"use client";

import { useEffect } from "react";

/** Enregistre le service worker — uniquement en production. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => { /* sans conséquence */ });
    // On attend la fin du chargement pour ne pas concurrencer le rendu initial.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
