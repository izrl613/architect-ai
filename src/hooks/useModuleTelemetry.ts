import { useEffect, useRef } from 'react';

interface TelemetryPayload {
  moduleId: string;
  entryTime: number;
  exitTime: number;
  latencyMs: number;
  userAgent: string;
}

export function useModuleTelemetry(activeModule: string) {
  const entryTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const currentEntryTime = Date.now();
    entryTimeRef.current = currentEntryTime;

    return () => {
      const exitTime = Date.now();
      const latencyMs = exitTime - currentEntryTime;

      const payload: TelemetryPayload = {
        moduleId: activeModule,
        entryTime: currentEntryTime,
        exitTime,
        latencyMs,
        userAgent: navigator.userAgent
      };

      const payloadStr = JSON.stringify(payload);

      // Create SHA-256 handshake seal
      crypto.subtle.digest('SHA-256', new TextEncoder().encode(payloadStr)).then(hashBuffer => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        fetch('/api/verify-module', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: payloadStr,
            seal: hashHex
          })
        }).catch(err => console.error("Telemetry error", err));
      });
    };
  }, [activeModule]);
}
