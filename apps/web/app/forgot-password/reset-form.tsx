"use client";

import type { VerificationRequestResult } from "@classroom-os/types";
import { useState, type FormEvent } from "react";

const T = {
  email: "\u0e2d\u0e35\u0e40\u0e21\u0e25",
  request: "\u0e02\u0e2d\u0e15\u0e31\u0e49\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48",
  requesting: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e2a\u0e48\u0e07\u0e04\u0e33\u0e02\u0e2d...",
  token: "\u0e23\u0e2b\u0e31\u0e2a\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19",
  devToken:
    "\u0e23\u0e2b\u0e31\u0e2a\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e2a\u0e20\u0e32\u0e1e\u0e41\u0e27\u0e14\u0e25\u0e49\u0e2d\u0e21\u0e1e\u0e31\u0e12\u0e19\u0e32",
  newPassword: "\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48",
  confirmNewPassword:
    "\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48",
  revealPassword: "\u0e01\u0e14\u0e04\u0e49\u0e32\u0e07\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e41\u0e2a\u0e14\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19",
  passwordHelp:
    "\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e19\u0e49\u0e2d\u0e22 12 \u0e15\u0e31\u0e27 \u0e21\u0e35\u0e15\u0e31\u0e27\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e43\u0e2b\u0e0d\u0e48 \u0e15\u0e31\u0e27\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e40\u0e25\u0e47\u0e01 \u0e15\u0e31\u0e27\u0e40\u0e25\u0e02 \u0e41\u0e25\u0e30\u0e2a\u0e31\u0e0d\u0e25\u0e31\u0e01\u0e29\u0e13\u0e4c",
  confirm: "\u0e15\u0e31\u0e49\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48",
  confirming: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e15\u0e31\u0e49\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19...",
  genericError: "\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23\u0e44\u0e14\u0e49",
  requestError: "\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e2a\u0e48\u0e07\u0e04\u0e33\u0e02\u0e2d\u0e44\u0e14\u0e49",
  confirmError:
    "\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e15\u0e31\u0e49\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e44\u0e14\u0e49",
  requested:
    "\u0e16\u0e49\u0e32\u0e21\u0e35\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e19\u0e35\u0e49\u0e43\u0e19\u0e23\u0e30\u0e1a\u0e1a \u0e40\u0e23\u0e32\u0e08\u0e30\u0e2a\u0e48\u0e07\u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19\u0e15\u0e31\u0e49\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e43\u0e2b\u0e49",
  mismatch:
    "\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e41\u0e25\u0e30\u0e0a\u0e48\u0e2d\u0e07\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e44\u0e21\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19",
  resetDone:
    "\u0e15\u0e31\u0e49\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27 \u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07",
  successTitle:
    "\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08",
  successBody:
    "\u0e04\u0e38\u0e13\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e43\u0e0a\u0e49\u0e23\u0e2b\u0e31\u0e2a\u0e43\u0e2b\u0e21\u0e48\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a\u0e44\u0e14\u0e49\u0e17\u0e31\u0e19\u0e17\u0e35 \u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e17\u0e35\u0e48\u0e04\u0e49\u0e32\u0e07\u0e2d\u0e22\u0e39\u0e48\u0e08\u0e30\u0e16\u0e39\u0e01\u0e43\u0e2b\u0e49\u0e2d\u0e2d\u0e01\u0e08\u0e32\u0e01\u0e23\u0e30\u0e1a\u0e1a",
  goToLogin:
    "\u0e44\u0e1b\u0e2b\u0e19\u0e49\u0e32\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a",
  invalidReset:
    "\u0e23\u0e2b\u0e31\u0e2a\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e44\u0e21\u0e48\u0e16\u0e39\u0e01\u0e15\u0e49\u0e2d\u0e07 \u0e2b\u0e21\u0e14\u0e2d\u0e32\u0e22\u0e38 \u0e2b\u0e23\u0e37\u0e2d\u0e16\u0e39\u0e01\u0e43\u0e0a\u0e49\u0e44\u0e1b\u0e41\u0e25\u0e49\u0e27 \u0e01\u0e23\u0e38\u0e13\u0e32\u0e02\u0e2d\u0e23\u0e2b\u0e31\u0e2a\u0e43\u0e2b\u0e21\u0e48",
};

