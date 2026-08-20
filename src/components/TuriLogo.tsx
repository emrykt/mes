import { useId } from "react";

/**
 * TURI brand logo — a gradient "T" mark (green → teal → blue-teal) with the
 * lowercase "turi" wordmark, a clean rendition of the uploaded logo. The
 * wordmark colour adapts via `wordClass` (e.g. text-white on dark chrome).
 */
export default function TuriLogo({
  className = "h-8 w-8",
  wordmark = true,
  wordClass = "text-ink",
}: {
  className?: string;
  wordmark?: boolean;
  wordClass?: string;
}) {
  const gid = useId();
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 40 40" className={className} role="img" aria-label="TURI">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3ddc84" />
            <stop offset="0.55" stopColor="#12b6a8" />
            <stop offset="1" stopColor="#0e8390" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="11" fill={`url(#${gid})`} />
        <path d="M10 12 H30 V16.6 H22.4 V30 H17.6 V16.6 H10 Z" fill="#fff" />
      </svg>
      {wordmark && (
        <span className={`text-xl font-bold lowercase tracking-tight ${wordClass}`}>turi</span>
      )}
    </span>
  );
}
