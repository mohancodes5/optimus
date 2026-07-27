"use client";

import QRCode from "react-qr-code";
import { buildMemberQrPayload } from "@/lib/member-code";

export function MemberQrCard({
  memberCode,
  fullName,
}: {
  memberCode: string;
  fullName: string;
}) {
  const value = buildMemberQrPayload(memberCode);

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border/70 bg-white p-4 text-center">
      <QRCode value={value} size={160} />
      <div>
        <p className="text-sm font-semibold text-foreground">{fullName}</p>
        <p className="font-mono text-xs tracking-wide text-muted-foreground">{memberCode}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Scan at Check-In desk</p>
      </div>
    </div>
  );
}
