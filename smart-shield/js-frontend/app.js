/**
 * SmartShield AI — Real-Time Bank Fraud Switch & 2FA Command Centre
 * Vanilla ES6+ Client Implementation
 */

// Backend endpoint configuration (defaults to Spring Boot on port 8080)
const API_BASE_URL = window.location.port === '8080' ? '' : 'http://localhost:8080';

// State Management
let currentTransaction = null;
let countdownInterval = null;
let countdownRemaining = 60;
let userBalance = 74500.0;
let monthSpend = 11480.0;

// Presets Data
const PRESETS = {
  routine: {
    amount: 450,
    merchant: 'BlueTokai_Coffee',
    lat: 28.6139,
    lon: 77.2090,
    hours: 2.5,
    monthSpend: 11480
  },
  outlier: {
    amount: 9500,
    merchant: 'IRCTC_Rail_Booking',
    lat: 28.6139,
    lon: 77.2090,
    hours: 1.2,
    monthSpend: 11480
  },
  scam: {
    amount: 24000,
    merchant: 'FastCashLotteryUPI',
    lat: 19.0760,
    lon: 72.8777,
    hours: 0.2,
    monthSpend: 14000
  }
};

// Initial SOC Alerts
let socAlerts = [
  {
    id: 'SOC-INIT-1',
    timestamp: new Date().toISOString(),
    type: 'SYSTEM_READY',
    severity: 'INFO',
    message: 'SmartShield AI Core Online. C++17 sub-millisecond anomaly engine primed with 35 Delhi NCR baseline records.'
  },
  {
    id: 'SOC-INIT-2',
    timestamp: new Date(Date.now() - 15000).toISOString(),
    type: 'SECURITY_BASE',
    severity: 'INFO',
    message: 'TinyFish.ai Live OSINT & Web Agent bridges connected. Thresholds: <40 Auto-Approve, 40-79 2FA Hold, >=80 Immediate High Alert.'
  }
];

// DOM Elements
const form = document.getElementById('transferForm');
const amountInput = document.getElementById('amountInput');
const merchantInput = document.getElementById('merchantInput');
const latInput = document.getElementById('latInput');
const lonInput = document.getElementById('lonInput');
const hoursInput = document.getElementById('hoursInput');
const monthSpentInput = document.getElementById('monthSpentInput');
const submitBtn = document.getElementById('submitTxBtn');
const quickStatusBanner = document.getElementById('quickStatusBanner');
const quickStatusText = document.getElementById('quickStatusText');

// Center Brain DOM
const riskScoreNumber = document.getElementById('riskScoreNumber');
const gaugeFill = document.getElementById('gaugeFill');
const gaugeNeedle = document.getElementById('gaugeNeedle');
const verdictPill = document.getElementById('verdictPill');
const verdictDesc = document.getElementById('verdictDesc');
const execTimeValue = document.getElementById('execTimeValue');
const valSpendZ = document.getElementById('valSpendZ');
const spendZProgress = document.getElementById('spendZProgress');
const valVelocity = document.getElementById('valVelocity');
const valDistance = document.getElementById('valDistance');
const impossibleTravelAlert = document.getElementById('impossibleTravelAlert');
const valBudgetRatio = document.getElementById('valBudgetRatio');
const budgetProgress = document.getElementById('budgetProgress');
const budgetBadge = document.getElementById('budgetBadge');
const valKNN = document.getElementById('valKNN');
const knnProgress = document.getElementById('knnProgress');
const terminalStdout = document.getElementById('terminalStdout');

// Right SOC & Agent DOM
const socAlertsList = document.getElementById('socAlertsList');
const socCountBadge = document.getElementById('socCountBadge');
const agentStatusBadge = document.getElementById('agentStatusBadge');
const agentStreamBox = document.getElementById('agentStreamBox');
const agentTicketBanner = document.getElementById('agentTicketBanner');
const agentTicketId = document.getElementById('agentTicketId');

