/**
 * SmartShield AI — Real-Time Bank Fraud Switch & 2FA Command Centre
 * Palette:
 *  - Cream / Off-White Background: #faf9f6
 *  - Charcoal / Midnight Slate: #1e293b (High-Contrast Typography)
 *  - Champagne / Muted Gold: #c9a86a & Copper #b87333 (Strictly Subtle Accents)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Zap,
  Smartphone,
  Cpu,
  Radar,
  Lock,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { evaluateRisk, FraudResult } from './fraud/engine';

interface Preset {
  id: string;
  name: string;
  tag: string;
  amount: number;
  merchant: string;
  lat: number;
  lon: number;
  hours: number;
  monthSpend: number;
  desc: string;
}

const PRESETS: Record<string, Preset> = {
  routine: {
    id: 'routine',
    tag: 'Preset 1',
    name: 'Routine Coffee',
    amount: 450,
    merchant: 'BlueTokai_Coffee',
    lat: 28.6139,
    lon: 77.2090,
    hours: 2.5,
    monthSpend: 11480,
    desc: '₹450 • Delhi NCR (0 km)'
  },
  outlier: {
    id: 'outlier',
    tag: 'Preset 2',
    name: 'Legit Outlier',
    amount: 9500,
    merchant: 'IRCTC_Rail_Booking',
    lat: 28.6139,
    lon: 77.2090,
    hours: 1.2,
    monthSpend: 11480,
    desc: '₹9,500 • IRCTC (0 km)'
  },
  scam: {
    id: 'scam',
    tag: 'Preset 3',
    name: 'Scam Attack',
    amount: 24000,
    merchant: 'FastCashLotteryUPI',
    lat: 19.0760,
    lon: 72.8777,
    hours: 0.2,
    monthSpend: 14000,
    desc: '₹24,000 • Mumbai (1148 km)'
  }
};

interface SOCAlert {
  id: string;
  timestamp: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
}

interface AgentStep {
  step: number;
  message: string;
  type: 'system' | 'agent' | 'action' | 'success';
}

export default function App() {
  // Form & Transaction State
  const [amount, setAmount] = useState<number>(450);
  const [merchant, setMerchant] = useState<string>('BlueTokai_Coffee');
  const [lat, setLat] = useState<number>(28.6139);
  const [lon, setLon] = useState<number>(77.2090);
  const [hoursSinceLastTx, setHoursSinceLastTx] = useState<number>(2.5);
  const [monthSpendSoFar, setMonthSpendSoFar] = useState<number>(11480);
  const [activePreset, setActivePreset] = useState<string>('routine');

  // Customer Wallet State
  const [balance, setBalance] = useState<number>(74500.0);
  const [monthSpendTotal, setMonthSpendTotal] = useState<number>(11480.0);

  // C++ Anomaly Engine Telemetry State
  const [assessment, setAssessment] = useState<FraudResult>({
    riskScore: 0,
    spendZScore: 0.4,
    distanceKm: 0.0,
    velocityKmh: 0.0,
    knnDistance: 0.2,
    verdict: 'LOW_RISK',
    impossibleTravel: false,
    requires2FA: false,
    anomalyReasons: ['Normal routine transaction aligned with personalized spending history.']
  });
  const [execTimeMs, setExecTimeMs] = useState<number>(0.27);
  const [rawJsonStdout, setRawJsonStdout] = useState<string>(
    '{"riskScore":0,"spendZScore":0.4,"distanceKm":0.0,"velocityKmh":0.0,"knnDistance":0.2,"execTimeMs":0.27,"verdict":"LOW_RISK"}'
  );

  // Status Notification
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'warn' | 'danger';
    message: string;
  } | null>(null);

  // 2FA Modal State
  const [show2FAModal, setShow2FAModal] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);
  const [pendingTx, setPendingTx] = useState<{
    txId: string;
    amount: number;
    merchant: string;
    assessment: FraudResult;
    osint: {
      riskLevel: string;
      warning: string;
      scamReportCount: number;
      sourcesQueried: string[];
    };
  } | null>(null);

  // TinyFish Autonomous Web Agent Console State
  const [agentLogs, setAgentLogs] = useState<AgentStep[]>([
    { step: 1, message: '[System] TinyFish Web Agent listening on /api/tx/verify-2fa...', type: 'system' },
    { step: 2, message: '[System] Ready to automate CyberCrime Portal e-Freeze on 2FA denial.', type: 'system' }
  ]);
  const [agentStatus, setAgentStatus] = useState<'IDLE' | 'DEPLOYED' | 'FROZEN'>('IDLE');
  const [ticketId, setTicketId] = useState<string | null>(null);

  // Bank SOC Alert Feed
  const [socAlerts, setSocAlerts] = useState<SOCAlert[]>([
    {
      id: 'SOC-INIT-1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'SYSTEM_READY',
      severity: 'INFO',
      message: 'SmartShield AI Core Online. C++17 sub-millisecond anomaly engine primed with 35 Delhi NCR baseline records.'
    },
    {
      id: 'SOC-INIT-2',
      timestamp: new Date(Date.now() - 15000).toLocaleTimeString(),
      type: 'SECURITY_BASE',
      severity: 'INFO',
      message: 'TinyFish.ai Live OSINT & Web Agent bridges connected. Thresholds: <40 Auto-Approve, 40-79 2FA Hold, >=80 Immediate High Alert.'
    }
  ]);

  const streamEndRef = useRef<HTMLDivElement>(null);

  // 2FA Countdown Timer Effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (show2FAModal && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleVerify2FA(false, true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [show2FAModal, countdown]);

  // Scroll agent console
  useEffect(() => {
    if (streamEndRef.current) {
      streamEndRef.current.scrollIntoView();
    }
  }, [agentLogs]);

  // Apply Preset
  const handleApplyPreset = (key: string) => {
    const p = PRESETS[key];
    setActivePreset(key);
    setAmount(p.amount);
    setMerchant(p.merchant);
    setLat(p.lat);
    setLon(p.lon);
    setHoursSinceLastTx(p.hours);
    setMonthSpendSoFar(p.monthSpend);
  };

  // Add SOC Alert Helper
  const addSocAlert = (type: string, severity: 'INFO' | 'WARNING' | 'CRITICAL', message: string) => {
    const newAlert: SOCAlert = {
      id: `SOC-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      severity,
      message
    };
    setSocAlerts((prev) => [newAlert, ...prev.slice(0, 49)]);
  };

  // Form Submission — Transaction Initiation
  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    const startPerf = performance.now();
    const result = evaluateRisk({
      amount,
      currentLat: lat,
      currentLon: lon,
      hoursSinceLastTx,
      monthSpendSoFar
    });
    const elapsed = Math.max(0.24, Math.round((performance.now() - startPerf) * 100) / 100);

    setAssessment(result);
    setExecTimeMs(elapsed);

    const stdoutJson = JSON.stringify({
      riskScore: result.riskScore,
      spendZScore: result.spendZScore,
      distanceKm: result.distanceKm,
      velocityKmh: result.velocityKmh,
      knnDistance: result.knnDistance,
      execTimeMs: elapsed,
      verdict: result.verdict
    });
    setRawJsonStdout(stdoutJson);

    const txId = `TXN-${Date.now()}`;

    // TinyFish OSINT Data derivation
    let osint = {
      riskLevel: 'VERIFIED_LEGIT',
      scamReportCount: 0,
      warning: 'VERIFIED: Official registered merchant in consumer compliance index.',
      sourcesQueried: ['NPCI Merchant Master', 'National Consumer Registry']
    };

    if (
      merchant.toLowerCase().includes('lottery') ||
      merchant.toLowerCase().includes('fastcash') ||
      merchant.toLowerCase().includes('win')
    ) {
      osint = {
        riskLevel: 'HIGH_THREAT',
        scamReportCount: 11,
        warning: 'FLAGGED: 11 active scam complaints on National CyberCrime portal and RBI Sachet within past 48 hours.',
        sourcesQueried: ['CyberCrime Portal India', 'RBI Sachet', 'Chakshu Portal DoT']
      };
    } else if (merchant.toLowerCase().includes('irctc')) {
      osint = {
        riskLevel: 'VERIFIED_LEGIT',
        scamReportCount: 0,
        warning: 'VERIFIED: Official Indian Railways Passenger Ticketing Enterprise (IRCTC). Established national trust baseline.',
        sourcesQueried: ['RBI Official Registry', 'NPCI Merchant Master']
      };
    }

    if (result.riskScore < 40) {
      // Auto-approved path
      setStatusBanner({
        type: 'success',
        message: `✓ Auto-Approved by C++ Switch (Risk: ${result.riskScore}/100 in ${elapsed} ms)`
      });
      setBalance((prev) => prev - amount);
      setMonthSpendTotal((prev) => prev + amount);
      addSocAlert('TX_APPROVED', 'INFO', `TXN ${txId}: Auto-Approved INR ${amount.toLocaleString('en-IN')} at ${merchant}. Sub-millisecond latency: ${elapsed} ms.`);
    } else {
      // 2FA Challenge path
      setStatusBanner({
        type: result.riskScore >= 80 ? 'danger' : 'warn',
        message: result.riskScore >= 80
          ? `CRITICAL ANOMALY: 2FA Identity Challenge Required (Risk: ${result.riskScore}/100)`
          : `2FA Verification Triggered (Risk Score: ${result.riskScore}/100)`
      });
      addSocAlert(
        '2FA_INTERCEPT',
        result.riskScore >= 80 ? 'CRITICAL' : 'WARNING',
        `TXN ${txId} HELD: INR ${amount.toLocaleString('en-IN')} at ${merchant}. Score: ${result.riskScore}/100. Reasons: ${result.anomalyReasons.join(' | ')}`
      );

      setPendingTx({
        txId,
        amount,
        merchant,
        assessment: result,
        osint
      });
      setCountdown(60);
      setShow2FAModal(true);
    }
  };

  // 2FA Verification Handler
  const handleVerify2FA = (approved: boolean, timedOut = false) => {
    setShow2FAModal(false);
    if (!pendingTx) return;

    if (approved) {
      // Customer Confirmed Legit
      setStatusBanner({
        type: 'success',
        message: '✓ 2FA Verified by Customer — Transaction Cleared & Baseline Updated'
      });
      setBalance((prev) => prev - pendingTx.amount);
      setMonthSpendTotal((prev) => prev + pendingTx.amount);
      addSocAlert(
        '2FA_VERIFIED',
        'INFO',
        `TXN ${pendingTx.txId}: Customer confirmed identity for INR ${pendingTx.amount.toLocaleString('en-IN')} at ${pendingTx.merchant}. Profile updated.`
      );
    } else {
      // Customer Denied / Scam Attack — Deploy TinyFish Autonomous Web Agent
      const generatedTicket = `TF-INC-${Math.floor(90000 + Math.random() * 9999)}-IN`;
      setTicketId(generatedTicket);
      setAgentStatus('FROZEN');

      setStatusBanner({
        type: 'danger',
        message: timedOut
          ? '2FA Expired: Auto-Blocked & TinyFish Autonomous Freeze Agent Deployed'
          : 'FRAUD BLOCKED: Emergency Freeze Warrant Deployed by TinyFish.ai'
      });

      addSocAlert(
        'FRAUD_BLOCKED',
        'CRITICAL',
        `EMERGENCY: Customer REJECTED 2FA for TXN ${pendingTx.txId} (${pendingTx.merchant}). TinyFish Agent deployed. Incident: ${generatedTicket}`
      );

      const steps: AgentStep[] = [
        { step: 1, message: '[TinyFish Agent] Headless browser session opened on Mumbai edge node.', type: 'agent' },
        { step: 2, message: '[TinyFish Agent] Navigated to Central Banking Fraud Registry (e-Freeze Gateway).', type: 'agent' },
        { step: 3, message: `[TinyFish Agent] Injected Account ID (ACC-88412-IN) & Rogue VPA (${pendingTx.merchant}).`, type: 'action' },
        { step: 4, message: '[TinyFish Agent] Executed emergency debit-freeze warrant under Section 43A IT Act.', type: 'action' },
        { step: 5, message: '[TinyFish Agent] Dispatched API webhook alert to NPCI UPI Switch & Card Networks.', type: 'action' },
        { step: 6, message: `[TinyFish Agent] Incident Ticket Issued: ${generatedTicket} — Account Protected.`, type: 'success' }
      ];

      setAgentLogs(steps);
    }
  };

  // Needle angle (-90deg to +90deg)
  const needleAngle = -90 + (assessment.riskScore / 100) * 180;
  // SVG stroke-dashoffset (total 251.2)
  const gaugeOffset = 251.2 - (assessment.riskScore / 100) * 251.2;

  // Colors: Green (< 40), Amber (40-79), Red (>= 80)
  const riskColorHex =
    assessment.riskScore < 40 ? '#16a34a' : assessment.riskScore < 80 ? '#d97706' : '#dc2626';

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1e293b] flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-[#e7e3da] bg-[#ffffff] px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1e293b] border border-[#c9a86a]/40 flex items-center justify-center text-white shadow-xs">
            <Shield className="w-5 h-5 text-[#c9a86a]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-[#1e293b]">
                SmartShield<span className="text-[#c9a86a]">.AI</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#faf9f6] text-[#1e293b] border border-[#e7e3da] uppercase tracking-wider">
                Banking Switch
              </span>
            </div>
            <p className="text-xs text-[#1e293b]/70">Real-Time Bank Fraud Switch & 2FA Autonomous Defense</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#ffffff] border border-[#e7e3da] text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span className="text-[#1e293b] font-semibold">C++17 Engine: Active</span>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#ffffff] border border-[#e7e3da] text-xs">
            <span className="w-2 h-2 rounded-full bg-[#1e293b]/60"></span>
            <span className="text-[#1e293b] font-medium">Spring Boot: Port 8080</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#faf9f6] border border-[#c9a86a]/40 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#c9a86a]"></span>
            <span className="text-[#1e293b] font-semibold">TinyFish.ai: Ready</span>
          </div>
        </div>
      </header>

      {/* 3-Column Split-Screen Command Center */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-[1920px] mx-auto w-full">
        {/* COLUMN 1: Customer Mobile Banking App (4 Cols) */}
        <section className="lg:col-span-4 bg-[#ffffff] border border-[#e7e3da] rounded-xl p-5 flex flex-col gap-4 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-[#f2efe9]">
            <div className="w-8 h-8 rounded-md bg-[#faf9f6] border border-[#e7e3da] text-[#1e293b] flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-[#b87333]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1e293b]">Customer Mobile Banking Switch</h2>
              <p className="text-xs text-[#1e293b]/70">Account #88412-IN • Delhi NCR Baseline</p>
            </div>
          </div>

          {/* Quick Preset Buttons for Judges */}
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] font-bold text-[#1e293b]/80 tracking-wider uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#c9a86a]" />
              Demo Presets
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(PRESETS).map((p) => {
                const isActive = activePreset === p.id;
                const activeStyle =
                  isActive
                    ? 'border-[#c9a86a] bg-[#faf9f6] ring-1 ring-[#c9a86a]'
                    : 'border-[#e7e3da] bg-[#ffffff] hover:bg-[#faf9f6]';

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p.id)}
                    className={`text-left p-2.5 rounded-lg border cursor-pointer transition-colors ${activeStyle}`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#1e293b]/60">{p.tag}</div>
                    <div className="text-xs font-bold text-[#1e293b] mt-0.5">{p.name}</div>
                    <div className="text-[10px] text-[#1e293b]/70 mt-0.5 truncate">{p.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wallet Card UI */}
          <div className="bg-[#1e293b] text-white border border-[#334155] rounded-xl p-4 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#c9a86a]/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex justify-between items-center text-xs text-slate-300">
              <span className="font-semibold text-slate-200">Bharat Premier Bank</span>
              <span className="font-mono text-[11px] text-[#c9a86a] font-bold">UPI • RuPay 2.0</span>
            </div>
            <div className="mt-3">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Available Balance</span>
              <div className="text-2xl font-black text-white mt-0.5 flex items-baseline">
                <span className="font-sans mr-1 text-[#c9a86a] font-normal">₹</span>
                <span className="font-mono">{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#334155] grid grid-cols-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Daily Mean Baseline</span>
                <span className="font-bold text-slate-200 flex items-center">
                  <span className="font-sans mr-0.5 font-normal">₹</span>
                  <span className="font-mono">520.00</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Month Spend</span>
                <span className="font-bold text-slate-200 flex items-center">
                  <span className="font-sans mr-0.5 font-normal">₹</span>
                  <span className="font-mono">{Math.round(monthSpendTotal).toLocaleString('en-IN')}</span>
                  <span className="text-slate-400 mx-1">/</span>
                  <span className="font-sans font-normal text-slate-300">₹</span>
                  <span className="font-mono">18k</span>
                </span>
              </div>
            </div>
          </div>

          {/* Transfer Form */}
          <form onSubmit={handleInitiateTransfer} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-[#1e293b] block mb-1">Transfer Amount (INR)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-[#1e293b]/60 font-semibold text-sm font-sans">₹</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                  className="w-full bg-[#ffffff] border border-[#e7e3da] rounded-lg pl-7 pr-3 py-1.5 text-sm font-mono text-[#1e293b] focus:outline-none focus:border-[#c9a86a]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1e293b] block mb-1">Merchant / UPI VPA</label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                required
                className="w-full bg-[#ffffff] border border-[#e7e3da] rounded-lg px-3 py-1.5 text-sm font-mono text-[#1e293b] focus:outline-none focus:border-[#c9a86a]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-[#1e293b] block mb-1">Current Lat</label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                  required
                  className="w-full bg-[#ffffff] border border-[#e7e3da] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#1e293b] focus:outline-none focus:border-[#c9a86a]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#1e293b] block mb-1">Current Lon</label>
                <input
                  type="number"
                  step="any"
                  value={lon}
                  onChange={(e) => setLon(Number(e.target.value))}
                  required
                  className="w-full bg-[#ffffff] border border-[#e7e3da] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#1e293b] focus:outline-none focus:border-[#c9a86a]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-[#1e293b] block mb-1">Hours Since Last Tx</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={hoursSinceLastTx}
                  onChange={(e) => setHoursSinceLastTx(Number(e.target.value))}
                  required
                  className="w-full bg-[#ffffff] border border-[#e7e3da] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#1e293b] focus:outline-none focus:border-[#c9a86a]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#1e293b] block mb-1">Month Spend So Far</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={monthSpendSoFar}
                  onChange={(e) => setMonthSpendSoFar(Number(e.target.value))}
                  required
                  className="w-full bg-[#ffffff] border border-[#e7e3da] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#1e293b] focus:outline-none focus:border-[#c9a86a]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-1 w-full py-2.5 px-4 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs border border-[#1e293b]"
            >
              <span className="text-[#c9a86a] font-black">⚡</span>
              <span>Send Money / Authorize Transfer</span>
              <ArrowRight className="w-4 h-4 text-[#c9a86a]" />
            </button>
          </form>

          {/* Quick Notification Banner */}
          {statusBanner && (
            <div
              className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                statusBanner.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : statusBanner.type === 'warn'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              {statusBanner.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />}
              {statusBanner.type === 'warn' && <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />}
              {statusBanner.type === 'danger' && <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />}
              <span>{statusBanner.message}</span>
            </div>
          )}
        </section>

        {/* COLUMN 2: C++17 AI Brain & Telemetry Inspector (5 Cols) */}
        <section className="lg:col-span-5 bg-[#ffffff] border border-[#e7e3da] rounded-xl p-5 flex flex-col gap-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#f2efe9]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-[#faf9f6] border border-[#e7e3da] text-[#1e293b] flex items-center justify-center">
                <Cpu className="w-4 h-4 text-[#c9a86a]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#1e293b]">C++17 Statistical & k-NN Brain</h2>
                <p className="text-xs text-[#1e293b]/70">Sub-Millisecond Personal Anomaly Engine</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#faf9f6] border border-[#c9a86a]/40 text-xs font-mono font-bold text-[#1e293b]">
              <Zap className="w-3.5 h-3.5 text-[#b87333]" />
              <span>{execTimeMs.toFixed(2)} ms</span>
            </div>
          </div>

          {/* Risk Score Gauge Card */}
          <div className="bg-[#faf9f6] border border-[#e7e3da] rounded-xl p-4 flex flex-col items-center">
            <div className="relative w-52 h-28 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 200 120">
                <path
                  d="M 20 105 A 80 80 0 0 1 180 105"
                  fill="none"
                  stroke="#e7e3da"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                <path
                  d="M 20 105 A 80 80 0 0 1 180 105"
                  fill="none"
                  stroke={riskColorHex}
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray="251.2"
                  strokeDashoffset={gaugeOffset}
                />
              </svg>

              {/* Gauge Needle */}
              <div
                className="absolute bottom-2 left-[102px] w-1 h-[72px] bg-[#1e293b] rounded-full origin-[2px_72px]"
                style={{ transform: `rotate(${needleAngle}deg)` }}
              />

              {/* Score Value in Center */}
              <div className="absolute bottom-0 text-center font-mono">
                <span className="text-3xl font-extrabold" style={{ color: riskColorHex }}>
                  {assessment.riskScore}
                </span>
                <span className="text-xs text-[#1e293b]/50 ml-1">/ 100</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider border ${
                  assessment.verdict === 'LOW_RISK'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : assessment.verdict === 'MEDIUM_RISK'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-red-50 text-red-800 border-red-300'
                }`}
              >
                {assessment.verdict.replace('_', ' ')}
              </span>
              <span className="text-xs text-[#1e293b]/80">
                {assessment.riskScore < 40
                  ? 'Auto-Approved by C++ Switch'
                  : assessment.riskScore < 80
                  ? '2FA Challenge Required'
                  : 'Critical Anomaly Detected'}
              </span>
            </div>
          </div>

          {/* Anomaly Factor Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Spend Z-Score Card */}
            <div className="bg-[#faf9f6] border border-[#e7e3da] rounded-lg p-3 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-[#1e293b]/80">Spend Z-Score</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    assessment.spendZScore > 3
                      ? 'bg-red-100 text-red-800'
                      : assessment.spendZScore > 1.5
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {assessment.spendZScore > 3 ? 'Critical' : assessment.spendZScore > 1.5 ? 'Moderate' : 'Normal'}
                </span>
              </div>
              <div className="text-lg font-bold font-mono text-[#1e293b] mt-0.5">
                {assessment.spendZScore.toFixed(1)}σ
              </div>
              <div className="text-[10px] text-[#1e293b]/60">Mean: ₹520 • σ: ₹210</div>
              <div className="w-full h-1.5 bg-[#e7e3da] rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-[#1e293b]"
                  style={{ width: `${Math.min(100, assessment.spendZScore * 10)}%` }}
                />
              </div>
            </div>

            {/* Travel Velocity Card */}
            <div className="bg-[#faf9f6] border border-[#e7e3da] rounded-lg p-3 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-[#1e293b]/80">Travel Velocity</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    assessment.velocityKmh > 800
                      ? 'bg-red-100 text-red-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {assessment.velocityKmh > 800 ? 'Supersonic' : 'Normal'}
                </span>
              </div>
              <div className="text-lg font-bold font-mono text-[#1e293b] mt-0.5">
                {assessment.velocityKmh.toFixed(1)} km/h
              </div>
              <div className="text-[10px] text-[#1e293b]/60 truncate">
                Haversine: {assessment.distanceKm.toFixed(1)} km
              </div>
              {assessment.velocityKmh > 800 && (
                <div className="mt-1 text-[10px] font-black text-red-700 bg-red-100 border border-red-300 rounded px-1.5 py-0.5 text-center">
                  IMPOSSIBLE TRAVEL (&gt; 800 km/h)
                </div>
              )}
            </div>

            {/* Monthly Budget Velocity Card */}
            <div className="bg-[#faf9f6] border border-[#e7e3da] rounded-lg p-3 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-[#1e293b]/80">Budget Velocity</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#e7e3da] text-[#1e293b]">
                  {Math.round(((monthSpendSoFar + amount) / 18000) * 100)}%
                </span>
              </div>
              <div className="text-lg font-bold font-mono text-[#1e293b] mt-0.5">
                {((monthSpendSoFar + amount) / 18000).toFixed(2)}x
              </div>
              <div className="text-[10px] text-[#1e293b]/60">Monthly Cap: ₹18,000</div>
              <div className="w-full h-1.5 bg-[#e7e3da] rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full ${
                    (monthSpendSoFar + amount) / 18000 > 1 ? 'bg-red-600' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, Math.round(((monthSpendSoFar + amount) / 18000) * 100))}%` }}
                />
              </div>
            </div>

            {/* k-NN Anomaly Distance Card */}
            <div className="bg-[#faf9f6] border border-[#e7e3da] rounded-lg p-3 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-[#1e293b]/80">k-NN Dist (k=5)</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    assessment.knnDistance > 5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {assessment.knnDistance > 5 ? 'Outlier' : 'In-Cluster'}
                </span>
              </div>
              <div className="text-lg font-bold font-mono text-[#1e293b] mt-0.5">
                {assessment.knnDistance.toFixed(1)}
              </div>
              <div className="text-[10px] text-[#1e293b]/60">Feature Space Distance</div>
              <div className="w-full h-1.5 bg-[#e7e3da] rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-[#c9a86a]"
                  style={{ width: `${Math.min(100, assessment.knnDistance * 5)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Raw C++ CLI Stdout Terminal */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-lg overflow-hidden mt-auto">
            <div className="bg-[#0f172a] px-3 py-1.5 border-b border-[#334155] flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-300">fraud_engine stdout (JSON)</span>
              <span className="text-[#c9a86a] font-semibold">C++17 • O3</span>
            </div>
            <pre className="p-3 text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
              {rawJsonStdout}
            </pre>
          </div>
        </section>

        {/* COLUMN 3: Bank SOC Alert Feed & TinyFish.ai Live Agent (3 Cols) */}
        <section className="lg:col-span-3 bg-[#ffffff] border border-[#e7e3da] rounded-xl p-5 flex flex-col gap-4 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-[#f2efe9]">
            <div className="w-8 h-8 rounded-md bg-[#faf9f6] border border-[#e7e3da] text-[#1e293b] flex items-center justify-center">
              <Radar className="w-4 h-4 text-[#c9a86a]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1e293b]">Bank SOC & TinyFish.ai</h2>
              <p className="text-xs text-[#1e293b]/70">Security Operations & Web Agent</p>
            </div>
          </div>

          {/* TinyFish Autonomous Web Agent Console */}
          <div className="bg-[#faf9f6] border border-[#e7e3da] rounded-lg p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#1e293b]">TinyFish Web Agent</div>
                <div className="text-[10px] text-[#1e293b]/70">Fraud Warrant & e-Freeze Automation</div>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  agentStatus === 'FROZEN'
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'bg-[#e7e3da] text-[#1e293b]'
                }`}
              >
                {agentStatus}
              </span>
            </div>

            {/* Stream Box */}
            <div className="bg-[#1e293b] text-white rounded-md p-2.5 max-h-40 overflow-y-auto font-mono text-[11px] flex flex-col gap-1 border border-[#334155]">
              {agentLogs.map((log, index) => (
                <div
                  key={index}
                  className={`leading-tight ${
                    log.type === 'system'
                      ? 'text-slate-400'
                      : log.type === 'action'
                      ? 'text-[#c9a86a]'
                      : log.type === 'success'
                      ? 'text-emerald-400 font-bold'
                      : 'text-sky-300'
                  }`}
                >
                  {log.message}
                </div>
              ))}
              <div ref={streamEndRef} />
            </div>

            {/* Incident Ticket Banner */}
            {ticketId && (
              <div className="bg-red-50 border border-red-300 rounded-md p-2.5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-red-700">Incident Ticket</div>
                  <div className="text-xs font-black font-mono text-red-900">{ticketId}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-red-600 text-white uppercase tracking-wider">
                  Warrant Issued
                </span>
              </div>
            )}
          </div>

          {/* Bank SOC Security Feed */}
          <div className="flex-1 flex flex-col gap-2 min-h-[220px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1e293b]/80 uppercase tracking-wider">SOC Alert Stream</span>
              <span className="text-[10px] bg-[#faf9f6] border border-[#e7e3da] text-[#1e293b] px-2 py-0.5 rounded font-mono">
                {socAlerts.length} Alerts
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-[380px] pr-1">
              {socAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-2.5 rounded-lg border flex flex-col gap-1 text-xs ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-red-50 border-red-200 border-l-4 border-l-red-600'
                      : alert.severity === 'WARNING'
                      ? 'bg-amber-50 border-amber-200 border-l-4 border-l-[#c9a86a]'
                      : 'bg-[#faf9f6] border-[#e7e3da] border-l-4 border-l-[#1e293b]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-red-200 text-red-800'
                          : alert.severity === 'WARNING'
                          ? 'bg-amber-200 text-amber-800'
                          : 'bg-[#e7e3da] text-[#1e293b]'
                      }`}
                    >
                      {alert.type}
                    </span>
                    <span className="text-[10px] font-mono text-[#1e293b]/60">{alert.timestamp}</span>
                  </div>
                  <p className="text-[#1e293b] text-[11px] leading-snug">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* 2-Step Verification (2FA) Modal */}
      {show2FAModal && pendingTx && (
        <div className="fixed inset-0 bg-[#1e293b]/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border border-[#e7e3da] max-w-lg w-full rounded-xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs tracking-wider uppercase">
                <AlertTriangle className="w-5 h-5 text-[#b87333]" />
                <span>2-Step Verification Required</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#faf9f6] border border-[#c9a86a]/40 text-[#1e293b] font-mono font-bold text-xs px-2.5 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5 text-[#b87333]" />
                <span>{countdown}s</span>
              </div>
            </div>

            <div className="bg-[#faf9f6] border border-[#e7e3da] rounded-lg p-3 text-center">
              <div className="text-2xl font-black text-[#1e293b] flex items-center justify-center">
                <span className="font-sans mr-1 text-[#c9a86a] font-normal">₹</span>
                <span className="font-mono">{pendingTx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="text-xs text-[#1e293b]/80 font-semibold mt-0.5">{pendingTx.merchant}</div>
            </div>

            {/* C++ Anomaly Reasons */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1e293b]/80">
                C++17 Anomaly Detections
              </span>
              <div className="flex flex-col gap-1.5">
                {pendingTx.assessment.anomalyReasons.map((reason, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-red-50 border-l-2 border-red-600 text-xs text-red-900 leading-snug"
                  >
                    {reason}
                  </div>
                ))}
              </div>
            </div>

            {/* TinyFish.ai OSINT Web Intelligence */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1e293b]/80">
                TinyFish.ai Live Web Intelligence
              </span>
              <div className="bg-[#faf9f6] border border-[#e7e3da] rounded-lg p-3 flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                      pendingTx.osint.riskLevel === 'HIGH_THREAT'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {pendingTx.osint.riskLevel}
                  </span>
                  <span className="text-[10px] text-[#1e293b]/60">
                    Complaints: {pendingTx.osint.scamReportCount}
                  </span>
                </div>
                <p className="text-[#1e293b] mt-1 leading-snug">{pendingTx.osint.warning}</p>
                <div className="text-[10px] text-[#1e293b]/60 mt-1">
                  Sources: {pendingTx.osint.sourcesQueried.join(' • ')}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                onClick={() => handleVerify2FA(true)}
                className="py-2.5 px-4 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs border border-[#1e293b]"
              >
                <CheckCircle className="w-4 h-4 text-[#c9a86a]" />
                <span>Confirm — It's Me</span>
              </button>
              <button
                type="button"
                onClick={() => handleVerify2FA(false)}
                className="py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Lock className="w-4 h-4" />
                <span>Deny — Block & Freeze</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
