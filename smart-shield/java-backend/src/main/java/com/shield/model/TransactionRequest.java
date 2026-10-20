package com.shield.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class TransactionRequest {
    private Double amount;
    private Double currentLat;
    private Double currentLon;
    private Double hoursSinceLastTx;
    private Double monthSpendSoFar;
    private String merchant;
    private String accountId;

    public TransactionRequest() {
    }

    public TransactionRequest(Double amount, Double currentLat, Double currentLon, 
                              Double hoursSinceLastTx, Double monthSpendSoFar, 
                              String merchant, String accountId) {
        this.amount = amount;
        this.currentLat = currentLat;
        this.currentLon = currentLon;
        this.hoursSinceLastTx = hoursSinceLastTx;
        this.monthSpendSoFar = monthSpendSoFar;
        this.merchant = merchant;
        this.accountId = accountId;
    }

    public Double getAmount() {
        return amount != null ? amount : 0.0;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public Double getCurrentLat() {
        return currentLat != null ? currentLat : 28.6139;
    }

    public void setCurrentLat(Double currentLat) {
        this.currentLat = currentLat;
    }

    public Double getCurrentLon() {
        return currentLon != null ? currentLon : 77.2090;
    }

    public void setCurrentLon(Double currentLon) {
        this.currentLon = currentLon;
    }

    public Double getHoursSinceLastTx() {
        return hoursSinceLastTx != null ? hoursSinceLastTx : 1.0;
    }

    public void setHoursSinceLastTx(Double hoursSinceLastTx) {
        this.hoursSinceLastTx = hoursSinceLastTx;
    }

    public Double getMonthSpendSoFar() {
        return monthSpendSoFar != null ? monthSpendSoFar : 5000.0;
    }

    public void setMonthSpendSoFar(Double monthSpendSoFar) {
        this.monthSpendSoFar = monthSpendSoFar;
    }

    public String getMerchant() {
        return merchant != null ? merchant : "Unknown_Merchant";
    }

    public void setMerchant(String merchant) {
        this.merchant = merchant;
    }

    public String getAccountId() {
        return accountId != null ? accountId : "ACC-88412-IN";
    }

    public void setAccountId(String accountId) {
        this.accountId = accountId;
    }
}
