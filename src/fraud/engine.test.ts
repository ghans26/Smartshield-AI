import test from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineDistanceKm,
  calculateSpendZScore,
  calculateTravelVelocity,
  evaluateRisk
} from './engine.ts';

test('haversine distance computes 0 km for identical coordinates', () => {
  const d = haversineDistanceKm(28.6139, 77.2090, 28.6139, 77.2090);
  assert.equal(Math.round(d), 0);
});

test('haversine distance computes approx 1148 km from Delhi to Mumbai', () => {
  // Delhi (28.6139, 77.2090) to Mumbai (19.0760, 72.8777)
  const d = haversineDistanceKm(28.6139, 77.2090, 19.0760, 72.8777);
  assert.ok(d > 1140 && d < 1160, `Distance should be ~1148km, got ${d}`);
});

test('calculateSpendZScore calculates correct deviation', () => {
  // Amount 520 with mean 520 is 0
  const z0 = calculateSpendZScore(520, 520, 210);
  assert.equal(z0, 0);

  // Amount 9500 with mean 520, stdDev 210
  const zOutlier = calculateSpendZScore(9500, 520, 210);
  assert.ok(zOutlier > 40, `Z-score should be > 40, got ${zOutlier}`);
});

test('calculateTravelVelocity flags supersonic travel correctly', () => {
  const vel = calculateTravelVelocity(1148.2, 0.2);
  assert.ok(vel > 5000, `Velocity should be ~5741 km/h, got ${vel}`);
});

test('Preset 1: Routine ₹450 at Delhi results in LOW_RISK without 2FA requirement', () => {
  const res = evaluateRisk({
    amount: 450,
    currentLat: 28.6139,
    currentLon: 77.2090,
    hoursSinceLastTx: 2.5,
    monthSpendSoFar: 5000
  });

  assert.equal(res.verdict, 'LOW_RISK');
  assert.ok(res.riskScore < 40, `Risk score should be < 40, got ${res.riskScore}`);
  assert.equal(res.requires2FA, false);
  assert.equal(res.impossibleTravel, false);
});

test('Preset 2: Legit Outlier ₹9,500 at Delhi results in MEDIUM_RISK requiring 2FA', () => {
  const res = evaluateRisk({
    amount: 9500,
    currentLat: 28.6139,
    currentLon: 77.2090,
    hoursSinceLastTx: 1.2,
    monthSpendSoFar: 5000
  });

  assert.equal(res.verdict, 'MEDIUM_RISK');
  assert.ok(res.riskScore >= 40 && res.riskScore < 80, `Risk score should be 40-79, got ${res.riskScore}`);
  assert.equal(res.requires2FA, true);
  assert.equal(res.impossibleTravel, false);
});

test('Preset 3: Scam Attack ₹24,000 at Mumbai results in HIGH_RISK with IMPOSSIBLE TRAVEL', () => {
  const res = evaluateRisk({
    amount: 24000,
    currentLat: 19.0760,
    currentLon: 72.8777,
    hoursSinceLastTx: 0.2,
    monthSpendSoFar: 14000
  });

  assert.equal(res.verdict, 'HIGH_RISK');
  assert.ok(res.riskScore >= 80, `Risk score should be >= 80, got ${res.riskScore}`);
  assert.equal(res.requires2FA, true);
  assert.equal(res.impossibleTravel, true);
  assert.ok(res.velocityKmh > 5000);
});
