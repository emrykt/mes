import { useId } from "react";

/**
 * TURI brand logo — a faithful rendition of the uploaded mark: a standalone
 * stylized "T" (pill-shaped arm + rounded-bottom stem) in a green→teal vertical
 * gradient with a soft layered-depth shadow, next to the lowercase "turi"
 * wordmark. The mark reads on both light and dark backgrounds; the wordmark
 * colour adapts via `wordClass` (e.g. text-white on dark chrome).
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
  const sid = useId();
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 46 50" className={className} role="img" aria-label="TURI" fill="none">
        <defs>
          <linearGradient id={gid} x1="0.12" y1="0" x2="0.42" y2="1">
            <stop offset="0" stopColor="#5ed15a" />
            <stop offset="0.34" stopColor="#31c57f" />
            <stop offset="0.7" stopColor="#14b2a5" />
            <stop offset="1" stopColor="#22ccb7" />
          </linearGradient>
          <radialGradient id={sid} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#053c3c" stopOpacity="0.35" />
            <stop offset="1" stopColor="#053c3c" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* vertical stem with a rounded bottom (tucks under the arm) */}
        <rect x="17.4" y="12" width="11.2" height="32" rx="5.6" fill={`url(#${gid})`} />
        {/* layered-depth shadow where the arm overlaps the stem */}
        <ellipse cx="21" cy="20.5" rx="6" ry="5.5" fill={`url(#${sid})`} />
        {/* pill-shaped top arm, in front */}
        <rect x="3" y="4" width="40" height="12.6" rx="6.3" fill={`url(#${gid})`} />
      </svg>
      {wordmark && (
        <span
          className={`text-2xl font-semibold lowercase leading-none ${wordClass}`}
          style={{ fontFamily: '"Turi", system-ui, sans-serif', letterSpacing: "0.025em" }}
        >
          tur
          {/* dotless "ı" (U+0131) + our own small green dot — no font dot to peek out,
              so the disc can be small; placement measured for Fredoka-600 + 0.025em spacing */}
          <span className="relative">
            {"ı"}
            <span
              aria-hidden
              className="absolute rounded-full"
              style={{
                width: "0.19em",
                height: "0.19em",
                left: "44%",
                top: "0.266em",
                transform: "translateX(-50%)",
                background: "linear-gradient(150deg, #8ee24d 10%, #57c01f 90%)",
              }}
            />
          </span>
        </span>
      )}
    </span>
  );
}
