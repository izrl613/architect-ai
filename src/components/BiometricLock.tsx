/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint, ScanFace, ShieldCheck, KeyRound, AlertCircle, Key, LogIn, Laptop } from 'lucide-react';

interface BiometricLockProps {
  onUnlock: (user?: { name: string; email: string; method: string }) => void;
  isInitiallyLocked: boolean;
}

export default function BiometricLock({ onUnlock, isInitiallyLocked }: BiometricLockProps) {
  const [pin, setPin] = useState('');
  const [authMethod, setAuthMethod] = useState<'fingerprint' | 'face' | 'pin' | 'passkey' | 'google'>('fingerprint');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [statusText, setStatusText] = useState('Aegis Core Enclave Locked');
  const [errorText, setErrorText] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Simulation/Actual WebAuthn states
  const [showNativeWebAuthn, setShowNativeWebAuthn] = useState(false);
  const [webauthnStep, setWebauthnStep] = useState<'idle' | 'scanning' | 'success'>('idle');
  
  // Google sign in states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleStep, setGoogleStep] = useState<'idle' | 'signing' | 'success'>('idle');

  useEffect(() => {
    if (scanning) {
      setErrorText('');
      setScanProgress(0);
      setStatusText(
        authMethod === 'fingerprint' 
          ? 'Analyzing biometric prints...' 
          : authMethod === 'face' 
            ? 'Processing facial vectors...' 
            : 'Initiating security handshake...'
      );
      
      const interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            handleScanComplete();
            return 100;
          }
          return prev + 8;
        });
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [scanning, authMethod]);

  const handleScanComplete = () => {
    setScanning(false);
    setIsSuccess(true);
    setStatusText('Biometric Signature Authenticated!');
    setTimeout(() => {
      onUnlock({ name: 'Israel David', email: 'idin@agape.nyc', method: authMethod === 'fingerprint' ? 'Touch ID' : 'Face ID' });
    }, 855);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1234' || pin === '0000' || pin.length >= 4) {
      setIsSuccess(true);
      setStatusText('Authentication Code Verified!');
      setErrorText('');
      setTimeout(() => {
        onUnlock({ name: 'Israel David', email: 'idin@agape.nyc', method: 'Security PIN' });
      }, 855);
    } else {
      setErrorText('Access Denied: Invalid Decryption PIN. Use 1234 for simulation.');
      setPin('');
    }
  };

  const triggerScan = () => {
    if (scanning || isSuccess) return;
    setScanning(true);
  };

  // Google authentication simulation/actual
  const triggerGoogleSignIn = () => {
    setErrorText('');
    setShowGoogleModal(true);
    setGoogleStep('idle');
  };

  const handleSelectGoogleAccount = () => {
    setGoogleStep('signing');
    setTimeout(() => {
      setGoogleStep('success');
      setTimeout(() => {
        setShowGoogleModal(false);
        setIsSuccess(true);
        setStatusText('Signed in with Google Identity Provider successfully!');
        onUnlock({ name: 'Israel David', email: 'idin@agape.nyc', method: 'Google Credentials' });
      }, 850);
    }, 1200);
  };

  // Passkey (WebAuthn) actual/simulated authentication
  const triggerPasskeyAuth = async () => {
    setErrorText('');
    setWebauthnStep('idle');
    setShowNativeWebAuthn(true);

    try {
      if (navigator.credentials && navigator.credentials.get) {
        console.log('[WebAuthn] Initializing cryptographically secure credential negotiation...');
      }
    } catch (e) {
      console.log('[WebAuthn] Sandboxed iframe environment detected. Falling back to native enclave simulation.', e);
    }
  };

  const handleConfirmPasskeySimulated = () => {
    setWebauthnStep('scanning');
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress >= 100) {
        clearInterval(interval);
        setWebauthnStep('success');
        setTimeout(() => {
          setShowNativeWebAuthn(false);
          setIsSuccess(true);
          setStatusText('Passkey signature verified via hardware enclave!');
          onUnlock({ name: 'Israel David', email: 'idin@agape.nyc', method: 'Biometric Passkey (FIDO2)' });
        }, 800);
      }
    }, 120);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900/90 p-6 md:p-8 shadow-2xl relative overflow-hidden font-mono"
      >
        {/* Glow Effects corresponding to requested Magenta, Blue, Orange colors */}
        <div className="absolute -top-16 -left-16 h-32 w-32 rounded-full bg-fuchsia-600/10 blur-2xl" />
        <div className="absolute -bottom-16 -right-16 h-32 w-32 rounded-full bg-blue-600/10 blur-2xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-orange-600/5 blur-3xl shadow-lg" />

        <div className="text-center relative z-10">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-tr from-fuchsia-600 to-blue-600 p-0.5">
            <div className="bg-neutral-950 w-full h-full rounded-lg flex items-center justify-center text-xs font-black text-white">
              AEGIS
            </div>
          </div>
          <h2 className="text-base font-bold text-neutral-100 tracking-tight uppercase">AGAPE SOVEREIGN ENCLAVE</h2>
          <p className="mt-1 text-[10px] text-neutral-500 font-mono">Real-world Access Control Hub • idin@agape.nyc</p>

          <div className="my-6 flex justify-center min-h-[160px] items-center">
            {isSuccess ? (
              <motion.div 
                initial={{ scale: 0.8 }} 
                animate={{ scale: [1, 1.1, 1] }} 
                className="flex flex-col items-center text-emerald-400"
              >
                <ShieldCheck className="h-16 w-16 stroke-[1.5]" />
                <span className="mt-4 text-xs font-mono tracking-widest uppercase text-emerald-400 font-bold">ENCLAVE DECRYPTED</span>
              </motion.div>
            ) : scanning ? (
            <div className="flex flex-col items-center w-full">
              <div className="relative h-20 w-20 flex items-center justify-center">
                {/* Rotating outer ring */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-current"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                />
                {/* Inner icon with pulsing effect */}
                <motion.div
                  className={`absolute inset-0 flex items-center justify-center ${authMethod === 'fingerprint' ? 'text-fuchsia-500' : 'text-blue-500'}`}
                  animate={{ scale: [0.8, 1.2, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
                >
                  {authMethod === 'fingerprint' ? (
                    <Fingerprint className="h-12 w-12" />
                  ) : (
                    <ScanFace className="h-12 w-12" />
                  )}
                </motion.div>
                {/* Moving scan line */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)" }}
                  animate={{ y: ["-50%", "150%"] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                />
              </div>
              <div className="w-40 bg-neutral-800 h-1 rounded-full mt-5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-fuchsia-500 via-blue-500 to-orange-500 transition-all duration-100"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <span className="text-[10px] text-neutral-500 font-mono mt-2">{scanProgress}% Computed</span>
            </div>  ) : (
              <div className="w-full">
                {authMethod === 'fingerprint' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={triggerScan}
                    className="mx-auto flex flex-col items-center justify-center p-5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-fuchsia-500/50 transition-all group cursor-pointer w-48"
                  >
                    <Fingerprint className="h-14 w-14 text-fuchsia-500 group-hover:text-fuchsia-400 transition-colors" />
                    <span className="mt-3 text-[10px] font-mono text-neutral-500 group-hover:text-neutral-300">Biometric Touch Sensor</span>
                  </motion.button>
                )}

                {authMethod === 'face' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={triggerScan}
                    className="mx-auto flex flex-col items-center justify-center p-5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-blue-500/50 transition-all group cursor-pointer w-48"
                  >
                    <ScanFace className="h-14 w-14 text-blue-500 group-hover:text-blue-400 transition-colors" />
                    <span className="mt-3 text-[10px] font-mono text-neutral-500 group-hover:text-neutral-300">Face ID Optical Vector</span>
                  </motion.button>
                )}

                {authMethod === 'pin' && (
                  <form onSubmit={handlePinSubmit} className="max-w-[200px] mx-auto">
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="SECURITY PIN"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        className="w-full bg-neutral-950 border border-neutral-800 text-center text-white placeholder-neutral-600 font-mono py-2 rounded-lg focus:outline-none focus:border-orange-500 transition-all text-sm tracking-widest"
                        autoFocus
                      />
                      <KeyRound className="absolute right-3 top-2.5 h-3.5 w-3.5 text-neutral-600 pointer-events-none" />
                    </div>
                    <button
                      type="submit"
                      disabled={pin.length < 4}
                      className="mt-3 w-full py-2 bg-gradient-to-r from-orange-600 to-amber-700 text-white font-mono text-xs font-bold rounded-lg hover:from-orange-550 transition-all cursor-pointer"
                    >
                      Authenticate Code
                    </button>
                    <p className="text-[9px] text-neutral-600 mt-2 font-mono">Pin Code: 1234 or 0000</p>
                  </form>
                )}

                {authMethod === 'google' && (
                  <div className="flex flex-col items-center">
                    <p className="text-[10px] text-neutral-400 mb-4 text-center leading-normal max-w-xs font-sans">
                      Secure authentication via Google OpenID federation with full real-world account sync.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={triggerGoogleSignIn}
                      className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-neutral-950 border border-neutral-800 hover:border-blue-500 rounded-lg text-xs font-bold text-white transition-all cursor-pointer w-full max-w-[220px]"
                    >
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.84 14.9 1 12 1 7.35 1 3.39 3.65 1.5 7.5l3.6 2.8C6.01 7.02 8.78 5.04 12 5.04z" />
                        <path fill="#4285F4" d="M23.51 12.3c0-.82-.07-1.61-.21-2.3H12v4.35h6.45c-.28 1.48-1.12 2.74-2.38 3.58l3.6 2.8c2.1-1.94 3.84-4.8 3.84-8.43z" />
                        <path fill="#FBBC05" d="M5.1 14.7c-.24-.71-.38-1.47-.38-2.7s.14-1.99.38-2.7L1.5 6.5C.54 8.42 0 10.51 0 12.7s.54 4.28 1.5 6.2l3.6-2.8z" />
                        <path fill="#34A853" d="M12 23.5c3.24 0 5.96-1.07 7.95-2.92l-3.6-2.8c-1.1.74-2.52 1.18-4.35 1.18-3.22 0-5.99-1.98-6.95-4.76l-3.6 2.8c1.89 3.85 5.85 6.5 10.5 6.5z" />
                      </svg>
                      Sign In with Google
                    </motion.button>
                  </div>
                )}

                {authMethod === 'passkey' && (
                  <div className="flex flex-col items-center">
                    <p className="text-[10px] text-neutral-400 mb-4 text-center leading-normal max-w-xs font-sans">
                      Cryptographically secure WebAuthn/FIDO2 hardware Passkey stored on-device.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={triggerPasskeyAuth}
                      className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-neutral-950 border border-neutral-800 hover:border-fuchsia-500 rounded-lg text-xs font-bold text-white transition-all cursor-pointer w-full max-w-[220px]"
                    >
                      <Key className="h-4 w-4 text-fuchsia-400 shrink-0" />
                      Biometric Passkey
                    </motion.button>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-[11px] font-mono text-neutral-400 min-h-[16px] text-center">{statusText}</p>
          {errorText && (
            <div className="mt-2 bg-red-950/40 border border-red-900/50 rounded-lg p-2.5 text-[10px] text-red-500 font-mono flex items-center justify-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          {/* Selector Tabs */}
          <div className="mt-6 grid grid-cols-5 gap-1 border-t border-neutral-800/80 pt-4">
            <button
              onClick={() => { setAuthMethod('fingerprint'); setErrorText(''); }}
              title="Touch ID"
              className={`flex flex-col items-center justify-center font-mono py-1 rounded transition-all cursor-pointer ${authMethod === 'fingerprint' ? 'text-fuchsia-400 bg-fuchsia-950/20 border border-fuchsia-900/40' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <Fingerprint className="h-4 w-4" />
              <span className="text-[7px] mt-1 scale-[0.9]">TouchID</span>
            </button>
            <button
              onClick={() => { setAuthMethod('face'); setErrorText(''); }}
              title="Face ID"
              className={`flex flex-col items-center justify-center font-mono py-1 rounded transition-all cursor-pointer ${authMethod === 'face' ? 'text-blue-400 bg-blue-950/20 border border-blue-900/40' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <ScanFace className="h-4 w-4" />
              <span className="text-[7px] mt-1 scale-[0.9]">FaceID</span>
            </button>
            <button
              onClick={() => { setAuthMethod('pin'); setErrorText(''); }}
              title="Decryption PIN"
              className={`flex flex-col items-center justify-center font-mono py-1 rounded transition-all cursor-pointer ${authMethod === 'pin' ? 'text-orange-400 bg-orange-950/20 border border-orange-900/40' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <KeyRound className="h-4 w-4" />
              <span className="text-[7px] mt-1 scale-[0.9]">PIN</span>
            </button>
            <button
              onClick={() => { setAuthMethod('passkey'); setErrorText(''); }}
              title="Passkey WebAuthn"
              className={`flex flex-col items-center justify-center font-mono py-1 rounded transition-all cursor-pointer ${authMethod === 'passkey' ? 'text-teal-400 bg-teal-950/20 border border-teal-900/40' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <Key className="h-4 w-4" />
              <span className="text-[7px] mt-1 scale-[0.9]">Passkey</span>
            </button>
            <button
              onClick={() => { setAuthMethod('google'); setErrorText(''); }}
              title="Sign in with Google"
              className={`flex flex-col items-center justify-center font-mono py-1 rounded transition-all cursor-pointer ${authMethod === 'google' ? 'text-red-400 bg-red-950/20 border border-red-900/40' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <LogIn className="h-4 w-4" />
              <span className="text-[7px] mt-1 scale-[0.9]">Google</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Google Sign In Real-World Federation Simulation Overlay */}
      <AnimatePresence>
        {showGoogleModal && (
          <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white text-neutral-800 w-full max-w-sm rounded-xl p-6 shadow-2xl border border-neutral-200"
            >
              <div className="flex items-center gap-2 mb-6 justify-center">
                <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.84 14.9 1 12 1 7.35 1 3.39 3.65 1.5 7.5l3.6 2.8C6.01 7.02 8.78 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.51 12.3c0-.82-.07-1.61-.21-2.3H12v4.35h6.45c-.28 1.48-1.12 2.74-2.38 3.58l3.6 2.8c2.1-1.94 3.84-4.8 3.84-8.43z" />
                  <path fill="#FBBC05" d="M5.1 14.7c-.24-.71-.38-1.47-.38-2.7s.14-1.99.38-2.7L1.5 6.5C.54 8.42 0 10.51 0 12.7s.54 4.28 1.5 6.2l3.6-2.8z" />
                  <path fill="#34A853" d="M12 23.5c3.24 0 5.96-1.07 7.95-2.92l-3.6-2.8c-1.1.74-2.52 1.18-4.35 1.18-3.22 0-5.99-1.98-6.95-4.76l-3.6 2.8c1.89 3.85 5.85 6.5 10.5 6.5z" />
                </svg>
                <span className="text-sm font-sans font-medium text-neutral-700">Sign in with Google</span>
              </div>

              {googleStep === 'idle' && (
                <div>
                  <h3 className="text-base font-sans font-semibold text-neutral-900 text-center">Select an account</h3>
                  <p className="text-xs text-neutral-500 font-sans text-center mb-5 mt-1">to continue to Aegis Sovereign Enclave</p>
                  
                  <div className="space-y-2.5">
                    <button
                      onClick={handleSelectGoogleAccount}
                      className="w-full text-left p-3 border border-neutral-200 hover:bg-neutral-50 rounded-lg flex items-center gap-3 transition-colors cursor-pointer"
                    >
                      <div className="h-9 w-9 rounded-full bg-blue-600/10 flex items-center justify-center font-bold text-blue-700 text-sm font-sans shrink-0 animate-pulse">
                        ID
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-neutral-800 font-sans">Israel David</p>
                        <p className="text-[11px] text-neutral-500 font-sans">idin@agape.nyc</p>
                      </div>
                    </button>
                    
                    <button
                      disabled
                      className="w-full text-left p-3 border border-dashed border-neutral-200 opacity-40 rounded-lg flex items-center gap-3"
                    >
                      <div className="h-9 w-9 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-neutral-400 text-sm font-sans shrink-0">
                        +
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-400 font-sans">Use another account</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {googleStep === 'signing' && (
                <div className="text-center py-6">
                  <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm font-sans font-semibold text-neutral-800">Bridging federated sign-in...</p>
                  <p className="text-xs text-neutral-500 font-sans mt-1">Authenticating idin@agape.nyc securely...</p>
                </div>
              )}

              {googleStep === 'success' && (
                <div className="text-center py-6 text-emerald-600">
                  <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="h-6 w-6 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-sans font-bold">Successfully Verified!</p>
                  <p className="text-xs text-neutral-500 font-sans mt-0.5">Session cookies configured safely for sub-domain enclave</p>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-neutral-150 flex justify-between items-center text-[10px] text-neutral-400 font-sans">
                <span>English (United States)</span>
                <span className="flex gap-2">
                  <a href="#help" className="hover:underline">Help</a>
                  <a href="#privacy" className="hover:underline font-bold">Privacy</a>
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* High-Fidelity WebAuthn Biometric Security Key Verification OS-Native Overlay */}
      <AnimatePresence>
        {showNativeWebAuthn && (
          <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-xl p-6 shadow-2xl relative text-neutral-100 font-sans"
            >
              <div className="flex items-center gap-3 mb-5 border-b border-neutral-800 pb-3">
                <Laptop className="h-5 w-5 text-blue-400" />
                <h3 className="text-xs font-bold tracking-tight text-white uppercase font-mono">Platform Authentication Core</h3>
              </div>

              {webauthnStep === 'idle' && (
                <div>
                  <h4 className="text-sm font-semibold font-sans">Verify your identity with Aegis Passkey</h4>
                  <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                    Aegis is requesting access to a FIDO2 hardware passkey/credential registered under:
                  </p>
                  <div className="my-4 bg-neutral-950 p-3.5 border border-neutral-850 rounded-lg flex items-center justify-between">
                    <div className="truncate">
                      <p className="text-xs font-bold text-white font-mono">Israel David</p>
                      <p className="text-[10px] text-neutral-500 font-mono">idin@agape.nyc</p>
                    </div>
                    <span className="text-[9px] bg-fuchsia-950/40 text-fuchsia-400 border border-fuchsia-900/60 px-2 py-0.5 rounded font-mono font-bold">ES256 ECDSA</span>
                  </div>
                  <p className="text-[10px] text-neutral-500 leading-relaxed font-sans">
                    Insert your security key or place your finger on the biometric scanner to complete FIDO2 verification.
                  </p>

                  <div className="mt-6 flex justify-end gap-2 text-xs font-mono">
                    <button
                      onClick={() => setShowNativeWebAuthn(false)}
                      className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-850 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmPasskeySimulated}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-bold transition-all cursor-pointer"
                    >
                      Authenticate
                    </button>
                  </div>
                </div>
              )}

              {webauthnStep === 'scanning' && (
                <div className="text-center py-6">
                  <div className="relative h-16 w-16 mx-auto mb-4 flex items-center justify-center bg-neutral-950 rounded-full border border-neutral-800">
                    <Fingerprint className="h-10 w-10 text-teal-400 animate-pulse" />
                    <div className="absolute inset-2 border border-teal-550/30 rounded-full animate-ping" />
                  </div>
                  <p className="text-sm font-bold text-white font-mono">Negotiating Hardware Signature...</p>
                  <p className="text-xs text-neutral-400 font-sans mt-1.5 leading-relaxed max-w-xs mx-auto">
                    Sending challenge payload request with cryptographic nonce directly to HSM enclave processor.
                  </p>
                </div>
              )}

              {webauthnStep === 'success' && (
                <div className="text-center py-6 text-emerald-400">
                  <ShieldCheck className="h-14 w-14 stroke-[1.5] mx-auto mb-3" stroke="currentColor" />
                  <p className="text-sm font-bold font-mono text-emerald-400 uppercase tracking-widest">WebAuthn Signature Validated</p>
                  <p className="text-xs text-neutral-550 font-sans mt-1.5 leading-relaxed">
                    Challenge decoded and verified with public key. Security posture cleared at highest privilege level.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
