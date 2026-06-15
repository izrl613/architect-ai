/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react';
import { 
  IdentityModule, PasswordEntry, EncryptedMessage, VaultItem, TrackerLog, AuditLog 
} from './types';
import { INITIAL_IDENTITY_MODULES } from './data/modules';
import { useModuleTelemetry } from './hooks/useModuleTelemetry';
import { generateSovereignReport } from './utils/pdfGenerator';
import { useUIDesign } from './UIDesignContext';

// Import components
import BiometricLock from './components/BiometricLock';
import IdentityModulesPanel from './components/IdentityModulesPanel';
import PasswordManager from './components/PasswordManager';
import EncryptedMessenger from './components/EncryptedMessenger';
import TrackerBlocker from './components/TrackerBlocker';
import DocumentVault from './components/DocumentVault';

import { 
  Shield, ShieldCheck, ShieldAlert, Cpu, KeyRound, Lock, Unlock, 
  MessageSquare, HardDrive, Wifi, WifiOff, Scan, RefreshCw, 
  Settings, HelpCircle, Activity, ChevronRight, AlertTriangle, Play,
  User, CheckCircle2, CloudLightning, FileText, Trash2, ShieldX, LogIn, LayoutGrid as LayoutGridIcon, Cloud
} from 'lucide-react';

