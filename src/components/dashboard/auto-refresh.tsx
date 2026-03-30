"use client";

import { useEffect, useEffectEvent } from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshProps {
  intervalMs: number;
}

export function AutoRefresh({ intervalMs }: AutoRefreshProps) {
  const router = useRouter();

  const refreshPage = useEffectEvent(() => {
    if (document.visibilityState === "visible") {
      router.refresh();
    }
  });

  useEffect(() => {
    refreshPage();
    const interval = window.setInterval(() => {
      refreshPage();
    }, intervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [intervalMs]);

  return null;
}
