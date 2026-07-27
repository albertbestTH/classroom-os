type NextClassIllustrationProps = { variant: "upcoming" | "active" | "empty" };

export function NextClassIllustration({ variant }: NextClassIllustrationProps) {
  const accent = variant === "active" ? "#14B8A6" : "#2563EB";
  return <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true" className="shrink-0">
    <rect x="8" y="8" width="44" height="52" rx="9" fill="rgba(255,255,255,.94)" />
    <path d="M18 8v8M42 8v8M8 23h44" stroke={accent} strokeWidth="2.25" strokeLinecap="round" />
    <path d="M18 33h22M18 42h16M18 51h10" stroke="#2563EB" strokeWidth="2.25" strokeLinecap="round" />
    <circle cx="53" cy="53" r="14" fill="#14B8A6" stroke="white" strokeWidth="2.25" />
    <path d="M53 46v8l5 3" stroke="white" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
