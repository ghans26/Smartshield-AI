package com.shield.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class RiskAssessment {
    private int riskScore;
    private double spendZScore;
    private double distanceKm;
    private double velocityKmh;
    private double knnDistance;
    private double execTimeMs;
    private String verdict;
    private boolean impossibleTravel;
    private boolean requires2FA;
    private List<String> anomalyReasons = new ArrayList<>();

    public RiskAssessment() {
    }

    public RiskAssessment(int riskScore, double spendZScore, double distanceKm, 
                          double velocityKmh, double knnDistance, double execTimeMs, String verdict) {
        this.riskScore = riskScore;
        this.spendZScore = spendZScore;
        this.distanceKm = distanceKm;
        this.velocityKmh = velocityKmh;
        this.knnDistance = knnDistance;
        this.execTimeMs = execTimeMs;
        this.verdict = verdict;
        this.impossibleTravel = velocityKmh > 800.0;
        this.requires2FA = riskScore >= 40;
        this.anomalyReasons = generateReasons();
    }

    public List<String> generateReasons() {
        List<String> reasons = new ArrayList<>();
        if (velocityKmh > 800.0) {
            reasons.add(String.format("IMPOSSIBLE TRAVEL: Velocity of %.1f km/h exceeds physical boundary of 800 km/h (Distance: %.1f km)", velocityKmh, distanceKm));
        } else if (distanceKm > 100.0) {
            reasons.add(String.format("GEOGRAPHIC ANOMALY: Location is %.1f km away from historical cluster", distanceKm));
        }

        if (spendZScore > 3.0) {
            reasons.add(String.format("HIGH SPEND ANOMALY: Transaction amount is %.1f standard deviations above user rolling mean", spendZScore));
        } else if (spendZScore > 1.8) {
            reasons.add(String.format("MODERATE SPEND DEVIATION: Spend Z-Score of %.1f indicates unusual volume", spendZScore));
        }

        if (knnDistance > 5.0) {
            reasons.add(String.format("K-NN OUTLIER: k=5 nearest historical neighbor distance of %.1f reflects novel spending vector", knnDistance));
        }

        if (reasons.isEmpty() && riskScore < 40) {
            reasons.add("Normal routine transaction aligned with personalized spending history and GPS baseline.");
        }
        return reasons;
    }

    public int getRiskScore() {
        return riskScore;
    }

    public void setRiskScore(int riskScore) {
        this.riskScore = riskScore;
        this.requires2FA = riskScore >= 40;
    }

    public double getSpendZScore() {
        return spendZScore;
    }

    public void setSpendZScore(double spendZScore) {
        this.spendZScore = spendZScore;
    }

    public double getDistanceKm() {
        return distanceKm;
    }

    public void setDistanceKm(double distanceKm) {
        this.distanceKm = distanceKm;
    }

    public double getVelocityKmh() {
        return velocityKmh;
    }

    public void setVelocityKmh(double velocityKmh) {
        this.velocityKmh = velocityKmh;
        this.impossibleTravel = velocityKmh > 800.0;
    }

    public double getKnnDistance() {
        return knnDistance;
    }

    public void setKnnDistance(double knnDistance) {
        this.knnDistance = knnDistance;
    }

    public double getExecTimeMs() {
        return execTimeMs;
    }

    public void setExecTimeMs(double execTimeMs) {
        this.execTimeMs = execTimeMs;
    }

    public String getVerdict() {
        return verdict;
    }

    public void setVerdict(String verdict) {
        this.verdict = verdict;
    }

    public boolean isImpossibleTravel() {
        return impossibleTravel || velocityKmh > 800.0;
    }

    public void setImpossibleTravel(boolean impossibleTravel) {
        this.impossibleTravel = impossibleTravel;
    }

    public boolean isRequires2FA() {
        return requires2FA || riskScore >= 40;
    }

    public void setRequires2FA(boolean requires2FA) {
        this.requires2FA = requires2FA;
    }

    public List<String> getAnomalyReasons() {
        if (anomalyReasons == null || anomalyReasons.isEmpty()) {
            anomalyReasons = generateReasons();
        }
        return anomalyReasons;
    }

    public void setAnomalyReasons(List<String> anomalyReasons) {
        this.anomalyReasons = anomalyReasons;
    }
}
