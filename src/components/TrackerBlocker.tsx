/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrackerLog } from '../types';
import { 
  ShieldAlert, ShieldCheck, Play, Square, Activity, AlertTriangle, 
  Trash2, Globe, Wifi, WifiOff, RefreshCw, BarChart2, Flame
} from 'lucide-react';

interface TrackerBlockerProps {
  blockedLogs: TrackerLog[];
  onAddLog: (log: TrackerLog) => void;
  onClearLogs: () => void;
  triggerAuditLog: (title: string, category: 'identity' | 'passwords' | 'vault' | 'trackers', status: 'critical' | 'warning' | 'secured', message: string) => void;
}

export default function TrackerBlocker({ blockedLogs, onAddLog, onClearLogs, triggerAuditLog }: TrackerBlockerProps) {
  const [shieldActive, setShieldActive] = useState(true);
  const [blockingLevel, setBlockingLevel] = useState<'Standard' | 'Strict' | 'Isolation'>('Strict');
  const [liveBlockedCount, setLiveBlockedCount] = useState(blockedLogs.length);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Background random tracker simulation ticker
  useEffect(() => {
    if (shieldActive) {
      const domains = [
        'doubleclick.net', 'google-analytics.com', 'pixel.facebook.com', 
        'adnxs.com', 'mixpanel.com', 'fingerprintjs.com', 'hotjar.com', 
        'amplitude.com', 'tracking.tiktok.com', 'scorecardresearch.com',
        'criteo.com', 'taboola.com', 'optimizely.com', 'spyware-bounced.cn',
        'telemetry.evil-tracker.ru', 'outbrain.com', 'quantserve.com', 'coinhive.js'
      ];

      const categories: TrackerLog['category'][] = ['advertising', 'analytics', 'social', 'fingerprinting', 'malware'];
      const locations = ['USA (Oregon)', 'China (Shenzhen)', 'Ireland (Dublin)', 'Russia (Moscow)', 'Germany (Frankfurt)'];

      const runTick = () => {
        const selectedDomain = domains[Math.floor(Math.random() * domains.length)];
        const category = selectedDomain.includes('evil') || selectedDomain.includes('spyware') || selectedDomain.includes('hive')
          ? 'malware' 
          : categories[Math.floor(Math.random() * categories.length)];
        
        const riskScore = category === 'malware' ? Math.floor(Math.random() * 3) + 8
          : category === 'fingerprinting' ? Math.floor(Math.random() * 3) + 6
          : Math.floor(Math.random() * 5) + 2;

        const newLog: TrackerLog = {
          id: 'tracker-' + Date.now(),
          domain: selectedDomain,
          category,
          riskScore,
          timestamp: new Date().toLocaleTimeString(),
          action: blockingLevel === 'Isolation' ? 'intercepted' : 'blocked',
          location: locations[Math.floor(Math.random() * locations.length)]
        };

        onAddLog(newLog);
        setLiveBlockedCount(prev => prev + 1);
      };

      // Ticker interval adjusts based on severity of block level
      const tickSpeed = blockingLevel === 'Isolation' ? 3000 : blockingLevel === 'Strict' ? 4500 : 7000;
      intervalRef.current = setInterval(runTick, tickSpeed);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shieldActive, blockingLevel]);

  const handleToggleShield = () => {
    const nextVal = !shieldActive;
    setShieldActive(nextVal);
    triggerAuditLog(
      `Real-time Shield ${nextVal ? 'Engaged' : 'Suspended'}`,
      'trackers',
      nextVal ? 'secured' : 'critical',
      `Dynamic tracker protection and cookie intercept algorithms are ${nextVal ? 'active on ports 80/443' : 'suspended indefinitely. Exposure rate has spiked.'}`
    );
  };

  const handleLevelChange = (level: 'Standard' | 'Strict' | 'Isolation') => {
    setBlockingLevel(level);
    triggerAuditLog(
      `Blocking Level Adjusted`,
      'trackers',
      'secured',
      `Altered tracking blockade severity to [${level}]. Filtering heuristics are adjusted.`
    );
  };

  const getCategoryColor = (cat: TrackerLog['category']) => {
    switch (cat) {
      case 'malware': return 'text-red-500 bg-red-950/20 border-red-900/30';
      case 'fingerprinting': return 'text-orange-400 bg-orange-950/20 border-orange-900/30';
      case 'advertising': return 'text-blue-400 bg-blue-950/20 border-blue-900/30';
      case 'analytics': return 'text-sky-400 bg-sky-950/20 border-sky-900/30';
      case 'social': return 'text-fuchsia-400 bg-fuchsia-950/20 border-fuchsia-900/30';
    }
  };

  const getRiskIndicator = (score: number) => {
    if (score >= 8) return 'bg-red-500 shadow-[0_0_8px_#ef4444]';
    if (score >= 5) return 'bg-orange-500 shadow-[0_0_8px_#f97316]';
    return 'bg-blue-500';
  };

  return (
    <div className="space-y-6">
      
      {/* Interactive Main Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Shield Status Controller */}
        <div className="md:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-bl-full pointer-events-none" />
          
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-mono text-neutral-400 uppercase">CORE INTERCEPT SHIELD</p>
              <h3 className="text-lg font-bold text-white mt-1">REAL-TIME SANITIZER</h3>
            </div>
            
            <button
              onClick={handleToggleShield}
              className={`py-1.5 px-3 rounded-lg font-mono text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer ${
                shieldActive 
                  ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/40' 
                  : 'bg-red-950/30 text-red-400 border border-red-500/40'
              }`}
            >
              {shieldActive ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" /> SECURED ON
                </>
              ) : (
                <>
                  <ShieldAlert className="h-3.5 w-3.5" /> PAUSED
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-neutral-400 font-mono mt-4">
            {shieldActive 
              ? `Airgap active. Intercepting background connections on ${blockingLevel} parameters.` 
              : 'Network tunnels fully exposed. Hostile tracers can track coordinates.'}
          </p>

          <div className="mt-5 flex items-center justify-between border-t border-neutral-800/80 pt-3 text-[10px] font-mono">
            <span className="text-neutral-500">ENGINE: V4 SANDBOX SENSOR</span>
            <span className="text-blue-400 animate-pulse flex items-center gap-1">
              <Activity className="h-3 w-3" /> LISTENING LOGS
            </span>
          </div>
        </div>

        {/* Counter Blocked */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-mono text-neutral-400 uppercase text-fuchsia-400">Total Intercepts</p>
            <h4 className="text-3xl font-black text-white font-sans mt-2 tracking-tight group-hover:scale-105 transition-transform">
              {blockedLogs.length}
            </h4>
          </div>
          <p className="text-xs text-neutral-400 mt-3 font-mono">Scripts & tracking cookies scrubbed safely.</p>
        </div>

        {/* Blocking Severity Standard selectors */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-mono text-neutral-400 uppercase text-orange-400">Filtering Severity</p>
            <div className="mt-3 space-y-1.5">
              {(['Standard', 'Strict', 'Isolation'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => handleLevelChange(lvl)}
                  disabled={!shieldActive}
                  className={`w-full py-1 text-[10px] font-mono rounded border text-left px-2.5 flex items-center justify-between uppercase transition-all cursor-pointer ${
                    blockingLevel === lvl
                      ? 'bg-neutral-800 text-white border-orange-500'
                      : 'text-neutral-500 border-neutral-800 hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  <span>{lvl}</span>
                  {blockingLevel === lvl && <span className="h-1 w-1 bg-orange-500 rounded-full animate-ping" />}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Main logs screen */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col max-h-[500px]">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-white font-mono tracking-wider uppercase flex items-center gap-1.5">
            <Globe className="h-4.5 w-4.5 text-blue-400" /> Dynamic Protection Pipeline Logs
          </h3>

          <div className="flex gap-2">
            <button
              onClick={onClearLogs}
              disabled={blockedLogs.length === 0}
              className="py-1 px-2.5 text-[10px] border border-neutral-800 hover:border-red-900 text-neutral-500 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed rounded font-mono transition cursor-pointer"
            >
              Reset Shield Log
            </button>
          </div>
        </div>

        {/* Logs Table Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left font-mono text-xs">
            <thead className="sticky top-0 bg-neutral-900 text-[10px] text-neutral-500 border-b border-neutral-800 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 pl-4">Timestamp</th>
                <th className="py-2.5">Suspicious Host Domain</th>
                <th className="py-2.5">Category</th>
                <th className="py-2.5">Inbound Location</th>
                <th className="py-2.5 text-center">Threat Risk</th>
                <th className="py-2.5 text-right pr-4">Action Taken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-850/50">
              {blockedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-neutral-500 font-mono text-xs">
                    <div className="flex flex-col items-center gap-2">
                      <BarChart2 className="h-8 w-8 text-neutral-700 animate-pulse" />
                      <span>Security shield idling. Activate above to intercept tracker sockets.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                [...blockedLogs].reverse().map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-850/20 transition-all font-mono">
                    <td className="py-3 pl-4 text-neutral-500 text-[11px]">{log.timestamp}</td>
                    <td className="py-3 font-bold text-neutral-200">{log.domain}</td>
                    <td className="py-3">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wide ${getCategoryColor(log.category)}`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="py-3 text-neutral-400 text-[11px]">{log.location}</td>
                    <td className="py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${getRiskIndicator(log.riskScore)}`} />
                        <span className="font-sans font-bold text-neutral-300">{log.riskScore}/10</span>
                      </div>
                    </td>
                    <td className="py-3 text-right pr-4">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase bg-emerald-950/20 border border-emerald-900/30 px-1.5 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Live Protection Status Info at bottom */}
        <div className="p-3 bg-neutral-950/40 border-t border-neutral-800 text-[11px] font-mono text-neutral-400 flex flex-col md:flex-row items-center justify-between gap-2.5">
          <span className="flex items-center gap-1">
            <Flame className="h-4 w-4 text-orange-500 animate-pulse" /> Real-time heuristic AI scoring blocks zero-day trackers instantly.
          </span>
          <span className="text-neutral-500">Fingerprint Spoofing: ACTIVE</span>
        </div>

      </div>

    </div>
  );
}
