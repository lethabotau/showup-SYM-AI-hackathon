'use client';
// Event.dc.html as a React component: lib/ui/sample/main.ts driven by lib/ui/dc-runtime.tsx.
import { createDCPage } from '@/lib/ui/dc-runtime';
import { Component } from '@/lib/ui/sample/main';
import SampleView from './SampleView';

export default createDCPage('Event', Component, (v) => <SampleView v={v} />);
