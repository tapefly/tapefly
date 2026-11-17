"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "./i18n/client";

export default function ContinueWorkshop() {
  const { t } = useLang();
  const [cleared, setCleared] = useState<number | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tapefly.workshop.v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { best?: Record<string, unknown> };
      setCleared(Object.keys(parsed.best ?? {}).length);
    } catch {}
  }, []);
  if (cleared === null) return null;
  return (
    <Link className="btn" href="/workshop">
      {t(`继续上次进度 · ${cleared} 关`, `Continue · ${cleared} cleared`)}
    </Link>
  );
}
