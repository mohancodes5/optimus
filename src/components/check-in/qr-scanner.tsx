"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";

export function QrScanner({
  active,
  onScan,
}: {
  active: boolean;
  onScan: (code: string) => void;
}) {
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef({ value: "", at: 0 });
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          const now = Date.now();
          if (
            decoded === lastScanRef.current.value &&
            now - lastScanRef.current.at < 2500
          ) {
            return;
          }
          lastScanRef.current = { value: decoded, at: now };
          onScanRef.current(decoded);
        },
        () => undefined
      )
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Camera unavailable — enter member code manually below."
          );
        }
      });

    return () => {
      cancelled = true;
      const active = scannerRef.current;
      scannerRef.current = null;
      if (!active) return;
      void (async () => {
        try {
          const state = active.getState();
          if (state === 2 /* SCANNING */) {
            await active.stop();
          }
          await active.clear();
        } catch {
          // scanner already stopped
        }
      })();
    };
  }, [active]);

  return (
    <div className="space-y-3">
      <div
        id="qr-reader"
        className="overflow-hidden rounded-xl border border-border bg-secondary/40"
      />
      {error ? <p className="text-xs text-warning">{error}</p> : null}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!manual.trim()) return;
          onScan(manual.trim());
          setManual("");
        }}
      >
        <input
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          placeholder="Or type member code (OPT-XXXXXX)"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <Button type="submit" size="sm">
          Go
        </Button>
      </form>
    </div>
  );
}
