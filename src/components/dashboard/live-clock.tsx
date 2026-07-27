"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

export function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-right">
      <p className="text-sm font-semibold tabular-nums text-foreground">
        {format(now, "EEE, d MMM yyyy")}
      </p>
      <p className="text-xs tabular-nums text-muted-foreground">{format(now, "hh:mm:ss a")}</p>
    </div>
  );
}
