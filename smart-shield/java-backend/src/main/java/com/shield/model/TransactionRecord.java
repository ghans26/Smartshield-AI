package com.shield.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class TransactionRecord {
    private String txId;
    private long timestamp;
    private double amount;
    private String merchant;
    private double currentLat;
    private double currentLon;
    private double hoursSinceLastTx;
    private double monthSpendSoFar;
    private String accountId;
    private String status; // APPROVED, HOLD_PENDING_2FA, BLOCKED_FRAUD
    private RiskAssessment riskAssessment;
    private Map<String, Object> tinyFishOsint;
    private Map<String, Object> tinyFishAgentStream;

    public TransactionRecord() {
    }

    public TransactionRecord(String txId, long timestamp, double amount, String merchant, 
                             double currentLat, double currentLon, double hoursSinceLastTx, 
                             double monthSpendSoFar, String accountId, String status, 
                             RiskAssessment riskAssessment) {
        this.txId = txId;
        this.timestamp = timestamp;
        this.amount = amount;
        this.merchant = merchant;
        this.currentLat = currentLat;
        this.currentLon = currentLon;
        this.hoursSinceLastTx = hoursSinceLastTx;
        this.monthSpendSoFar = monthSpendSoFar;
        this.accountId = accountId;
        this.status = status;
        this.riskAssessment = riskAssessment;
    }

    public String getTxId() {
        return txId;
    }

    public void setTxId(String txId) {
        this.txId = txId;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public String getMerchant() {
        return merchant;
    }

    public void setMerchant(String merchant) {
        this.merchant = merchant;
    }

    public double getCurrentLat() {
        return currentLat;
    }

    public void setCurrentLat(double currentLat) {
        this.currentLat = currentLat;
    }

    public double getCurrentLon() {
        return currentLon;
    }

    public void setCurrentLon(double currentLon) {
        this.currentLon = currentLon;
    }

    public double getHoursSinceLastTx() {
        return hoursSinceLastTx;
    }

    public void setHoursSinceLastTx(double hoursSinceLastTx) {
        this.hoursSinceLastTx = hoursSinceLastTx;
    }

    public double getMonthSpendSoFar() {
        return monthSpendSoFar;
    }

    public void setMonthSpendSoFar(double monthSpendSoFar) {
        this.monthSpendSoFar = monthSpendSoFar;
    }

    public String getAccountId() {
        return accountId;
    }

    public void setAccountId(String accountId) {
        this.accountId = accountId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public RiskAssessment getRiskAssessment() {
        return riskAssessment;
    }

    public void setRiskAssessment(RiskAssessment riskAssessment) {
        this.riskAssessment = riskAssessment;
    }

    public Map<String, Object> getTinyFishOsint() {
        return tinyFishOsint;
    }

    public void setTinyFishOsint(Map<String, Object> tinyFishOsint) {
        this.tinyFishOsint = tinyFishOsint;
    }

    public Map<String, Object> getTinyFishAgentStream() {
        return tinyFishAgentStream;
    }

    public void setTinyFishAgentStream(Map<String, Object> tinyFishAgentStream) {
        this.tinyFishAgentStream = tinyFishAgentStream;
    }
}
