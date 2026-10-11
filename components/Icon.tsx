import type { ReactNode } from "react";

type IconName =
  | "home"
  | "book"
  | "heart"
  | "music"
  | "headphones"
  | "arrow-up-right"
  | "arrow-left"
  | "chevron-right"
  | "play"
  | "pause"
  | "skip-back"
  | "skip-forward"
  | "rewind"
  | "fast-forward"
  | "check"
  | "check-circle"
  | "volume"
  | "volume-off"
  | "repeat"
  | "eye"
  | "eye-off"
  | "search"
  | "sparkles"
  | "clock"
  | "file"
  | "info"
  | "plus"
  | "keyboard"
  | "disc"
  | "focus"
  | "x"
  | "sliders"
  | "list-music"
  | "bookmark"
  | "pause-circle"
  | "external-link"
  | "help-circle"
  | "check-check"
  | "user"
  | "menu"
  | "grid"
  | "list"
  | "upload"
  | "download"
  | "trash"
  | "star"
  | "settings";

type Props = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

const elements: Record<IconName, ReactNode> = {
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  upload: <path d="m8 7 4-4 4 4M12 3v12M4 15v5h16v-5" />,
  download: <path d="m8 11 4 4 4-4M12 3v12M4 17v4h16v-4" />,
  trash: <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />,
  star: (
    <path d="m12 3 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3L12 17.4l-5.6 2.9 1.1-6.3-4.6-4.4 6.3-.9z" />
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="m9 3 6 0 1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z" />
    </>
  ),
  home: (
    <>
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M9 21v-8h6v8" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2" />
      <path d="M8 7h8M8 11h6" />
    </>
  ),
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
  ),
  music: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  headphones: (
    <>
      <path d="M3 14v-3a9 9 0 0 1 18 0v3" />
      <rect x="3" y="13" width="4" height="8" rx="2" />
      <rect x="17" y="13" width="4" height="8" rx="2" />
    </>
  ),
  "arrow-up-right": (
    <>
      <path d="M7 17 17 7M7 7h10v10" />
    </>
  ),
  "arrow-left": (
    <>
      <path d="m12 19-7-7 7-7M5 12h14" />
    </>
  ),
  "chevron-right": <path d="m9 18 6-6-6-6" />,
  play: <path d="m8 5 12 7-12 7z" />,
  pause: (
    <>
      <path d="M8 5v14M16 5v14" />
    </>
  ),
  "skip-back": (
    <>
      <path d="M6 4v16M19 20 7 12 19 4z" />
    </>
  ),
  "skip-forward": (
    <>
      <path d="M18 4v16M5 4l12 8-12 8z" />
    </>
  ),
  rewind: (
    <>
      <path d="m11 19-9-7 9-7v14ZM22 19l-9-7 9-7v14Z" />
    </>
  ),
  "fast-forward": (
    <>
      <path d="m13 5 9 7-9 7V5ZM2 5l9 7-9 7V5Z" />
    </>
  ),
  check: <path d="m4 12 5 5L20 6" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  "check-check": (
    <>
      <path d="m2 12 5 5L18 6" />
      <path d="m12 17 2 2 8-9" />
    </>
  ),
  volume: (
    <>
      <path d="m11 5-5 4H3v6h3l5 4z" />
      <path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" />
    </>
  ),
  "volume-off": (
    <>
      <path d="m11 5-5 4H3v6h3l5 4z" />
      <path d="m16 9 5 6m0-6-5 6" />
    </>
  ),
  repeat: (
    <>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4" />
      <path d="M21 13v2a3 3 0 0 1-3 3H3" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-off": (
    <>
      <path d="m3 3 18 18M10.6 5.1A11 11 0 0 1 12 5c6.4 0 10 7 10 7a13 13 0 0 1-2.2 3.1M6.5 6.5C3.6 8.5 2 12 2 12s3.6 7 10 7a11 11 0 0 0 4.1-.8" />
      <path d="M10 10a3 3 0 0 0 4 4" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="7.8" />
      <path d="m16.5 16.5 5 5" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9z" />
      <path d="M19 18v4M17 20h4M4 2v4M2 4h4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h7" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 11v5M12 7h.01" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  keyboard: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M7 16h10" />
    </>
  ),
  disc: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="2" />
      <path d="M17 7a7 7 0 0 1 2 5M7 17a7 7 0 0 1-2-5" />
    </>
  ),
  focus: (
    <>
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
    </>
  ),
  x: <path d="M18 6 6 18M6 6l12 12" />,
  sliders: (
    <>
      <path d="M4 7h16M4 17h16" />
      <circle cx="9" cy="7" r="2" />
      <circle cx="15" cy="17" r="2" />
    </>
  ),
  "list-music": (
    <>
      <path d="M9 6h12M9 12h12M9 18h5M3 5v14M3 9h2M3 15h2" />
    </>
  ),
  bookmark: <path d="M5 3h14v18l-7-4-7 4z" />,
  "pause-circle": (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 8v8M15 8v8" />
    </>
  ),
  "external-link": (
    <>
      <path d="M13 5h6v6M19 5l-9 9" />
      <path d="M19 13v6H5V5h6" />
    </>
  ),
  "help-circle": (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2.5-2.5 4M12 17h.01" />
    </>
  ),
};

export function Icon({ name, size = 20, strokeWidth = 1.8, className }: Props) {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {elements[name]}
    </svg>
  );
}
