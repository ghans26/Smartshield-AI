package com.shield.controller;

import com.shield.model.RiskAssessment;
import com.shield.model.TransactionRecord;
import com.shield.model.TransactionRequest;
import com.shield.service.CppEngineBridge;
import com.shield.service.TinyFishService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class TransactionController {

    private final CppEngineBridge cppEngineBridge;
    private final TinyFishService tinyFishService;

    private final ConcurrentHashMap<String, TransactionRecord> transactionStore = new ConcurrentHashMap<>();
    private final CopyOnWriteArrayList<Map<String, Object>> socAlerts = new CopyOnWriteArrayList<>();

    public TransactionController(CppEngineBridge cppEngineBridge, TinyFishService tinyFishService) {
        this.cppEngineBridge = cppEngineBridge;
        this.tinyFishService = tinyFishService;
        initializeDefaultSocAlerts();
    }

    private void initializeDefaultSocAlerts() {
        addSocAlert("SYSTEM_READY", "INFO", "SmartShield AI Core Online. C++17 sub-millisecond anomaly engine primed with 35 Delhi NCR baseline records.");
        addSocAlert("SECURITY_BASE", "INFO", "TinyFish.ai Live OSINT & Web Agent bridges connected. Thresholds: <40 Auto-Approve, 40-79 2FA Hold, >=80 Immediate High Alert.");
    }

    private void addSocAlert(String type, String severity, String message) {
        Map<String, Object> alert = new HashMap<>();
        alert.put("id", "SOC-" + System.currentTimeMillis() + "-" + new Random().nextInt(1000));
        alert.put("timestamp", Instant.now().toString());
        alert.put("type", type);
        alert.put("severity", severity);
        alert.put("message", message);
        // Prepend so latest alert is first
        socAlerts.add(0, alert);
        // Retain last 50 alerts
        while (socAlerts.size() > 50) {
            socAlerts.remove(socAlerts.size() - 1);
        }
    }

    @PostMapping("/tx/initiate")
    public ResponseEntity<TransactionRecord> initiateTransaction(@RequestBody TransactionRequest request) {
        // Step 1: Run Sub-millisecond C++ Anomaly Engine
        RiskAssessment assessment = cppEngineBridge.assessRisk(request);

        String txId = "TXN-" + System.currentTimeMillis();
        long now = System.currentTimeMillis();

        TransactionRecord record = new TransactionRecord(
                txId,
                now,
                request.getAmount(),
                request.getMerchant(),
                request.getCurrentLat(),
                request.getCurrentLon(),
                request.getHoursSinceLastTx(),
                request.getMonthSpendSoFar(),
                request.getAccountId(),
                "PENDING",
                assessment
        );

        if (assessment.getRiskScore() < 40) {
            record.setStatus("APPROVED");
            addSocAlert("TX_APPROVED", "INFO",
                    String.format("TXN %s: Approved INR %.2f at %s. Risk Score: %d/100 (C++ latency: %.2f ms)",
                            txId, request.getAmount(), request.getMerchant(), assessment.getRiskScore(), assessment.getExecTimeMs()));
        } else {
            record.setStatus("HOLD_PENDING_2FA");

            // Step 2: Fetch Live/Cached Web OSINT via TinyFish Search API
            Map<String, Object> osintData = tinyFishService.checkMerchantReputation(request.getMerchant());
            record.setTinyFishOsint(osintData);

            String severity = assessment.getRiskScore() >= 80 ? "CRITICAL" : "WARNING";
            String reasonSummary = String.join(" | ", assessment.getAnomalyReasons());

            addSocAlert("2FA_INTERCEPT", severity,
                    String.format("TXN %s HELD FOR 2FA: INR %.2f at %s. Risk Score: %d/100. Reasons: %s",
                            txId, request.getAmount(), request.getMerchant(), assessment.getRiskScore(), reasonSummary));
        }

        transactionStore.put(txId, record);
        return ResponseEntity.ok(record);
    }

    @PostMapping("/tx/verify-2fa")
    public ResponseEntity<Map<String, Object>> verify2FA(@RequestBody Map<String, Object> payload) {
        String txId = (String) payload.get("txId");
        Boolean approved = (Boolean) payload.get("approved");

        if (txId == null || approved == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "txId and approved flag are required"));
        }

        TransactionRecord record = transactionStore.get(txId);
        if (record == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Transaction " + txId + " not found"));
        }

        Map<String, Object> response = new HashMap<>();

        if (Boolean.TRUE.equals(approved)) {
            // User Confirmed: It's genuine!
            record.setStatus("APPROVED");
            // Dynamically adapt C++ model baseline by appending approved transaction to CSV
            cppEngineBridge.appendVerifiedTransaction(record);

            addSocAlert("2FA_VERIFIED", "INFO",
                    String.format("TXN %s: Customer verified 2FA for INR %.2f at %s. Baselined into user profile.",
                            txId, record.getAmount(), record.getMerchant()));

            response.put("status", "APPROVED");
            response.put("message", "2FA Verified by Customer — Transaction Cleared & Profile Updated");
            response.put("transaction", record);
        } else {
            // User Denied: Rogue attack! Block & deploy TinyFish Autonomous Agent!
            record.setStatus("BLOCKED_FRAUD");

            // Step 3: Trigger TinyFish Autonomous Web Agent to freeze bank account & file cyber fraud report
            Map<String, Object> agentResult = tinyFishService.triggerBankFreezeAgent(record);
            record.setTinyFishAgentStream(agentResult);

            addSocAlert("FRAUD_BLOCKED", "CRITICAL",
                    String.format("EMERGENCY: Customer REJECTED 2FA for TXN %s (INR %.2f at %s). TinyFish Agent deployed. Incident Ticket: %s",
                            txId, record.getAmount(), record.getMerchant(), agentResult.get("ticketId")));

            response.put("status", "BLOCKED_FRAUD");
            response.put("message", "Emergency Freeze Triggered — Account Secured by TinyFish Autonomous Agent");
            response.put("transaction", record);
            response.put("agentResult", agentResult);
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/soc/alerts")
    public ResponseEntity<Map<String, Object>> getSocAlerts() {
        Map<String, Object> response = new HashMap<>();
        response.put("alerts", socAlerts);
        response.put("totalAlerts", socAlerts.size());

        Map<String, Object> baseline = new HashMap<>();
        baseline.put("userHome", "Delhi NCR (28.6139° N, 77.2090° E)");
        baseline.put("dailyMeanAmountInr", 520.0);
        baseline.put("monthlyBaselineBudgetInr", 18000.0);
        baseline.put("historicalRecordsCount", 35);
        baseline.put("maxSafeVelocityKmh", 800.0);
        response.put("userBaseline", baseline);

        return ResponseEntity.ok(response);
    }
}
