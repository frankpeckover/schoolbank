"use client";

import { useEffect, useRef } from "react";
import { showToast } from "@/components/ui/toast-viewport";

type FixedNotificationProps = {
  error?: string | null;
  message?: string | null;
};

export function FixedNotification({
  error,
  message,
}: FixedNotificationProps) {
  const lastToastKeyRef = useRef("");

  useEffect(() => {
    const text = error ?? message;

    if (!text) {
      lastToastKeyRef.current = "";
      return;
    }

    const tone = error ? "error" : "success";
    const toastKey = `${tone}:${text}`;

    if (lastToastKeyRef.current === toastKey) {
      return;
    }

    lastToastKeyRef.current = toastKey;
    showToast({ text, tone });
  }, [error, message]);

  return null;
}
