"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

const T = {
  email: "\u0e2d\u0e35\u0e40\u0e21\u0e25",
  password: "\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19",
  forgotPassword: "\u0e25\u0e37\u0e21\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19?",
  login: "\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a",
  loggingIn: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a...",
  revealPassword: "\u0e01\u0e14\u0e04\u0e49\u0e32\u0e07\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e41\u0e2a\u0e14\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19",
};

const inputClass =
  "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-slate-800">
          {T.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          aria-describedby={state.error ? "login-error" : undefined}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-slate-800">
          {T.password}
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          visible={passwordVisible}
          onRevealStart={() => setPasswordVisible(true)}
          onRevealEnd={() => setPasswordVisible(false)}
          describedBy={state.error ? "login-error" : undefined}
        />
      </div>
      <div className="text-right">
        <Link
          href="/forgot-password"
          className="text-sm font-semibold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          {T.forgotPassword}
        </Link>
      </div>
      {state.error ? (
        <p id="login-error" role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
      >
        {isPending ? T.loggingIn : T.login}
      </button>
    </form>
  );
}

function PasswordInput({
  id,
  name,
  autoComplete,
  visible,
  onRevealStart,
  onRevealEnd,
  describedBy,
}: {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  visible: boolean;
  onRevealStart(): void;
  onRevealEnd(): void;
  describedBy?: string;
}) {
  return (
    <div className="relative mt-2">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required
        aria-describedby={describedBy}
        className={`${inputClass} mt-0 pr-14`}
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
