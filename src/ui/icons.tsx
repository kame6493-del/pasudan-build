export function LockIcon({ size = 14, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ verticalAlign: -2 }}>
      <path d="M4.5 7V5a3.5 3.5 0 017 0v2" fill="none" stroke={color} strokeWidth="2" />
      <rect x="2.5" y="7" width="11" height="8" rx="2" fill={color} />
    </svg>
  );
}
export function Check({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ verticalAlign: -2 }}>
      <path d="M3 8.5l3 3 7-7.5" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
