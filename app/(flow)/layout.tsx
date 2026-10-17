import type { ReactNode } from 'react';
// Main.dc.html's stylesheets, in the original <link> order.
// They must never be loaded together with styles/event.css: the two define .header,
// .display, .sheet, .sheet-actions (and more) differently. Links between / and /example
// are therefore plain <a href> (full page load), never next/link, so a client-side
// navigation can't leave one page's CSS applied to the other.
import '@/styles/base.css';
import '@/styles/components/materials.css';
import '@/styles/components/buttons.css';
import '@/styles/components/fields.css';
import '@/styles/components/segmented.css';
import '@/styles/components/wheels.css';
import '@/styles/layout.css';
import '@/styles/transitions.css';
import '@/styles/screens/landing.css';
import '@/styles/screens/create.css';
import '@/styles/screens/respond.css';
import '@/styles/screens/join.css';
import '@/styles/screens/event-flow.css';
import '@/styles/screens/sheets.css';

export default function FlowLayout({ children }: { children: ReactNode }) {
  return children;
}