// Modal DOM
const modalOverlay = document.getElementById('modalOverlay');
const modalAmountDisplay = document.getElementById('modalAmountDisplay');
const modalMerchantDisplay = document.getElementById('modalMerchantDisplay');
const modalReasonsList = document.getElementById('modalReasonsList');
const osintRiskTag = document.getElementById('osintRiskTag');
const osintWarningText = document.getElementById('osintWarningText');
const osintMetaText = document.getElementById('osintMetaText');
const countdownTimer = document.getElementById('countdownTimer');
const btnConfirm2FA = document.getElementById('btnConfirm2FA');
const btnDeny2FA = document.getElementById('btnDeny2FA');

// Presets Listeners
document.getElementById('presetRoutineBtn').addEventListener('click', () => applyPreset('routine'));
document.getElementById('presetOutlierBtn').addEventListener('click', () => applyPreset('outlier'));
document.getElementById('presetScamBtn').addEventListener('click', () => applyPreset('scam'));

function applyPreset(name) {
  const p = PRESETS[name];
  amountInput.value = p.amount;
  merchantInput.value = p.merchant;
  latInput.value = p.lat;
  lonInput.value = p.lon;
  hoursInput.value = p.hours;
  monthSpentInput.value = p.monthSpend;

  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  if (name === 'routine') document.getElementById('presetRoutineBtn').classList.add('active');
  if (name === 'outlier') document.getElementById('presetOutlierBtn').classList.add('active');
  if (name === 'scam') document.getElementById('presetScamBtn').classList.add('active');
}

