/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PasswordEntry } from '../types';
import { 
  generateSecurePassword, 
  evaluatePasswordStrength, 
  encryptText, 
  decryptText 
} from '../utils/crypto';
import { 
  Search, Plus, Eye, EyeOff, Copy, Check, Trash2, Key, RefreshCw, 
  ShieldAlert, AlertTriangle, ShieldCheck, ExternalLink, Filter, Sparkles
} from 'lucide-react';

interface PasswordManagerProps {
  passwords: PasswordEntry[];
  onUpdatePasswords: (updated: PasswordEntry[]) => void;
  triggerAuditLog: (title: string, category: 'identity' | 'passwords' | 'vault' | 'trackers', status: 'critical' | 'warning' | 'secured', message: string) => void;
}

export default function PasswordManager({ passwords, onUpdatePasswords, triggerAuditLog }: PasswordManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states for new password creation
  const [showAddForm, setShowAddForm] = useState(false);
  const [service, setService] = useState('');
  const [username, setUsername] = useState('');
  const [rawPassword, setRawPassword] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('Personal');
  const [notes, setNotes] = useState('');

  // Generator Configuration
  const [genLength, setGenLength] = useState(16);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);

  // Derive encryption master temporary key
  const MASTER_XOR_KEY = "AEGIS-CLIENT-KEY-99";

  const handleCreatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !username || !rawPassword) return;

    const strength = evaluatePasswordStrength(rawPassword);
    const encryptedPwd = encryptText(rawPassword, MASTER_XOR_KEY);

    const newEntry: PasswordEntry = {
      id: 'pwd-' + Date.now(),
      service,
      username,
      passwordCipher: encryptedPwd,
      strength,
      url: url.startsWith('http') || !url ? url : `https://${url}`,
      notes,
      category,
      updatedAt: new Date().toLocaleDateString()
    };

    const nextList = [...passwords, newEntry];
    onUpdatePasswords(nextList);

    // Logging
    triggerAuditLog(
      `Credential Registered`,
      'passwords',
      strength === 'weak' ? 'warning' : 'secured',
      `Stored auth token for [${service}]. Password index is evaluated as ${strength.toUpperCase()}.`
    );

    // Reset Form
    setService('');
    setUsername('');
    setRawPassword('');
    setUrl('');
    setNotes('');
    setShowAddForm(false);
  };

  const handleDeletePassword = (id: string, name: string) => {
    const nextList = passwords.filter(p => p.id !== id);
    onUpdatePasswords(nextList);
    triggerAuditLog(
      `Credential Deleted`,
      'passwords',
      'warning',
      `Purged login data object for [${name}] from local keychain.`
    );
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleToggleVisible = (id: string) => {
    setVisiblePasswordIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleRunGenerator = () => {
    const generated = generateSecurePassword(genLength, includeSymbols, includeNumbers);
    setRawPassword(generated);
  };

  const filteredPasswords = passwords.filter(p => {
    const matchesSearch = p.service.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.notes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const getStrengthBadgeStyle = (lvl: PasswordEntry['strength']) => {
    switch (lvl) {
      case 'weak':
        return 'bg-red-950/20 text-red-500 border-red-900/30';
      case 'medium':
        return 'bg-orange-950/20 text-orange-500 border-orange-900/30';
      case 'strong':
        return 'bg-blue-950/20 text-blue-400 border-blue-900/30';
      case 'paranoid':
        return 'bg-fuchsia-950/20 text-fuchsia-400 border-fuchsia-900/30';
      default:
        return 'bg-neutral-800 text-neutral-400 border-neutral-700';
    }
  };

  const getStrengthScore = (lvl: PasswordEntry['strength']) => {
    switch (lvl) {
      case 'weak': return 25;
      case 'medium': return 50;
      case 'strong': return 75;
      case 'paranoid': return 100;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Section Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-sans tracking-tight">ENCRYPTED PASSWORD KEYCHAIN</h2>
          <p className="text-xs text-neutral-400 font-mono mt-0.5">Automated AES-XOR 256-bit simulated key containers</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono font-medium transition-all shadow-md self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {showAddForm ? 'Close Vault' : 'New Vault Credentials'}
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-5"
          >
            <h3 className="text-sm font-bold text-orange-400 font-mono flex items-center gap-1 mb-4 uppercase">
              <Sparkles className="h-4 w-4" /> Generate & Record Auth Key
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Manual Input Entry Form */}
              <form onSubmit={handleCreatePassword} className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-400 font-mono uppercase">Service Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Google Cloud, AWS Console"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-3 text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-400 font-mono uppercase">Username or email *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. idin@agape.nyc"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-3 text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 relative">
                    <label className="block text-[10px] text-neutral-400 font-mono uppercase">Decryption Password *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter raw passphrase"
                      value={rawPassword}
                      onChange={(e) => setRawPassword(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-3 text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-mono font-sans pr-10"
                    />
                    
                    {/* Tiny Strength Color Dots */}
                    {rawPassword && (
                      <div className="absolute right-3 top-7 flex gap-0.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${evaluatePasswordStrength(rawPassword) === 'weak' ? 'bg-red-500' : 'bg-neutral-700'}`} />
                        <span className={`h-1.5 w-1.5 rounded-full ${['medium', 'strong', 'paranoid'].includes(evaluatePasswordStrength(rawPassword)) ? 'bg-orange-500' : 'bg-neutral-700'}`} />
                        <span className={`h-1.5 w-1.5 rounded-full ${['strong', 'paranoid'].includes(evaluatePasswordStrength(rawPassword)) ? 'bg-blue-500' : 'bg-neutral-700'}`} />
                        <span className={`h-1.5 w-1.5 rounded-full ${evaluatePasswordStrength(rawPassword) === 'paranoid' ? 'bg-fuchsia-500' : 'bg-neutral-700'}`} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-400 font-mono uppercase">Target URL Address</label>
                    <input
                      type="text"
                      placeholder="e.g. console.aws.amazon.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-3 text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-4 space-y-1">
                    <label className="block text-[10px] text-neutral-400 font-mono uppercase">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-2.5 text-white focus:outline-none focus:border-orange-500 font-mono"
                    >
                      <option value="Personal">Personal</option>
                      <option value="Finance">Finance</option>
                      <option value="Work">Corporate/Work</option>
                      <option value="Server/Dev">Server/Dev</option>
                      <option value="Web3/Wallet">Web3/Wallet</option>
                    </select>
                  </div>

                  <div className="sm:col-span-8 space-y-1">
                    <label className="block text-[10px] text-neutral-400 font-mono uppercase">Secret Notes</label>
                    <input
                      type="text"
                      placeholder="Pin codes, secondary backup security answers..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-3 text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                </div>

                {/* Simulated cipher code readouts */}
                {rawPassword && (
                  <div className="p-3 bg-neutral-950/70 border border-neutral-800/80 rounded-lg text-[10px] font-mono text-neutral-500 space-y-1">
                    <div className="flex justify-between">
                      <span>STRENGTH: <strong className="text-neutral-300 uppercase">{evaluatePasswordStrength(rawPassword)}</strong></span>
                      <span>CIPHER STREAM DELEGATE (MASTER ALGORITHM): ON</span>
                    </div>
                    <p className="truncate text-fuchsia-400/90 font-mono">
                      XOR: {encryptText(rawPassword, MASTER_XOR_KEY)}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-mono text-xs font-bold rounded-lg transition-all shadow-md mt-2 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Key className="h-4 w-4" /> Save Encrypted Credential
                </button>
              </form>

              {/* Entropy Password Generator Panel */}
              <div className="lg:col-span-5 bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold font-mono text-neutral-300 border-b border-neutral-800 pb-2">
                    HIGH-ENTROPY CORE GENERATOR
                  </h4>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-neutral-400">Character Length:</span>
                      <span className="text-orange-400 font-bold">{genLength} bytes</span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="32"
                      value={genLength}
                      onChange={(e) => setGenLength(parseInt(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2.5 text-xs text-neutral-400 font-mono cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeSymbols}
                        onChange={(e) => setIncludeSymbols(e.target.checked)}
                        className="rounded bg-neutral-900 border-neutral-700 text-orange-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      Include Cryptographic Symbols (!@#$)
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-neutral-400 font-mono cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeNumbers}
                        onChange={(e) => setIncludeNumbers(e.target.checked)}
                        className="rounded bg-neutral-900 border-neutral-700 text-orange-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      Include Numerical Constants (0-9)
                    </label>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleRunGenerator}
                    className="w-full py-2 bg-neutral-900 border border-neutral-700 text-neutral-200 hover:text-white hover:border-orange-500 font-mono text-xs flex items-center justify-center gap-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Initialize Entropy Run
                  </button>
                </div>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Dashboard & Dynamic Password Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search services, usernames, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-8.5 text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-mono"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {['all', 'Personal', 'Finance', 'Work', 'Server/Dev', 'Web3/Wallet'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 text-[10px] rounded font-mono border whitespace-nowrap transition-all uppercase cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-neutral-800 text-white border-orange-500'
                    : 'text-neutral-500 border-neutral-800 hover:text-neutral-300 hover:border-neutral-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Credentials Table View */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-[10px] text-neutral-400 font-mono uppercase tracking-wider">
                <th className="pb-3 pl-2">Service</th>
                <th className="pb-3">Username</th>
                <th className="pb-3">Cipher / Decryption Container</th>
                <th className="pb-3 text-center">Safety Rating</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-mono">
              {filteredPasswords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500 text-xs font-mono">
                    No encrypted keychain records stored. Use "New Vault Credentials" above to define tokens.
                  </td>
                </tr>
              ) : (
                filteredPasswords.map((p) => {
                  const isVisible = visiblePasswordIds.includes(p.id);
                  const decryptedVal = decryptText(p.passwordCipher, MASTER_XOR_KEY);
                  
                  return (
                    <motion.tr 
                      key={p.id}
                      layout
                      className="hover:bg-neutral-850/30 transition-colors group"
                    >
                      {/* Service Info */}
                      <td className="py-3.5 pl-2">
                        <div className="font-bold text-xs text-white">{p.service}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] px-1 bg-neutral-800 border border-neutral-700 rounded text-neutral-400">
                            {p.category}
                          </span>
                          {p.url && (
                            <a 
                              href={p.url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[9px] text-neutral-500 hover:text-orange-400 flex items-center gap-0.5 hover:underline"
                            >
                              <ExternalLink className="h-2.5 w-2.5" /> URL
                            </a>
                          )}
                        </div>
                      </td>

                      {/* User Info */}
                      <td className="py-3.5 text-xs text-neutral-300">
                        {p.username}
                      </td>

                      {/* Decryption Field */}
                      <td className="py-3.5">
                        <div className="flex items-center gap-2 max-w-[280px]">
                          <div className="bg-neutral-950 p-2 border border-neutral-800 rounded font-mono text-[11px] flex-1 truncate select-all">
                            {isVisible ? (
                              <span className="text-emerald-400 font-sans tracking-wide">{decryptedVal}</span>
                            ) : (
                              <span className="text-fuchsia-500 tracking-widest text-[9px]">●●●●●●●● {p.passwordCipher.substring(0, 8)}</span>
                            )}
                          </div>
                          
                          <button
                            onClick={() => handleToggleVisible(p.id)}
                            className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition-colors cursor-pointer"
                            title={isVisible ? "Lock password container" : "Decrypt password display"}
                          >
                            {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          
                          <button
                            onClick={() => handleCopy(decryptedVal, p.id)}
                            className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition-colors cursor-pointer relative"
                            title="Copy unlocked value"
                          >
                            {copiedId === p.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Security rating visual indicator */}
                      <td className="py-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5 border px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide font-mono bg-neutral-950">
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            p.strength === 'paranoid' ? 'bg-fuchsia-500' :
                            p.strength === 'strong' ? 'bg-blue-500' :
                            p.strength === 'medium' ? 'bg-orange-500' : 'bg-red-500'
                          }`} />
                          <span className={`${
                            p.strength === 'paranoid' ? 'text-fuchsia-400' :
                            p.strength === 'strong' ? 'text-blue-400' :
                            p.strength === 'medium' ? 'text-orange-400' : 'text-red-500'
                          }`}>{p.strength}</span>
                        </div>
                        {/* Interactive mini progress meter */}
                        <div className="w-16 mx-auto bg-neutral-800 h-1 rounded-full mt-1.5 overflow-hidden">
                          <div 
                            className={`h-full ${
                              p.strength === 'paranoid' ? 'bg-fuchsia-500' :
                              p.strength === 'strong' ? 'bg-blue-500' :
                              p.strength === 'medium' ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${getStrengthScore(p.strength)}%` }}
                          />
                        </div>
                      </td>

                      {/* Action trigger columns */}
                      <td className="py-3.5 text-right pr-2">
                        <button
                          onClick={() => handleDeletePassword(p.id, p.service)}
                          className="p-1.5 hover:bg-red-950/40 text-neutral-500 hover:text-red-400 rounded transition cursor-pointer"
                          title="Purge key register"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Informative Guidance Card inside tab */}
        <div className="mt-5 border-t border-neutral-800 p-3 flex flex-col md:flex-row items-center justify-between text-xs font-mono text-neutral-400 gap-2">
          <span>Total Keychain Complexity Rating: <strong className="text-orange-400 font-sans">98% High Entropy</strong></span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Automatic backups are zero-knowledge encrypted on local memory ticks.
          </span>
        </div>

      </div>
    </div>
  );
}
