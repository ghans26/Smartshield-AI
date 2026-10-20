package com.shield.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shield.model.RiskAssessment;
import com.shield.model.TransactionRecord;
import com.shield.model.TransactionRequest;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
public class CppEngineBridge {

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Resolves the C++ fraud_engine binary and user_history.csv paths across
     * different execution working directories.
     */
    private File findFile(String relativePath) {
        String[] candidateRoots = {
            ".",
            "..",
            "smart-shield",
            "/smart-shield",
            System.getProperty("user.dir"),
            System.getProperty("user.dir") + "/smart-shield"
        };

        for (String root : candidateRoots) {
            File f = new File(root, relativePath);
            if (f.exists()) {
                return f;
            }
        }
        return new File(relativePath);
    }

    public RiskAssessment assessRisk(TransactionRequest request) {
        File binaryFile = findFile("cpp-engine/fraud_engine");
        File csvFile = findFile("cpp-engine/user_history.csv");

        if (binaryFile.exists() && binaryFile.canExecute()) {
            try {
                List<String> command = new ArrayList<>();
                command.add(binaryFile.getAbsolutePath());
                command.add(String.valueOf(request.getAmount()));
                command.add(String.valueOf(request.getCurrentLat()));
                command.add(String.valueOf(request.getCurrentLon()));
                command.add(String.valueOf(request.getHoursSinceLastTx()));
                command.add(String.valueOf(request.getMonthSpendSoFar()));
                command.add(csvFile.getAbsolutePath());

                ProcessBuilder pb = new ProcessBuilder(command);
                pb.redirectErrorStream(false);
                Process process = pb.start();

                BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
                String stdoutLine = reader.readLine();

                boolean finished = process.waitFor(2, TimeUnit.SECONDS);
                if (finished && stdoutLine != null && stdoutLine.trim().startsWith("{")) {
                    RiskAssessment assessment = objectMapper.readValue(stdoutLine.trim(), RiskAssessment.class);
                    // Populate reasons & boolean flags
                    assessment.setImpossibleTravel(assessment.getVelocityKmh() > 800.0);
                    assessment.setRequires2FA(assessment.getRiskScore() >= 40);
                    assessment.setAnomalyReasons(assessment.generateReasons());
                    return assessment;
                }
            } catch (Exception e) {
                System.err.println("[CppEngineBridge] Binary invocation fallback triggered: " + e.getMessage());
            }
        }

        // High-fidelity fallback mirroring the exact C++ calculation logic
        return calculateFallbackAssessment(request, csvFile);
    }

    public synchronized void appendVerifiedTransaction(TransactionRecord tx) {
        try {
            File csvFile = findFile("cpp-engine/user_history.csv");
            if (!csvFile.exists()) {
                Path parent = csvFile.getParentFile() != null ? csvFile.getParentFile().toPath() : Paths.get(".");
                Files.createDirectories(parent);
                Files.writeString(csvFile.toPath(), "tx_id,timestamp_epoch,amount,lat,lon,merchant\n", StandardOpenOption.CREATE);
            }

            String line = String.format("%s,%d,%.1f,%.4f,%.4f,%s\n",
                    tx.getTxId(),
                    tx.getTimestamp() / 1000,
                    tx.getAmount(),
                    tx.getCurrentLat(),
                    tx.getCurrentLon(),
                    tx.getMerchant() != null ? tx.getMerchant().replace(",", "_") : "Verified_Merchant"
            );

            Files.writeString(csvFile.toPath(), line, StandardOpenOption.APPEND);
            System.out.println("[CppEngineBridge] Appended verified transaction to " + csvFile.getAbsolutePath() + ": " + line.trim());
        } catch (IOException e) {
            System.err.println("[CppEngineBridge] Error appending to CSV: " + e.getMessage());
        }
    }

