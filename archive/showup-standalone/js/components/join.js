/* Join screen (guest entry) */
(function () {
  class JoinMixin {
  joinContinue() {
    var s = this.state;
    var n = (s.joinName || '').trim();
    if (!n) { this.setState({ joinError: 'Add your name to continue.' }); return; }
    var taken = (s.event.responses || []).some(function (r) { return r.who.toLowerCase() === n.toLowerCase(); });
    if (taken) { this.setState({ joinError: 'Someone with that name has already responded. Try adding an initial.' }); return; }
    this.go(Object.assign(respondFor(s.event, 'guest', n), { screen: 'respond', joinError: '', errors: {}, formError: '', noneWork: false, phase: 'editing', dirty: false, editing: false }));
  }
  previewGuest() {
    this.go(Object.assign(respondFor(this.state.event, 'guest', ''), { screen: 'join', joinName: '', joinError: '', reminderOpen: false }));
  }

  joinVals(s) {
    var self = this;
    return {
      joinName: s.joinName, setJoinName: function (e) { self.setState({ joinName: e.target.value, joinError: '' }); },
      joinKey: function (e) { if (e.key === 'Enter') { e.preventDefault(); self.joinContinue(); } },
      hasJoinError: !!s.joinError, joinError: s.joinError,
      joinContinue: function () { self.joinContinue(); },
    };
  }
  }
  Showup.register(JoinMixin);
})();
