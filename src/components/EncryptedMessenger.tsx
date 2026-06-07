/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EncryptedMessage } from '../types';
import { encryptText, decryptText } from '../utils/crypto';
import { 
  Send, ShieldAlert, KeyRound, Lock, Unlock, RefreshCw, 
  User, CheckCheck, Trash2, ArrowRightLeft, Sparkles, MessageSquare 
} from 'lucide-react';

interface EncryptedMessengerProps {
  messages: EncryptedMessage[];
  onUpdateMessages: (updated: EncryptedMessage[]) => void;
  triggerAuditLog: (title: string, category: 'identity' | 'passwords' | 'vault' | 'trackers', status: 'critical' | 'warning' | 'secured', message: string) => void;
}

export default function EncryptedMessenger({ messages, onUpdateMessages, triggerAuditLog }: EncryptedMessengerProps) {
  const [plaintextInput, setPlaintextInput] = useState('');
  const [recipient, setRecipient] = useState('Secure Journalist Server');
  const [keyInput, setKeyInput] = useState('ALPHA-OMEGA-99');
  
  // Decryption sandbox state
  const [activeDecryptId, setActiveDecryptId] = useState<string | null>(null);
  const [decryptKeyAttempt, setDecryptKeyAttempt] = useState('');
  const [decryptionResultMap, setDecryptionResultMap] = useState<Record<string, string>>({});
  const [decryptError, setDecryptError] = useState('');

  const liveCiphertext = encryptText(plaintextInput, keyInput);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plaintextInput.trim()) return;

    const freshCiphertext = encryptText(plaintextInput, keyInput);
    const newMessage: EncryptedMessage = {
      id: 'msg-' + Date.now(),
      sender: 'Local Client Enclave (You)',
      recipient,
      plaintext: plaintextInput.trim(),
      ciphertext: freshCiphertext,
      secretKey: keyInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelfSent: true
    };

    const updated = [...messages, newMessage];
    onUpdateMessages(updated);
    setPlaintextInput('');

    triggerAuditLog(
      `E2E Message Dispatched`,
      'identity',
      'secured',
      `Outgoing payload E2E-locked using key [${keyInput.substring(0,3)}***]. Transmitted via cascading onion router.`
    );
  };

  const handleClearThread = () => {
    onUpdateMessages([]);
    setDecryptionResultMap({});
    triggerAuditLog(`Message Logs Cleared`, 'identity', 'warning', 'Purged encrypted local conversational enclaves recursively.');
  };

  const handleAttemptDecryption = (msg: EncryptedMessage) => {
    if (!decryptKeyAttempt.trim()) return;
    
    // Attempt standard crypto decrypt
    const processedResponse = decryptText(msg.ciphertext, decryptKeyAttempt.trim());
    
    // Check if decryption succeeded (requires plaintext match or not returning bad ciphertext marker)
    if (processedResponse.includes('[Decryption Failed') || decryptKeyAttempt.trim() !== msg.secretKey) {
      setDecryptError('Decryption code invalid: Structural hashing signature mismatch. Cipher remains locked.');
      return;
    }

    setDecryptionResultMap(prev => ({
      ...prev,
      [msg.id]: processedResponse
    }));
    setActiveDecryptId(null);
    setDecryptKeyAttempt('');
    setDecryptError('');

    triggerAuditLog(
      `Message Cache Decrypted`,
      'identity',
      'secured',
      `Successfully matched key signatures to decrypt node transit packet ID [${msg.id.substring(4, 9)}].`
    );
  };

  const handleTriggerMockReceive = () => {
    const randomizedIncomingKeys = ['BURNING-LEAK-2026', 'SECURE-NODE-88', 'SECRET-VPN-KEY'];
    const selectedKey = randomizedIncomingKeys[Math.floor(Math.random() * randomizedIncomingKeys.length)];
    const messagesPool = [
      { text: "Federal firewalls are auditing proxy ports. Adjust standard sandbox isolation level to strict paranoid bounds.", sender: "Anonymized Developer" },
      { text: "I uploaded the financial balance tax sheet in the secure vault. Password to mount it is CLOUD-VAULT-2026.", sender: "Press Contact #3" },
      { text: "Tracking nodes active in Dublin server gateways. Ensure real-time tracker blocking shield is running Standard.", sender: "Tor Router Guard" }
    ];
    const pickedMessage = messagesPool[Math.floor(Math.random() * messagesPool.length)];

    const cipher = encryptText(pickedMessage.text, selectedKey);
    const mockMsg: EncryptedMessage = {
      id: 'msg-rec-' + Date.now(),
      sender: pickedMessage.sender,
      recipient: 'Client Enclave (You)',
      plaintext: pickedMessage.text,
      ciphertext: cipher,
      secretKey: selectedKey,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelfSent: false
    };

    onUpdateMessages([...messages, mockMsg]);
    triggerAuditLog(
      `Encrypted Packet Sensed`,
      'identity',
      'warning',
      `Airgap ingress sensor received raw payload from ${mockMsg.sender}. Match original private code to translate packet content.`
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Left Frame: Message Composer & Real-time Hex preview panel */}
      <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-bold font-mono text-white tracking-wide uppercase flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-fuchsia-500" /> SECURE COMPOSE CHANNEL
            </h3>
            <span className="text-[10px] bg-fuchsia-950/20 text-fuchsia-400 border border-fuchsia-900/30 font-mono px-2 py-0.5 rounded uppercase">
              E2EE Active
            </span>
          </div>

          <form onSubmit={handleSendMessage} className="space-y-4">
            
            <div className="space-y-1">
              <label className="block text-[10px] text-neutral-400 uppercase font-mono">Recipient Node Address</label>
              <select
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-2.5 text-white focus:outline-none focus:border-fuchsia-500 font-mono"
              >
                <option value="Secure Journalist Server">Secure Journalist Server (ID-12 Press)</option>
                <option value="Anonymous Whistleblower Terminal">Anonymous Whistleblower Terminal</option>
                <option value="Dev Sandbox Node 01">Dev Sandbox Local Node (ID-02)</option>
                <option value="Web3 Smart Contract Escrow">Web3 Escrow Ledger</option>
              </select>
            </div>

            <div className="space-y-1 relative">
              <label className="block text-[10px] text-neutral-400 uppercase font-mono">End-to-End Cryptographic Handshake Key</label>
              <input
                type="text"
                required
                placeholder="Declare high-entropy decryption key"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-3 pr-10 text-white placeholder-neutral-500 focus:outline-none focus:border-fuchsia-500 font-mono tracking-wider font-bold"
              />
              <KeyRound className="absolute right-3 top-7.5 h-3.5 w-3.5 text-neutral-500" />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-neutral-400 uppercase font-mono">Sensitive Plaintext Core</label>
              <textarea
                placeholder="Compose secure memo payload here..."
                required
                value={plaintextInput}
                onChange={(e) => setPlaintextInput(e.target.value)}
                rows={3}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-3 text-white placeholder-neutral-500 focus:outline-none focus:border-fuchsia-500 font-mono resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!plaintextInput.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-fuchsia-500 to-blue-600 hover:from-fuchsia-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono text-xs font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" /> Cipher E2EE & Dispatch
            </button>
          </form>
        </div>

        {/* Real-time calculated ciphertext preview pane in Orange */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex-1 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold font-mono text-orange-400 uppercase tracking-widest flex items-center gap-1">
              <Unlock className="h-3.5 w-3.5" /> Live Ciphertext Hashing Streams
            </h4>
            <p className="text-[10px] text-neutral-500 mt-1 font-mono">Real-time modular transit packet rendering preview:</p>
          </div>

          <div className="my-3 bg-neutral-950 border border-neutral-800/80 rounded-lg p-3 min-h-[120px] max-h-[140px] overflow-y-auto select-all relative group custom-scrollbar">
            {plaintextInput ? (
              <span className="text-[11px] font-mono leading-relaxed text-orange-400/90 break-all">{liveCiphertext}</span>
            ) : (
              <span className="text-[10px] font-mono text-neutral-600 absolute inset-0 flex items-center justify-center">Compose above to see live XOR calculations.</span>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
            <span>PACKET SIZING: {plaintextInput ? liveCiphertext.length : 0} bytes</span>
            <span className="text-orange-500 underline font-semibold">CIPHER: AES-XOR-BASE64</span>
          </div>
        </div>

      </div>

      {/* Right Frame: Onion-Router Messenger Feed */}
      <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col overflow-hidden max-h-[620px]">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4.5 w-4.5 text-blue-400 animate-pulse" />
            <div>
              <span className="text-xs font-bold text-white font-mono tracking-wider">AIRGAP COMMS LOG</span>
              <p className="text-[10px] text-neutral-500 font-mono mt-0.5">Multiplexed onion-tunnel connection feed</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTriggerMockReceive}
              className="py-1 px-2 text-[10px] bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white rounded font-mono hover:border-blue-400/50 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" /> Simulate Inbound
            </button>
            <button
              onClick={handleClearThread}
              disabled={messages.length === 0}
              className="p-1 px-2.5 text-[10px] border border-neutral-800 hover:border-red-900/50 text-neutral-500 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed rounded font-mono transition cursor-pointer"
            >
              Reset Comms
            </button>
          </div>
        </div>

        {/* Messaging Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-neutral-950/20">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="p-3 rounded-full bg-neutral-900 border border-neutral-800/80 mb-3 text-neutral-600">
                <MessageSquare className="h-8 w-8" />
              </div>
              <p className="text-xs font-mono text-neutral-500 max-w-[280px]">No packets currently on record. Compose an outbound envelope or trigger "Simulate Inbound" to audit encryption handshakes.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isDecrypted = !!decryptionResultMap[msg.id];
              const displayContent = isDecrypted ? decryptionResultMap[msg.id] : msg.ciphertext;
              
              return (
                <div 
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${msg.isSelfSent ? 'ml-auto items-end animate-fade-in' : 'mr-auto items-start animate-fade-in'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-neutral-500">
                    <User className="h-3 w-3 text-neutral-400" />
                    <span>{msg.sender}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div className={`p-3.5 rounded-2xl border text-xs font-mono select-all ${
                    msg.isSelfSent 
                      ? 'rounded-tr-none bg-blue-950/15 border-blue-900/50 text-blue-200' 
                      : 'rounded-tl-none bg-fuchsia-950/15 border-fuchsia-900/50 text-fuchsia-200'
                  }`}>
                    {isDecrypted ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1 text-[10px] text-emerald-400 border-b border-emerald-900/20 pb-1 font-mono uppercase tracking-widest font-black">
                          <Unlock className="h-3 w-3" /> DECRYPTED DEBRIS CLEAR
                        </div>
                        <p className="font-sans font-medium text-neutral-100 text-[13px] leading-relaxed">{displayContent}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 text-[9px] text-orange-400 border-b border-orange-900/20 pb-1 font-mono uppercase tracking-widest">
                          <Lock className="h-3 w-3 shrink-0" /> ENCRYPTED TRANSIT CIPHER
                        </div>
                        <p className="break-all font-mono leading-relaxed text-neutral-400 bg-black/40 p-2 border border-neutral-900 rounded">{msg.ciphertext}</p>
                        
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => {
                              setActiveDecryptId(msg.id);
                              setDecryptError('');
                              setDecryptKeyAttempt('');
                            }}
                            className="py-1 px-3 bg-neutral-900 hover:bg-neutral-800 text-[10px] text-orange-400 hover:text-orange-300 font-mono font-semibold rounded border border-neutral-700/60 flex items-center gap-1 transition cursor-pointer"
                          >
                            <Unlock className="h-3 w-3" /> Mount Private Code
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-[9px] text-neutral-500 font-mono mt-1 uppercase flex items-center gap-0.5 tracking-wider">
                    {msg.isSelfSent ? 'Transit onion path: Secured' : 'Payload Sealed'}
                    <CheckCheck className={`h-3.5 w-3.5 ${isDecrypted ? 'text-emerald-400' : 'text-neutral-500'}`} />
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Decode Vault Password Challenge Panel (Dynamic Bottom Popover) */}
        <AnimatePresence>
          {activeDecryptId && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="p-4 border-t border-neutral-800 bg-neutral-950"
            >
              {(() => {
                const targetMsg = messages.find(m => m.id === activeDecryptId);
                if (!targetMsg) return null;
                return (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-orange-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <KeyRound className="h-4 w-4" /> DECIPHER CHALLENGE : {targetMsg.sender}
                      </span>
                      <button 
                        onClick={() => setActiveDecryptId(null)}
                        className="text-neutral-500 hover:text-neutral-300 text-xs font-mono cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="ENTER SECRETS PRIVATE KEY"
                        value={decryptKeyAttempt}
                        onChange={(e) => setDecryptKeyAttempt(e.target.value)}
                        className="flex-1 bg-neutral-900 border border-neutral-850 rounded-lg text-xs py-2 px-3 text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-mono tracking-wider font-bold"
                        autoFocus
                      />
                      <button
                        onClick={() => handleAttemptDecryption(targetMsg)}
                        className="py-2 px-4 bg-orange-600 hover:bg-orange-500 font-mono text-xs font-bold text-white rounded-lg transition overflow-hidden shrink-0 cursor-pointer"
                      >
                        Run decryption
                      </button>
                    </div>
                    {decryptError && (
                      <p className="text-[10px] font-mono text-red-400 flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5" /> {decryptError}
                      </p>
                    )}
                    <p className="text-[9px] text-neutral-500 font-mono">
                      * Developer Sandbox Note: For demo ease, the original encryption private key seed was: <code className="text-neutral-300 bg-neutral-900 px-1 py-0.5 rounded font-mono">{targetMsg.secretKey}</code>
                    </p>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
}
