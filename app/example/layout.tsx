import type { ReactNode } from 'react';
// Event.dc.html's stylesheet. It must never be loaded together with Main's CSS
// (see app/(flow)/layout.tsx): links between /example and / are plain <a href>
// (full page load), never next/link, so the two CSS sets never coexist.
import '@/styles/event.css';

export default function ExampleLayout({ children }: { children: ReactNode }) {
  return children;
}
