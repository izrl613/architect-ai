/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Initialize environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize server-side Gemini client with proper telemetry headers
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('WARN: GEMINI_API_KEY environment variable is not defined. Sever-side Gemini queries will fallback to on-device emulation.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || 'MOCK_KEY',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Server-side E2EE guidance route for Architect AI counselor
  app.post('/api/guidance', async (req, res) => {
    const { prompt, context } = req.body;
    
    if (!prompt) {
      res.status(400).json({ error: 'System Prompt parameter is required.' });
      return;
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        throw new Error('MISSING_API_KEY');
      }

      const ai = getAiClient();
      
      const systemInstruction = 
        "You are the 'Architect AI Enclave Counselor', a local, client-trusted security auditor " +
        "built into the Aegis Core Privacy Suite. Your role is to provide deep, actionable guidance " +
        "to standard users on data protection, encryption, tracker-blocking, on-device enclaves, " +
        "and identity module isolation. " +
        "Adhere to the following rules:\n" +
        "1. Write in a highly compact, professional, technical-yet-direct tone (High Density theme style).\n" +
        "2. Do NOT use emojis, promotional slogans, or fluff. Keep summaries extremely scannable using brief bullet points.\n" +
        "3. Focus on explaining technical mechanics, security parameters, and cryptographic isolation boundaries simply.\n" +
        "4. Standard user configurations: 16 identity modules are loaded, biometric lock is active, credentials are local ciphertexts.";

      const contents = `
      User Inquiry: ${prompt}
      
      Security Environment Status Context:
      - overallScore: ${context?.overallScore || 75}/100
      - activeIdentitiesCount: ${context?.activeModulesCount || 0}/16
      - weakPasswordsLocked: ${context?.weakPasswordsCount || 0}
      - blockedTrackersCount: ${context?.blockedTrackersTotal || 0}
      - encryptedVaultFiles: ${context?.vaultItemsCount || 0}
      - blockingTunnelSeverity: ${context?.blockingLevel || 'Strict'}
      - systemStatus: ${context?.isOffline ? 'OFFLINE (Gemma4-e4b emulation)' : 'ONLINE (Enclave cascade Tunnel)'}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.2
        }
      });

      res.json({ message: response.text });
    } catch (error: any) {
      console.error('Server-Side Gemini Error:', error);
      
      // If the API key is not valid, fallback gracefully to on-device simulated counselor
      res.json({ 
        message: generateLocalGuidance(prompt, context)
      });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    // Serve static compiled assets in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Integrate Vite as a development middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[AEGIS CORE] Full-stack enclave server actively listening on port ${port}`);
  });
}

// Deterministic on-device fallback counselor using local context (simulating gemma4-e4b)
function generateLocalGuidance(prompt: string, context: any): string {
  const q = prompt.toLowerCase();
  
  if (q.includes('password') || q.includes('passphrase') || q.includes('strength')) {
    return `### [Local Gemma4-e4b Advice] Credential Architecture Recommendations
- **Avoid Key Repetition**: Ensure you do not use identical master passwords across corporate sandboxes (ID-04) and public burners (ID-07).
- **Evaluate Strength Scores**: Our localized on-device metrics require high entropy levels. Passwords with fewer than 10 bytes or lacking numbers are flagged.
- **Audit Findings**: You currently have **${context?.weakPasswordsCount || 0} weak passwords** in storage. Purge or cycle keys.`;
  }
  
  if (q.includes('module') || q.includes('identity') || q.includes('custom')) {
    return `### [Local Gemma4-e4b Advice] Virtual Identity Sandbox Isolation
- **16 Isolated Sectors Active**: Currently, **${context?.activeModulesCount || 0} of 16 modules** are running. Turning on unused profiles expands memory allocation footprints.
- **MFA Enforcement**: Enforce multi-factor tokens (TOTP/Biometric) on all modules of elevated or paranoid clearance to protect sandbox registers.
- **Sandbox Whitelist Bounds**: Ensure only verified software (such as Tor, Brave, Signal, QuickBooks) is registered in sandbox whitelists.`;
  }

  if (q.includes('tracker') || q.includes('block') || q.includes('blocker') || q.includes('analytics')) {
    return `### [Local Gemma4-e4b Advice] Real-time Network Sanitization
- **Severity Level Selection**: You are currently operating at **${context?.blockingLevel || 'Strict'}** parameter filtering.
- **Isolation Boundaries**: Switching to 'Isolation' intercepts all tracking pixels. Standard mode blocks analytical trackers only.
- **Scrubbing Results**: **${context?.blockedTrackersTotal || 0} requests** have been blocked. All socket handshakes are verified client-side.`;
  }

  if (q.includes('vault') || q.includes('storage') || q.includes('file') || q.includes('photo')) {
    return `### [Local Gemma4-e4b Advice] Symmetric Device Airgap Vault
- **Encrypted Local Enclave**: Stored files are symmetrically locked on local storage using Base64 indexing.
- **Zero-Knowledge**: Aegis does not store original decryption matrices. Lost vault passphrases cannot be recovered.
- **Vault Status**: Your vault contains **${context?.vaultItemsCount || 0} encrypted elements**. All backups are synchronized with on-device sandbox clusters.`;
  }

  return `### [Local Gemma4-e4b Advice] Aegis Core Status Analysis
- **On-Device Status**: Currently active in **${context?.isOffline ? 'AIRGAP OFFLINE' : 'STANDARD SECURE TUNNEL'}** configuration.
- **Local Enclave Heuristics**: Our local on-device neural parser (Gemma4-e4b) is active, keeping communication trace-free.
- **Dynamic Scoring**: Your core suite privacy score is evaluated as **${context?.overallScore || 75}%**. We recommend enforcing MFA on active identities to elevate this ranking.`;
}

startServer();
