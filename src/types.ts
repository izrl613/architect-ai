/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PasswordEntry {
  id: string;
  service: string;
  username: string;
  passwordCipher: string; // Mock AES/Symmetric encrypted representation
  strength: 'weak' | 'medium' | 'strong' | 'paranoid';
  url: string;
  notes: string;
  category: string;
  updatedAt: string;
}

export interface EncryptedMessage {
  id: string;
  sender: string;
  recipient: string;
  plaintext: string;
  ciphertext: string;
  secretKey: string;
  timestamp: string;
  isSelfSent: boolean;
}

export interface VaultItem {
  id: string;
  name: string;
  type: 'document' | 'photo';
  fileSize: string;
  category: 'financial' | 'personal' | 'legal' | 'credentials';
  dataUrl: string; // Base64 or placeholder placeholder data
  encryptedAt: string;
}

export interface TrackerLog {
  id: string;
  domain: string;
  category: 'advertising' | 'analytics' | 'social' | 'fingerprinting' | 'malware';
  riskScore: number; // 1 to 10
  timestamp: string;
  action: 'blocked' | 'intercepted';
  location: string; // e.g. USA, China, Ireland
}

export interface IdentityModule {
  id: string;
  name: string;
  code: string; // unique short code like ID-01, ID-02
  iconName: string; // Name corresponding to Lucide icons
  description: string;
  flowRequirement: string; // e.g., "Developer Sandbox", "Anonymous Surfer"
  mfaType: 'TOTP' | 'SMS' | 'Biometric' | 'Hardware Key';
  mfaEnabled: boolean;
  mfaSecret?: string;
  protectionLevel: 'Standard' | 'Elevated' | 'Paranoid';
  isActive: boolean;
  encryptedBytes: number;
  authorizedApps: string[];
}

export interface AuditLog {
  id: string;
  title: string;
  status: 'critical' | 'warning' | 'secured';
  category: 'passwords' | 'vault' | 'trackers' | 'identity';
  message: string;
  timestamp: string;
}

export interface SecurityStats {
  overallScore: number; // 0 - 100
  passwordsAnalyzed: number;
  weakPasswordsCount: number;
  blockedTrackersTotal: number;
  vaultItemsCount: number;
  activeModulesCount: number;
}
