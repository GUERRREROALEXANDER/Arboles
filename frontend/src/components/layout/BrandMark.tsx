interface BrandMarkProps {
  className?: string;
}

/** The Canopy leaf, same drawing as the favicon. */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="brand-leaf" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="1" stopColor="#bef264" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0b2a1f" stroke="rgba(255,255,255,0.12)" />
      <path d="M15 49C14 30 26 16 50 14c1 23-12 36-31 36" fill="url(#brand-leaf)" />
      <path
        d="M15 49C22 38 30 30 42 22"
        fill="none"
        stroke="#04130d"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
