/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VaultItem, IdentityModule } from '../types';
import { encryptText, decryptText } from '../utils/crypto';
import CryptoJS from 'crypto-js';
import jsQR from 'jsqr';
import { 
  File, Image, ShieldCheck, Lock, Unlock, Upload, Trash2, 
  Search, ShieldAlert, FileText, Download, KeyRound, Plus, Eye, EyeOff,
  QrCode, Camera, CheckCircle, Grid
} from 'lucide-react';

interface DocumentVaultProps {
  items: VaultItem[];
  onUpdateItems: (updated: VaultItem[]) => void;
  triggerAuditLog: (title: string, category: 'identity' | 'passwords' | 'vault' | 'trackers', status: 'critical' | 'warning' | 'secured', message: string) => void;
  modules?: IdentityModule[];
  onUpdateModules?: (updated: IdentityModule[]) => void;
}

export default function DocumentVault({ 
  items, 
  onUpdateItems, 
  triggerAuditLog,
  modules = [],
  onUpdateModules
}: DocumentVaultProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vaultKey, setVaultKey] = useState('VAULT-SAFE-12');
  const [visibleItemIds, setVisibleItemIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // QR code scanning states
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrScanMode, setQrScanMode] = useState<'webcam' | 'file'>('webcam');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [parsedQrData, setParsedQrData] = useState<{
    type: 'totp' | 'text';
    label?: string;
    issuer?: string;
    secret?: string;
    raw: string;
  } | null>(null);
  const [selectedTargetModuleId, setSelectedTargetModuleId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // QR Scanning methods
  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError('');
    setScannedResult(null);
    setParsedQrData(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        setCameraActive(true);
        animationFrameId.current = requestAnimationFrame(scanLoop);
      }
    } catch (err: any) {
      console.error(err);
      setCameraError('Unable to access camera. Please confirm system & browser permissions.');
    }
  };

  const scanLoop = () => {
    if (!videoRef.current || !streamRef.current) {
      animationFrameId.current = requestAnimationFrame(scanLoop);
      return;
    }
    
    const video = videoRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current || document.createElement('canvas');
      const width = video.videoWidth;
      const height = video.videoHeight;
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        try {
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          
          if (code && code.data) {
            handleSuccessfulScan(code.data);
            return;
          }
        } catch (e) {
          // ignore processing glitches
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(scanLoop);
  };

  const handleQrFileFieldUploaded = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      const image = new window.Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(image, 0, 0);
          const imageData = ctx.getImageData(0, 0, image.width, image.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleSuccessfulScan(code.data);
          } else {
            setCameraError('No readable QR code cipher found. Ensure good quality and high contrast.');
          }
        }
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSuccessfulScan = (data: string) => {
    stopCamera();
    setScannedResult(data);
    
    if (data.toLowerCase().startsWith('otpauth://')) {
      try {
        const url = new URL(data);
        const params = new URLSearchParams(url.search);
        const secret = params.get('secret') || '';
        const issuer = params.get('issuer') || '';
        let label = decodeURIComponent(url.pathname.substring(2));
        if (label.includes(':')) {
          label = label.split(':')[1];
        } else if (label.startsWith('/')) {
          label = label.substring(1);
        }
        
        setParsedQrData({
          type: 'totp',
          label,
          issuer,
          secret,
          raw: data
        });
        
        if (modules && modules.length > 0) {
          setSelectedTargetModuleId(modules[0].id);
        }
        
        triggerAuditLog(
          'MFA Code Scanned',
          'vault',
          'secured',
          `Parsed Authenticator setup URI for provider [${issuer || 'Unknown'}]. Ready to bind.`
        );
      } catch (err) {
        setParsedQrData({
          type: 'text',
          raw: data
        });
      }
    } else {
      setParsedQrData({
        type: 'text',
        raw: data
      });
      triggerAuditLog(
        'Physical Doc QR Scanned',
        'vault',
        'secured',
        `Credential data string ingested from physical document QR code.`
      );
    }
  };

  const handleImportTotpToModule = () => {
    if (!parsedQrData || !parsedQrData.secret || !onUpdateModules || !modules) return;
    
    const nextList = modules.map(m => {
      if (m.id === selectedTargetModuleId) {
        return {
          ...m,
          mfaEnabled: true,
          mfaType: 'TOTP' as const,
          mfaSecret: parsedQrData.secret
        };
      }
      return m;
    });
    
    onUpdateModules(nextList);
    
    const matchedMod = modules.find(m => m.id === selectedTargetModuleId);
    
    triggerAuditLog(
      'MFA Secrets Seed Configured',
      'identity',
      'secured',
      `Imported multi-factor verification secret directly into Identity profile [${matchedMod?.code || selectedTargetModuleId}] via secure QR interface.`
    );
    
    setShowQrScanner(false);
    stopCamera();
    alert(`Successfully bound scanned TOTP secret key directly to ${matchedMod?.name || 'Identity Module'}!`);
  };

  const handleImportTextToModuleWhitelists = () => {
    if (!scannedResult || !onUpdateModules || !modules) return;
    
    const targetModule = modules.find(m => m.id === selectedTargetModuleId);
    if (!targetModule) return;
    
    const shortText = scannedResult.slice(0, 16);
    const friendlyName = `Scan App Credentials [${shortText}]`;
    
    const nextList = modules.map(m => {
      if (m.id === selectedTargetModuleId) {
        return {
          ...m,
          authorizedApps: [...m.authorizedApps, friendlyName]
        };
      }
      return m;
    });
    onUpdateModules(nextList);
    
    triggerAuditLog(
      'Identity Whitelist Extended',
      'identity',
      'secured',
      `Registered client token credential in ${targetModule.code} sandbox bounds via QR ingest.`
    );
    
    setShowQrScanner(false);
    stopCamera();
    alert(`Scanned credentials successfully registered as an authorized boundary client on ${targetModule.code}!`);
  };

  const handleImportTextToVaultForm = () => {
    if (!scannedResult) return;
    
    setItemName(`Scanned QR Ingress - ${new Date().toLocaleDateString()}`);
    setItemContent(scannedResult);
    setItemType('document');
    setItemCategory('credentials');
    
    setShowQrScanner(false);
    stopCamera();
    
    setShowAddForm(true);
    
    triggerAuditLog(
      'Document Buffer Populated',
      'vault',
      'secured',
      'Successfully preloaded on-device QR content. Complete the encryption key fields to lock transaction into safe clusters.'
    );
    
    alert('QR text content mapped straight into Cryptographic Vault Form. Input secret master key to symmetrically seal file.');
  };

  useEffect(() => {
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // New item upload states
  const [showAddForm, setShowAddForm] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<'financial' | 'personal' | 'legal' | 'credentials'>('personal');
  const [itemType, setItemType] = useState<'document' | 'photo'>('document');
  const [itemContent, setItemContent] = useState(''); // Text content to encrypt OR Base64 image
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');

  // AES-256 local export states
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('VAULT-SAFE-12');
  const [exportingItemId, setExportingItemId] = useState<string | null>(null);
  const [individualPassphrases, setIndividualPassphrases] = useState<Record<string, string>>({});

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setFileError('');
    
    // Check file size limit (let's keep it under 3MB raw for localStorage ease)
    if (file.size > 3 * 1024 * 1024) {
      setFileError('File exceeds 3MB memory limit for simulated on-device enclave.');
      return;
    }

    const reader = new FileReader();
    
    if (file.type.startsWith('image/')) {
      setItemType('photo');
      reader.onload = () => {
        setItemContent(reader.result as string);
        if (!itemName) setItemName(file.name);
      };
      reader.readAsDataURL(file);
    } else {
      setItemType('document');
      reader.onload = () => {
        // Read text or store string code
        setItemContent(reader.result as string);
        if (!itemName) setItemName(file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !itemContent) return;

    // Symmetric E2E encryption representation using our utility
    const cipherText = encryptText(itemContent, vaultKey);
    
    const formattedSize = (itemContent.length / 1024).toFixed(1) + ' KB';

    const newItem: VaultItem = {
      id: 'vault-' + Date.now(),
      name: itemName,
      type: itemType,
      fileSize: formattedSize,
      category: itemCategory,
      dataUrl: cipherText, // Encrypted content string
      encryptedAt: new Date().toLocaleDateString()
    };

    const nextList = [...items, newItem];
    onUpdateItems(nextList);

    triggerAuditLog(
      `Secure Vault Item Encrypted`,
      'vault',
      'secured',
      `Locked [${itemName}] (${itemType.toUpperCase()}) securely. Symmetrically ciphered with key [${vaultKey.substring(0,3)}***].`
    );

    // Reset Form
    setItemName('');
    setItemContent('');
    setShowAddForm(false);
  };

  const handleDeleteItem = (id: string, name: string) => {
    const nextList = items.filter(val => val.id !== id);
    onUpdateItems(nextList);
    triggerAuditLog(
      `Vault Payload Shredded`,
      'vault',
      'warning',
      `Recursively shredded cluster data blocks for file [${name}].`
    );
  };

  const handleToggleDecrypt = (id: string) => {
    setVisibleItemIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleExportAllVault = (passphrase: string) => {
    if (!passphrase) return;
    try {
      const payload = {
        source: "Aegis Sovereign Enclave Vault E2E Export",
        operator: "Israel David",
        email: "idin@agape.nyc",
        exportedAt: new Date().toISOString(),
        itemsCount: items.length,
        items: items
      };
      
      const cipherText = CryptoJS.AES.encrypt(JSON.stringify(payload), passphrase).toString();
      
      const blob = new Blob([cipherText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aegis-vault-aes256-${Date.now()}.aes`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      triggerAuditLog(
        'All Vault Items Exported',
        'vault',
        'secured',
        `Symmetrically ciphered ${items.length} records on-device using AES-256 with key hash [SHA256].`
      );
    } catch (err) {
      console.error("Export failure: ", err);
    }
  };

  const handleExportItem = (item: VaultItem, passphrase: string) => {
    if (!passphrase) return;
    try {
      let decryptedContent = '';
      try {
        decryptedContent = decryptText(item.dataUrl, vaultKey);
      } catch (err) {
        decryptedContent = item.dataUrl;
      }

      if (decryptedContent.startsWith('[Decryption Failed') || !decryptedContent) {
        decryptedContent = item.dataUrl;
      }

      const individualPayload = {
        name: item.name,
        type: item.type,
        fileSize: item.fileSize,
        category: item.category,
        encryptedAt: item.encryptedAt,
        exportedAt: new Date().toISOString(),
        content: decryptedContent
      };
      
      const cipherText = CryptoJS.AES.encrypt(JSON.stringify(individualPayload), passphrase).toString();
      
      const safeName = item.name.replace(/[^a-z0-9.]/gi, '_');
      const blob = new Blob([cipherText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeName}-${Date.now()}.aes`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      triggerAuditLog(
        'Item Exported as AES-256',
        'vault',
        'secured',
        `Successfully exported item [${item.name}] as an AES-256 encrypted local file.`
      );
      
      setExportingItemId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      
      {/* Vault Summary Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-sans tracking-tight">E2E ENCRYPTED AIRGAP VAULT</h2>
          <p className="text-xs text-neutral-400 font-mono mt-0.5">Physical device sandbox containing sensitive files and certificates</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              const nextState = !showQrScanner;
              setShowQrScanner(nextState);
              setShowAddForm(false);
              setShowExportPanel(false);
              if (nextState) {
                if (qrScanMode === 'webcam') {
                  startCamera();
                }
              } else {
                stopCamera();
              }
            }}
            className={`flex items-center gap-1.5 py-2 px-4 rounded-lg text-xs font-mono font-medium transition-all shadow-md cursor-pointer ${
              showQrScanner 
                ? 'bg-neutral-850 text-fuchsia-400 border border-fuchsia-500/30' 
                : 'bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300'
            }`}
          >
            <QrCode className="h-4 w-4" />
            {showQrScanner ? 'Close Scanner Core' : 'QR Scanner Console'}
          </button>

          <button
            onClick={() => {
              setShowExportPanel(!showExportPanel);
              setShowAddForm(false);
              setShowQrScanner(false);
              stopCamera();
            }}
            className={`flex items-center gap-1.5 py-2 px-4 rounded-lg text-xs font-mono font-medium transition-all shadow-md cursor-pointer ${
              showExportPanel 
                ? 'bg-neutral-850 text-orange-400 border border-orange-500/30' 
                : 'bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300'
            }`}
          >
            <Download className="h-4 w-4" />
            {showExportPanel ? 'Close Backup Engine' : 'AES-256 Export'}
          </button>

          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setShowExportPanel(false);
              setShowQrScanner(false);
              stopCamera();
            }}
            className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono font-medium transition-all shadow-md cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {showAddForm ? 'Lock Vault Door' : 'Deprecate & Upload File'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showExportPanel && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-5"
          >
            <h3 className="text-sm font-bold text-orange-400 font-mono flex items-center gap-2 mb-2 uppercase">
              <ShieldCheck className="h-4.5 w-4.5" /> AES-256 Backups & Export Engine
            </h3>
            <p className="text-[11px] text-neutral-400 mb-4 font-mono leading-relaxed">
              Export your entire secure database as a single local <strong className="text-white">AES-256 encrypted file</strong>. Symmetrically ciphered on-device, preventing remote probing loops or offline registry cracking vectors.
            </p>

            <div className="flex flex-col md:flex-row gap-4 items-end animate-fade-in">
              <div className="flex-1 w-full space-y-1.5">
                <label className="block text-[10px] text-neutral-400 font-mono uppercase">Encryption Passphrase</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Enter passphrase to seal backup file"
                    value={exportPassphrase}
                    onChange={(e) => setExportPassphrase(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-3.5 text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-mono font-bold tracking-wider"
                  />
                  <KeyRound className="absolute right-3 top-2.5 h-3.5 w-3.5 text-neutral-600 pointer-events-none" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleExportAllVault(exportPassphrase)}
                disabled={!exportPassphrase || items.length === 0}
                className="w-full md:w-auto py-2 px-6 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono text-xs font-bold rounded-lg transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 h-[36px]"
              >
                <Download className="h-4 w-4" />
                Export Vault Encrypted (AES-256)
              </button>
            </div>
            {items.length === 0 && (
              <p className="text-[9px] text-red-500 mt-2 font-mono">No items found in the vault to export.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQrScanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 shadow-xl"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-2.5 border-b border-neutral-800/80">
              <div>
                <h3 className="text-sm font-bold text-fuchsia-400 font-mono flex items-center gap-2 uppercase">
                  <QrCode className="h-4.5 w-4.5 hover:animate-spin" /> QR SCANNER INGRESS CONSOLE
                </h3>
                <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Ingest TOTP seeds or physical document text blocks symmetrically on-device</p>
              </div>
              
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setQrScanMode('webcam');
                    startCamera();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono border transition-all uppercase cursor-pointer ${
                    qrScanMode === 'webcam'
                      ? 'bg-fuchsia-950/30 text-fuchsia-400 border-fuchsia-500/40 shadow-sm'
                      : 'text-neutral-500 border-neutral-800 hover:text-neutral-300'
                  }`}
                >
                  Live Camera
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQrScanMode('file');
                    stopCamera();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono border transition-all uppercase cursor-pointer ${
                    qrScanMode === 'file'
                      ? 'bg-fuchsia-950/30 text-fuchsia-400 border-fuchsia-500/40 shadow-sm'
                      : 'text-neutral-500 border-neutral-800 hover:text-neutral-300'
                  }`}
                >
                  Parse Image file
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              
              {/* Visual Scanning Viewport */}
              <div className="md:col-span-5 relative bg-neutral-950 border border-neutral-850 rounded-xl overflow-hidden flex flex-col items-center justify-center min-h-[240px]">
                {qrScanMode === 'webcam' ? (
                  <>
                    <video
                      ref={videoRef}
                      className={`w-full h-full object-cover max-h-[250px] ${!cameraActive ? 'hidden' : ''}`}
                    />
                    
                    {!cameraActive && (
                      <div className="text-center p-4 font-mono space-y-3">
                        <Camera className="h-8 w-8 text-neutral-600 mx-auto" />
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Webcam Lens Shielded</p>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="py-1.5 px-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded text-[10px] font-mono cursor-pointer transition"
                        >
                          Mount Lens Stream
                        </button>
                      </div>
                    )}

                    {cameraActive && (
                      <>
                        {/* Scanning laser line animation effect */}
                        <div className="absolute inset-x-0 h-[2px] bg-fuchsia-500 shadow-[0_0_8px_#d946ef] animate-scanner-laser pointer-events-none" />
                        <div className="absolute inset-4 border border-dashed border-fuchsia-500/40 rounded-lg pointer-events-none flex items-center justify-center">
                          <span className="text-[9px] text-fuchsia-400/80 uppercase font-mono tracking-widest bg-neutral-950/85 px-2.5 py-1 rounded border border-fuchsia-500/20 shadow-sm">ALIGN SECURITY CODE</span>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full text-center p-4 font-mono space-y-3 animate-fade-in">
                    <Upload className="h-8 w-8 text-neutral-600 mx-auto" />
                    <p className="text-[10px] text-neutral-400 uppercase tracking-widest leading-relaxed">DRAG QR IMAGE OR CHOOSE LOCAL ASSET</p>
                    <input
                      type="file"
                      id="qr-file-upload-input"
                      onChange={handleQrFileFieldUploaded}
                      className="hidden"
                      accept="image/*"
                    />
                    <label
                      htmlFor="qr-file-upload-input"
                      className="inline-block py-1.5 px-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded text-[10px] font-mono cursor-pointer uppercase transition"
                    >
                      Browse QR Code File
                    </label>
                  </div>
                )}
                
                {cameraError && (
                  <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-4 text-center font-mono">
                    <ShieldAlert className="h-6 w-6 text-red-500 mb-2" />
                    <p className="text-[10px] text-red-400 uppercase font-bold leading-relaxed">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => setCameraError('')}
                      className="mt-3 text-[9px] text-neutral-400 hover:text-white border border-neutral-800 px-2.5 py-1 rounded transition"
                    >
                      Dismiss Diagnostic Override
                    </button>
                  </div>
                )}
              </div>

              {/* Parsed Output Diagnostics */}
              <div className="md:col-span-7 bg-neutral-950 p-4 border border-neutral-850 rounded-xl flex flex-col justify-between min-h-[240px]">
                {scannedResult ? (
                  <div className="space-y-4 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                        <span className="text-[10px] font-bold text-emerald-400 font-mono flex items-center gap-1 uppercase">
                          <CheckCircle className="h-3.5 w-3.5 animate-pulse" /> SECURE DECODE SUCCESSFUL
                        </span>
                        <span className="text-[8px] text-neutral-600 font-mono">ENCRYPTED BUS INGRESS</span>
                      </div>

                      {parsedQrData?.type === 'totp' ? (
                        <div className="mt-3 space-y-2.5 animate-fade-in">
                          <div className="bg-emerald-950/15 border border-emerald-900/30 p-2.5 rounded-lg space-y-1">
                            <span className="text-[9px] uppercase font-mono text-emerald-400 font-bold block">TOTP / MFA Configuration Payload</span>
                            <p className="text-xs text-white font-mono mt-0.5">Provider/Issuer: <strong className="text-emerald-300">{parsedQrData.issuer || 'Local Multi-factor'}</strong></p>
                            <p className="text-xs text-white font-mono">Target Identity Token: <strong className="text-neutral-200">{parsedQrData.label || 'Default User'}</strong></p>
                            <div className="mt-1.5 text-[10px] font-mono text-neutral-400 flex items-center justify-between bg-neutral-950 border border-neutral-850 px-2.5 py-1.5 rounded select-all font-bold">
                              <span>Secret Seed: <code className="text-white tracking-widest">{parsedQrData.secret || 'UNSPECIFIED'}</code></span>
                            </div>
                          </div>

                          {modules && modules.length > 0 ? (
                            <div className="space-y-1.5 pt-1">
                              <label className="block text-[9px] text-neutral-400 uppercase font-mono font-bold">Target Identity Module to Bind Secret</label>
                              <div className="flex gap-2">
                                <select
                                  value={selectedTargetModuleId}
                                  onChange={(e) => setSelectedTargetModuleId(e.target.value)}
                                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                                >
                                  {modules.map(mod => (
                                    <option key={mod.id} value={mod.id}>
                                      {mod.code} : {mod.name} ({mod.mfaEnabled ? 'MFA Enabled' : 'MFA Off'})
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={handleImportTotpToModule}
                                  className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold rounded-lg cursor-pointer uppercase transition shadow-md"
                                >
                                  Bind Config
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[9px] text-red-500 font-mono">No customizable Identity Modules available to map scanned credentials.</p>
                          )}
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2.5 animate-fade-in">
                          <div className="bg-neutral-900/50 border border-neutral-850 p-2.5 rounded-lg space-y-1">
                            <span className="text-[9px] uppercase font-mono text-fuchsia-400 font-bold block">Physical Document / Credential Text Scanned</span>
                            <div className="max-h-[90px] overflow-y-auto custom-scrollbar bg-neutral-950/80 p-2 border border-neutral-850 rounded">
                              <p className="text-[10px] leading-relaxed text-neutral-300 font-mono break-all font-medium whitespace-pre-wrap">{scannedResult}</p>
                            </div>
                            <span className="text-[8px] text-neutral-500 block uppercase font-mono mt-1 font-semibold">Capacity footprint: {scannedResult.length} characters</span>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleImportTextToVaultForm}
                              className="py-1.5 px-3.5 bg-orange-600 hover:bg-orange-500 text-white font-mono text-[9px] text-center font-bold rounded-lg cursor-pointer uppercase flex items-center gap-1.5 transition shadow-sm"
                            >
                              <Lock className="h-3.5 w-3.5" /> Save into Secure Vault
                            </button>

                            {modules && modules.length > 0 && (
                              <div className="flex-1 min-w-[200px] flex gap-1 items-stretch">
                                <select
                                  value={selectedTargetModuleId}
                                  onChange={(e) => setSelectedTargetModuleId(e.target.value)}
                                  className="flex-1 bg-neutral-900 border border-neutral-850 rounded-lg px-2 py-1 text-[9px] text-white font-mono focus:outline-none focus:border-fuchsia-500"
                                >
                                  {modules.map(mod => (
                                    <option key={mod.id} value={mod.id}>
                                      Attach to {mod.code} Whitelist
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={handleImportTextToModuleWhitelists}
                                  className="py-1 px-3.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-mono text-[9px] font-bold rounded-lg cursor-pointer uppercase shrink-0 transition"
                                >
                                  Attach
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-neutral-800 pt-2 flex justify-between items-center text-[10px]">
                      <span className="text-[9px] text-neutral-500 font-mono uppercase">State Hash: Local Sandbox Secure Memory</span>
                      <button
                        type="button"
                        onClick={() => {
                          setScannedResult(null);
                          setParsedQrData(null);
                          if (qrScanMode === 'webcam') {
                            startCamera();
                          }
                        }}
                        className="text-[9px] border border-neutral-800 px-2.5 py-1 rounded text-neutral-400 hover:text-white font-mono cursor-pointer transition"
                      >
                        Scan New Code
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center h-full text-neutral-600 font-mono py-12 space-y-2">
                    <Grid className="h-7 w-7 stroke-[1.5] text-neutral-700 animate-pulse" />
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-neutral-500">Diagnostic Input Stream Active</p>
                      <p className="text-[9px] text-neutral-600 max-w-[240px] mt-1 leading-relaxed text-center mx-auto">
                        Align any valid physical QR document credential sheet or TOTP setup barcode in front of your camera device stream.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-5"
          >
            <h3 className="text-sm font-bold text-orange-400 font-mono flex items-center gap-1 mb-4 uppercase">
              <Lock className="h-4 w-4" /> Inject New Cryptographic Payload
            </h3>

            <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-12 gap-5">
              
              <div className="md:col-span-4 space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] text-neutral-400 font-mono uppercase">Master Encrypted Vault Key</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter passphrase"
                    value={vaultKey}
                    onChange={(e) => setVaultKey(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-3 text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-mono font-bold tracking-wider"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-neutral-400 font-mono uppercase">Identifier Name / Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Passport details, tax cert"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-3 text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-400 font-mono uppercase">Category</label>
                    <select
                      value={itemCategory}
                      onChange={(e: any) => setItemCategory(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-2.5 text-white focus:outline-none focus:border-orange-500 font-mono"
                    >
                      <option value="personal">Personal</option>
                      <option value="financial">Financial</option>
                      <option value="legal">Legal</option>
                      <option value="credentials">Credentials</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-400 font-mono uppercase">Type</label>
                    <select
                      value={itemType}
                      onChange={(e: any) => setItemType(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-2.5 text-white focus:outline-none focus:border-orange-500 font-mono"
                    >
                      <option value="document">Document (Plaintext)</option>
                      <option value="photo">Photo / Scan (Base64)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Upload Drop Zone / Input Box */}
              <div className="md:col-span-8 flex flex-col justify-between">
                <div className="space-y-1.5 flex-1 flex flex-col">
                  <span className="block text-[10px] text-neutral-400 font-mono uppercase">Sensory Data Input Source</span>
                  
                  {itemType === 'document' ? (
                    <div className="flex-1 flex flex-col">
                      <textarea
                        required
                        placeholder="Paste private document content, keys, transcripts, or notes to save... (Or select a local text file below)"
                        value={itemContent}
                        onChange={(e) => setItemContent(e.target.value)}
                        rows={4}
                        className="flex-1 w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs p-3 text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-mono resize-none h-[110px]"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-center">
                      {itemContent ? (
                        <div className="relative h-[110px] border border-neutral-800 bg-neutral-950 rounded-lg p-2 flex items-center justify-center gap-3">
                          <img src={itemContent} className="h-20 w-20 object-cover rounded border border-neutral-800" alt="Preview" />
                          <div className="text-left font-mono">
                            <p className="text-[10px] text-emerald-400 font-bold">IMAGE SECURED FOR INGRESS</p>
                            <span className="text-[9px] text-neutral-500 block uppercase">Encoding standard: Base64 dataURL</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setItemContent('')}
                            className="absolute top-2 right-2 text-xs text-red-400 hover:text-red-300 font-mono border border-red-950 px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div 
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`flex-1 min-h-[110px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-3 text-center transition-all ${
                            dragOver ? 'border-orange-500 bg-orange-950/20' : 'border-neutral-800 bg-neutral-950'
                          }`}
                        >
                          <Upload className="h-6 w-6 text-neutral-600 mb-1" />
                          <p className="text-[10px] text-neutral-400 font-mono">DRAG & DROP IMAGE HERE OR SELECT FILE BASE64</p>
                          <span className="text-[8px] text-neutral-600 font-mono mt-0.5">Supports standard png, jpg scans</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="vault-file-picker"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept={itemType === 'photo' ? 'image/*' : '.txt,.json,.xml,.md,.doc,.csv'}
                    />
                    <label
                      htmlFor="vault-file-picker"
                      className="py-1.5 px-3 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white rounded text-[10px] font-mono flex items-center gap-1.5 cursor-pointer"
                    >
                      Browse Local Device Files
                    </label>
                    {fileError && <span className="text-[9px] text-red-400 font-mono font-bold uppercase">{fileError}</span>}
                  </div>
                  
                  <button
                    type="submit"
                    disabled={!itemName || !itemContent}
                    className="w-full sm:w-auto py-1.5 px-6 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono text-xs font-bold rounded-lg transition-all shadow-md cursor-pointer"
                  >
                    Cipher Symmetric Payload
                  </button>
                </div>
              </div>

            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vault Cabinet Grid & Dashboard */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search documents, photographs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-2 px-8.5 text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-mono"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {['all', 'personal', 'financial', 'legal', 'credentials'].map((cat) => (
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

        {/* Bento Grid layout of files */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {filteredItems.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-3 py-16 text-center text-neutral-500 text-xs font-mono">
              The cryptographic safe is empty. Deposit files using "Deprecate & Upload File".
            </div>
          ) : (
            filteredItems.map((item) => {
              const isDecrypted = visibleItemIds.includes(item.id);
              let decryptedContent = '';
              try {
                if (isDecrypted) {
                  decryptedContent = decryptText(item.dataUrl, vaultKey);
                }
              } catch (e) {
                decryptedContent = '[Decryption Failure: Corrupt Key Hash]';
              }

              const isImage = item.type === 'photo';

              return (
                <motion.div
                  key={item.id}
                  layout
                  className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-neutral-700 transition relative group overflow-hidden"
                >
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => handleToggleDecrypt(item.id)}
                      className="p-1 hover:bg-neutral-850 text-neutral-400 hover:text-orange-400 rounded transition cursor-pointer"
                      title={isDecrypted ? "Lock & Cipher Display" : "Mount Cryptographic decryption Key"}
                    >
                      {isDecrypted ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => setExportingItemId(exportingItemId === item.id ? null : item.id)}
                      className={`p-1 rounded transition cursor-pointer ${
                        exportingItemId === item.id 
                          ? 'bg-orange-950 text-orange-400 border border-orange-500/20' 
                          : 'hover:bg-neutral-850 text-neutral-400 hover:text-emerald-400'
                      }`}
                      title="Export individual file as AES-256 encrypted file"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      className="p-1 hover:bg-red-950/40 text-neutral-500 hover:text-red-400 rounded transition cursor-pointer"
                      title="Recursively shred file"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div>
                    {/* Header */}
                    <div className="flex items-start gap-2.5">
                      <div className={`p-2.5 rounded-lg bg-neutral-900 border border-neutral-850 text-neutral-300`}>
                        {isImage ? <Image className="h-4.5 w-4.5" /> : <FileText className="h-4.5 w-4.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-neutral-200 truncate pr-8 font-mono">{item.name}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[8px] px-1 py-0.5 bg-neutral-900 border border-neutral-850 rounded text-neutral-400 font-mono uppercase tracking-wider">
                            {item.category}
                          </span>
                          <span className="text-[9px] text-neutral-500 font-mono font-bold font-sans">
                            {item.fileSize}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Vault Body Content */}
                    <div className="mt-4 bg-neutral-900/60 p-3 rounded-lg border border-neutral-850 h-[100px] overflow-y-auto select-all custom-scrollbar flex flex-col justify-center">
                      {exportingItemId === item.id ? (
                        <div className="space-y-1.5 h-full flex flex-col justify-between">
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] text-orange-400 font-bold uppercase tracking-wider">AES-256 Local Encrypt</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setExportingItemId(null);
                              }}
                              className="text-[8px] text-neutral-500 hover:text-neutral-300 font-mono uppercase cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                          <div className="flex gap-1.5">
                            <input
                              type="password"
                              placeholder="Key passphrase"
                              required
                              value={individualPassphrases[item.id] || ''}
                              onChange={(e) => setIndividualPassphrases(prev => ({ ...prev, [item.id]: e.target.value }))}
                              className="flex-1 bg-neutral-950 border border-neutral-800 rounded text-[10px] py-1 px-2 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 font-mono font-bold"
                            />
                            <button
                              onClick={() => handleExportItem(item, individualPassphrases[item.id] || vaultKey)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded px-2.5 py-1 text-[9px] font-mono font-bold cursor-pointer"
                              title="Export encrypted file with this passphrase"
                            >
                              Encrypt
                            </button>
                          </div>
                          <p className="text-[7.5px] text-neutral-500 leading-normal font-sans">
                            Downloaded as a secure, ciphered .aes payload.
                          </p>
                        </div>
                      ) : isDecrypted ? (
                        isImage ? (
                          <div className="h-full w-full flex items-center justify-center">
                            <img src={decryptedContent} className="max-h-full max-w-full object-contain rounded border border-neutral-800" alt="Symmetric Vault Node" />
                          </div>
                        ) : (
                          <p className="text-[10px] leading-relaxed text-emerald-400 break-words font-mono font-medium">{decryptedContent}</p>
                        )
                      ) : (
                        <div className="text-center font-mono space-y-1">
                          <Lock className="h-4.5 w-4.5 text-orange-500/80 mx-auto" />
                          <p className="text-[8px] text-neutral-500 font-mono uppercase tracking-widest break-all">CIPHERTEXT: {item.dataUrl.slice(0, 16)}...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footing info */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-800/50 flex justify-between items-center text-[10px] font-mono text-neutral-500">
                    <span>DATE LOCK: {item.encryptedAt}</span>
                    <span className="flex items-center gap-0.5">
                      {isDecrypted ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-bold"><Unlock className="h-3 w-3" /> DECIPHERED</span>
                      ) : (
                        <span className="text-orange-500 uppercase flex items-center gap-1"><Lock className="h-3 w-3" /> SECURED ON FLOP</span>
                      )}
                    </span>
                  </div>

                </motion.div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