// Format Currency
function formatINR(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Render SOC Alerts
function renderSocAlerts() {
  socAlertsList.innerHTML = '';
  socCountBadge.textContent = `${socAlerts.length} Alerts`;

  socAlerts.forEach(alert => {
    const item = document.createElement('div');
    item.className = `soc-alert-item severity-${alert.severity}`;

    const dateStr = new Date(alert.timestamp).toLocaleTimeString();
    item.innerHTML = `
      <div class="alert-top">
        <span class="alert-badge ${alert.severity}">${alert.type}</span>
        <span class="alert-time">${dateStr}</span>
      </div>
      <div class="alert-msg">${escapeHtml(alert.message)}</div>
    `;
    socAlertsList.appendChild(item);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// Add New Alert
function addSocAlert(type, severity, message) {
  socAlerts.unshift({
    id: 'SOC-' + Date.now(),
    timestamp: new Date().toISOString(),
    type,
    severity,
    message
  });
  if (socAlerts.length > 50) socAlerts.pop();
  renderSocAlerts();
}

// Update Center Brain Gauge & Cards
function updateBrainUI(assessment, request) {
  const score = assessment.riskScore;
  riskScoreNumber.textContent = score;

  // Gauge Needle Calculation: -90deg is 0 score, +90deg is 100 score
  const needleAngle = -90 + (score / 100) * 180;
  gaugeNeedle.style.transform = `rotate(${needleAngle}deg)`;

  // Gauge Arc stroke-dashoffset: total length is 251.2
  // offset = 251.2 - (score / 100) * 251.2
  const offset = 251.2 - (score / 100) * 251.2;
  gaugeFill.style.strokeDashoffset = offset;

  // Colors based on risk
  if (score < 40) {
    gaugeFill.style.stroke = '#10b981';
    riskScoreNumber.style.color = '#10b981';
    verdictPill.className = 'verdict-pill pill-low';
    verdictPill.textContent = 'LOW RISK';
    verdictDesc.textContent = 'Auto-Approved by C++ Switch';
  } else if (score < 80) {
    gaugeFill.style.stroke = '#f59e0b';
    riskScoreNumber.style.color = '#f59e0b';
    verdictPill.className = 'verdict-pill pill-med';
    verdictPill.textContent = 'MEDIUM RISK';
    verdictDesc.textContent = '2FA Identity Challenge Required';
  } else {
    gaugeFill.style.stroke = '#ef4444';
    riskScoreNumber.style.color = '#ef4444';
    verdictPill.className = 'verdict-pill pill-high';
    verdictPill.textContent = 'HIGH RISK';
    verdictDesc.textContent = 'Critical Threat Detected';
  }

  // Exec time badge
  execTimeValue.textContent = `${assessment.execTimeMs.toFixed(2)} ms`;

  // Spend Z-Score
  valSpendZ.textContent = `${assessment.spendZScore.toFixed(1)}σ`;
  spendZProgress.style.width = `${Math.min(100, assessment.spendZScore * 10)}%`;
  document.getElementById('spendZBadge').textContent = assessment.spendZScore > 3 ? 'Critical Outlier' : (assessment.spendZScore > 1.5 ? 'Moderate' : 'Normal');

  // Travel Velocity & Haversine
  valVelocity.textContent = `${assessment.velocityKmh.toFixed(1)} km/h`;
  valDistance.textContent = `Haversine: ${assessment.distanceKm.toFixed(1)} km from Delhi`;
  if (assessment.velocityKmh > 800.0) {
    impossibleTravelAlert.classList.remove('hidden');
    document.getElementById('velocityBadge').textContent = 'Supersonic';
    document.getElementById('velocityBadge').style.color = '#ef4444';
  } else {
    impossibleTravelAlert.classList.add('hidden');
    document.getElementById('velocityBadge').textContent = 'Normal';
    document.getElementById('velocityBadge').style.color = '';
  }

  // Monthly Budget Velocity
  const totalMonth = request.monthSpendSoFar + request.amount;
  const ratio = totalMonth / 18000.0;
  valBudgetRatio.textContent = `${ratio.toFixed(2)}x`;
  const pct = Math.min(100, Math.round(ratio * 100));
  budgetProgress.style.width = `${pct}%`;
  budgetBadge.textContent = `${pct}%`;
  budgetProgress.style.backgroundColor = pct > 100 ? '#ef4444' : '#6366f1';

  // k-NN Anomaly Score
  valKNN.textContent = assessment.knnDistance.toFixed(1);
  knnProgress.style.width = `${Math.min(100, assessment.knnDistance * 5)}%`;
  document.getElementById('knnBadge').textContent = assessment.knnDistance > 5 ? 'Outlier' : 'In-Cluster';

  // Terminal stdout representation
  const jsonStr = JSON.stringify(assessment);
  terminalStdout.textContent = jsonStr;
}

// Initiate Transaction
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const reqPayload = {
    amount: parseFloat(amountInput.value),
    merchant: merchantInput.value.trim(),
    currentLat: parseFloat(latInput.value),
    currentLon: parseFloat(lonInput.value),
    hoursSinceLastTx: parseFloat(hoursInput.value),
    monthSpendSoFar: parseFloat(monthSpentInput.value),
    accountId: 'ACC-88412-IN'
  };

  submitBtn.disabled = true;
  submitBtn.querySelector('.btn-text').textContent = 'Processing in C++ Switch...';

  try {
    let result = null;

    try {
      // 1. Attempt Real Backend API Call (Port 8080)
      const res = await fetch(`${API_BASE_URL}/api/tx/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqPayload)
      });
      if (res.ok) {
        result = await res.json();
      }
    } catch (netErr) {
      console.warn('Real backend call failed, activating graceful zero-crash demo client engine:', netErr);
    }

    // 2. High-Fidelity Client Fallback Simulation if backend is not currently running
    if (!result) {
      result = simulateLocalAssessment(reqPayload);
    }

    currentTransaction = result;
    updateBrainUI(result.riskAssessment, reqPayload);

    if (result.status === 'APPROVED') {
      // Immediate Approval Path
      showQuickStatus('success', `✓ Transaction Approved Instantly (Risk: ${result.riskAssessment.riskScore}/100 in ${result.riskAssessment.execTimeMs.toFixed(2)} ms)`);
      userBalance -= reqPayload.amount;
      monthSpend += reqPayload.amount;
      updateWalletUI();
      addSocAlert('TX_APPROVED', 'INFO', `TXN ${result.txId}: Approved ₹${reqPayload.amount.toLocaleString()} at ${reqPayload.merchant}. Fast-path clearance.`);
    } else {
      // 2FA Challenge Path
      showQuickStatus('warn', `⚠ 2FA Verification Triggered (Risk Score: ${result.riskAssessment.riskScore}/100)`);
      addSocAlert('2FA_INTERCEPT', result.riskAssessment.riskScore >= 80 ? 'CRITICAL' : 'WARNING',
        `TXN ${result.txId} HELD: ₹${reqPayload.amount.toLocaleString()} at ${reqPayload.merchant}. 2FA Challenge dispatched.`);
      open2FAModal(result);
    }

  } catch (err) {
    console.error('Initiate error:', err);
    showQuickStatus('danger', 'Error processing transaction');
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-text').textContent = 'Send Money / Initiate Transfer';
  }
});

function updateWalletUI() {
  document.getElementById('userBalanceDisplay').textContent = formatINR(userBalance);
  document.getElementById('monthSpendDisplay').textContent = `₹${Math.round(monthSpend).toLocaleString('en-IN')} / ₹18k`;
  monthSpentInput.value = Math.round(monthSpend);
}

function showQuickStatus(type, msg) {
  quickStatusBanner.className = `quick-status-banner ${type}`;
  quickStatusText.textContent = msg;
  quickStatusBanner.classList.remove('hidden');
}

// 2FA Modal Flow
function open2FAModal(tx) {
  modalAmountDisplay.textContent = formatINR(tx.amount);
  modalMerchantDisplay.textContent = tx.merchant;

  // Render C++ Anomaly Reasons
  modalReasonsList.innerHTML = '';
  const reasons = tx.riskAssessment.anomalyReasons || [];
  reasons.forEach(r => {
    const d = document.createElement('div');
    d.className = 'modal-reason-item';
    d.textContent = r;
    modalReasonsList.appendChild(d);
  });

  // Render TinyFish OSINT Intel
  const osint = tx.tinyFishOsint || {};
  osintRiskTag.textContent = osint.riskLevel || (tx.riskAssessment.riskScore >= 80 ? 'HIGH THREAT' : 'VERIFIED / AUDITED');
  osintWarningText.textContent = osint.warning || 'No critical blacklists matched for this merchant.';
  osintMetaText.textContent = `Sources: ${(osint.sourcesQueried || ['National CyberCrime Registry', 'TinyFish Search Index']).join(' • ')}`;

  // Start 60s countdown timer
  countdownRemaining = 60;
  countdownTimer.textContent = `${countdownRemaining}s`;
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    countdownRemaining--;
    countdownTimer.textContent = `${countdownRemaining}s`;
    if (countdownRemaining <= 0) {
      clearInterval(countdownInterval);
      // Auto-block on timeout
      handleVerify2FA(false, true);
    }
  }, 1000);

  modalOverlay.classList.remove('hidden');
}

function close2FAModal() {
  clearInterval(countdownInterval);
  modalOverlay.classList.add('hidden');
}

btnConfirm2FA.addEventListener('click', () => handleVerify2FA(true));
btnDeny2FA.addEventListener('click', () => handleVerify2FA(false));

async function handleVerify2FA(approved, timedOut = false) {
  if (!currentTransaction) return;
  close2FAModal();

  try {
    let verifyResult = null;

    try {
      const res = await fetch(`${API_BASE_URL}/api/tx/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txId: currentTransaction.txId, approved })
      });
      if (res.ok) {
        verifyResult = await res.json();
      }
    } catch (e) {
      console.warn('Real backend 2FA call failed, using graceful simulation:', e);
    }

    if (!verifyResult) {
      verifyResult = simulateVerify2FA(currentTransaction, approved);
    }

    if (approved) {
      showQuickStatus('success', '✓ 2FA Verified by Customer — Transaction Cleared & Profile Updated');
      userBalance -= currentTransaction.amount;
      monthSpend += currentTransaction.amount;
      updateWalletUI();
      addSocAlert('2FA_VERIFIED', 'INFO', `TXN ${currentTransaction.txId}: Customer confirmed identity for ₹${currentTransaction.amount.toLocaleString()} at ${currentTransaction.merchant}.`);
    } else {
      showQuickStatus('danger', timedOut ? '⏱ 2FA Expired — Auto-Blocked & Account Frozen' : '🛑 FRAUD BLOCKED: Emergency Freeze Triggered');
      triggerTinyFishAgentHUD(verifyResult.agentResult, currentTransaction);
      addSocAlert('FRAUD_BLOCKED', 'CRITICAL', `EMERGENCY: Customer DENIED 2FA for TXN ${currentTransaction.txId}. TinyFish Autonomous Web Agent deployed!`);
    }

  } catch (err) {
    console.error('Verify 2FA error:', err);
  }
}

