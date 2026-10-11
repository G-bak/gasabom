import Link from "next/link";

export function Brand({
  compact = false,
  dark = false,
}: {
  compact?: boolean;
  dark?: boolean;
}) {
  return (
    <Link
      href="/"
      className={`brand ${compact ? "brand-compact" : ""}`}
      aria-label="가사봄 홈"
    >
      <img
        src={`/brand/logo-${dark ? "dark" : "light"}.png`}
        width="150"
        height="62"
        alt="가사봄 GASABOM"
      />
      <span className="brand-tagline">J-POP 가사 연습</span>
    </Link>
  );
}
