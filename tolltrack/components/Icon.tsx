const PATHS: Record<string, string> = {
  road: "M8 3 4 21M16 3l4 18M12 5v2M12 11v2M12 17v2",
  back: "M15 5l-7 7 7 7",
  chevron: "M9 5l7 7-7 7",
  plus: "M12 5v14M5 12h14",
  truck: "M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  warning: "M12 3 2 20h20zM12 10v4M12 17v.5",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  pin: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  gps: "M12 2v3M12 19v3M2 12h3M19 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  shield: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z",
  synced: "M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  share: "M12 3v12M7 8l5-5 5 5M5 13v7h14v-7",
  upload: "M12 20V9M7 14l5-5 5 5M5 4h14",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11",
  trash: "M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
};

export function Icon({ name, size = 20, color = "currentColor", strokeWidth = 2 }: { name: keyof typeof PATHS | string; size?: number; color?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="logo" style={{ width: size, height: size }}>
      <Icon name="road" size={size * 0.6} color="#2b0f06" strokeWidth={2.4} />
    </span>
  );
}
