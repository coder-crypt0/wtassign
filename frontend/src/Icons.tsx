export type IconName =
  | "grid"
  | "calendar"
  | "players"
  | "bookmark"
  | "search"
  | "arrow"
  | "chevron"
  | "close"
  | "pin"
  | "radio"
  | "sliders"
  | "play"
  | "pause"
  | "undo"
  | "check"
  | "external"
  | "sun"
  | "refresh"
  | "menu"
  | "info";
const paths: Record<IconName, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2" />
    </>
  ),
  players: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 20v-2a6 6 0 0 1 12 0v2m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2" />
    </>
  ),
  bookmark: <path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4Z" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  pin: (
    <>
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  radio: (
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M7 7a7 7 0 0 0 0 10m10-10a7 7 0 0 1 0 10M4 4a11 11 0 0 0 0 16M20 4a11 11 0 0 1 0 16" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h9m4 0h3M4 17h3m4 0h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  play: <path d="m8 4 13 8-13 8Z" />,
  pause: (
    <>
      <path d="M8 5v14m8-14v14" />
    </>
  ),
  undo: (
    <>
      <path d="M4 11h10a6 6 0 1 1 0 12M4 11l5-5m-5 5 5 5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  external: (
    <path d="M14 3h7v7m0-7L10 14M9 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-5" />
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 8a8 8 0 0 0-14-2L3 9m0-6v6h6m-5 7a8 8 0 0 0 14 2l3-3m0 6v-6h-6" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v.1" />
    </>
  ),
};
export function Icon({
  name,
  size = 20,
  ...rest
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
export function WicketsLogo() {
  return (
    <svg viewBox="0 0 32 36" fill="none" aria-hidden="true">
      <path
        d="M7 9v24m9-24v24m9-24v24M4 5h24"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <circle
        cx="27"
        cy="27"
        r="4"
        fill="currentColor"
        stroke="#f4f3ee"
        strokeWidth="2"
      />
    </svg>
  );
}