export default function App() {
  const { currentDesign, toggleDesign } = useUIDesign();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentTimeUTC = time.toISOString().substring(11, 19);

  // Authentication / Lock State
  const [isLocked, setIsLocked] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string; method: string; score: number } | null>(null);

  // Connection State (Simulated Offline Airgap Network Enclave)
  const [isOffline, setIsOffline] = useState(false);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'identities' | 'passwords' | 'vault' | 'messenger' | 'trackers' | 'ai'>('dashboard');

  // Core Databases
  const [modules, setModules] = useState<IdentityModule[]>([]);
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [messages, setMessages] = useState<EncryptedMessage[]>([]);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [blockedTrackers, setBlockedTrackers] = useState<TrackerLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Interactive AI Counselor state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLogs, setAiLogs] = useState<Array<{ sender: 'user' | 'architect', text: string; timestamp: string }>>([
    {
      sender: 'architect',
      text: 'Architect AI Counselor online. Real-world database connected for idin@agape.nyc. Ready to analyze historical exposure, sanitization algorithms, or configure hardware enclaves.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  // Auditing Diagnostic and Scanner state
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
  const [diagnosticMessage, setDiagnosticMessage] = useState('');
  const [systemSuggestions, setSystemSuggestions] = useState<string[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  // Scheduling for automated security scans
  const [scanInterval, setScanInterval] = useState<number | null>(null); // minutes
  const scanTimerRef = useRef<number | null>(null);

  // Real-world breach exposure state & simulation variables
  const [breachStatus, setBreachStatus] = useState<'exposed' | 'nuked'>('exposed');
  const [cloudSync, setCloudSync] = useState<{status:'success'|'warning'|'error', timestamp:string}>({status:'success', timestamp:new Date().toISOString()});
  // Backup toast state
  const [showBackupToast, setShowBackupToast] = useState(false);

  // Module Telemetry Tracking
  useModuleTelemetry(activeTab);

  // Check backup age on mount / status change
  useEffect(() => {
    if (cloudSync.timestamp) {
      const last = new Date(cloudSync.timestamp);
      const now = new Date();
      const diffMs = now - last;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > 7) {
        setShowBackupToast(true);
      } else {
        setShowBackupToast(false);
      }
    }
  }, [cloudSync.timestamp]);
  // Idle auto-lock timer (10 minutes inactivity)
  const idleTimeoutRef = useRef<number | null>(null);

  const idleDelay = 10 * 60 * 1000; // 10 minutes in ms

  const resetIdleTimer = () => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    idleTimeoutRef.current = setTimeout(() => {
      setIsLocked(true);
      triggerAuditLog(
        'Idle Lock Activated',
        'identity',
        'warning',
        'Application auto-locked after 10 minutes of inactivity.'
      );
    }, idleDelay);
  };

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'];
    const handler = () => resetIdleTimer();
    events.forEach(ev => window.addEventListener(ev, handler));
    // Start the timer initially
    resetIdleTimer();
    return () => {
      events.forEach(ev => window.removeEventListener(ev, handler));
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, []);

  // Automated scan scheduler
  useEffect(() => {
    // Clear any existing timer
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
    }
    if (scanInterval && scanInterval > 0) {
      // Set interval in milliseconds
      const intervalMs = scanInterval * 60 * 1000;
      scanTimerRef.current = setInterval(() => {
        // Avoid overlapping diagnostics
        if (!isDiagnosticRunning) {
          handleRunDiagnostic();
        }
      }, intervalMs);
    }
    // Cleanup on unmount or interval change
    return () => {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
    };
  }, [scanInterval, isDiagnosticRunning]);

  // Perform immediate backup action
  const handleBackupNow = () => {
    // Simulate backup operation and update state
    setCloudSync({status:'success', timestamp:new Date().toISOString()});
    setShowBackupToast(false);
    // Optionally persist to localStorage
    localStorage.setItem('aegis_cloud_sync', JSON.stringify({status:'success', timestamp:new Date().toISOString()}));
  };

  // Generate downloadable security report
  const handleDownloadReport = async () => {
    try {
      await generateSovereignReport(
        currentUser?.name || 'Israel David',
        displayScore,
        activeModulesCount,
        blockedTrackers.length
      );
      triggerAuditLog(
        'Sovereign Report Generated',
        'identity',
        'secured',
        'Sovereign Identity Trust Report exported successfully.'
      );
    } catch (err) {
      console.error('Failed to generate report:', err);
    }
  };

  const handleKnoxAllSovereign = () => {
    setStats(prev => ({ ...prev, knoxed: prev.knoxed + 16 }));
    triggerAuditLog(
      'Knox All Triggered',
      'identity',
      'secured',
      'All security matrices locked down to Knox level 100.'
    );
  };

  const [nukeProgress, setNukeProgress] = useState(0);
  const [isNuking, setIsNuking] = useState(false);
  const [stats, setStats] = useState({ nuked: 1, knoxed: 0, monitored: 1 });

  // Load state from on-device local storage on mount
  useEffect(() => {
    // 1. Modules
    const localModules = localStorage.getItem('aegis_modules');
    if (localModules) {
      setModules(JSON.parse(localModules));
    } else {
      setModules(INITIAL_IDENTITY_MODULES);
    }

    // 2. Passwords
    const localPasswords = localStorage.getItem('aegis_passwords');
    if (localPasswords) {
      setPasswords(JSON.parse(localPasswords));
    } else {
      const seedPasswords: PasswordEntry[] = [
        {
          id: 'seed-1',
          service: 'Stripe Corporate Live Access',
          username: 'billing@aegis-shield.com',
          passwordCipher: 'Ym9mdXMtNzg5MDE=', 
          strength: 'strong',
          url: 'https://dashboard.stripe.com',
          notes: 'Secondary backup secret key: rk_live_8910s',
          category: 'Finance',
          updatedAt: '2026-06-01'
        },
        {
          id: 'seed-2',
          service: 'AWS Root Enclave Cloud',
          username: 'aws-admin@aegis-core',
          passwordCipher: 'bWluaW11bS1wYXNzcGhyYXNl', 
          strength: 'weak',
          url: 'https://console.aws.amazon.com',
          notes: 'MFA enabled via TOTP hardware key (ID-15). Critical access nodes.',
          category: 'Server/Dev',
          updatedAt: '2026-06-05'
        }
      ];
      setPasswords(seedPasswords);
    }

    // 3. Messages
    const localMessages = localStorage.getItem('aegis_messages');
    if (localMessages) {
      setMessages(JSON.parse(localMessages));
    } else {
      setMessages([]);
    }

    // 4. Vault Items
    const localVault = localStorage.getItem('aegis_vault');
    if (localVault) {
      setVaultItems(JSON.parse(localVault));
    } else {
      const seedVault: VaultItem[] = [
        {
          id: 'vault-seed-1',
          name: 'Litigation Escrow Defense Strategy.txt',
          type: 'document',
          fileSize: '4.8 KB',
          category: 'legal',
          dataUrl: 'ZG9jdW1lbnQtY29udGVudC1zaGllbGQtMTI=', 
          encryptedAt: '2026-06-05'
        }
      ];
      setVaultItems(seedVault);
    }

    // 5. Trackers
    const localTrackers = localStorage.getItem('aegis_trackers');
    if (localTrackers) {
      setBlockedTrackers(JSON.parse(localTrackers));
    } else {
      setBlockedTrackers([]);
    }

    // 6. Audit Logs
    const localAudits = localStorage.getItem('aegis_audits');
    if (localAudits) {
      setAuditLogs(JSON.parse(localAudits));
    } else {
      const initialLogs: AuditLog[] = [
        {
          id: 'aud-0',
          title: 'Enclave Core Synchronized',
          status: 'secured',
          category: 'identity',
          message: 'Bootstrap initialization completed. 16 virtual identity sandbox modules registered.',
          timestamp: new Date().toLocaleTimeString()
        }
      ];
      setAuditLogs(initialLogs);
    }

    // 7. Network Enclave Mode
    const savedOffline = localStorage.getItem('aegis_offline_enclave');
    if (savedOffline) {
      setIsOffline(savedOffline === 'true');
    }
    // Load Cloud Sync Health status
    const savedSync = localStorage.getItem('aegis_cloud_sync');
    if (savedSync) {
      setCloudSync(JSON.parse(savedSync));
    }
  }, []);

  // Panic Lock Keyboard Shortcut (Cmd+L / Ctrl+L)
  useEffect(() => {
    const handlePanicLock = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (!isLocked) {
          setIsLocked(true);
          setCurrentUser(null);
          triggerAuditLog(
            'Panic Lock Activated',
            'identity',
            'warning',
            'User triggered panic lock via keyboard shortcut'
          );
        }
      }
    };
    window.addEventListener('keydown', handlePanicLock);
    return () => window.removeEventListener('keydown', handlePanicLock);
  }, [isLocked]);

  // Save changes to localStorage acting as automatically synced device enclaves
  const saveState = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const handleUpdateModules = (updated: IdentityModule[]) => {
    setModules(updated);
    saveState('aegis_modules', updated);
  };

  const handleUpdatePasswords = (updated: PasswordEntry[]) => {
    setPasswords(updated);
    saveState('aegis_passwords', updated);
  };

  const handleUpdateMessages = (updated: EncryptedMessage[]) => {
    setMessages(updated);
    saveState('aegis_messages', updated);
  };

  const handleUpdateVault = (updated: VaultItem[]) => {
    setVaultItems(updated);
    saveState('aegis_vault', updated);
  };

  const handleAddTrackerLog = (log: TrackerLog) => {
    const updated = [...blockedTrackers, log];
    if (updated.length > 50) {
      updated.shift();
    }
    setBlockedTrackers(updated);
    saveState('aegis_trackers', updated);
  };

  const handleClearTrackerLogs = () => {
    setBlockedTrackers([]);
    saveState('aegis_trackers', []);
    triggerAuditLog(
      'Airgap Log Recycled',
      'trackers',
      'warning',
      'Discarded historically blocked tracker logs on device.'
    );
  };

  // Central trigger to append system audit reports
  const triggerAuditLog = (
    title: string,
    category: AuditLog['category'],
    status: AuditLog['status'],
    message: string
  ) => {
    const newLog: AuditLog = {
      id: 'aud-' + Date.now(),
      title,
      status,
      category,
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    const updated = [newLog, ...auditLogs];
    if (updated.length > 60) {
      updated.pop();
    }
    setAuditLogs(updated);
    saveState('aegis_audits', updated);
  };

  // Handle network state flipping
  const handleToggleOffline = () => {
    const nextOffline = !isOffline;
    setIsOffline(nextOffline);
    localStorage.setItem('aegis_offline_enclave', String(nextOffline));

    triggerAuditLog(
      `Enclave Tunnel Shifted`,
      'identity',
      nextOffline ? 'warning' : 'secured',
      `Flipped internet bridge toggle. Enclave operates on ${nextOffline ? 'AIRGAP OFFLINE (gemma-4-e4b model)' : 'SECURE WAN TUNNEL (Standard E2E Syncing)'} mechanics.`
    );
  };

  // Calculate Dynamic Security Scores for the Persisted Dashboard Auditor
  const activeModulesCount = modules.filter(m => m.isActive).length;
  const weakPasswordsCount = passwords.filter(p => p.strength === 'weak').length;
  
  const calculateSecurityScore = () => {
    if (breachStatus === 'nuked') return 100;

    let score = 70; // baseline
    score += (activeModulesCount * 1.5); 
    score += (modules.filter(m => m.mfaEnabled).length * 1.2); 
    score -= (weakPasswordsCount * 12);
    
    const trackerLogsCount = blockedTrackers.length;
    if (trackerLogsCount > 10) score += 5;

    return Math.max(0, Math.min(99, Math.round(score)));
  };

    const overallScore = calculateSecurityScore();
  // Animated display score using Framer Motion for high-fidelity transitions
  const motionScore = useMotionValue(overallScore);
  const [displayScore, setDisplayScore] = useState(overallScore);

  // Sync motion value to state for rendering
  useEffect(() => {
    const unsubscribe = motionScore.onChange((v) => {
      setDisplayScore(Math.round(v));
    });
    return () => unsubscribe();
  }, []);

  // Animate when overallScore changes
  useEffect(() => {
    if (motionScore.get() === overallScore) return;
    animate(motionScore, overallScore, { duration: 0.8, ease: 'easeOut' });
  }, [overallScore]);


  // Run detailed diagnostic checking cryptographic enclaves
  const handleRunDiagnostic = () => {
    if (isDiagnosticRunning) return;
    setIsDiagnosticRunning(true);
    setDiagnosticMessage('Initiating cryptographic bounds diagnostic...');
    
    triggerAuditLog(
      `Audit Core Audit Initialized`,
      'identity',
      'secured',
      'Running centralized system audit analyzing identity sandboxes, keychain ciphers, and tracker interception channels.'
    );

    const steps = [
      'Scanning 16 identity partition sectors...',
      'Assessing on-device keychain cryptography...',
      'Auditing secure document vault seals...',
      'System Audit complete!'
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setDiagnosticMessage(steps[i]);
        i++;
      } else {
        clearInterval(interval);
        setIsDiagnosticRunning(false);
        setDiagnosticMessage('');
        
        const freshSuggestions = [];
        if (weakPasswordsCount > 0) {
          freshSuggestions.push(`Purge or rotate the ${weakPasswordsCount} weak keychain records IMMEDIATELY to secure server gates.`);
        }
        if (modules.filter(m => !m.mfaEnabled).length > 5) {
          freshSuggestions.push("Multiple identity modules ignore MFA. Enable TOTP triggers on high-clearance sectors.");
        }
        if (activeModulesCount === 0) {
          freshSuggestions.push("Zero virtual enclaves active. Sandbox standard browser agents via Anonymous Surfer (ID-01).");
        }
        if (isOffline) {
          freshSuggestions.push("Offline mode operational. Document vaults are safe from remote probing vectors.");
        } else {
          freshSuggestions.push("Online tunnel bridged. Standard account cloud real-time backup loops active.");
        }

        setSystemSuggestions(freshSuggestions.length > 0 ? freshSuggestions : [
          "Enclave integrity rated 100% secure. Perfect cryptographic safety indicators.",
          "Automatic cloud backups configured and verified trace-free."
        ]);

        triggerAuditLog(
          `Security Audit Finished`,
          'identity',
          weakPasswordsCount > 0 ? 'warning' : 'secured',
          `centralized auditor evaluated threat indicators. Final score rated at: ${overallScore}% secure.`
        );
      }
    }, 1000);
  };

  // Submit secure inquiry to Architect AI counselor via backend Express
  const handleAiInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || aiLoading) return;

    const userText = aiPrompt.trim();
    setAiPrompt('');
    
    const newUserMsg = {
      sender: 'user' as const,
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setAiLogs(prev => [...prev, newUserMsg]);
    setAiLoading(true);

    try {
      const response = await fetch('/api/guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userText,
          context: {
            overallScore,
            activeModulesCount,
            weakPasswordsCount,
            blockedTrackersTotal: blockedTrackers.length,
            vaultItemsCount: vaultItems.length,
            isOffline,
            blockingLevel: 'Strict'
          }
        })
      });

      const data = await response.json();
      
      const architectMsg = {
        sender: 'architect' as const,
        text: data.message || 'Error executing AI model response container.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setAiLogs(prev => [...prev, architectMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg = {
        sender: 'architect' as const,
        text: 'System link failed. Please check local connectivity enclaves.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setAiLogs(prev => [...prev, errorMsg]);
    } finally {
      setAiLoading(false);
    }
  };

  // Purge / Nuke Breach sequence simulation
  const handleNukeExplosion = () => {
    // Save current state snapshot before nuking
    const preNukeSnapshot = {
      breachStatus,
      stats,
      passwords,
      systemSuggestions,
      auditLogs
    };
    localStorage.setItem('aegis_pre_nuke_snapshot', JSON.stringify(preNukeSnapshot));
    if (isNuking) return;
    setIsNuking(true);
    setNukeProgress(0);
    
    triggerAuditLog(
      'Sovereign Identity Nuke Triggered',
      'identity',
      'critical',
      'Purging leaking databases and rotating credentials for account idin@agape.nyc...'
    );

    const interval = setInterval(() => {
      setNukeProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsNuking(false);
          setBreachStatus('nuked');
          setStats({ nuked: 2, knoxed: 16, monitored: 0 });
          setPasswords(prev => prev.map(p => ({ ...p, strength: 'strong', updatedAt: '2026-06-07' })));
          // update suggestions
          setSystemSuggestions(["Zero leaked registries. All records successfully nuked & sealed."]);
          triggerAuditLog(
            'Security Cleansing Completed',
            'identity',
            'secured',
            'Nuked Canva expose registries. Revoked plaintext occurrences on paste servers. Identity posture updated to 100 SCORE!'
          );
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  // Revert the last nuke by restoring snapshot from localStorage
  const handleRevertNuke = () => {
    const snapshotStr = localStorage.getItem('aegis_pre_nuke_snapshot');
    if (!snapshotStr) {
      triggerAuditLog('Revert Nuke Failed', 'identity', 'warning', 'No pre-nuke snapshot found in storage.');
      return;
    }
    const snapshot = JSON.parse(snapshotStr);
    // Restore states
    setBreachStatus(snapshot.breachStatus || 'exposed');
    setStats(snapshot.stats || { nuked: 1, knoxed: 0, monitored: 1 });
    setPasswords(snapshot.passwords || []);
    setSystemSuggestions(snapshot.systemSuggestions || []);
    setAuditLogs(snapshot.auditLogs || []);
    // Clear the snapshot after revert to prevent repeated restores
    localStorage.removeItem('aegis_pre_nuke_snapshot');
    triggerAuditLog('Nuke Reverted', 'identity', 'secured', 'Restored security state from pre-nuke snapshot.');
  };

  const renderAgapeLayout = () => {
    return (
      <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "#060D1F", overflow: "hidden" }}>
        {/* Top border gradient */}
        <div style={{ height: 2, background: "linear-gradient(135deg, #FF2E9F 0%, #00D4FF 50%, #FF7A18 100%)", backgroundSize: "200% 100%", animation: "rotate-gradient 3s linear infinite", flexShrink: 0 }} />

        {/* Top Header */}
        <header style={{ height: 56, background: "rgba(6,13,31,0.98)", borderBottom: "1px solid rgba(0,212,255,0.1)", display: "flex", alignItems: "center", padding: "0 20px", gap: 16, position: "relative", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg viewBox="0 0 32 32" width="28" style={{ flexShrink: 0, filter: "drop-shadow(0 0 6px #00D4FF)" }}>
              <polygon points="16,2 30,10 30,22 16,30 2,22 2,10" fill="none" stroke="#00D4FF" strokeWidth="1.5" />
              <polygon points="16,8 24,12 24,20 16,24 8,20 8,12" fill="none" stroke="#FF2E9F" strokeWidth="0.8" opacity="0.7" />
              <text x="16" y="20" textAnchor="middle" fill="#00D4FF" fontFamily="Orbitron" fontSize="8" fontWeight="900">AI</text>
            </svg>
            <div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "0.7rem", fontWeight: 700, color: "#00D4FF", letterSpacing: "0.1em" }}>AGAPE SOVEREIGN</div>
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: "0.55rem", color: "#7F9BB3", letterSpacing: "0.1em" }}>ARCHITECT AI 2026</div>
            </div>
          </div>

          <div style={{ height: 20, width: 1, background: "rgba(0,212,255,0.2)" }} />

          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0f0", boxShadow: "0 0 8px #0f0", animation: "pulse-border 1.5s infinite" }} />
            <span style={{ fontFamily: "'Share Tech Mono'", fontSize: "0.65rem", color: "#0f0", letterSpacing: "0.1em" }}>LIVE</span>
          </div>

          <div style={{ height: 20, width: 1, background: "rgba(0,212,255,0.2)" }} />

          {/* Time */}
          <span style={{ fontFamily: "'Share Tech Mono'", fontSize: "0.7rem", color: "#00D4FF" }}>
            {currentTimeUTC} UTC
          </span>

          <div style={{ flex: 1 }} />

          {/* Right side controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "'Share Tech Mono'", fontSize: "0.75rem", fontWeight: "bold", color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", padding: "2px 8px", borderRadius: 4 }}>
              {displayScore} SCORE
            </span>

            <button
              onClick={toggleDesign}
              style={{ fontFamily: "'Share Tech Mono'", fontSize: "0.7rem", padding: "4px 10px", background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)", borderRadius: 4, color: "#00D4FF", cursor: "pointer", transition: "all 0.2s" }}
              className="hover:bg-[#00D4FF]/20"
            >
              ⟲ ARCHITECT UI
            </button>

            {/* Profile trigger */}
            <div style={{ position: "relative" }}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#00D4FF", fontSize: "0.8rem", fontFamily: "'Orbitron'" }}
              >
                ID
              </button>
              
              {isProfileOpen && (
                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, width: 200, background: "#060D1F", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, overflow: "hidden", zIndex: 100, boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
                  <div style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontSize: 9, fontFamily: "'Share Tech Mono'", color: "#00D4FF" }}>SOVEREIGN IDENTITY</div>
                    <div style={{ fontSize: 11, color: "white", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{currentUser?.email || "idin@agape.nyc"}</div>
                  </div>
                  <div style={{ padding: "6px" }}>
                    <button 
                      onClick={() => { toggleDesign(); setIsProfileOpen(false); }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px", fontSize: 11, color: "#7F9BB3", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", textAlign: "left" }}
                      className="hover:bg-white/5 hover:text-white"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Switch to Architect UI
                    </button>
                    <button 
                      onClick={() => { setIsLocked(true); setIsProfileOpen(false); }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px", fontSize: 11, color: "#FF2E9F", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", textAlign: "left" }}
                      className="hover:bg-[#FF2E9F]/10"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Lock Enclave
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Sidebar */}
          <aside style={{ width: 260, height: "100%", background: "rgba(6,13,31,0.97)", borderRight: "1px solid rgba(0,212,255,0.12)", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
            {/* Header / Logo */}
            <div style={{ padding: "16px", borderBottom: "1px solid rgba(0,212,255,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00D4FF" }} />
                <span style={{ fontFamily: "'Share Tech Mono'", fontSize: "0.65rem", color: "#FF7A18", letterSpacing: "0.15em" }}>DIFF HUB</span>
              </div>
              {/* Stats Row */}
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, background: "rgba(255,46,159,0.1)", borderRadius: 6, padding: "6px", textAlign: "center", border: "1px solid rgba(255,46,159,0.2)" }}>
                  <div style={{ color: "#FF2E9F", fontFamily: "'Orbitron'", fontSize: "0.85rem", fontWeight: 700 }}>{stats.nuked}</div>
                  <div style={{ color: "#7F9BB3", fontSize: "0.58rem", letterSpacing: "0.1em" }}>NUKED</div>
                </div>
                <div style={{ flex: 1, background: "rgba(0,212,255,0.08)", borderRadius: 6, padding: "6px", textAlign: "center", border: "1px solid rgba(0,212,255,0.2)" }}>
                  <div style={{ color: "#00D4FF", fontFamily: "'Orbitron'", fontSize: "0.85rem", fontWeight: 700 }}>{stats.knoxed}</div>
                  <div style={{ color: "#7F9BB3", fontSize: "0.58rem", letterSpacing: "0.1em" }}>KNOXED</div>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav style={{ padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", flex: 1 }} className="scroll-area">
              {[
                { id: 'dashboard', label: 'DASHBOARD', icon: LayoutGridIcon },
                { id: 'identities', label: 'DIFF MODULES (16)', icon: Cpu },
                { id: 'passwords', label: 'SECURE KEYCHAIN', icon: KeyRound },
                { id: 'vault', label: 'ENC VAULT', icon: HardDrive },
                { id: 'messenger', label: 'COMMS ENCLAVE', icon: MessageSquare },
                { id: 'trackers', label: 'TRACKER SHIELD', icon: Activity },
                { id: 'ai', label: 'ARCHITECT COUNSELOR', icon: HelpCircle }
              ].map((s) => {
                const isActive = activeTab === s.id;
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveTab(s.id as any)}
                    style={{ 
                      width: "100%", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 10, 
                      padding: "10px 12px", 
                      borderRadius: 8, 
                      background: isActive ? "rgba(0, 212, 255, 0.08)" : "transparent", 
                      border: isActive ? "1px solid rgba(0, 212, 255, 0.2)" : "1px solid transparent", 
                      color: isActive ? "#00D4FF" : "#E8F4FF", 
                      cursor: "pointer", 
                      textAlign: "left", 
                      fontFamily: "'Orbitron', monospace", 
                      fontSize: "0.68rem", 
                      fontWeight: isActive ? 700 : 500, 
                      letterSpacing: "0.08em" 
                    }}
                    className="hover:bg-white/5 transition-all"
                  >
                    <Icon className="w-4 h-4" style={{ color: isActive ? "#00D4FF" : "rgba(0, 212, 255, 0.6)" }} />
                    {s.label}
                  </button>
                );
              })}

              <div style={{ margin: "8px 16px", height: 1, background: "linear-gradient(135deg, #FF2E9F 0%, #00D4FF 50%, #FF7A18 100%)", opacity: 0.3 }} />

              <button
                onClick={handleDownloadReport}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "transparent", border: "none", color: "#FF7A18", cursor: "pointer", textAlign: "left", fontFamily: "'Orbitron', monospace", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.08em" }}
                className="hover:bg-white/5 transition-all"
              >
                <FileText className="w-4 h-4 text-[#FF7A18]" />
                IDENTITY AUDIT REPORT
              </button>
            </nav>

            {/* Bottom status block */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(0,212,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9, fontFamily: "'Share Tech Mono'", color: "#7F9BB3" }}>
              <span>AGAPE CORP v4.18</span>
              <span style={{ color: "#00FF00" }}>● SECURE</span>
            </div>
          </aside>

          {/* Main workspace */}
          <main style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            
            {/* Background grid */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,212,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.025) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: "20%", right: "15%", width: 300, height: 300, background: "radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "20%", left: "20%", width: 200, height: 200, background: "radial-gradient(circle, rgba(255,46,159,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

            {/* Content container */}
            <div style={{ position: "relative", zIndex: 1, height: "100%", overflowY: "auto", padding: 24 }} className="scroll-area flex-1">
              <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                
                {/* Active Tab rendering */}
                {activeTab === 'dashboard' && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 24, animation: "fade-in 0.4s ease" }}>
                    
                    {/* Bento stats row */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                      <div className="glass-panel" style={{ padding: 16, position: "relative", overflow: "hidden" }}>
                        <span style={{ fontSize: 10, fontFamily: "'Share Tech Mono'", color: "#7F9BB3" }}>NUKED BREACHES</span>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                          <span style={{ fontSize: "1.8rem", fontWeight: 900, color: "#FF2E9F", fontFamily: "'Orbitron'" }}>{stats.nuked}</span>
                          <span style={{ fontSize: 10, color: "#7F9BB3" }}>EXPOSED SECTORS PURGED</span>
                        </div>
                      </div>
                      <div className="glass-panel" style={{ padding: 16, position: "relative", overflow: "hidden" }}>
                        <span style={{ fontSize: 10, fontFamily: "'Share Tech Mono'", color: "#7F9BB3" }}>KNOX SECURED</span>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                          <span style={{ fontSize: "1.8rem", fontWeight: 900, color: "#00D4FF", fontFamily: "'Orbitron'" }}>{stats.knoxed}</span>
                          <span style={{ fontSize: 10, color: "#7F9BB3" }}>MFA HANDSHAKES VERIFIED</span>
                        </div>
                      </div>
                      <div className="glass-panel" style={{ padding: 16, position: "relative", overflow: "hidden" }}>
                        <span style={{ fontSize: 10, fontFamily: "'Share Tech Mono'", color: "#7F9BB3" }}>MONITORED HOOKS</span>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                          <span style={{ fontSize: "1.8rem", fontWeight: 900, color: "#FF7A18", fontFamily: "'Orbitron'" }}>{stats.monitored}</span>
                          <span style={{ fontSize: 10, color: "#7F9BB3" }}>REAL-TIME SOCKET TAPS</span>
                        </div>
                      </div>
                    </div>

                    {/* Threat card */}
                    <div className="glass-panel shadow-2xl" style={{ position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: 0, left: 0, width: 6, height: "100%", background: "linear-gradient(to bottom, #FF2E9F, #00D4FF, #FF7A18)" }} />
                      <div style={{ padding: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, flexWrap: "wrap" }}>
                          <div>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 9, fontWeight: "bold", border: "1px solid rgba(255,46,159,0.3)", backgroundColor: "rgba(255,46,159,0.1)", color: "#FF2E9F", padding: "2px 8px", borderRadius: 4, marginBottom: 10 }}>
                              <ShieldAlert className="h-3 w-3 animate-pulse" /> Critical Threat Alert
                            </span>
                            <h2 style={{ fontSize: "0.85rem", fontWeight: 900, color: "white", letterSpacing: "0.05em", fontFamily: "'Orbitron'" }}>
                              Critical Historical Breach Exposure and Domain Spoofing Vulnerability Detected
                            </h2>
                          </div>
                          <span style={{ fontSize: 9, fontFamily: "'Share Tech Mono'", color: "#7F9BB3", padding: "4px 8px", background: "rgba(0,0,0,0.3)", borderRadius: 4, border: "1px solid rgba(0,212,255,0.1)" }}>
                            ID: AEGIS-789-VULN
                          </span>
                        </div>

                        {breachStatus === 'exposed' ? (
                          <div style={{ marginTop: 14 }}>
                            <p style={{ fontSize: "0.75rem", color: "#7F9BB3", lineHeight: 1.6, fontFamily: "sans-serif" }}>
                              Architect AI scan for <strong style={{ color: "white" }}>idin@agape.nyc</strong> indicates severe identity degradation. The account was identified in the <strong style={{ color: "#FF2E9F" }}>2019 Canva breach data</strong> and a recent <strong style={{ color: "#FF2E9F" }}>Pastebin dump</strong> containing plaintext password exposures. Security posture analysis reveals missing MFA on the primary recovery account and active suspicious SMTP forwarding rules mapping from agape.nyc DNS MX registers.
                            </p>

                            {isNuking && (
                              <div style={{ margin: "16px 0", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(0,212,255,0.1)", padding: 12, borderRadius: 8 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#7F9BB3", marginBottom: 6, fontFamily: "'Share Tech Mono'" }}>
                                  <span>Purging leak repositories...</span>
                                  <span>{nukeProgress}%</span>
                                </div>
                                <div style={{ width: "100%", background: "rgba(255,255,255,0.05)", height: 8, borderRadius: 4, overflow: "hidden" }}>
                                  <div style={{ height: "100%", background: "linear-gradient(to right, #FF2E9F, #00D4FF, #FF7A18)", width: `${nukeProgress}%`, transition: "all 0.1s" }} />
                                </div>
                              </div>
                            )}

                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
                              <button
                                onClick={handleDownloadReport}
                                style={{ padding: "8px 16px", fontSize: 10, fontWeight: "bold", fontFamily: "'Share Tech Mono'", border: "1px solid rgba(0,212,255,0.4)", background: "rgba(0,212,255,0.1)", color: "#00D4FF", borderRadius: 6, cursor: "pointer", transition: "all 0.2s" }}
                                className="hover:bg-[#00D4FF]/25"
                              >
                                GENERATE SOVEREIGN IDENTITY TRUST REPORT
                              </button>
                              <button
                                onClick={handleNukeExplosion}
                                disabled={isNuking}
                                style={{ padding: "8px 16px", fontSize: 10, fontWeight: "bold", fontFamily: "'Share Tech Mono'", border: "1px solid rgba(255,46,159,0.4)", background: "rgba(255,46,159,0.1)", color: "#FF2E9F", borderRadius: 6, cursor: "pointer", transition: "all 0.2s" }}
                                className="hover:bg-[#FF2E9F]/25 disabled:opacity-40"
                              >
                                NUKE EXPOSURE
                              </button>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: 6, padding: "0 8px" }}>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Min"
                                  value={scanInterval ?? ''}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val) && val > 0) setScanInterval(val);
                                    else setScanInterval(null);
                                  }}
                                  style={{ width: 32, background: "transparent", border: "none", borderBottom: "1px solid rgba(0,212,255,0.3)", color: "white", outline: "none", textAlign: "center", fontSize: 11, fontFamily: "'Share Tech Mono'" }}
                                />
                                <span style={{ fontSize: 9, color: "#7F9BB3", fontFamily: "'Share Tech Mono'" }}>/ scan</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginTop: 14 }}>
                            <div style={{ padding: 12, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, display: "flex", gap: 8, fontSize: "0.75rem", color: "#10b981" }}>
                              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                              <div>
                                <strong style={{ color: "white", display: "block", marginBottom: 2 }}>Sovereign Posture Secured & Cleansed</strong>
                                The Canva breach records and paste occurrences associated with <strong>idin@agape.nyc</strong> have been successfully purged from indexed registries. High-entropy key rotation occurred, and security thresholds are at 100% Knox security boundaries.
                              </div>
                            </div>
                            <button
                              onClick={() => setBreachStatus('exposed')}
                              style={{ border: "none", background: "transparent", textDecoration: "underline", color: "#7F9BB3", fontSize: 9, cursor: "pointer", marginTop: 8 }}
                            >
                              Reset simulation matrices
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Event Log inside card */}
                      <div style={{ padding: "0 20px 20px 20px" }}>
                        <h3 style={{ fontSize: "0.75rem", color: "white", marginBottom: 12, fontFamily: "'Orbitron'" }}>System Event Log</h3>
                        <div style={{ borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                          {auditLogs.slice(0, 4).map((log) => (
                            <div key={log.id} style={{ display: "flex", alignItems: "start", gap: 8, fontSize: 11 }}>
                              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00D4FF", marginTop: 4, shrink: 0 }} />
                              <div>
                                <span style={{ fontFamily: "'Share Tech Mono'", color: "#7F9BB3", marginRight: 8 }}>{log.timestamp}</span>
                                <span style={{ fontFamily: "'Share Tech Mono'", color: "white", fontWeight: "bold" }}>{log.title}</span>
                                {log.message && <span style={{ display: "block", fontSize: 10, color: "#7F9BB3", marginTop: 2 }}>{log.message}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
                      <div className="glass-panel" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                        <h3 style={{ fontSize: "0.75rem", color: "white", fontFamily: "'Orbitron'", display: "flex", alignItems: "center", gap: 6 }}>
                          <User className="h-4 w-4 text-[#00D4FF]" /> REAL-WORLD SUITE STATUS
                        </h3>
                        <p style={{ fontSize: 11, color: "#7F9BB3", fontFamily: "'Share Tech Mono'" }}>
                          These authentication markers correlate directly with Israel David's active security profiles.
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(0,212,255,0.05)", borderRadius: 8, padding: 10 }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: "bold", color: "white" }}>Google Account Sync</div>
                              <div style={{ fontSize: 9, color: "#7F9BB3", fontFamily: "'Share Tech Mono'" }}>Linked and Verified: idin@agape.nyc</div>
                            </div>
                            <span style={{ fontSize: 9, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", padding: "2px 6px", borderRadius: 4, fontFamily: "'Share Tech Mono'" }}>ACTIVE</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(0,212,255,0.05)", borderRadius: 8, padding: 10 }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: "bold", color: "white" }}>Biometric Passkey</div>
                              <div style={{ fontSize: 9, color: "#7F9BB3", fontFamily: "'Share Tech Mono'" }}>FIDO2 SECURE ENCLAVE MODULE</div>
                            </div>
                            <span style={{ fontSize: 9, color: "#00D4FF", background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", padding: "2px 6px", borderRadius: 4, fontFamily: "'Share Tech Mono'" }}>REGISTERED</span>
                          </div>
                        </div>
                      </div>

                      <div className="glass-panel" style={{ padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <h3 style={{ fontSize: "0.75rem", color: "white", fontFamily: "'Orbitron'", display: "flex", alignItems: "center", gap: 6 }}>
                            <Activity className="h-4 w-4 text-[#FF7A18]" /> SOVEREIGN ANALYTICS
                          </h3>
                          <p style={{ fontSize: 11, color: "#7F9BB3", fontFamily: "'Share Tech Mono'", marginTop: 6 }}>
                            Core enclaves operating index is mapped client-side. Trackers caught inside local sandboxes are logged and destroyed instantly.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab('identities')}
                          style={{ padding: "8px", fontSize: 11, fontFamily: "'Share Tech Mono'", width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(0,212,255,0.1)", color: "white", borderRadius: 6, cursor: "pointer", transition: "all 0.2s" }}
                          className="hover:border-[#00D4FF] hover:bg-black/50"
                        >
                          View 16 virtual identity heatmaps →
                        </button>
                      </div>
                    </div>

                  </div>
                )}

                {activeTab === 'identities' && (
                  <IdentityModulesPanel 
                    modules={modules}
                    onUpdateModules={handleUpdateModules}
                    triggerAuditLog={triggerAuditLog}
                  />
                )}

                {activeTab === 'passwords' && (
                  <PasswordManager 
                    passwords={passwords}
                    onUpdatePasswords={handleUpdatePasswords}
                    triggerAuditLog={triggerAuditLog}
                  />
                )}

                {activeTab === 'vault' && (
                  <DocumentVault 
                    items={vaultItems}
                    onUpdateItems={handleUpdateVault}
                    triggerAuditLog={triggerAuditLog}
                    modules={modules}
                    onUpdateModules={handleUpdateModules}
                  />
                )}

                {activeTab === 'messenger' && (
                  <EncryptedMessenger 
                    messages={messages}
                    onUpdateMessages={handleUpdateMessages}
                    triggerAuditLog={triggerAuditLog}
                  />
                )}

                {activeTab === 'trackers' && (
                  <TrackerBlocker 
                    blockedLogs={blockedTrackers}
                    onAddLog={handleAddTrackerLog}
                    onClearLogs={handleClearTrackerLogs}
                    triggerAuditLog={triggerAuditLog}
                  />
                )}

                {activeTab === 'ai' && (
                  <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16, animation: "fade-in 0.4s ease" }}>
                    <div className="glass-panel" style={{ display: "flex", flexDirection: "column", height: 600, overflow: "hidden" }}>
                      <div style={{ padding: 12, borderBottom: "1px solid rgba(0,212,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: "bold", fontFamily: "'Orbitron'", color: "white" }}>ENCLAVE COUNSELOR CHAT</div>
                          <div style={{ fontSize: 9, color: "#7F9BB3", fontFamily: "'Share Tech Mono'" }}>{isOffline ? 'Operating on-device via local model gemma-4-e4b' : 'Connected standard secure channel path to server-side Gemma'}</div>
                        </div>
                        <span style={{ fontSize: 9, fontFamily: "'Share Tech Mono'", color: isOffline ? "#FF7A18" : "#00D4FF", border: isOffline ? "1px solid rgba(255,122,24,0.3)" : "1px solid rgba(0,212,255,0.3)", padding: "2px 6px", borderRadius: 4 }}>
                          {isOffline ? 'Off-Grid gemma-4' : 'Gemma Local Online'}
                        </span>
                      </div>

                      <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, background: "rgba(0,0,0,0.1)" }} className="scroll-area">
                        {aiLogs.map((log, index) => {
                          const isArch = log.sender === 'architect';
                          return (
                            <div
                              key={index}
                              style={{ display: "flex", flexDirection: "column", maxWidth: "80%", alignSelf: isArch ? "flex-start" : "flex-end" }}
                            >
                              <span style={{ fontSize: 9, fontFamily: "'Share Tech Mono'", color: "#7F9BB3", marginBottom: 2, alignSelf: isArch ? "flex-start" : "flex-end" }}>
                                {isArch ? 'Architect Counselor' : 'Local Enclave Operator'} • {log.timestamp}
                              </span>
                              <div style={{ 
                                padding: 10, 
                                borderRadius: 12, 
                                fontSize: 11, 
                                fontFamily: "'Share Tech Mono'", 
                                background: isArch ? "rgba(255,255,255,0.03)" : "rgba(0,212,255,0.05)", 
                                border: isArch ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,212,255,0.1)", 
                                color: isArch ? "#E8F4FF" : "#00D4FF",
                                borderTopLeftRadius: isArch ? 0 : 12,
                                borderTopRightRadius: isArch ? 12 : 0,
                                whiteSpace: "pre-line",
                                lineHeight: 1.5
                              }}>
                                {log.text}
                              </div>
                            </div>
                          );
                        })}
                        {aiLoading && (
                          <div style={{ display: "flex", flexDirection: "column", maxWidth: "80%", alignSelf: "flex-start" }}>
                            <span style={{ fontSize: 9, fontFamily: "'Share Tech Mono'", color: "#7F9BB3", marginBottom: 2 }}>Architect Counselor is thinking...</span>
                            <div style={{ padding: 10, borderRadius: 12, borderTopLeftRadius: 0, fontSize: 11, fontFamily: "'Share Tech Mono'", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", color: "#7F9BB3" }} className="animate-pulse">
                              Processing secure prompt matrices...
                            </div>
                          </div>
                        )}
                      </div>

                      <form onSubmit={handleAiInquiry} style={{ padding: 12, borderTop: "1px solid rgba(0,212,255,0.1)", display: "flex", gap: 8 }}>
                        <input
                          type="text"
                          required
                          disabled={aiLoading}
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="Inquire on biometric setups, cryptographic standards, leaks..."
                          style={{ flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: 6, padding: "8px 12px", color: "white", fontSize: 11, fontFamily: "'Share Tech Mono'", outline: "none" }}
                        />
                        <button
                          type="submit"
                          disabled={aiLoading}
                          style={{ padding: "8px 16px", background: "#FF7A18", border: "none", color: "white", fontSize: 11, fontFamily: "'Share Tech Mono'", borderRadius: 6, fontWeight: "bold", cursor: "pointer" }}
                        >
                          Ask Counselor
                        </button>
                      </form>
                    </div>

                    <div className="glass-panel" style={{ padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between", height: 600 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <h4 style={{ fontSize: 11, fontFamily: "'Orbitron'", color: "#7F9BB3", borderBottom: "1px solid rgba(0,212,255,0.1)", paddingBottom: 6 }}>SUGGESTED ENCLAVE DIRECTIVES</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {[
                            { question: "How does end-to-end encryption guard my documents?", key: "e2ee" },
                            { question: "Explain the isolation of the 16 sandbox modules.", key: "sandbox" },
                            { question: "What risk indicators does the tracker blocker audit?", key: "blocker" },
                            { question: "Is gemma-4-e4b fully airgapped?", key: "gemma" }
                          ].map((item) => (
                            <button
                              key={item.key}
                              onClick={() => setAiPrompt(item.question)}
                              style={{ width: "100%", textAlign: "left", padding: 10, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(0,212,255,0.05)", borderRadius: 6, fontFamily: "'Share Tech Mono'", fontSize: 10, color: "#7F9BB3", cursor: "pointer", transition: "all 0.2s" }}
                              className="hover:border-[#FF7A18] hover:text-white"
                            >
                              {item.question}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(0,212,255,0.05)", padding: 12, borderRadius: 8, marginTop: 24 }}>
                        <span style={{ fontSize: 9, color: "#FF7A18", fontFamily: "'Share Tech Mono'", fontWeight: "bold", display: "block", marginBottom: 4 }}>ON-DEVICE HARNESS DIRECTIVE</span>
                        <p style={{ fontSize: 10, color: "#7F9BB3", fontFamily: "'Share Tech Mono'", lineHeight: 1.5 }}>
                          Aegis Core incorporates a localized vector intelligence system (gemma-4-e4b) that parses inquiries without bridging external networks, protecting intellectual property from centralized data harvesting structures.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </main>
        </div>
        
        {/* Bottom border gradient */}
        <div style={{ height: 2, background: "linear-gradient(135deg, #FF2E9F 0%, #00D4FF 50%, #FF7A18 100%)", backgroundSize: "200% 100%", animation: "rotate-gradient 3s linear infinite reverse", flexShrink: 0 }} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-neutral-300 flex flex-col font-mono selection:bg-fuchsia-500/30 selection:text-white">
      
      {/* Gated Authentication Portal */}
      <AnimatePresence>
        {isLocked && (
          <BiometricLock 
            isInitiallyLocked={true}
            onUnlock={(user) => {
              setIsLocked(false);
              setCurrentUser(user || { name: 'Israel David', email: 'idin@agape.nyc', role: 'Sovereign Admin (Bypass)', method: 'Touch ID', score: 100 });
              triggerAuditLog(
                'Enclave Decrypted', 
                'identity', 
                'secured', 
                `Authenticated via ${user?.method || 'Secure Enclave Handshake'}. Welcome back Sovereign Admin Israel David.`
              );
            }}
          />
        )}
      </AnimatePresence>

      {/* Main App Workspace */}
      {!isLocked && (
        currentDesign === 'agape' ? renderAgapeLayout() : (
          <div className="flex-1 flex flex-col xl:flex-row relative">
          
          {/* Work Station Area */}
          <div className="flex-1 flex flex-col border-b xl:border-b-0 xl:border-r border-neutral-800">
            
            {/* Header Toolbar (High-Fidelity Match to Screenshot) */}
            <header className="p-4 bg-neutral-950 border-b border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="h-9 w-9 rounded bg-gradient-to-br from-fuchsia-600 via-blue-600 to-orange-500 p-0.5 relative overflow-hidden flex items-center justify-center shrink-0">
                  <div className="h-full w-full bg-black rounded-sm flex items-center justify-center">
                    <Shield className="h-4.5 w-4.5 text-fuchsia-400" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-[10px] bg-amber-950/40 text-amber-500 border border-amber-900/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">DIFF BUSY</span>
                </div>
                <span className="text-[10px] bg-red-950/40 text-red-500 border border-red-900/40 px-2 py-0.5 rounded font-black font-mono">ADMIN</span>
              </div>

              {/* Title Header */}
              <div className="text-center">
                <h1 className="text-xs md:text-sm font-black text-white tracking-widest uppercase font-mono bg-clip-text text-transparent bg-gradient-to-r from-neutral-100 via-neutral-300 to-neutral-500">
                  Architect AI - Agape Sovereign Enclave
                </h1>
                <p className="text-[9px] text-neutral-500 mt-0.5">SOVEREIGN PRIVACY CONTROL HUB FOR ISRAEL DAVID</p>
              </div>

              {/* User Identity Controller */}
              <div className="flex items-center gap-3.5 bg-neutral-900 border border-neutral-800/80 rounded-lg px-4 py-2 text-right">
                <div className="hidden sm:block">
                  <p className="text-[10px] font-black text-white tracking-wider uppercase">
                    {currentUser?.name || 'Israel David'}
                  </p>
                  <p className="text-[8px] text-neutral-500 font-mono">
                    {currentUser?.email || 'idin@agape.nyc'} • {currentUser?.role || 'Sovereign Admin (Bypass)'}
                  </p>
                </div>
                
                {/* Score indicators */}
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[10px] font-black tracking-widest text-[#10b981] bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded shadow">
                    {displayScore} SCORE
                  </span>
                  
                  {/* Avatar Sphere */}
                  <div className="h-8 w-8 rounded-full border-2 border-blue-500 bg-neutral-950 flex items-center justify-center font-bold text-xs text-blue-400 relative overflow-hidden group hover:border-fuchsia-500 transition-all cursor-pointer shadow-md">
                    <span className="relative z-10 font-bold font-sans">ID</span>
                    <div className="absolute inset-0 bg-neutral-900 layer opacity-10 group-hover:bg-fuchsia-950 transition-colors" />
                  </div>
                  
                  {/* Switch UI button */}
                  <button
                    onClick={toggleDesign}
                    className="ml-2 px-2.5 py-1 text-[10px] bg-blue-950/50 text-blue-400 border border-blue-800/60 hover:border-blue-500 rounded hover:bg-blue-900/20 transition-all font-mono uppercase cursor-pointer"
                  >
                    ⟲ AGAPE UI
                  </button>

                  {/* Revert Nuke Button */}
                  {breachStatus === 'nuked' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={handleRevertNuke}
                      className="ml-4 px-3 py-1 text-xs bg-fuchsia-900/30 text-fuchsia-300 border border-fuchsia-500 rounded hover:bg-fuchsia-800 transition-colors"
                    >
                      Revert Last Nuke
                    </motion.button>
                  )}
                  </div>
                </div>
              </header>

            {/* Application Ribbons */}
            <div className="bg-neutral-900 border-b border-neutral-800 flex overflow-x-auto divide-r divide-neutral-800 custom-scrollbar">
              {[
                { id: 'dashboard', label: 'DASHBOARD & FINDINGS', icon: LayoutGridIcon, accent: 'border-b-blue-500 text-blue-400' },
                { id: 'identities', label: 'DIFF MODULES (16)', icon: Cpu, accent: 'border-b-fuchsia-500 text-fuchsia-400' },
                { id: 'passwords', label: 'SECURE KEYCHAIN', icon: KeyRound, accent: 'border-b-orange-500 text-orange-400' },
                { id: 'vault', label: 'ENC VAULT', icon: HardDrive, accent: 'border-b-fuchsia-500 text-fuchsia-400' },
                { id: 'messenger', label: 'COMMS ENCLAVE', icon: MessageSquare, accent: 'border-b-blue-500 text-blue-400' },
                { id: 'trackers', label: 'TRACKER SHIELD', icon: Activity, accent: 'border-b-orange-500 text-orange-400' },
                { id: 'ai', label: 'ARCHITECT COUNSELOR', icon: HelpCircle, accent: 'border-b-fuchsia-500 text-fuchsia-400' }
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-5 py-3 text-[10px] font-mono whitespace-nowrap cursor-pointer transition border-b-2 hover:bg-neutral-850/30 ${
                      isActive 
                        ? `${tab.accent} bg-neutral-950/60 font-black` 
                        : 'border-b-transparent text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Main viewports display */}
            <main className="p-4 md:p-5 flex-1 overflow-y-auto max-h-[calc(100vh-112px)] custom-scrollbar">
              
              {/* BRAND NEW SOVEREIGN DASHBOARD VIEW */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  
                  {/* Bento top cards: Nuked, Knoxed, Monitored */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between overflow-hidden relative group">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 blur-xl group-hover:bg-red-500/10 transition-colors" />
                      <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">NUKED BREACHES</span>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-black font-sans text-red-500">{stats.nuked}</span>
                        <span className="text-[10px] text-neutral-500">EXPOSED SECTORS PURGED</span>
                      </div>
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between overflow-hidden relative group">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 blur-xl group-hover:bg-blue-500/10 transition-colors" />
                      <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">KNOX SECURED</span>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-black font-sans text-blue-400">{stats.knoxed}</span>
                        <span className="text-[10px] text-neutral-500">MFA HANDSHAKES VERIFIED</span>
                      </div>
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between overflow-hidden relative group">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 blur-xl group-hover:bg-amber-500/10 transition-colors" />
                      <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">MONITORED HOOKS</span>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-black font-sans text-amber-500">{stats.monitored}</span>
                        <span className="text-[10px] text-neutral-500">REAL-TIME SOCKET TAPS</span>
                      </div>
                    </div>
                  </div>

                  {/* REAL WORLD INTELLIGENCE FINDINGS */}
                  <div className="bg-neutral-900 border border-neutral-850 rounded-xl overflow-hidden shadow-2xl relative">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-red-600 via-fuchsia-600 to-amber-500" />
                    
                    <div className="p-5">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase border border-red-500/30 bg-red-950/20 text-red-500 px-2 py-0.5 rounded mb-2.5">
                            <ShieldAlert className="h-3 w-3 animate-pulse" /> Critical Threat Alert
                          </span>
                          
                          <h2 className="text-sm font-black text-white uppercase tracking-wider leading-relaxed">
                            Critical Historical Breach Exposure and Domain Spoofing Vulnerability Detected
                          </h2>
                        </div>
                        
                        <span className="text-[9px] font-mono text-neutral-500 uppercase shrink-0 bg-neutral-950 px-2 py-1 rounded border border-neutral-850">
                          ID: AEGIS-789-VULN
                        </span>
                      </div>

                      {breachStatus === 'exposed' ? (
                        <div className="mt-3.5 space-y-4">
                          <p className="text-xs text-neutral-400 leading-relaxed font-sans mt-1">
                            Architect AI scan for <strong className="text-white">idin@agape.nyc</strong> indicates severe identity degradation. The account was identified in the <strong className="text-red-400">2019 Canva breach data</strong> and a recent <strong className="text-red-400">Pastebin dump</strong> containing plaintext password exposures. Security posture analysis reveals missing MFA on the primary recovery account and active suspicious SMTP forwarding rules mapping from agape.nyc DNS MX registers.
                          </p>
                          
                          {/* Progress slider when nuking */}
                          {isNuking && (
                            <div className="my-4 bg-neutral-950 border border-neutral-850 p-3 rounded-lg">
                              <div className="flex justify-between text-[10px] text-neutral-400 mb-1.5 uppercase font-mono">
                                <span>Purging leak repositories...</span>
                                <span>{nukeProgress}%</span>
                              </div>
                              <div className="w-full bg-neutral-850 h-2 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-red-500 via-fuchsia-500 to-blue-500 duration-100 transition-all" style={{ width: `${nukeProgress}%` }} />
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-3 pt-3">
                            <button
                              onClick={handleDownloadReport}
                              className="px-4 py-2 text-xs font-bold font-mono border border-blue-500/50 bg-blue-950/20 text-blue-400 hover:bg-blue-950/50 rounded-lg cursor-pointer transition uppercase"
                            >
                              GENERATE SOVEREIGN IDENTITY TRUST REPORT
                            </button>
                            <button
                              onClick={handleNukeExplosion}
                              disabled={isNuking}
                              className="px-4 py-2 text-xs font-bold font-mono border border-fuchsia-500/50 bg-fuchsia-950/20 text-fuchsia-400 hover:bg-fuchsia-950/50 rounded-lg cursor-pointer transition uppercase"
                            >
                              NUKE EXPOSURE
                            </button>
                            {/* Schedule Automated Scan */}
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                placeholder="Minutes"
                                value={scanInterval ?? ''}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val) && val > 0) setScanInterval(val);
                                  else setScanInterval(null);
                                }}
                                className="w-16 px-1 py-0.5 text-xs bg-neutral-900 border border-neutral-700 rounded text-neutral-300 focus:outline-none"
                              />
                              <span className="text-xs text-neutral-400">/ scan</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3.5 space-y-2">
                          <div className="p-3 bg-emerald-950/15 border border-emerald-900/40 rounded-lg flex items-start gap-2 text-xs text-emerald-400 font-sans leading-relaxed">
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                            <div>
                              <strong className="text-white block uppercase">Sovereign Posture Secured & Cleansed</strong>
                              The Canva breach records and paste occurrences associated with <strong>idin@agape.nyc</strong> have been successfully purged from indexed registries. High-entropy key rotation occurred, and security thresholds are at 100% Knox security boundaries.
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setBreachStatus('exposed')}
                            className="text-[9px] text-neutral-500 hover:text-neutral-400 underline pt-2 uppercase"
                          >
                            Reset simulation matrices
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Breach Exposure Timeline */}
                        <div className="mt-6 px-5 pb-5">
                          <h2 className="text-sm font-black text-neutral-300 uppercase mb-3">Breach Exposure Timeline</h2>
                          <div className="border-l border-neutral-700 pl-4 space-y-4">
                            {auditLogs.map((log) => (
                              <div key={log.id} className="flex items-start gap-2">
                                <div className="w-2 h-2 rounded-full bg-fuchsia-400 mt-1"></div>
                                <div>
                                  <span className="text-xs text-neutral-500 mr-2">{log.timestamp}</span>
                                  <span className="font-mono text-neutral-300">{log.title}</span>
                                  {log.message && (
                                    <span className="block text-xs text-neutral-400">{log.message}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                    <div className="p-3 bg-neutral-950/80 border-t border-neutral-850 flex items-center justify-between gap-3 text-[10px] font-mono">
                      <span className="text-neutral-500">Sovereign Cleansing Tool version 2.4.9</span>
                      <div className="flex gap-2">
                        <button
                          onClick={handleNukeExplosion}
                          disabled={breachStatus === 'nuked' || isNuking}
                          className="px-3 py-1 bg-gradient-to-r from-fuchsia-600 to-red-650 hover:from-fuchsia-500 hover:to-red-550 text-white font-bold rounded text-[9px] cursor-pointer disabled:opacity-40 transition uppercase"
                        >
                          NUKE ALL EXPOSURES
                        </button>
                        <button
                          onClick={handleKnoxAllSovereign}
                          className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-550 text-white font-bold rounded text-[9px] cursor-pointer transition uppercase flex items-center gap-1"
                        >
                          <Shield className="h-3 w-3" /> KNOX ALL SECURED
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* MINI INTERACTIVE RE-VERIFYING USER PROFILE SYNC ACCORDION */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-black tracking-wider text-neutral-300 uppercase flex items-center gap-1.5">
                        <User className="h-4.5 w-4.5 text-blue-400" /> REAL-WORLD SUITE STATUS
                      </h3>
                      <p className="text-[11px] text-neutral-500 leading-normal font-mono">
                        These real-world authentication markers correlate directly with Israel David's security profiles.
                      </p>

                      <div className="space-y-2.5">
                        <div className="p-3 bg-neutral-950 border border-neutral-850 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-white font-sans">Google Account Sync</p>
                            <p className="text-[10px] text-neutral-500 font-mono">Linked and Verified: idin@agape.nyc</p>
                          </div>
                          <span className="text-[9px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/60 px-2 py-0.5 rounded font-black font-mono">ACTIVE SYNC</span>
                        </div>
                        <div className="p-3 bg-neutral-950 border border-neutral-850 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-white font-sans">Biometric Passkey</p>
                            <p className="text-[10px] text-neutral-500 font-mono">FIDO2 SECURE ENCLAVE MODULE</p>
                          </div>
                          <span className="text-[9px] bg-fuchsia-950/40 text-fuchsia-400 border border-fuchsia-900/60 px-2 py-0.5 rounded font-black font-mono">REGISTERED</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-black tracking-wider text-neutral-300 uppercase flex items-center gap-1.5">
                          <Activity className="h-4.5 w-4.5 text-orange-400" /> SOVEREIGN ANALYTICS
                        </h3>
                        <p className="text-[11px] text-neutral-500 leading-normal mt-1.5 font-mono">
                          Core enclaves operating index is mapped client-side. Trackers caught inside local sandboxes are logged and destroyed instantly.
                        </p>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => setActiveTab('identities')}
                          className="w-full py-2 bg-neutral-950 hover:bg-neutral-855 border border-neutral-800 text-xs font-bold rounded-lg text-white font-mono hover:border-blue-500 transition-all flex items-center justify-center gap-1.5 uppercase cursor-pointer"
                        >
                          View 16 virtual identity heatmaps <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {activeTab === 'identities' && (
                <IdentityModulesPanel 
                  modules={modules}
                  onUpdateModules={handleUpdateModules}
                  triggerAuditLog={triggerAuditLog}
                />
              )}

              {activeTab === 'passwords' && (
                <PasswordManager 
                  passwords={passwords}
                  onUpdatePasswords={handleUpdatePasswords}
                  triggerAuditLog={triggerAuditLog}
                />
              )}

              {activeTab === 'vault' && (
                <DocumentVault 
                  items={vaultItems}
                  onUpdateItems={handleUpdateVault}
                  triggerAuditLog={triggerAuditLog}
                  modules={modules}
                  onUpdateModules={handleUpdateModules}
                />
              )}

              {activeTab === 'messenger' && (
                <EncryptedMessenger 
                  messages={messages}
                  onUpdateMessages={handleUpdateMessages}
                  triggerAuditLog={triggerAuditLog}
                />
              )}

              {activeTab === 'trackers' && (
                <TrackerBlocker 
                  blockedLogs={blockedTrackers}
                  onAddLog={handleAddTrackerLog}
                  onClearLogs={handleClearTrackerLogs}
                  triggerAuditLog={triggerAuditLog}
                />
              )}

              {activeTab === 'ai' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left AI chat console */}
                  <div className="lg:col-span-8 flex flex-col justify-between bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden max-h-[640px]">
                    <div className="p-4 border-b border-neutral-800 bg-neutral-900/50 flex justify-between items-center">
                      <div>
                        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                          <Cpu className="h-4.5 w-4.5 text-orange-400" /> ENCLAVE COUNSELOR CHAT
                        </h3>
                        <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                          {isOffline 
                            ? 'Operating on-device via local model gemma-4-e4b' 
                            : 'Connected standard secure channel path to server-side Gemma'}
                        </p>
                      </div>
                      
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 border rounded uppercase ${
                        isOffline 
                          ? 'bg-orange-950/20 text-orange-400 border-orange-500/40' 
                          : 'bg-blue-950/20 text-blue-400 border-blue-500/40'
                      }`}>
                        {isOffline ? 'Off-Grid gemma-4' : 'Gemma Local Online'}
                      </span>
                    </div>

                    {/* Messages feed */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-neutral-950/25 min-h-[300px]">
                      {aiLogs.map((log, index) => {
                        const isArch = log.sender === 'architect';
                        return (
                          <div
                            key={index}
                            className={`flex flex-col max-w-[85%] ${isArch ? 'mr-auto items-start' : 'ml-auto items-end'}`}
                          >
                            <span className="text-[9px] font-mono text-neutral-500 mb-1">
                              {isArch ? 'Architect Counselor' : 'Local Enclave Operator'} • {log.timestamp}
                            </span>
                            
                            <div className={`p-3 rounded-2xl border text-xs font-sans leading-relaxed ${
                              isArch 
                                ? 'rounded-tl-none bg-neutral-900 border-neutral-850 text-neutral-300' 
                                : 'rounded-tr-none bg-orange-950/10 border-orange-900/35 text-orange-200'
                            }`}>
                              {isArch ? (
                                <div className="space-y-1 text-[11.5px] font-mono whitespace-pre-line leading-relaxed">
                                  {log.text}
                                </div>
                              ) : (
                                <p className="font-mono">{log.text}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {aiLoading && (
                        <div className="flex flex-col items-start max-w-[80%]">
                          <span className="text-[9px] font-mono text-neutral-500 mb-1">Architect Counselor is thinking...</span>
                          <div className="p-3 bg-neutral-900 border border-neutral-850 rounded-2xl rounded-tl-none text-xs text-neutral-500 font-mono animate-pulse">
                            Processing secure prompt matrices...
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Input toolbar */}
                    <form onSubmit={handleAiInquiry} className="p-4 border-t border-neutral-800 bg-neutral-950 flex gap-2">
                      <input
                        type="text"
                        required
                        disabled={aiLoading}
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Inquire on biometric setups, cryptographic standards, leaks..."
                        className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg text-xs py-2.5 px-3 text-white focus:outline-none focus:border-orange-500 font-mono"
                      />
                      <button
                        type="submit"
                        disabled={aiLoading}
                        className="py-2.5 px-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-lg transition-all cursor-pointer shadow"
                      >
                        Ask Counselor
                      </button>
                    </form>
                  </div>

                  {/* Right panel: Standard recommendations guidelines */}
                  <div className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between max-h-[640px] overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold font-mono text-neutral-300 uppercase tracking-widest border-b border-neutral-800 pb-2">
                        SUGGESTED ENCLAVE DIRECTIVES
                      </h4>
                      
                      <div className="space-y-2.5">
                        {[
                          { question: "How does end-to-end encryption guard my documents?", key: "e2ee" },
                          { question: "Explain the isolation of the 16 sandbox modules.", key: "sandbox" },
                          { question: "What risk indicators does the tracker blocker audit?", key: "blocker" },
                          { question: "Is gemma-4-e4b fully airgapped?", key: "gemma" }
                        ].map((item) => (
                          <button
                            key={item.key}
                            onClick={() => {
                              setAiPrompt(item.question);
                            }}
                            className="w-full text-left p-3 bg-neutral-950 hover:bg-neutral-850/40 border border-neutral-850 hover:border-orange-500/50 rounded-lg font-mono text-[10.5px] leading-relaxed text-neutral-400 hover:text-white transition cursor-pointer flex items-center justify-between"
                          >
                            <span>{item.question}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-neutral-600 shrink-0 ml-1" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-8 bg-neutral-950 p-3.5 border border-neutral-850 rounded-lg space-y-2.5">
                      <span className="text-[9px] text-orange-500 font-bold uppercase block tracking-wider">ON-DEVICE HARNESS DIRECTIVE</span>
                      <p className="text-[10px] text-neutral-500 leading-relaxed font-mono">
                        Aegis Core incorporates a localized vector intelligence system (gemma-4-e4b) that parses inquiries without bridging external networks, protecting intellectual property from centralized data harvesting structures.
                      </p>
                    </div>
                  </div>

                </div>
              )}

            </main>
          </div>

          {/* Right Operation Sidebar Container: Security Auditor & Log Auditor */}
          <aside className="w-full xl:w-96 bg-neutral-950 p-4 border-l-0 xl:border-l border-neutral-800/80 flex flex-col justify-between max-h-screen overflow-y-auto custom-scrollbar">
            <div className="space-y-6">
              
              {/* Score card bento design incorporating colors Magenta, Blue, Orange */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 relative overflow-hidden">
                {/* Glowing neon borders based on score severity */}
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  overallScore >= 95 ? 'bg-emerald-500 animate-pulse' :
                  overallScore >= 75 ? 'bg-blue-500' : 'bg-red-500'
                }`} />

                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-bold font-mono text-neutral-300 uppercase tracking-widest">ENCLAVE EVALUATION</h3>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Automated on-device audit score</p>
                  </div>
                  
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-neutral-950 border border-neutral-800 rounded-[4px] text-[10px] font-mono">
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      overallScore >= 95 ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' :
                      overallScore >= 70 ? 'bg-blue-500 shadow-[0_0_6px_#3b82f6]' :
                      'bg-orange-500 shadow-[0_0_6px_#f97316]'
                    }`} />
                    <span className="text-neutral-300 font-bold uppercase tracking-wider">
                      {overallScore >= 95 ? 'SECURED' : overallScore >= 70 ? 'ELEVATED' : 'CRITICAL'}
                    </span>
                  </div>
                </div>

                <div className="my-5 flex items-baseline justify-center gap-1.5">
                  <span className={`text-5xl font-black font-sans tracking-tight ${
                    overallScore >= 95 ? 'text-emerald-400' :
                    overallScore >= 70 ? 'text-blue-400' : 'text-red-500'
                  }`}>{overallScore}</span>
                  <span className="text-sm font-mono text-neutral-600">/ 100 Privacy Standard</span>
                </div>

                {/* Meter visualizer */}
                <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden border border-neutral-800">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      overallScore >= 95 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                      overallScore >= 70 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                      'bg-gradient-to-r from-orange-500 to-red-500'
                    }`}
                    style={{ width: `${overallScore}%` }}
                  />
                </div>
              </div>

              {/* Security Auditor Run Diagnostic Module */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold font-mono text-neutral-300 uppercase tracking-widest flex items-center gap-1.5">
                    <Scan className="h-4 w-4 text-orange-400 animate-pulse" /> COMPREHENSIVE RECONNAISSANCE
                  </h4>
                  {isDiagnosticRunning && (
                    <span className="text-[8px] bg-orange-950 text-orange-400 px-1.5 py-0.5 rounded animate-pulse font-bold">SCANNING</span>
                  )}
                </div>

                {isDiagnosticRunning ? (
                  <div className="py-2.5 bg-neutral-950 rounded-lg p-3 text-center border border-neutral-850">
                    <RefreshCw className="h-4.5 w-4.5 text-orange-400 animate-spin mx-auto mb-2" />
                    <p className="text-[10px] text-neutral-300 font-mono font-bold uppercase">{diagnosticMessage}</p>
                  </div>
                ) : (
                  <button
                    onClick={handleRunDiagnostic}
                    className="w-full py-2 bg-gradient-to-r from-fuchsia-600 to-blue-600 hover:from-fuchsia-500 hover:to-blue-500 text-white text-xs font-medium font-mono rounded-lg transition-all shadow cursor-pointer flex items-center justify-center gap-1.5 uppercase font-bold"
                  >
                    Run Auditing Checkup
                  </button>
                )}

                <div className="space-y-2 pt-1 font-mono">
                  <span className="text-[10px] text-neutral-500 block uppercase border-b border-neutral-800 pb-1 font-bold">Auditor Suggestions ({systemSuggestions.length})</span>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
                    {systemSuggestions.length === 0 ? (
                      <div className="bg-neutral-950 border border-neutral-850 p-2 text-center text-neutral-600 font-mono text-[9px]">
                        No active suggestions. Run checkup.
                      </div>
                    ) : (
                      systemSuggestions.map((sug, i) => (
                        <div key={i} className="bg-neutral-950 border border-neutral-850 p-2.5 rounded text-[10px] leading-relaxed text-neutral-400 font-mono flex items-start gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
                          <span>{sug}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Real-time Audit logs tracker */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                  <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-widest font-mono">REAL-TIME EVENTS</span>
                  <span className="text-[9px] bg-neutral-900 border border-neutral-800 text-neutral-400 px-1 rounded font-mono font-bold">{auditLogs.length} LOGS</span>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1 divide-y divide-neutral-900">
                  {auditLogs.length === 0 ? (
                    <p className="text-neutral-600 text-[10px] font-mono py-4 text-center">No security incidents logged.</p>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="pt-2 flex items-start gap-1.5 text-[10.5px] leading-relaxed font-mono group">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 mt-1.5 ${
                          log.status === 'secured' ? 'bg-emerald-500 shadow-[0_0_4px_#34d399]' :
                          log.status === 'warning' ? 'bg-orange-500 shadow-[0_0_4px_#f97316]' :
                          'bg-red-500 shadow-[0_0_4px_#ef4444]'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-baseline">
                            <span className="font-bold text-neutral-200 uppercase text-[9px] truncate">{log.title}</span>
                            <span className="text-[9px] text-neutral-600 shrink-0 font-mono pl-1">{log.timestamp}</span>
                          </div>
                          <p className="text-neutral-500 text-[9px] leading-normal font-sans tracking-tight mt-0.5 select-all">{log.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Footer Credits */}
            <div className="border-t border-neutral-900 pt-3 text-[9px] text-neutral-600 font-mono flex items-center justify-between mt-6">
              <span>AGAPE SYSTEMS INC. v4.18</span>
              <span>LOCAL HARDWARE ENCLAVE</span>
            </div>
          </aside>

        </div>
      ))}

      {/* SOVEREIGN REPORT MODAL OVERLAY */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 text-neutral-100 w-full max-w-2xl rounded-xl p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Sovereign Encryption & Exposure Report</h3>
                </div>
                <div>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="p-1 text-xs text-neutral-500 hover:text-white cursor-pointer font-bold"
                  >
                    [CLOSE]
                  </button>
                  <button
                    onClick={handleDownloadReport}
                    className="p-1 text-xs text-neutral-500 hover:text-white cursor-pointer font-bold ml-2"
                  >
                    [DOWNLOAD]
                  </button>
                </div>
              </div>

              <div className="space-y-4 text-xs font-mono leading-relaxed max-h-[440px] overflow-y-auto custom-scrollbar bg-neutral-950 p-4 rounded-lg border border-neutral-850">
                <div className="border-b border-neutral-900 pb-3 flex justify-between items-center text-[10px] text-neutral-500">
                  <span>TARGET: IDIN@AGAPE.NYC</span>
                  <span>EVALUATION TIMESTAMP: 2026-06-07 UTC</span>
                </div>

                <div className="space-y-3">
                  <p className="text-red-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 shrink-0" /> EXPOSURE SECTOR 01: 2019 CANVA CORP DATABASE BREACH
                  </p>
                  <p className="text-neutral-400 pl-4">
                    On-device intelligence matched database pattern hashes. Account registered under `idin@agape.nyc` was compromised on Canva server breaches. Compromised payload includes: saltwater crypt-hashes, encrypted registration passwords, and physical IP mapping logs.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-red-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 shrink-0" /> EXPOSURE SECTOR 02: PLAINTEXT PASTE BIN EXPOSURES
                  </p>
                  <p className="text-neutral-400 pl-4">
                    Plaintext credentials matched historical dumps on scrapers. Plaintext credentials of format "david_#####" were flagged in multiple unsealed key stores. Security parameters require immediate cyclic rotations.
                  </p>
                </div>

                <div className="space-y-3 border-t border-neutral-900 pt-3">
                  <p className="text-blue-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4 shrink-0" /> DNS RECONNAISSANCE AUDIT: REGISTRY AGAPE.NYC
                  </p>
                  <pre className="text-[10px] bg-black p-2.5 rounded border border-neutral-900 text-neutral-500 overflow-x-auto">
{`$ dig MX agape.nyc +short
10 mail.agape.nyc.
$ dig TXT agape.nyc +short
"v=spf1 include:_spf.google.com mx ~all" [WARNING: SOFTFAIL FILTER ACTIVE]
$ dig dkim._domainkey.agape.nyc TXT`}
                  </pre>
                  <p className="text-neutral-400 pl-4">
                    Active MX registers verified to agape.nyc. Google SPF filters configured, but softfail directives can allow minor domain spoofing vulnerabilities without strict DKIM/DMARC alignments.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex justify-between items-center text-[10px] text-neutral-500">
                <span>Total threat rating scored critical.</span>
                <div className="flex gap-2 font-bold select-none text-xs">
                  <button
                    onClick={() => {
                      setShowReportModal(false);
                      handleNukeExplosion();
                    }}
                    className="px-4 py-1.5 bg-gradient-to-r from-fuchsia-600 to-red-650 hover:from-fuchsia-500 text-white rounded cursor-pointer uppercase font-mono text-[10px]"
                  >
                    TRIGGER IMMEDIATE NUKE
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

