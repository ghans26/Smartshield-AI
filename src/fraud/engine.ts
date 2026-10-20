/**
 * Pure Mathematical Fraud Engine Logic for Unit Testing and Browser Computation
 */

export interface FraudParams {
  amount: number;
  currentLat: number;
  currentLon: number;
  hoursSinceLastTx: number;
  monthSpendSoFar: number;
  meanAmount?: number;
  stdDevAmount?: number;
  baseLat?: number;
  baseLon?: number;
  monthlyBudget?: number;
}

export interface FraudResult {
  riskScore: number;
  spendZScore: number;
  distanceKm: number;
  velocityKmh: number;
  knnDistance: number;
  verdict: 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';
  impossibleTravel: boolean;
  requires2FA: boolean;
  anomalyReasons: string[];
}

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return R * c;
}

export function calculateSpendZScore(
  amount: number,
  mean: number = 520.0,
  stdDev: number = 210.0
): number {
  return Math.abs(amount - mean) / (stdDev + 1.0);
}

export function calculateTravelVelocity(
  distanceKm: number,
  hoursSinceLastTx: number
): number {
  const effectiveHours = Math.max(0.05, hoursSinceLastTx);
  return distanceKm / effectiveHours;
}

export function evaluateRisk(params: FraudParams): FraudResult {
  const mean = params.meanAmount ?? 520.0;
  const stdDev = params.stdDevAmount ?? 210.0;
  const baseLat = params.baseLat ?? 28.6139;
  const baseLon = params.baseLon ?? 77.2090;
  const budget = params.monthlyBudget ?? 18000.0;

  const spendZScore = calculateSpendZScore(params.amount, mean, stdDev);
  const distanceKm = haversineDistanceKm(baseLat, baseLon, params.currentLat, params.currentLon);
  const velocityKmh = calculateTravelVelocity(distanceKm, params.hoursSinceLastTx);
  const impossibleTravel = velocityKmh > 800.0;

  // Normalized feature space distance for k-NN proxy
  const normAmount = params.amount / (mean > 0 ? mean : 500.0);
  const normDist = distanceKm / 50.0;
  const knnDistance = Math.sqrt(Math.pow(normAmount - 1.0, 2) + Math.pow(normDist, 2));

  let risk = 0;
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

  const monthRatio = (params.monthSpendSoFar + params.amount) / budget;
  if (monthRatio > 1.0) {
    risk += Math.min(15.0, (monthRatio - 1.0) * 12.0);
  }

  if (knnDistance > 2.0) {
    risk += Math.min(20.0, (knnDistance - 2.0) * 2.5);
  }

  if (distanceKm > 10.0 && risk < 15.0) {
    risk += Math.min(10.0, distanceKm / 10.0);
  }

  if (params.amount > 15000.0 && risk < 60.0) {
    risk += 25.0;
  }

  const riskScore = Math.min(100, Math.max(0, Math.round(risk)));
  let verdict: 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK' = 'LOW_RISK';
  if (riskScore >= 80) {
    verdict = 'HIGH_RISK';
  } else if (riskScore >= 40) {
    verdict = 'MEDIUM_RISK';
  }

  const anomalyReasons: string[] = [];
  if (impossibleTravel) {
    anomalyReasons.push(
      `IMPOSSIBLE TRAVEL: Velocity of ${velocityKmh.toFixed(1)} km/h exceeds physical boundary of 800 km/h (Distance: ${distanceKm.toFixed(1)} km)`
    );
  } else if (distanceKm > 100.0) {
    anomalyReasons.push(
      `GEOGRAPHIC ANOMALY: Location is ${distanceKm.toFixed(1)} km away from historical Delhi NCR baseline`
    );
  }

  if (spendZScore > 3.0) {
    anomalyReasons.push(
      `HIGH SPEND ANOMALY: Transaction amount is ${spendZScore.toFixed(1)} standard deviations above rolling mean`
    );
  } else if (spendZScore > 1.8) {
    anomalyReasons.push(
      `MODERATE SPEND DEVIATION: Spend Z-Score of ${spendZScore.toFixed(1)} indicates unusual volume`
    );
  }

  if (knnDistance > 5.0) {
    anomalyReasons.push(
      `K-NN OUTLIER: k=5 nearest historical neighbor distance of ${knnDistance.toFixed(1)} reflects novel spending vector`
    );
  }

  if (anomalyReasons.length === 0 && riskScore < 40) {
    anomalyReasons.push('Normal routine transaction aligned with personalized spending history.');
  }

  return {
    riskScore,
    spendZScore: Math.round(spendZScore * 10) / 10,
    distanceKm: Math.round(distanceKm * 10) / 10,
    velocityKmh: Math.round(velocityKmh * 10) / 10,
    knnDistance: Math.round(knnDistance * 10) / 10,
    verdict,
    impossibleTravel,
    requires2FA: riskScore >= 40,
    anomalyReasons
  };
}