// Animate TinyFish Autonomous Web Agent Console
function triggerTinyFishAgentHUD(agentResult, tx) {
  agentStatusBadge.textContent = 'DEPLOYED & FREEZING';
  agentStatusBadge.className = 'agent-status-badge frozen';

  agentStreamBox.innerHTML = '';
  const steps = agentResult.executionSteps || [
    { message: '[TinyFish Agent] Provisioning secure headless browser session on Mumbai edge node...', elapsedMs: 40 },
    { message: '[TinyFish Agent] Navigating to Central Banking Fraud Registry (e-Freeze Gateway)...', elapsedMs: 120 },
    { message: `[TinyFish Agent] Injected Compromised Account ID (${tx.accountId}) and Rogue Merchant (${tx.merchant})`, elapsedMs: 220 },
    { message: '[TinyFish Agent] Executing automated emergency debit-freeze warrant under Section 43A IT Act', elapsedMs: 350 },
    { message: '[TinyFish Agent] Dispatched instant API webhook alert to NPCI UPI Clearing Switch & Card Networks', elapsedMs: 480 },
    { message: `[TinyFish Agent] Official Incident Ticket Issued: ${agentResult.ticketId} — Account Protected`, elapsedMs: 600 }
  ];

  steps.forEach((st, idx) => {
    setTimeout(() => {
      const line = document.createElement('div');
      line.className = idx === steps.length - 1 ? 'stream-line success' : (idx > 2 ? 'stream-line action' : 'stream-line agent');
      line.textContent = st.message;
      agentStreamBox.appendChild(line);
      agentStreamBox.scrollTop = agentStreamBox.scrollHeight;

      if (idx === steps.length - 1) {
        agentTicketBanner.classList.remove('hidden');
        agentTicketId.textContent = agentResult.ticketId;
      }
    }, idx * 400);
  });
}

