"use client";
import { useEffect } from "react";

/** Registra o service worker (instalação como aplicativo). Só em produção, para não interferir no desenvolvimento. */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
  }, []);
  return null;
}
