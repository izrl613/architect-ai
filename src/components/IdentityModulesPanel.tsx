/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { IdentityModule } from '../types';
import * as Icons from 'lucide-react';
import { Search, ToggleLeft, ToggleRight, Shield, ShieldAlert, KeyRound, Smartphone, Fingerprint, RefreshCw, Cpu, Plus, Trash2, ArrowUpRight, HelpCircle } from 'lucide-react';

interface IdentityModulesPanelProps {
  modules: IdentityModule[];
  onUpdateModules: (updated: IdentityModule[]) => void;
  triggerAuditLog: (title: string, category: 'identity' | 'passwords' | 'vault' | 'trackers', status: 'critical' | 'warning' | 'secured', message: string) => void;
}

export default function IdentityModulesPanel({ modules, onUpdateModules, triggerAuditLog }: IdentityModulesPanelProps) {
  const [selectedId, setSelectedId] = useState<string>(m => {
    // Graceful initializer to fallback cleanly
    return m?.[0]?.id || '';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [newAppInput, setNewAppInput] = useState('');

  const currentModule = modules.find(m => m.id === selectedId) || modules[0];

  // Helper to calculate Exposure Score (0 - 100) based on active network state, whitelist apps, and total bytes
  const calculateExposureScore = (m: IdentityModule) => {
    // Stored bytes logarithmic scale relative to max seed bytes (approx 154 MB)
    const maxBytes = 154020300;
    const bytesWeight = m.encryptedBytes > 0 
      ? Math.log(m.encryptedBytes + 1) / Math.log(maxBytes + 1) 
      : 0;
    
    // Connection weight (0.35 if active, 0.05 if paused)
    const activityWeight = m.isActive ? 0.35 : 0.05;
    
    // Whitelisted apps count weight (up to 4 apps, weights up to 0.20)
    const appsWeight = Math.min(1.0, m.authorizedApps.length / 4) * 0.20;
    
    // Protection Level modifier
    // 'Paranoid' reduces score by 0.10, Standard adds 0.10, Elevated is neutral
    let levelModifier = 0;
    if (m.protectionLevel === 'Paranoid') levelModifier = -0.10;
    if (m.protectionLevel === 'Standard') levelModifier = 0.10;

    // Combine factors
    const score = (bytesWeight * 0.45) + activityWeight + appsWeight + levelModifier;
    
    // Normalized safely to 0-100
    return Math.max(5, Math.min(100, Math.round(score * 100)));
  };

  const handleToggleModuleActive = (id: string) => {
    const nextList = modules.map(m => {
      if (m.id === id) {
        const nextState = !m.isActive;
        triggerAuditLog(
          `${m.name} ${nextState ? 'Activated' : 'Suspended'}`,
          'identity',
          nextState ? 'secured' : 'warning',
          `Sandbox module [${m.code}] configured for ${m.flowRequirement} is now ${nextState ? 'actively guarding endpoints' : 'suspended'}.`
        );
        return { ...m, isActive: nextState };
      }
      return m;
    });
    onUpdateModules(nextList);
  };

  const handleUpdateMFAType = (id: string, type: IdentityModule['mfaType']) => {
    const nextList = modules.map(m => {
      if (m.id === id) {
        return { ...m, mfaType: type };
      }
      return m;
    });
    onUpdateModules(nextList);
    triggerAuditLog(`MFA Protocol Modified`, 'identity', 'secured', `Module ${currentModule.code} updated MFA configuration to ${type}.`);
  };

  const handleToggleMFAEnabled = (id: string) => {
    const nextList = modules.map(m => {
      if (m.id === id) {
        const nextVal = !m.mfaEnabled;
        return { 
          ...m, 
          mfaEnabled: nextVal,
          mfaSecret: nextVal && !m.mfaSecret ? 'AEGIS-' + Math.random().toString(36).substring(3, 11).toUpperCase() : m.mfaSecret
        };
      }
      return m;
    });
    onUpdateModules(nextList);
    const mod = modules.find(m => m.id === id);
    if (mod) {
      triggerAuditLog(
        `MFA ${!mod.mfaEnabled ? 'Enabled' : 'Disabled'}`,
        'identity',
        !mod.mfaEnabled ? 'secured' : 'critical',
        `MFA enforcement state flipped for identity ${mod.code}. Disabling MFA lowers data protection ratings.`
      );
    }
  };

  const handleUpdateProtectionLevel = (id: string, level: IdentityModule['protectionLevel']) => {
    const nextList = modules.map(m => {
      if (m.id === id) {
        return { ...m, protectionLevel: level };
      }
      return m;
    });
    onUpdateModules(nextList);
    triggerAuditLog(`Protection Tightened`, 'identity', 'secured', `Core sandbox defense level for ${currentModule.name} upgraded to ${level}.`);
  };

  const handleRegenSecret = (id: string) => {
    const nextList = modules.map(m => {
      if (m.id === id) {
        return { ...m, mfaSecret: 'AEGIS-' + Math.random().toString(36).substring(3, 11).toUpperCase() };
      }
      return m;
    });
    onUpdateModules(nextList);
    triggerAuditLog(`MFA Secrets Cycle Completed`, 'identity', 'secured', `Revoked previous cryptographic seed coordinates for ${currentModule.code}. Spun high-entropy replacement seed successfully.`);
  };

  const handleAddApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppInput.trim()) return;
    const nextList = modules.map(m => {
      if (m.id === currentModule.id) {
        return { ...m, authorizedApps: [...m.authorizedApps, newAppInput.trim()] };
      }
      return m;
    });
    onUpdateModules(nextList);
    setNewAppInput('');
    triggerAuditLog(`Whitelist App Registered`, 'identity', 'secured', `Authorized app [${newAppInput.trim()}] linked to module ${currentModule.code} sandbox.`);
  };

  const handleRemoveApp = (app: string) => {
    const nextList = modules.map(m => {
      if (m.id === currentModule.id) {
        return { ...m, authorizedApps: m.authorizedApps.filter(a => a !== app) };
      }
      return m;
    });
    onUpdateModules(nextList);
    triggerAuditLog(`Whitelist App Revoked`, 'identity', 'warning', `Revoked gateway permission for [${app}] on module ${currentModule.code}.`);
  };

  // Helper inside loop to resolve dynamic Lucide icons safely
  const renderModuleIcon = (name: string, className = "h-5 w-5") => {
    const LucideIcon = (Icons as any)[name];
    if (LucideIcon) return <LucideIcon className={className} />;
    return <Icons.Shield className={className} />;
  };

  const filteredModules = modules.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.flowRequirement.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = levelFilter === 'all' || m.protectionLevel.toLowerCase() === levelFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const activeCount = modules.filter(m => m.isActive).length;

  return (
    <div className="space-y-6">
      {/* Top statistics banners in Magenta, Blue, Orange */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          <p className="text-xs font-mono text-neutral-400">CORE SYSTEM IDENTITIES</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-blue-400 font-sans">{activeCount}</span>
            <span className="text-sm font-mono text-neutral-500">/ 16 Active Sandbox Modules</span>
          </div>
          <div className="w-full bg-neutral-800 h-1 mt-4 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full" style={{ width: `${(activeCount / 16) * 100}%` }} />
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-fuchsia-500 animate-pulse" />
          <p className="text-xs font-mono text-neutral-400">TOTAL ENCRYPTED SEED STORAGE</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-fuchsia-400 font-sans">
              {(modules.reduce((acc, m) => acc + (m.isActive ? m.encryptedBytes : 0), 0) / 1024 / 1024).toFixed(1)}
            </span>
            <span className="text-sm font-mono text-neutral-500">MB Protected</span>
          </div>
          <div className="w-full bg-neutral-800 h-1 mt-4 rounded-full overflow-hidden">
            <div className="bg-fuchsia-500 h-full" style={{ width: `${(modules.reduce((a,c) => a+(c.isActive?1:0),0)/16)*100}%` }} />
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
          <p className="text-xs font-mono text-neutral-400">MFA ENFORCEMENT</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-orange-400 font-sans">
              {modules.filter(m => m.mfaEnabled).length}
            </span>
            <span className="text-sm font-mono text-neutral-500">/ 16 Safeguarded</span>
          </div>
          <div className="w-full bg-neutral-800 h-1 mt-4 rounded-full overflow-hidden">
            <div className="bg-orange-500 h-full" style={{ width: `${(modules.filter(m => m.mfaEnabled).length / 16) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Dynamic Privacy Surface Area Heatmap Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-neutral-800/65">
          <div>
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Icons.Activity className="h-4.5 w-4.5 text-fuchsia-400 animate-pulse" />
              PRIVACY SURFACE AREA & DATA DENSITY HEATMAP
            </h3>
            <p className="text-[10.5px] text-neutral-400 font-mono mt-0.5">
              Identifies sandbox vulnerability zones by calculating normalized scales of data footprint size, connection states, and whitelist mappings.
            </p>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap gap-3 text-[9px] font-mono select-none">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-neutral-950 border border-blue-500/60 shadow-[0_0_4px_rgba(59,130,246,0.2)] shrink-0" />
              <span className="text-neutral-400">LOW EXPOSURE (&lt;40%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-neutral-950 border border-fuchsia-500/60 shadow-[0_0_4px_rgba(217,70,239,0.2)] shrink-0" />
              <span className="text-neutral-400">MODERATE EXPOSURE (40-70%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-neutral-950 border border-orange-500/60 shadow-[0_0_4px_rgba(249,115,22,0.2)] shrink-0 animate-pulse" />
              <span className="text-neutral-400">CRITICAL EXPOSURE (&gt;70%)</span>
            </span>
          </div>
        </div>

        {/* Dynamic Details Monitor Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
          
          {/* Heatmap Grid: 16 sector blocks */}
          <div className="xl:col-span-8 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
            {modules.map((m) => {
              const score = calculateExposureScore(m);
              const isSelected = m.id === selectedId;
              
              // Color style resolving
              let colorClasses = {
                border: 'border-blue-900/60 hover:border-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.05)] bg-blue-950/5',
                indicator: 'bg-blue-500 shadow-[0_0_6px_#3b82f6]',
                text: 'text-blue-400'
              };
              if (score >= 70) {
                colorClasses = {
                  border: 'border-orange-900/65 hover:border-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.05)] bg-orange-950/5',
                  indicator: 'bg-orange-500 shadow-[0_0_8px_#f97316] animate-pulse',
                  text: 'text-orange-400'
                };
              } else if (score >= 40) {
                colorClasses = {
                  border: 'border-fuchsia-900/65 hover:border-fuchsia-500 shadow-[0_0_4px_rgba(217,70,239,0.05)] bg-fuchsia-950/5',
                  indicator: 'bg-fuchsia-500 shadow-[0_0_6px_#d946ef]',
                  text: 'text-fuchsia-400'
                };
              }

              if (isSelected) {
                if (score >= 70) colorClasses.border = 'border-orange-500 bg-orange-950/20 ring-1 ring-orange-400/50';
                else if (score >= 40) colorClasses.border = 'border-fuchsia-500 bg-fuchsia-950/20 ring-1 ring-fuchsia-400/50';
                else colorClasses.border = 'border-blue-500 bg-blue-950/20 ring-1 ring-blue-400/60';
              }

              return (
                <button
                  key={m.id}
                  id={`heatmap-cell-${m.id}`}
                  onClick={() => setSelectedId(m.id)}
                  className={`p-3 rounded-xl border text-left transition-all relative group flex flex-col justify-between h-[76px] cursor-pointer ${colorClasses.border}`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[10px] font-bold font-mono text-neutral-400 group-hover:text-white uppercase">
                      {m.code}
                    </span>
                    <span className={`h-1.5 w-1.5 rounded-full ${colorClasses.indicator}`} />
                  </div>

                  <div className="mt-2 text-left">
                    <span className="text-[9.5px] font-sans font-bold text-neutral-300 block truncate leading-tight group-hover:text-white">
                      {m.name}
                    </span>
                    <div className="flex items-center justify-between mt-1 text-[8px] font-mono text-neutral-500">
                      <span className={isSelected ? 'text-white font-bold' : ''}>{score}% EXP</span>
                      <span className="truncate max-w-[45px]">
                        {(m.encryptedBytes / 1024 / 1024).toFixed(1)}MB
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Focus Sector Diagnostics Readout panel */}
          <div className="xl:col-span-4 bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between min-h-[160px]">
            {currentModule ? (
              <div className="space-y-3.5 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-800/85">
                    <span className="text-[10px] font-bold text-neutral-450 font-mono uppercase tracking-wider">
                      SECTOR READOUT: {currentModule.code}
                    </span>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                      calculateExposureScore(currentModule) >= 70 ? 'bg-orange-950/40 text-orange-400 border-orange-500/30' :
                      calculateExposureScore(currentModule) >= 40 ? 'bg-fuchsia-950/40 text-fuchsia-400 border-fuchsia-500/30' :
                      'bg-blue-950/40 text-blue-400 border-blue-500/30'
                    }`}>
                      Score: {calculateExposureScore(currentModule)}/100
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-2.5">
                    <h4 className="text-xs font-bold text-white tracking-tight truncate leading-tight font-sans">{currentModule.name}</h4>
                    <p className="text-[10px] text-neutral-400 font-mono leading-relaxed line-clamp-2">
                      {currentModule.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-neutral-500 border-t border-neutral-800 pt-2.5 mt-2">
                  <div>
                    <span className="block text-[8px] text-neutral-600 uppercase font-bold">ACTIVE TUNNEL</span>
                    <span className={currentModule.isActive ? 'text-emerald-400 font-bold' : 'text-neutral-500 font-bold'}>
                      {currentModule.isActive ? 'ONLINE ACTIVE' : 'BRIDGE CLOSED'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-neutral-600 uppercase font-bold">SECURED BYTES</span>
                    <span className="text-neutral-300 font-bold">
                      {(currentModule.encryptedBytes / 1024 / 1024).toFixed(3)} Megabytes
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-neutral-600 uppercase font-bold">WHITELIST CLIENTS</span>
                    <span className="text-neutral-300 font-bold">
                      {currentModule.authorizedApps.length} Clients
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-neutral-600 uppercase font-bold">QUARANTINE LVL</span>
                    <span className="text-neutral-400 font-bold">
                      {currentModule.protectionLevel}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full text-neutral-600 font-mono py-6">
                <Icons.Activity className="h-6 w-6 stroke-[1.5] text-neutral-700 animate-pulse mb-1" />
                <p className="text-[10px] uppercase font-bold">Awaiting hardware handshake</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Main Content Split: Left list, Right custom configuration panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Modular Identity List */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col overflow-hidden max-h-[640px]">
          <div className="p-4 border-b border-neutral-800">
            <h3 className="text-sm font-bold font-mono text-white flex items-center justify-between gap-1">
              <span>WORKFLOW IDENTITY MODULES</span>
              <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-900/40 font-mono px-2 py-0.5 rounded-full">
                16 Modules Available
              </span>
            </h3>
            
            <div className="mt-4 relative">
              <input
                type="text"
                placeholder="Search specs, tags, codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-8.5 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 font-mono"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
            </div>

            {/* Filter buttons */}
            <div className="mt-3 flex gap-2">
              {['all', 'standard', 'elevated', 'paranoid'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-2 py-1 text-[10px] rounded font-mono border uppercase transition-all cursor-pointer ${
                    levelFilter === lvl
                      ? 'bg-neutral-800 text-white border-blue-500/50'
                      : 'text-neutral-500 border-neutral-800 hover:text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/60 custom-scrollbar">
            {filteredModules.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs font-mono">
                No identity matches the specified crypto parameters.
              </div>
            ) : (
              filteredModules.map((m) => {
                const isSelected = m.id === selectedId;
                const threatColor = 
                  m.protectionLevel === 'Paranoid' ? 'text-orange-500 bg-orange-950/15 border-orange-900/20' : 
                  m.protectionLevel === 'Elevated' ? 'text-fuchsia-400 bg-fuchsia-950/15 border-fuchsia-900/20' : 
                  'text-blue-400 bg-blue-950/15 border-blue-900/20';

                return (
                  <div 
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-neutral-800/40 border-l-2 border-fuchsia-500' 
                        : 'hover:bg-neutral-800/20'
                    }`}
                  >
                    <div className={`p-2 rounded-lg bg-neutral-950/80 border ${isSelected ? 'border-fuchsia-500/40 text-fuchsia-400' : 'border-neutral-800 text-neutral-400'}`}>
                      {renderModuleIcon(m.iconName, "h-5 w-5")}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-neutral-200 font-mono tracking-wider">{m.code} : {m.name}</span>
                        <span className={`text-[9px] font-mono border px-1.5 rounded uppercase ${threatColor}`}>
                          {m.protectionLevel}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5 font-mono">{m.description}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${m.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'}`} />
                          <span className="text-[9px] font-mono text-neutral-500 uppercase">{m.isActive ? 'Active sandbox' : 'Paused'}</span>
                        </div>
                        {m.mfaEnabled && (
                          <span className="text-[9px] font-mono text-orange-400 flex items-center gap-0.5 bg-orange-950/20 border border-orange-900/30 px-1 rounded">
                            <KeyRound className="h-2.5 w-2.5" /> MFA
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Identity Core Customizer */}
        <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-xl p-5 overflow-y-auto max-h-[640px]">
          {currentModule ? (
            <div className="space-y-6">
              
              {/* Header Box */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-700 text-fuchsia-400 shadow-md">
                    {renderModuleIcon(currentModule.iconName, "h-7 w-7")}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-neutral-800 rounded text-neutral-300 border border-neutral-700">
                        {currentModule.code}
                      </span>
                      <h2 className="text-base font-bold text-white font-sans">{currentModule.name}</h2>
                    </div>
                    <p className="text-xs text-neutral-400 font-mono mt-1">Config Target: {currentModule.flowRequirement}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                  <span className="text-xs font-mono text-neutral-400">SHIELD STATUS</span>
                  <button 
                    onClick={() => handleToggleModuleActive(currentModule.id)}
                    className="focus:outline-none cursor-pointer"
                  >
                    {currentModule.isActive ? (
                      <ToggleRight className="h-8 w-8 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-neutral-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Left card: Guard Parameters */}
                <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 space-y-4">
                  <h4 className="text-xs font-bold text-blue-400 font-mono tracking-wider flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5" /> SECURITY SHIELD CORE
                  </h4>

                  <div className="space-y-3">
                    <label className="block text-[10px] text-neutral-400 uppercase font-mono">Defense Quarantine Standard</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Standard', 'Elevated', 'Paranoid'] as const).map((lvl) => {
                        const isChosen = currentModule.protectionLevel === lvl;
                        const borderStyle = isChosen 
                          ? lvl === 'Paranoid' ? 'border-orange-500 bg-orange-950/20 text-orange-400'
                            : lvl === 'Elevated' ? 'border-fuchsia-500 bg-fuchsia-950/20 text-fuchsia-400'
                            : 'border-blue-500 bg-blue-950/20 text-blue-400'
                          : 'border-neutral-800 hover:border-neutral-700 text-neutral-500 bg-transparent';
                        return (
                          <button
                            key={lvl}
                            onClick={() => handleUpdateProtectionLevel(currentModule.id, lvl)}
                            className={`py-1 rounded text-[10px] font-mono border font-medium uppercase transition-all cursor-pointer ${borderStyle}`}
                          >
                            {lvl}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-neutral-800/60 pt-3">
                    <span className="text-[10px] text-neutral-400 uppercase font-mono">Isolated App Sandbox Bounds</span>
                    <div className="flex gap-2">
                      <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">Memory Encryption: AES-XTS-256</span>
                      <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">Network: Sandbox Tor Proxy</span>
                    </div>
                  </div>
                </div>

                {/* Right card: MFA Enforcer */}
                <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-orange-400 font-mono tracking-wider flex items-center gap-1">
                      <KeyRound className="h-3.5 w-3.5" /> MULTI-FACTOR SETUP
                    </h4>
                    <button
                      onClick={() => handleToggleMFAEnabled(currentModule.id)}
                      className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase border cursor-pointer ${
                        currentModule.mfaEnabled 
                          ? 'bg-orange-950/20 text-orange-400 border-orange-500/40' 
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}
                    >
                      {currentModule.mfaEnabled ? 'Enforced' : 'Disabled'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[10px] text-neutral-400 uppercase font-mono">Primary MFA Vector</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['TOTP', 'Biometric', 'SMS', 'Hardware Key'] as const).map((method) => {
                        const isChosen = currentModule.mfaType === method;
                        return (
                          <button
                            key={method}
                            disabled={!currentModule.mfaEnabled}
                            onClick={() => handleUpdateMFAType(currentModule.id, method)}
                            className={`py-1 px-2 text-[10px] rounded font-mono border flex items-center gap-1.5 transition-all cursor-pointer ${
                              isChosen 
                                ? 'bg-orange-950/20 border-orange-500/50 text-orange-400' 
                                : 'border-neutral-800 text-neutral-500 hover:text-neutral-400 hover:border-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed'
                            }`}
                          >
                            {method === 'TOTP' && <Smartphone className="h-3.5 w-3.5 shrink-0" />}
                            {method === 'Biometric' && <Fingerprint className="h-3.5 w-3.5 shrink-0" />}
                            {method === 'SMS' && <Icons.MessageSquare className="h-3.5 w-3.5 shrink-0" />}
                            {method === 'Hardware Key' && <Icons.Key className="h-3.5 w-3.5 shrink-0" />}
                            {method}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {currentModule.mfaEnabled && (
                    <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-lg flex items-center justify-between text-xs font-mono">
                      <div className="truncate pr-1">
                        <span className="text-[9px] text-neutral-500 block uppercase font-mono">Authentic Security Seed</span>
                        <code className="text-neutral-300 font-mono tracking-widest text-[10px]">{currentModule.mfaSecret || 'Biometric Bound Key'}</code>
                      </div>
                      {currentModule.mfaType !== 'Biometric' && (
                        <button 
                          onClick={() => handleRegenSecret(currentModule.id)}
                          title="Generate high-entropy key seed"
                          className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition-colors cursor-pointer"
                        >
                          <RefreshCw className="h-3.5 w-3.5 animate-spin-hover" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Authorized App Quarantines & Whitelists */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-neutral-300 font-mono tracking-wider uppercase flex items-center gap-1">
                    <Cpu className="h-3.5 w-3.5 text-fuchsia-400" /> Whitelisted Applications Bounds
                  </h4>
                  <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase">
                    {currentModule.authorizedApps.length} Apps Attached
                  </span>
                </div>

                <form onSubmit={handleAddApp} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. ProtonMail Secure Client, Brave Sandbox"
                    value={newAppInput}
                    onChange={(e) => setNewAppInput(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg text-xs py-2 px-3 text-white placeholder-neutral-500 focus:outline-none focus:border-fuchsia-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="py-2 px-3.5 bg-gradient-to-r from-fuchsia-500 to-blue-600 hover:from-fuchsia-400 hover:to-blue-500 text-white font-mono text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Authorize App
                  </button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                  {currentModule.authorizedApps.map((app) => (
                    <div 
                      key={app}
                      className="bg-neutral-900 border border-neutral-800/60 p-2.5 rounded-lg flex items-center justify-between group hover:border-neutral-700 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <span className="text-xs font-mono text-neutral-300">{app}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveApp(app)}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-neutral-800 text-red-400 hover:text-red-300 rounded transition cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Setup Guidance Box */}
              <div className="bg-neutral-950/40 border border-neutral-800 rounded-lg p-3.5 text-xs text-neutral-400 font-mono flex items-start gap-2.5">
                <HelpCircle className="h-4 w-4 stroke-[1.5] text-neutral-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-neutral-300 font-bold uppercase text-[9px] tracking-wide">SYSTEM ARCHITECTURE DIRECTIVE</p>
                  <p className="text-[11px] leading-relaxed">
                    Identity Profiles act as hardware virtualization layers. When you run an app connected to <span className="text-fuchsia-400 font-bold">{currentModule.name}</span>, all storage handles redirect to an off-record, encrypted key sector, enforcing dual-factor checkpoints to read files.
                  </p>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-neutral-500 font-mono text-xs">
              Select an isolation profile to customize hardware variables.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
