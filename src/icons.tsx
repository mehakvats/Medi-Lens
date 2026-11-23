import type { ReactNode } from 'react'

type IconProps = { size?: number; stroke?: number }
const svg = (children: ReactNode, { size = 20, stroke = 1.7 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)
export const Icons = {
  grid: (p: IconProps = {}) => svg(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>, p),
  file: (p: IconProps = {}) => svg(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></>, p),
  compare: (p: IconProps = {}) => svg(<><path d="M17 3l4 4-4 4"/><path d="M3 7h18"/><path d="M7 21l-4-4 4-4"/><path d="M21 17H3"/></>, p),
  trend: (p: IconProps = {}) => svg(<><path d="M3 17l6-6 4 4 8-9"/><path d="M16 6h5v5"/></>, p),
  chat: (p: IconProps = {}) => svg(<><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.3 9.3 0 0 1-4-.9L3 21l1.4-4.2A8 8 0 0 1 3 12c0-4.7 4-8.5 9-8.5s9 3.6 9 8z"/></>, p),
  shield: (p: IconProps = {}) => svg(<><path d="M12 22s8-3.8 8-10V5l-8-3-8 3v7c0 6.2 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></>, p),
  plus: (p: IconProps = {}) => svg(<><path d="M12 5v14M5 12h14"/></>, p),
  arrow: (p: IconProps = {}) => svg(<path d="M5 12h14M13 6l6 6-6 6"/>, p),
  chevron: (p: IconProps = {}) => svg(<path d="M9 18l6-6-6-6"/>, p),
  close: (p: IconProps = {}) => svg(<><path d="M18 6L6 18M6 6l12 12"/></>, p),
  search: (p: IconProps = {}) => svg(<><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></>, p),
  upload: (p: IconProps = {}) => svg(<><path d="M12 16V3"/><path d="M7 8l5-5 5 5"/><path d="M5 21h14"/></>, p),
  check: (p: IconProps = {}) => svg(<path d="M5 12l4 4L19 6"/>, p),
  alert: (p: IconProps = {}) => svg(<><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.4L2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 3.4a2 2 0 0 0-3.4 0z"/></>, p),
  info: (p: IconProps = {}) => svg(<><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>, p),
  more: (p: IconProps = {}) => svg(<><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>, p),
  calendar: (p: IconProps = {}) => svg(<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></>, p),
  lock: (p: IconProps = {}) => svg(<><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>, p),
}

