"use client";

import { useEffect, useState } from "react";

/** Single source of truth for connectivity. Every write control reads this one hook. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const read = () => setOnline(navigator.onLine ?? true);
    read();
    window.addEventListener("online", read);
    window.addEventListener("offline", read);
    return () => {
      window.removeEventListener("online", read);
      window.removeEventListener("offline", read);
    };
  }, []);

  return online;
}
