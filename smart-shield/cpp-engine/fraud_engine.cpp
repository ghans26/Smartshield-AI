#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <cmath>
#include <chrono>
#include <iomanip>
#include <algorithm>

struct Transaction {
    std::string txId;
    long long timestampEpoch;
    double amount;
    double lat;
    double lon;
    std::string merchant;
};

class UserProfile {
public:
    std::vector<Transaction> history;
    double meanAmount = 0.0;
    double stdDevAmount = 0.0;
    double lastLat = 28.6139;
    double lastLon = 77.2090;

    bool loadHistory(const std::string& csvPath) {
        std::ifstream file(csvPath);
        if (!file.is_open()) {
            return false;
        }

        std::string line;
        // Skip CSV header
        if (!std::getline(file, line)) {
            return false;
        }

        history.clear();
        double sum = 0.0;

        while (std::getline(file, line)) {
            if (line.empty()) continue;
            std::stringstream ss(line);
            std::string token;
            Transaction tx;

            if (std::getline(ss, tx.txId, ',') &&
                std::getline(ss, token, ',') && (tx.timestampEpoch = std::stoll(token), true) &&
                std::getline(ss, token, ',') && (tx.amount = std::stod(token), true) &&
                std::getline(ss, token, ',') && (tx.lat = std::stod(token), true) &&
                std::getline(ss, token, ',') && (tx.lon = std::stod(token), true) &&
                std::getline(ss, tx.merchant)) {
                
                // Trim potential carriage returns
                if (!tx.merchant.empty() && tx.merchant.back() == '\r') {
                    tx.merchant.pop_back();
                }
                history.push_back(tx);
                sum += tx.amount;
            }
        }

        if (history.empty()) {
            return false;
        }

        // Compute Mean
        meanAmount = sum / static_cast<double>(history.size());

        // Compute Sample Standard Deviation
        double varSum = 0.0;
        for (const auto& tx : history) {
            double diff = tx.amount - meanAmount;
            varSum += diff * diff;
        }
        std::size_t n = history.size();
        stdDevAmount = (n > 1) ? std::sqrt(varSum / static_cast<double>(n - 1)) : 1.0;

        // Last baseline location is the final row in user_history.csv
        lastLat = history.back().lat;
        lastLon = history.back().lon;

        return true;
    }
};

// Haversine Distance in Kilometers
static double haversineDistanceKm(double lat1, double lon1, double lat2, double lon2) {
    constexpr double R = 6371.0; // Earth's mean radius in km
    constexpr double PI = 3.14159265358979323846;

    double phi1 = lat1 * PI / 180.0;
    double phi2 = lat2 * PI / 180.0;
    double deltaPhi = (lat2 - lat1) * PI / 180.0;
    double deltaLambda = (lon2 - lon1) * PI / 180.0;

    double a = std::sin(deltaPhi / 2.0) * std::sin(deltaPhi / 2.0) +
               std::cos(phi1) * std::cos(phi2) *
               std::sin(deltaLambda / 2.0) * std::sin(deltaLambda / 2.0);
    double c = 2.0 * std::atan2(std::sqrt(a), std::sqrt(std::max(0.0, 1.0 - a)));

    return R * c;
}

