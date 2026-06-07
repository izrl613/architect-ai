/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Simple XOR and Base64 cipher to simulate End-to-End Encryption
export function encryptText(text: string, key: string): string {
  if (!text) return '';
  if (!key) return text;
  
  // Transform key into a numerical shift sequence
  const keyCodes = Array.from(key).map(c => c.charCodeAt(0));
  let result = '';
  
  for (let i = 0; i < text.length; i++) {
    const shift = keyCodes[i % keyCodes.length];
    const encryptedChar = String.fromCharCode(text.charCodeAt(i) ^ shift);
    result += encryptedChar;
  }
  
  // Convert to Base64 to be safe for transport/viewing
  try {
    return btoa(unescape(encodeURIComponent(result)));
  } catch (e) {
    // Fallback if encode error occurs
    return btoa(result);
  }
}

export function decryptText(ciphertext: string, key: string): string {
  if (!ciphertext) return '';
  if (!key) return ciphertext;
  
  let rawText = '';
  try {
    rawText = decodeURIComponent(escape(atob(ciphertext)));
  } catch (e) {
    try {
      rawText = atob(ciphertext);
    } catch {
      return '[Decryption Failed: Invalid Ciphertext]';
    }
  }
  
  const keyCodes = Array.from(key).map(c => c.charCodeAt(0));
  let result = '';
  
  for (let i = 0; i < rawText.length; i++) {
    const shift = keyCodes[i % keyCodes.length];
    const decryptedChar = String.fromCharCode(rawText.charCodeAt(i) ^ shift);
    result += decryptedChar;
  }
  
  return result;
}

// Password strength assessment algorithm
export function evaluatePasswordStrength(password: string): 'weak' | 'medium' | 'strong' | 'paranoid' {
  if (!password) return 'weak';
  if (password.length < 6) return 'weak';
  
  let score = 0;
  if (password.length >= 10) score += 2;
  if (password.length >= 16) score += 2;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 2;
  
  if (score >= 7) return 'paranoid';
  if (score >= 5) return 'strong';
  if (score >= 3) return 'medium';
  return 'weak';
}

// Advanced Password Generator
export function generateSecurePassword(length = 16, includeSymbols = true, includeNumbers = true): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let characters = lowercase + uppercase;
  if (includeNumbers) characters += numbers;
  if (includeSymbols) characters += symbols;
  
  let result = '';
  // Guarantee at least one character from each enabled set
  result += lowercase[Math.floor(Math.random() * lowercase.length)];
  result += uppercase[Math.floor(Math.random() * uppercase.length)];
  if (includeNumbers) result += numbers[Math.floor(Math.random() * numbers.length)];
  if (includeSymbols) result += symbols[Math.floor(Math.random() * symbols.length)];
  
  const remainingLength = length - result.length;
  for (let i = 0; i < remainingLength; i++) {
    result += characters[Math.floor(Math.random() * characters.length)];
  }
  
  // Shuffle characters
  return result.split('').sort(() => 0.5 - Math.random()).join('');
}
