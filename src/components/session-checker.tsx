"use client";

import { useEffect } from "react";
import { getCurrentSessionUser } from "@/lib/actions";
import { notifySessionExpired } from "@/lib/session-expiry-event";

const sessionCheckIntervalMs = 60_000;
const unauthenticatedErrorText = "Not authenticated.";

export function SessionChecker() {
  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const currentUser = await getCurrentSessionUser();

        if (isMounted && currentUser === null) {
          notifySessionExpired();
        }
      } catch (error) {
        if (isUnauthenticatedError(error)) {
          notifySessionExpired();
        }
      }
    }

    const intervalId = window.setInterval(checkSession, sessionCheckIntervalMs);

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      if (!isUnauthenticatedError(event.reason)) {
        return;
      }

      event.preventDefault();
      notifySessionExpired();
    }

    function handleWindowError(event: ErrorEvent) {
      if (!isUnauthenticatedError(event.error ?? event.message)) {
        return;
      }

      event.preventDefault();
      notifySessionExpired();
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleWindowError);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleWindowError);
    };
  }, []);

  return null;
}

function isUnauthenticatedError(error: unknown) {
  if (error instanceof Error) {
    return error.message.includes(unauthenticatedErrorText);
  }

  if (typeof error === "string") {
    return error.includes(unauthenticatedErrorText);
  }

  return false;
}
