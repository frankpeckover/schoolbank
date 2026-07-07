"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  listEnabledSsoProviders,
  loginUser,
  requestPasswordReset,
} from "@/lib/actions";
import { appConfig } from "@/lib/app-config";
import { type SessionUser } from "@/lib/session";
import type { PublicSsoProvider } from "@/lib/sso-types";
import { AppFooter } from "@/components/ui/app-footer";
import { GlobalMaintenanceBanner } from "@/components/ui/global-maintenance-banner";
import { ModalCloseButton } from "@/components/ui/modal-close-button";

type LoginCardProps = {
  onLogin: (user: SessionUser) => void;
};

export function LoginCard({ onLogin }: LoginCardProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ssoProviders, setSsoProviders] = useState<PublicSsoProvider[]>([]);

  useEffect(() => {
    const ssoStatus = new URLSearchParams(window.location.search).get("sso");

    if (!ssoStatus) {
      return;
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("sso");
    window.history.replaceState({}, "", nextUrl);

    if (ssoStatus === "account_required") {
      setMessage(
        "You were authenticated successfully. Please ask an admin to create your account before signing in.",
      );
      return;
    }

    if (ssoStatus === "sso_unavailable") {
      setError("That SSO provider is not currently enabled for this school.");
      return;
    }

    setError(getSsoErrorMessage(ssoStatus));
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSsoProviders() {
      try {
        const providers = await listEnabledSsoProviders();

        if (isMounted) {
          setSsoProviders(providers);
        }
      } catch {
        if (isMounted) {
          setSsoProviders([]);
        }
      }
    }

    loadSsoProviders();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await loginUser(username, password);

    if (!result.ok) {
      setMessage(null);
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    setError(null);
    setIsSubmitting(false);
    onLogin(result.user);
  }

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <GlobalMaintenanceBanner />
      <div className="mx-auto grid w-full max-w-6xl flex-1 content-center gap-5 px-4 py-5 sm:gap-8 sm:px-6 lg:grid-cols-[1fr_420px] lg:items-center lg:px-8">
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
            {message && (
              <p className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success">
                {message}
              </p>
            )}

            <button
              className="w-full rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>

            {ssoProviders.length > 0 && (
              <SsoLoginOptions providers={ssoProviders} />
            )}

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

      <div className="mx-auto w-full max-w-6xl px-4 pb-5 sm:px-6 lg:px-8">
        <AppFooter />
      </div>

      {isForgotPasswordOpen && (
        <ForgotPasswordModal onClose={() => setIsForgotPasswordOpen(false)} />
      )}
    </main>
  );
}

function getSsoErrorMessage(status: string) {
  const messages: Record<string, string> = {
    expired_token: "SSO sign-in failed because the provider token expired.",
    email_domain_mismatch: "SSO sign-in failed because the account email domain does not match the allowed domains in SSO settings.",
    hosted_domain_missing: "SSO sign-in failed because Google did not return a Workspace domain.",
    hosted_domain_mismatch: "SSO sign-in failed because the Google Workspace domain does not match this school.",
    invalid_audience: "SSO sign-in failed because the client ID did not match.",
    invalid_callback_values: "SSO sign-in failed because the provider callback was not valid.",
    invalid_issuer: "SSO sign-in failed because the issuer URL did not match the provider.",
    invalid_nonce: "SSO sign-in failed because the login session could not be verified. Try again.",
    missing_callback_values: "SSO sign-in failed because the provider callback was incomplete.",
    missing_email: "SSO sign-in failed because the provider did not return an email address.",
    missing_id_token: "SSO sign-in failed because the provider did not return an ID token.",
    missing_verified_email: "SSO sign-in failed because the provider did not return a verified email.",
    provider_error: "The SSO provider returned an error before sign-in completed.",
    signing_key_not_found: "SSO sign-in failed because the provider signing key could not be found.",
    signing_keys_unavailable: "SSO sign-in failed because provider signing keys could not be loaded.",
    state_mismatch: "SSO sign-in failed because the login session could not be matched. Try again.",
    tenant_mismatch: "SSO sign-in failed because the Microsoft tenant did not match this school.",
    token_exchange_failed: "SSO sign-in failed during the provider token exchange.",
    unknown_provider: "That SSO provider is not recognised.",
    unverified_email: "SSO sign-in failed because the provider email is not verified.",
    unsupported_token_algorithm: "SSO sign-in failed because the provider token algorithm is not supported.",
  };

  return messages[status] ?? "SSO sign-in could not be completed.";
}

function SsoLoginOptions({ providers }: { providers: PublicSsoProvider[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border-subtle" />
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
          or
        </span>
        <span className="h-px flex-1 bg-border-subtle" />
      </div>

      <div className="grid gap-2">
        {providers.map((provider) => (
          <a
            className="block w-full rounded-md border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-text-control transition hover:bg-surface-muted"
            href={`/auth/sso/${provider.providerType}`}
            key={provider.providerType}
          >
            Sign in with {provider.displayName}
          </a>
        ))}
      </div>
    </div>
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
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold">Reset password</h2>
            <p className="mt-1 text-sm text-text-muted">
              Enter your username or email and we&apos;ll send a reset link.
            </p>
          </div>
          <ModalCloseButton onClick={onClose} />
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
