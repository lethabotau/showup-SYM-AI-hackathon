'use client';
import dynamic from 'next/dynamic';

// Client-only, as the original was (constructor reads sessionStorage and matchMedia).
const SampleApp = dynamic(() => import('./SampleApp'), { ssr: false });

export default function SampleClient({ showRoster = false }: { showRoster?: boolean }) {
  return <SampleApp showRoster={showRoster} />;
}
