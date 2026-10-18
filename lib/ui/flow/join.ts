// @ts-nocheck
import { respondFor } from '../state';
import { joinStoredEvent, fetchOwnResponse } from '../services/event-api';
import { loadGuestCredential, saveGuestCredential } from '../services/guest-credential';
import { applyOwnResponse } from '../utils/response-sync';

export class JoinMixin {
  tryRestoreGuest() {
    var s = this.state;
    var ev = s.event;
    if (!ev || !ev.persisted || s.screen !== 'join') return;
    var cred = loadGuestCredential(ev.id);
    if (!cred) return;
    var self = this;
    fetchOwnResponse(ev.id, cred).then(function (r) {
      if (!r.ok) return;
      var data = r.body;
      self.setState({ joinName: data.participant.name, participantId: data.participant.id });
      if (data.responded) {
        self.go(Object.assign({ screen: 'event', mode: 'guest', myName: data.participant.name, phase: 'saved' }, applyOwnResponse(ev.slots, data)));
      } else {
        self.go(Object.assign(respondFor(ev, 'guest', data.participant.name), applyOwnResponse(ev.slots, data), { screen: 'respond', joinError: '', phase: 'editing', editing: false }));
      }
    });
  }

  joinContinue() {
    var s = this.state;
    var n = (s.joinName || '').trim();
    if (!n) { this.setState({ joinError: 'Add your name to continue.' }); return; }
    var ev = s.event;
    if (ev && ev.persisted) {
      var self = this;
      this.setState({ joinError: '', joining: true });
      joinStoredEvent(ev.id, n).then(function (r) {
        if (!r.ok) {
          self.setState({ joining: false, joinError: r.field === 'name' ? r.message : r.message });
          return;
        }
        saveGuestCredential(ev.id, r.credential);
        var responses = (ev.responses || []).slice();
        if (!responses.some(function (x) { return x.who.toLowerCase() === r.name.toLowerCase(); })) responses.push({ who: r.name, role: 'guest' });
        self.go(Object.assign(respondFor(Object.assign({}, ev, { responses: responses }), 'guest', r.name), {
          screen: 'respond', joinError: '', joining: false, participantId: r.participantId, errors: {}, formError: '', noneWork: false, phase: 'editing', dirty: false, editing: false,
        }));
      }, function () {
        self.setState({ joining: false, joinError: "We couldn't reach the server. Check your connection and try again." });
      });
      return;
    }
    var taken = (ev.responses || []).some(function (r) { return r.who.toLowerCase() === n.toLowerCase(); });
    if (taken) { this.setState({ joinError: 'Someone with that name has already responded. Try adding an initial.' }); return; }
    this.go(Object.assign(respondFor(ev, 'guest', n), { screen: 'respond', joinError: '', errors: {}, formError: '', noneWork: false, phase: 'editing', dirty: false, editing: false }));
  }

  previewGuest() {
    this.go(Object.assign(respondFor(this.state.event, 'guest', ''), { screen: 'join', joinName: '', joinError: '', reminderOpen: false }));
  }

  joinVals(s) {
    var self = this;
    return {
      joinName: s.joinName,
      setJoinName: function (e) { self.setState({ joinName: e.target.value, joinError: '' }); },
      joinKey: function (e) { if (e.key === 'Enter') { e.preventDefault(); self.joinContinue(); } },
      hasJoinError: !!s.joinError, joinError: s.joinError,
      joinContinue: function () { self.joinContinue(); },
      joinDisabled: !!s.joining, joinLabel: s.joining ? 'Joining…' : 'Continue',
    };
  }
}
