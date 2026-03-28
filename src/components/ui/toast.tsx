"use client";

import { useEffect, useState, useCallback } from "react";

interface ToastMessage {
  id: number;
  text: string;
}

let nextId = 0;
let globalAddToast: ((text: string) => void) | null = null;

/**
 * Call from anywhere to show a toast. The ToastContainer must be mounted.
 */
export function showToast(text: string) {
  globalAddToast?.(text);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    globalAddToast = addToast;
    return () => {
      globalAddToast = null;
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-slide-in-right rounded-md border border-[var(--ssg-green)]/30 bg-[var(--card)] px-4 py-3 text-sm text-[var(--foreground)] shadow-lg shadow-[#64feba08]"
        >
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ssg-green)]" />
            {toast.text}
          </div>
        </div>
      ))}
    </div>
  );
}