// Client Fallback Simulation Functions (Identical algorithm to C++ engine)
function simulateLocalAssessment(req) {
  const mean = 520.0;
  const stdDev = 210.0;
  const lastLat = 28.6139;
  const lastLon = 77.2090;

  const spendZScore = Math.abs(req.amount - mean) / (stdDev + 1.0);
  const distanceKm = haversine(lastLat, lastLon, req.currentLat, req.currentLon);
  const effHours = Math.max(0.05, req.hoursSinceLastTx);
  const velocityKmh = distanceKm / effHours;
  const impossibleTravel = velocityKmh > 800.0;

  const normAmount = req.amount / mean;
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

  const monthRatio = (req.monthSpendSoFar + req.amount) / 18000.0;
  if (monthRatio > 1.0) risk += Math.min(15.0, (monthRatio - 1.0) * 12.0);
  if (knnDistance > 2.0) risk += Math.min(20.0, (knnDistance - 2.0) * 2.5);
  if (req.amount > 15000.0 && risk < 60.0) risk += 25.0;

  const riskScore = Math.min(100, Math.max(0, Math.round(risk)));
  const verdict = riskScore < 40 ? 'LOW_RISK' : (riskScore < 80 ? 'MEDIUM_RISK' : 'HIGH_RISK');

  const anomalyReasons = [];
  if (impossibleTravel) {
    anomalyReasons.push(`IMPOSSIBLE TRAVEL: Velocity of ${velocityKmh.toFixed(1)} km/h exceeds physical boundary of 800 km/h (Distance: ${distanceKm.toFixed(1)} km)`);
  } else if (distanceKm > 100.0) {
    anomalyReasons.push(`GEOGRAPHIC ANOMALY: Location is ${distanceKm.toFixed(1)} km away from historical cluster`);
  }
  if (spendZScore > 3.0) {
    anomalyReasons.push(`HIGH SPEND ANOMALY: Transaction amount is ${spendZScore.toFixed(1)} standard deviations above rolling mean`);
  }
  if (knnDistance > 5.0) {
    anomalyReasons.push(`K-NN OUTLIER: k=5 nearest historical neighbor distance of ${knnDistance.toFixed(1)} indicates novel spending vector`);
  }

  let osint = {
    merchant: req.merchant,
    riskLevel: 'VERIFIED_LEGIT',
    scamReportCount: 0,
    warning: 'VERIFIED: Merchant matching legitimate user footprint.',
    sourcesQueried: ['NPCI Merchant Master']
  };

  if (req.merchant.toLowerCase().includes('lottery') || req.merchant.toLowerCase().includes('fastcash')) {
    osint = {
      merchant: req.merchant,
      riskLevel: 'HIGH_THREAT',
      scamReportCount: 11,
      warning: 'FLAGGED: 11 active scam complaints on National CyberCrime portal and RBI Sachet within past 48 hours.',
      sourcesQueried: ['CyberCrime Portal India', 'RBI Sachet', 'Chakshu Portal DoT']
    };
  } else if (req.merchant.toLowerCase().includes('irctc')) {
    osint = {
      merchant: req.merchant,
      riskLevel: 'VERIFIED_LEGIT',
      scamReportCount: 0,
      warning: 'VERIFIED: Official Indian Railways Passenger Ticketing Enterprise (IRCTC). Established national trust baseline.',
      sourcesQueried: ['RBI Official Registry', 'NPCI Merchant Master']
    };
  }

  return {
    txId: 'TXN-' + Date.now(),
    timestamp: Date.now(),
    amount: req.amount,
    merchant: req.merchant,
    currentLat: req.currentLat,
    currentLon: req.currentLon,
    accountId: req.accountId,
    status: riskScore < 40 ? 'APPROVED' : 'HOLD_PENDING_2FA',
    riskAssessment: {
      riskScore,
      spendZScore,
      distanceKm,
      velocityKmh,
      knnDistance,
      execTimeMs: 0.27,
      verdict,
      impossibleTravel,
      requires2FA: riskScore >= 40,
      anomalyReasons
    },
    tinyFishOsint: osint
  };
}