function safeErrorMessage(message: string | undefined) {
  if (!message) return T.genericError;
  if (/invalid|expired|request/i.test(message)) return T.invalidReset;
  return message;
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { data?: T; error?: { message: string } };
  if (!response.ok || !payload.data) {
    throw new Error(safeErrorMessage(payload.error?.message));
  }
  return payload.data;
}

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [developmentToken, setDevelopmentToken] = useState("");
  const [pending, setPending] = useState(false);
  const [resetSucceeded, setResetSucceeded] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const inputClass =
    "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setDevelopmentToken("");
    setResetSucceeded(false);
    const form = new FormData(event.currentTarget);
    try {
      const result = await postJson<VerificationRequestResult>("/api/password-reset", { email: form.get("email") });
      setDevelopmentToken(result.developmentToken ?? "");
      setMessage(T.requested);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : T.requestError);
    } finally {
      setPending(false);
    }
  }

  async function confirmReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const newPassword = form.get("newPassword");
    const confirmNewPassword = form.get("confirmNewPassword");
    if (newPassword !== confirmNewPassword) {
      setMessage(T.mismatch);
      setPending(false);
      return;
    }
    try {
      await postJson("/api/password-reset/confirm", { token: form.get("token"), newPassword });
      setMessage(T.resetDone);
      setDevelopmentToken("");
      setResetSucceeded(true);
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : T.confirmError);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <form onSubmit={requestReset} className="space-y-4">
        <label htmlFor="reset-email" className="block text-sm font-semibold text-slate-800">
          {T.email}
          <input id="reset-email" name="email" type="email" autoComplete="username" required className={inputClass} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? T.requesting : T.request}
        </button>
      </form>
      {developmentToken ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          {T.devToken}: <code>{developmentToken}</code>
        </p>
      ) : null}
      <form onSubmit={confirmReset} className="space-y-4">
        <label htmlFor="reset-token" className="block text-sm font-semibold text-slate-800">
          {T.token}
          <input id="reset-token" name="token" defaultValue={developmentToken} required className={inputClass} />
        </label>
        <label htmlFor="new-password" className="block text-sm font-semibold text-slate-800">
          {T.newPassword}
          <PasswordInput
            id="new-password"
            name="newPassword"
            visible={newPasswordVisible}
            onRevealStart={() => setNewPasswordVisible(true)}
            onRevealEnd={() => setNewPasswordVisible(false)}
            className={inputClass}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">{T.passwordHelp}</span>
        </label>
        <label htmlFor="confirm-new-password" className="block text-sm font-semibold text-slate-800">
          {T.confirmNewPassword}
          <PasswordInput
            id="confirm-new-password"
            name="confirmNewPassword"
            visible={confirmPasswordVisible}
            onRevealStart={() => setConfirmPasswordVisible(true)}
            onRevealEnd={() => setConfirmPasswordVisible(false)}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-blue-600 px-5 py-3 text-sm font-semibold text-blue-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? T.confirming : T.confirm}
        </button>
      </form>
      {message ? <p aria-live="polite" className="text-sm font-medium text-blue-700">{message}</p> : null}
      {resetSucceeded ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="reset-success-title">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700" aria-hidden="true">
              ✓
            </div>
            <h2 id="reset-success-title" className="mt-4 text-xl font-bold text-slate-950">
              {T.successTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{T.successBody}</p>
            <a
              href="/login"
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {T.goToLogin}
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PasswordInput({
  id,
  name,
  visible,
  onRevealStart,
  onRevealEnd,
  className,
}: {
  id: string;
  name: string;
  visible: boolean;
  onRevealStart(): void;
  onRevealEnd(): void;
  className: string;
}) {
  return (
    <div className="relative mt-2">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        minLength={12}
        required
        className={`${className} pr-14`}
      />
      <button
        type="button"
        aria-label={T.revealPassword}
        aria-pressed={visible}
        onPointerDown={onRevealStart}
        onPointerUp={onRevealEnd}
        onPointerCancel={onRevealEnd}
        onPointerLeave={onRevealEnd}
        onBlur={onRevealEnd}
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") onRevealStart();
        }}
        onKeyUp={onRevealEnd}
        className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        <EyeIcon />
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M2.25 12s3.5-6.25 9.75-6.25S21.75 12 21.75 12 18.25 18.25 12 18.25 2.25 12 2.25 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
