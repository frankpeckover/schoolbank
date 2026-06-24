"use client";

import { FormEvent, useState } from "react";
import { loginUser, requestPasswordReset } from "@/lib/actions";
import { appConfig } from "@/lib/app-config";
import { type SessionUser } from "@/lib/session";

type LoginCardProps = {
  onLogin: (user: SessionUser) => void;
};

export function LoginCard({ onLogin }: LoginCardProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await loginUser(username, password);

    if (!result.ok) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    setError(null);
    setIsSubmitting(false);
    onLogin(result.user);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl content-center gap-5 sm:gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-kicker">
            {appConfig.name}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-5xl">
            Sign in to your school economy
          </h1>
          <p className="mt-3 text-base leading-7 text-text-label sm:mt-4 sm:text-lg sm:leading-8">
            Earn wisely. Spend purposefully. Grow together.
          </p>
        </div>

        <section className="theme-panel p-5">
          <h2 className="text-2xl font-semibold">Log in</h2>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                className="text-sm font-semibold text-text-control"
                htmlFor="username"
              >
                Username
              </label>
              <input
                autoComplete="username"
                className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
                disabled={isSubmitting}
                id="username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Username"
                type="text"
                value={username}
              />
            </div>

            <div>
              <label
                className="text-sm font-semibold text-text-control"
                htmlFor="password"
              >
                Password
              </label>
              <input
                autoComplete="current-password"
                className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
                disabled={isSubmitting}
                id="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                type="password"
                value={password}
              />
            </div>

            {error && (
              <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
                {error}
              </p>
            )}

            <button
              className="w-full rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>

            <div className="text-center">
              <button
                className="text-sm font-semibold text-text-muted underline-offset-4 transition hover:text-text-control hover:underline disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => setIsForgotPasswordOpen(true)}
                title="Request a password reset link"
                type="button"
              >
                Forgot password?
              </button>
            </div>
          </form>
        </section>
      </div>

      {isForgotPasswordOpen && (
        <ForgotPasswordModal onClose={() => setIsForgotPasswordOpen(false)} />
      )}
    </main>
  );
}

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const result = await requestPasswordReset(identifier);

    if (!result.ok) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    setMessage(result.message);
    setIsSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="theme-panel motion-pop w-full max-w-md p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Reset password</h2>
            <p className="mt-1 text-sm text-text-muted">
              Enter your username or email and we&apos;ll send a reset link.
            </p>
          </div>
          <button
            className="rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              className="text-sm font-semibold text-text-control"
              htmlFor="resetIdentifier"
            >
              Username or email
            </label>
            <input
              autoComplete="username"
              className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
              disabled={isSubmitting}
              id="resetIdentifier"
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Username or email"
              value={identifier}
            />
          </div>

          {message && (
            <p className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success">
              {message}
            </p>
          )}
          {error && (
            <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
              {error}
            </p>
          )}

          <button
            className="w-full rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>
      </div>
    </div>
  );
}