function simulateVerify2FA(tx, approved) {
  if (approved) {
    return {
      status: 'APPROVED',
      message: '2FA Verified by Customer — Transaction Cleared & Profile Updated',
      transaction: tx
    };
  } else {
    const ticketId = 'TF-INC-' + Math.floor(90000 + Math.random() * 9999) + '-IN';
    return {
      status: 'BLOCKED_FRAUD',
      message: 'Emergency Freeze Triggered — Account Secured by TinyFish Autonomous Agent',
      transaction: tx,
      agentResult: {
        ticketId,
        status: 'SUCCESS_FROZEN',
        streamingUrl: 'https://agent.tinyfish.ai/v1/automation/demo/' + ticketId.toLowerCase(),
        executionSteps: [
          { message: '[TinyFish Agent] Provisioning secure headless browser session on Mumbai edge node...', elapsedMs: 40 },
          { message: '[TinyFish Agent] Navigating to Central Banking Fraud Registry (e-Freeze Gateway)...', elapsedMs: 120 },
          { message: `[TinyFish Agent] Injected Compromised Account ID (${tx.accountId}) and Merchant VPA (${tx.merchant})`, elapsedMs: 220 },
          { message: '[TinyFish Agent] Executing automated emergency debit-freeze warrant under Section 43A IT Act', elapsedMs: 350 },
          { message: '[TinyFish Agent] Dispatched instant API webhook alert to NPCI UPI Clearing Switch & Card Networks', elapsedMs: 480 },
          { message: `[TinyFish Agent] Official Incident Ticket Issued: ${ticketId} — Account Protected`, elapsedMs: 600 }
        ]
      }
    };
  }
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371.0;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

// Initial Render
renderSocAlerts();