int main(int argc, char* argv[]) {
    // Start high-precision timer
    auto startTime = std::chrono::high_resolution_clock::now();

    if (argc < 6) {
        std::cerr << "Usage: " << argv[0] 
                  << " <amount> <current_lat> <current_lon> <hours_since_last_tx> <month_spend_so_far> [csv_path]\n";
        return 1;
    }

    double currentAmount = std::stod(argv[1]);
    double currentLat = std::stod(argv[2]);
    double currentLon = std::stod(argv[3]);
    double hoursSinceLastTx = std::stod(argv[4]);
    double monthSpendSoFar = std::stod(argv[5]);

    std::string csvPath = "user_history.csv";
    if (argc >= 7) {
        csvPath = argv[6];
    }

    UserProfile profile;
    if (!profile.loadHistory(csvPath)) {
        // Fallback default statistics if CSV cannot be read
        profile.meanAmount = 520.0;
        profile.stdDevAmount = 210.0;
        profile.lastLat = 28.6139;
        profile.lastLon = 77.2090;
    }

    // 1. Spend Z-Score & Monthly Velocity Ratio
    double spendZScore = std::abs(currentAmount - profile.meanAmount) / (profile.stdDevAmount + 1.0);
    double monthlyBudget = 18000.0;
    double monthSpendRatio = (monthSpendSoFar + currentAmount) / monthlyBudget;

    // 2. Haversine Distance & Travel Velocity
    double distanceKm = haversineDistanceKm(profile.lastLat, profile.lastLon, currentLat, currentLon);
    double effectiveHours = std::max(0.05, hoursSinceLastTx);
    double velocityKmh = distanceKm / effectiveHours;
    bool impossibleTravel = (velocityKmh > 800.0);

    // 3. k-NN Anomaly Score (k = 5)
    // Normalized feature space: (amount / mean_amount, distanceKm / 50.0)
    double normCurrentAmount = currentAmount / (profile.meanAmount > 0.0 ? profile.meanAmount : 500.0);
    double normCurrentDist = distanceKm / 50.0;

    std::vector<double> distances;
    distances.reserve(profile.history.size());

    for (const auto& tx : profile.history) {
        double txNormAmount = tx.amount / (profile.meanAmount > 0.0 ? profile.meanAmount : 500.0);
        double txDistKm = haversineDistanceKm(profile.lastLat, profile.lastLon, tx.lat, tx.lon);
        double txNormDist = txDistKm / 50.0;

        double dAmount = normCurrentAmount - txNormAmount;
        double dDist = normCurrentDist - txNormDist;
        double dist = std::sqrt(dAmount * dAmount + dDist * dDist);
        distances.push_back(dist);
    }

    std::sort(distances.begin(), distances.end());
    int k = 5;
    double knnSum = 0.0;
    int actualK = std::min(k, static_cast<int>(distances.size()));
    for (int i = 0; i < actualK; ++i) {
        knnSum += distances[i];
    }
    double knnDistance = (actualK > 0) ? (knnSum / static_cast<double>(actualK)) : 0.0;

    // 4. Multi-Factor Risk Score Calculation (0 - 100)
    double calculatedRisk = 0.0;

    // Velocity / Travel factor:
    if (impossibleTravel) {
        // Instant massive risk for supersonic travel
        calculatedRisk += 55.0 + std::min(25.0, (velocityKmh - 800.0) / 200.0);
    } else if (distanceKm > 100.0) {
        calculatedRisk += std::min(20.0, (distanceKm / 100.0) * 5.0);
    }

    // Spend Z-Score factor:
    if (spendZScore > 3.0) {
        // High amount anomaly
        calculatedRisk += std::min(35.0, 15.0 + (spendZScore - 3.0) * 1.5);
    } else if (spendZScore > 1.5) {
        calculatedRisk += (spendZScore - 1.5) * 8.0;
    }

    // Monthly velocity overshoot:
    if (monthSpendRatio > 1.0) {
        calculatedRisk += std::min(15.0, (monthSpendRatio - 1.0) * 12.0);
    }

    // k-NN distance factor:
    if (knnDistance > 2.0) {
        calculatedRisk += std::min(20.0, (knnDistance - 2.0) * 2.5);
    }

    // Baseline small noise/risk for non-zero travel
    if (distanceKm > 10.0 && calculatedRisk < 15.0) {
        calculatedRisk += std::min(10.0, distanceKm / 10.0);
    }

    // High amount guardrail
    if (currentAmount > 15000.0 && calculatedRisk < 60.0) {
        calculatedRisk += 25.0;
    }

    // Clamping to [0, 100]
    int riskScore = static_cast<int>(std::round(calculatedRisk));
    if (riskScore < 0) riskScore = 0;
    if (riskScore > 100) riskScore = 100;

    // Verdict Categorization
    std::string verdict;
    if (riskScore < 40) {
        verdict = "LOW_RISK";
    } else if (riskScore < 80) {
        verdict = "MEDIUM_RISK";
    } else {
        verdict = "HIGH_RISK";
    }

    // End timer
    auto endTime = std::chrono::high_resolution_clock::now();
    double execTimeMs = std::chrono::duration<double, std::milli>(endTime - startTime).count();

    // Output ONLY a single-line valid JSON string to stdout
    std::cout << std::fixed;
    std::cout << "{\"riskScore\":" << riskScore
              << ",\"spendZScore\":" << std::setprecision(1) << spendZScore
              << ",\"distanceKm\":" << std::setprecision(1) << distanceKm
              << ",\"velocityKmh\":" << std::setprecision(1) << velocityKmh
              << ",\"knnDistance\":" << std::setprecision(1) << knnDistance
              << ",\"execTimeMs\":" << std::setprecision(2) << execTimeMs
              << ",\"verdict\":\"" << verdict << "\"}" << std::endl;

    return 0;
}
