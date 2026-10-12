import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & { size?: number };

export function RiceCornIcon({ size = 24, ...props }: Props) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M14 42V12m0 21C9 29 6 25 5 20m9 5c-5-4-7-7-7-11m7 3c-4-3-5-6-5-10m5 25c4-4 7-7 8-12m-8 5c4-4 6-8 6-12m-6 4c3-4 4-7 4-11" />
    <path d="M35 42V13m-7 13c-4 3-5 7-5 12 5-1 9-4 12-8m0 0c3 4 6 7 11 8-1-5-3-9-7-12" />
    <path d="M31 12c0-3 2-5 4-5s4 2 4 5v16c0 3-2 5-4 5s-4-2-4-5V12Z" />
    <path d="M31 15h8m-8 6h8m-8 6h8m-4-20v26" />
  </svg>;
}

export function BananaIcon({ size = 24, ...props }: Props) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M11 9c4 16 15 25 28 22-2 8-9 11-16 9C12 37 6 24 9 12l2-3Z" />
    <path d="M11 9 8 5m31 26 4 2M12 18c4 9 11 14 19 16" />
  </svg>;
}

export function VegetableIcon({ size = 24, ...props }: Props) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M24 16c-7-6-16-2-16 8 0 11 8 18 16 18s16-7 16-18c0-10-9-14-16-8Z" />
    <path d="M24 16c-3-8-9-10-14-9 3 5 7 8 14 9Zm0 0c3-8 9-10 14-9-3 5-7 8-14 9Zm0 1v-9" />
  </svg>;
}

export function CornIcon({ size = 24, ...props }: Props) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M20 8c0-3 2-5 4-5s4 2 4 5v27c0 4-2 6-4 6s-4-2-4-6V8Z" />
    <path d="M20 12h8m-8 7h8m-8 7h8m-8 7h8m-4-29v37M19 28c-6-5-10-6-14-4 2 9 7 15 17 17m7-13c6-5 10-6 14-4-2 9-7 15-17 17" />
  </svg>;
}

export function MangoIcon({ size = 24, ...props }: Props) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M22 12C8 11 5 22 9 32c4 9 17 13 26 5 8-8 5-22-5-25-3-1-5-1-8 0Z" />
    <path d="M23 12c2-5 5-8 10-9m-10 9c-6-4-10-5-15-4 2 5 7 7 15 4Z" />
  </svg>;
}

export function MalePersonIcon({ size = 24, ...props }: Props) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <circle cx="24" cy="14" r="7"/><path d="M13 43v-7c0-7 5-11 11-11s11 4 11 11v7M17 8c5 3 10 3 14 0"/>
  </svg>;
}

export function FemalePersonIcon({ size = 24, ...props }: Props) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M14 27c-3-6-2-15 1-19 4-6 14-7 19-1 4 5 5 14 1 20"/><circle cx="24" cy="16" r="7"/><path d="M12 43v-5c0-8 5-13 12-13s12 5 12 13v5"/>
  </svg>;
}
