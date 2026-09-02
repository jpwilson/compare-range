import type { SVGProps } from 'react';

const base = (size: number): SVGProps<SVGSVGElement> => ({ width: size, height: size, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true });
type P = { size?: number };

export const Search = ({ size = 18 }: P) => <svg {...base(size)}><circle cx="9" cy="9" r="5.5" /><path d="M13.2 13.2 17 17" /></svg>;
export const Pin = ({ size = 18 }: P) => <svg {...base(size)}><path d="M10 18s-6-6.3-6-10a6 6 0 0 1 12 0c0 3.7-6 10-6 10Z" /><circle cx="10" cy="8" r="2" /></svg>;
export const Plus = ({ size = 18 }: P) => <svg {...base(size)}><path d="M10 4v12M4 10h12" /></svg>;
export const Minus = ({ size = 18 }: P) => <svg {...base(size)}><path d="M4 10h12" /></svg>;
export const Globe = ({ size = 18 }: P) => <svg {...base(size)}><circle cx="10" cy="10" r="7.5" /><path d="M2.5 10h15M10 2.5c2.5 2.6 2.5 12.4 0 15M10 2.5c-2.5 2.6-2.5 12.4 0 15" /></svg>;
export const Fit = ({ size = 18 }: P) => <svg {...base(size)}><path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" /><circle cx="10" cy="10" r="3" /></svg>;
export const Check = ({ size = 14 }: P) => <svg {...base(size)} strokeWidth={2.2}><path d="M4 10.5 8 14.5 16 6" /></svg>;
export const Arrow = ({ size = 16 }: P) => <svg {...base(size)}><path d="M4 10h12M11 5l5 5-5 5" /></svg>;
export const Chevron = ({ size = 14 }: P) => <svg {...base(size)}><path d="M7 4l6 6-6 6" /></svg>;
export const X = ({ size = 14 }: P) => <svg {...base(size)}><path d="M5 5l10 10M15 5 5 15" /></svg>;
export const Swap = ({ size = 16 }: P) => <svg {...base(size)}><path d="M4 7h11l-3-3M16 13H5l3 3" /></svg>;
export const Share = ({ size = 16 }: P) => <svg {...base(size)}><path d="M10 12V3M6.5 6.5 10 3l3.5 3.5" /><path d="M4 11v5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5" /></svg>;
export const Layers = ({ size = 18 }: P) => <svg {...base(size)}><path d="m10 3 7.5 4L10 11 2.5 7z" /><path d="m2.5 10.5 7.5 4 7.5-4M2.5 14l7.5 4 7.5-4" /></svg>;
export const Locate = ({ size = 18 }: P) => <svg {...base(size)}><circle cx="10" cy="10" r="5" /><path d="M10 2v3M10 15v3M2 10h3M15 10h3" /></svg>;
export const Bolt = ({ size = 18 }: P) => <svg {...base(size)}><path d="M11 2 5 11h4l-1.5 7L15 8.5h-4z" /></svg>;
export const Logo = ({ size = 30 }: P) => (
  <svg width={size} height={size} viewBox="0 0 30 30" fill="none" aria-hidden>
    <circle cx="15" cy="15" r="13" stroke="currentColor" strokeWidth="2" opacity="0.5" /><circle cx="15" cy="15" r="8.5" stroke="currentColor" strokeWidth="2" opacity="0.8" /><circle cx="15" cy="15" r="4" fill="currentColor" />
  </svg>
);

/* ---- category icons (stroke, 24px grid) ---- */
const cat = (size: number): SVGProps<SVGSVGElement> => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true });
export const CarIcon = ({ size = 18 }: P) => <svg {...cat(size)}><path d="M3 13.5 5.2 8.6A2 2 0 0 1 7 7.4h10a2 2 0 0 1 1.8 1.2L21 13.5" /><path d="M3 13.5h18v4.2a1 1 0 0 1-1 1h-1.6a1 1 0 0 1-1-1V17H6.6v.7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><circle cx="7" cy="15.2" r="0.9" fill="currentColor" /><circle cx="17" cy="15.2" r="0.9" fill="currentColor" /></svg>;
export const EvIcon = ({ size = 18 }: P) => <svg {...cat(size)}><path d="M3 13.5 5.2 8.6A2 2 0 0 1 7 7.4h10a2 2 0 0 1 1.8 1.2L21 13.5" /><path d="M3 13.5h18v4.2a1 1 0 0 1-1 1h-1.6a1 1 0 0 1-1-1V17H6.6v.7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="m12.6 8.8-2 3h2.8l-2 3" strokeWidth={1.6} /></svg>;
export const HybridIcon = ({ size = 18 }: P) => <svg {...cat(size)}><path d="M3 13.5 5.2 8.6A2 2 0 0 1 7 7.4h10a2 2 0 0 1 1.8 1.2L21 13.5" /><path d="M3 13.5h18v4.2a1 1 0 0 1-1 1h-1.6a1 1 0 0 1-1-1V17H6.6v.7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="m10.4 9-1.5 2.2h2.1L9.5 13.4" strokeWidth={1.5} /><path d="M13.5 9.2v3.6M15.3 11h-3.6" strokeWidth={1.5} /></svg>;
export const MotoIcon = ({ size = 18 }: P) => <svg {...cat(size)}><circle cx="5.5" cy="16" r="3" /><circle cx="18.5" cy="16" r="3" /><path d="M5.5 16 9 10h4l2.5 3.5H18M13 10l-1.5-3H9M9 10h4" /></svg>;
export const HeliIcon = ({ size = 18 }: P) => <svg {...cat(size)}><path d="M3 5h16M11 5v3" /><path d="M6 12.5c0-2 1.6-3.5 4-3.5h3.5c2.4 0 4.5 1.6 4.5 3.7V14a2 2 0 0 1-2 2H9a3 3 0 0 1-3-3z" /><path d="M8 16v2h8v-2M18 11h3" /></svg>;
export const PlaneIcon = ({ size = 18 }: P) => <svg {...cat(size)}><path d="M12 3.5c.9 0 1.4 1 1.4 2.4V9l7.1 4.2v1.8L13.4 13v4l2.1 1.6v1.4L12 19l-3.5 1v-1.4L10.6 17v-4L3.5 15v-1.8L10.6 9V5.9c0-1.4.5-2.4 1.4-2.4z" /></svg>;
export const JetIcon = ({ size = 18 }: P) => <svg {...cat(size)}><path d="M4 12.5 19 6.5c.9-.4 1.6.5 1.2 1.3L16 15l-3.5 1-2-2.5-3.5-.3z" /><path d="M10.5 13.5 7 19l3-1.2 2.5-3.3M16 15l2.5 2" /></svg>;
export const AirlinerIcon = ({ size = 18 }: P) => <svg {...cat(size)}><path d="M2.5 12.2 20 8.6c1 0 1.5.8 1.3 1.5L20.2 12 8.3 15.3l-3-1.2z" /><path d="m8.3 15.3-.6 3.4 2.6-2.9M11.5 10.2 8 6h2.4l4.1 3.3" /></svg>;
