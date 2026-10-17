// @ts-nocheck
// Ported verbatim from archive/showup-standalone/js/components/landing.js. Only the export/import lines were added
// (the original files shared globals through classic <script> tags). Types come later.
import { loadEventData } from '../services/storage';
import { respondFor } from '../state';
/* Landing screen */
export class LandingMixin {
  next() {
    var n = (this.state.name || '').trim();
    if (!n) { this.setState({ nameError: 'Give it a name to continue.' }); return; }
    this.go({ name: n, nameError: '', screen: 'create' });
  }
  openMyEvent(entry) {
    var ev = loadEventData(entry.id);
    if (!ev) { this.setState({ myEvents: (this.state.myEvents || []).filter(function (x) { return x !== entry; }) }); return; }
    var mode = entry.role === 'organising' ? 'organiser' : 'guest';
    this.go(Object.assign(respondFor(ev, mode, entry.who || ev.organiser), { screen: 'event', name: ev.name, editing: false, phase: 'saved' }));
  }

  landingVals(s) {
    var self = this;
    var myEvents = (s.myEvents || []).slice(0, 5).map(function (x) {
      return {
        name: x.name, status: x.status || 'Collecting responses', roleLabel: x.role === 'organising' ? 'Organising' : 'Invited',
        isLink: !!x.sample, isButton: !x.sample,
        open: function () { self.openMyEvent(x); }
      };
    });
    return {
      name: s.name,
      setName: function (e) { self.setState({ name: e.target.value, nameError: '' }); },
      nameKey: function (e) { if (e.key === 'Enter') { e.preventDefault(); self.next(); } },
      hasNameError: !!s.nameError, nameError: s.nameError,
      next: function () { self.next(); },
      hasMyEvents: s.screen === 'landing' && myEvents.length > 0,
      myEvents: myEvents,
    };
  }
  }
