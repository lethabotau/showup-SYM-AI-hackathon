'use client';
// Main.dc.html as a React component: the ported logic class (lib/ui/flow/main.ts) driven by the
// ported runtime (lib/ui/dc-runtime.tsx), rendering FlowView (the ported template).
import { createDCPage } from '@/lib/ui/dc-runtime';
import { Component } from '@/lib/ui/flow/main';
import FlowView from './FlowView';

export default createDCPage('Main', Component, (v) => <FlowView v={v} />);