    private RiskAssessment calculateFallbackAssessment(TransactionRequest req, File csvFile) {
        long start = System.nanoTime();
        double meanAmount = 520.0;
        double stdDevAmount = 210.0;
        double lastLat = 28.6139;
        double lastLon = 77.2090;

        List<Double> historicalAmounts = new ArrayList<>();
        List<double[]> historicalCoords = new ArrayList<>();

        if (csvFile != null && csvFile.exists()) {
            try (BufferedReader br = new BufferedReader(new FileReader(csvFile))) {
                String line;
                boolean first = true;
                while ((line = br.readLine()) != null) {
                    if (first) { first = false; continue; }
                    String[] parts = line.split(",");
                    if (parts.length >= 6) {
                        double amt = Double.parseDouble(parts[2].trim());
                        double lat = Double.parseDouble(parts[3].trim());
                        double lon = Double.parseDouble(parts[4].trim());
                        historicalAmounts.add(amt);
                        historicalCoords.add(new double[]{lat, lon});
                        lastLat = lat;
                        lastLon = lon;
                    }
                }
                if (!historicalAmounts.isEmpty()) {
                    double sum = historicalAmounts.stream().mapToDouble(Double::doubleValue).sum();
                    meanAmount = sum / historicalAmounts.size();
                    double varSum = 0;
                    for (double a : historicalAmounts) {
                        varSum += Math.pow(a - meanAmount, 2);
                    }
                    stdDevAmount = historicalAmounts.size() > 1 ? Math.sqrt(varSum / (historicalAmounts.size() - 1)) : 1.0;
                }
            } catch (Exception ignored) {}
        }

        double spendZScore = Math.abs(req.getAmount() - meanAmount) / (stdDevAmount + 1.0);
        double distanceKm = haversine(lastLat, lastLon, req.getCurrentLat(), req.getCurrentLon());
        double effHours = Math.max(0.05, req.getHoursSinceLastTx());
        double velocityKmh = distanceKm / effHours;
        boolean impossibleTravel = velocityKmh > 800.0;

        // k-NN
        List<Double> knnDistances = new ArrayList<>();
        double normAmt = req.getAmount() / (meanAmount > 0 ? meanAmount : 500.0);
        double normDist = distanceKm / 50.0;
        for (int i = 0; i < historicalAmounts.size(); i++) {
            double hNormAmt = historicalAmounts.get(i) / (meanAmount > 0 ? meanAmount : 500.0);
            double hDistKm = haversine(lastLat, lastLon, historicalCoords.get(i)[0], historicalCoords.get(i)[1]);
            double hNormDist = hDistKm / 50.0;
            double d = Math.sqrt(Math.pow(normAmt - hNormAmt, 2) + Math.pow(normDist - hNormDist, 2));
            knnDistances.add(d);
        }
        Collections.sort(knnDistances);
        double knnSum = 0;
        int k = Math.min(5, knnDistances.size());
        for (int i = 0; i < k; i++) knnSum += knnDistances.get(i);
        double knnDistance = k > 0 ? (knnSum / k) : 0.0;

        double risk = 0.0;
        if (impossibleTravel) {
            risk += 55.0 + Math.min(25.0, (velocityKmh - 800.0) / 200.0);
        } else if (distanceKm > 100.0) {
            risk += Math.min(20.0, (distanceKm / 100.0) * 5.0);
        }
        if (spendZScore > 3.0) {
            risk += Math.min(35.0, 15.0 + (spendZScore - 3.0) * 1.5);
        } else if (spendZScore > 1.5) {
            risk += (spendZScore - 1.5) * 8.0;
        }
        double monthSpendRatio = (req.getMonthSpendSoFar() + req.getAmount()) / 18000.0;
        if (monthSpendRatio > 1.0) {
            risk += Math.min(15.0, (monthSpendRatio - 1.0) * 12.0);
        }
        if (knnDistance > 2.0) {
            risk += Math.min(20.0, (knnDistance - 2.0) * 2.5);
        }
        if (distanceKm > 10.0 && risk < 15.0) {
            risk += Math.min(10.0, distanceKm / 10.0);
        }
        if (req.getAmount() > 15000.0 && risk < 60.0) {
            risk += 25.0;
        }

        int riskScore = (int) Math.round(Math.min(100.0, Math.max(0.0, risk)));
        String verdict = riskScore < 40 ? "LOW_RISK" : (riskScore < 80 ? "MEDIUM_RISK" : "HIGH_RISK");
        double execTimeMs = (System.nanoTime() - start) / 1_000_000.0;

        return new RiskAssessment(riskScore, Math.round(spendZScore * 10.0) / 10.0,
                Math.round(distanceKm * 10.0) / 10.0,
                Math.round(velocityKmh * 10.0) / 10.0,
                Math.round(knnDistance * 10.0) / 10.0,
                Math.max(0.20, Math.round(execTimeMs * 100.0) / 100.0),
                verdict);
    }

    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
    }
}
