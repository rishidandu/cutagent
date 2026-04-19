interface Props {
  size?: number;
  className?: string;
}

/**
 * CutAgent logo — a film-clip frame with an AI play-button inside.
 * Symbolizes "cut" (film editing) + "agent" (automated AI workflow).
 *
 * Usage: <Logo size={40} /> or <Logo className="h-10 w-10" />
 */
export default function Logo({ size, className }: Props) {
  const sz = size ?? 40;
  return (
    <svg
      width={sz}
      height={sz}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="CutAgent logo"
    >
      {/* Gradient definition — cyan to violet */}
      <defs>
        <linearGradient id="cutagent-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#53d4ff" />
          <stop offset="55%" stopColor="#7c4dff" />
          <stop offset="100%" stopColor="#f5b94f" />
        </linearGradient>
        <linearGradient id="cutagent-inner" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f5b94f" />
          <stop offset="100%" stopColor="#ff7c87" />
        </linearGradient>
      </defs>

      {/* Outer rounded frame (film clip shape) */}
      <rect
        x="2" y="2"
        width="36" height="36"
        rx="10"
        stroke="url(#cutagent-grad)"
        strokeWidth="2.5"
        fill="#0a0d1a"
      />

      {/* Film perforations — left side */}
      <rect x="5" y="9"  width="2.5" height="3" rx="0.5" fill="#53d4ff" opacity="0.7" />
      <rect x="5" y="18.5" width="2.5" height="3" rx="0.5" fill="#7c4dff" opacity="0.7" />
      <rect x="5" y="28" width="2.5" height="3" rx="0.5" fill="#f5b94f" opacity="0.7" />

      {/* Film perforations — right side */}
      <rect x="32.5" y="9"  width="2.5" height="3" rx="0.5" fill="#53d4ff" opacity="0.7" />
      <rect x="32.5" y="18.5" width="2.5" height="3" rx="0.5" fill="#7c4dff" opacity="0.7" />
      <rect x="32.5" y="28" width="2.5" height="3" rx="0.5" fill="#f5b94f" opacity="0.7" />

      {/* Play triangle in center — the "agent" action */}
      <path
        d="M15.5 13.5L26 20L15.5 26.5V13.5Z"
        fill="url(#cutagent-inner)"
      />
    </svg>
  );
}
