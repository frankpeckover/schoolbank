"use client";

import { FormEvent, useState } from "react";
import { loginUser } from "@/lib/actions";
import { type SessionUser } from "@/lib/session";

type LoginCardProps = {
  onLogin: (user: SessionUser) => void;
};

export function LoginCard({ onLogin }: LoginCardProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_420px]">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-kicker">
            SchoolBank
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal sm:text-5xl">
            Sign in to your school economy
          </h1>
          <p className="mt-4 text-lg leading-8 text-text-label">
            Earn wisely. Spend purposefully. Grow together.
          </p>
        </div>

        <section className="rounded-md border border-border bg-surface p-5 shadow-sm">
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
                placeholder="username"
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
          </form>

        </section>
      </div>
    </main>
  );
}
