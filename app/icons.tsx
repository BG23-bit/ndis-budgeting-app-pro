// Minimal inline SVG icon set — replaces emoji so the UI reads as a product.
// All icons inherit currentColor and size via the .kv-icon class (1em).
import React from "react";

function I({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <svg className="kv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden={label ? undefined : true} aria-label={label} role={label ? "img" : undefined}>
      {children}
    </svg>
  );
}

export const IconDoc = () => (<I><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></I>);
export const IconMed = () => (<I><path d="M12 2v4M10 4h4"/><rect x="4" y="6" width="16" height="16" rx="2"/><path d="M12 11v6M9 14h6"/></I>);
export const IconSparkle = () => (<I><path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></I>);
export const IconClock = () => (<I><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></I>);
export const IconCopy = () => (<I><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></I>);
export const IconReset = () => (<I><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></I>);
export const IconUpload = () => (<I><path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 20h16"/></I>);
export const IconArrowRight = () => (<I><path d="M5 12h14M13 6l6 6-6 6"/></I>);
export const IconChevronDown = () => (<I><path d="M6 9l6 6 6-6"/></I>);
export const IconLock = () => (<I><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></I>);
