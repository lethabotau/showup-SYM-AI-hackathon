/* Event page (in the flow): results, invite link, reminder */
(function () {
  class EventPageMixin {
  flash(key, msg, ms) {
    var self = this; var p = {}; p[key] = msg; this.setState(p);
    if (this.timers[key]) clearTimeout(this.timers[key]);
    this.timers[key] = setTimeout(function () { var q = {}; q[key] = ''; self.setState(q); }, ms || 2400);
  }
  legacyCopy(el) {
    if (!el) return false;
    try {
      if (el.select) { el.focus(); el.select(); }
      else { var r = document.createRange(); r.selectNodeContents(el); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); }
      return document.execCommand('copy');
    } catch (e) { return false; }
  }
  copy(text, el, key, okMsg, failMsg) {
    var self = this;
    var done = function (ok) { self.flash(key, ok ? okMsg : failMsg, ok ? 2400 : 6000); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(self.legacyCopy(el)); });
        return;
      }
    } catch (e) {}
    done(this.legacyCopy(el));
  }
  dayBefore(iso) { var d = dateFromIso(iso); return isoFromDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)); }
  withdraw() {
    var ev = clone(this.state.event); ev.proposal = null; saveEventData(ev);
    recordMyEvent({ id: ev.id, name: ev.name, role: 'organising', who: this.state.myName, status: 'Collecting responses' });
    this.setState({ event: ev });
  }
  renderValsReminder() { var ev = this.state.event; return "Hey, we're trying to lock in a time for " + ((ev && ev.name) || 'Weekend plans') + '. Add your availability when you get a chance!'; }

  eventContext(s) {
    var ev = s.event;
    var isEvent = s.screen === 'event' && !!ev;
    var orgView = isEvent && s.mode === 'organiser';
    var guestView = isEvent && s.mode === 'guest';
    var nResp = ev ? (ev.responses || []).length : 0;
    var sum = isEvent ? summarise(ev) : { days: [], best: null };
    var showResults = isEvent && (guestView || nResp >= 2);
    var best = sum.best; var bw = best ? bestWindow(ev, best.slot.id, best.viable) : null;
    var prop = ev && ev.proposal;
    var propSlot = prop ? ev.slots.filter(function (x) { return x.id === prop.slotId; })[0] : null;
    return { ev: ev, isEvent: isEvent, orgView: orgView, guestView: guestView, nResp: nResp, sum: sum, showResults: showResults, best: best, bw: bw, prop: prop, propSlot: propSlot };
  }

  eventVals(s, x) {
    var self = this;
    var ev = x.ev, isEvent = x.isEvent, orgView = x.orgView, guestView = x.guestView, nResp = x.nResp, sum = x.sum, showResults = x.showResults, best = x.best, bw = x.bw, prop = x.prop, propSlot = x.propSlot;
    var people = isEvent ? (ev.responses || []).map(function (r) {
      var on = s.activePerson === r.who;
      return { name: r.who, initial: r.who.charAt(0).toUpperCase(), cls: 'av glass-silver' + (on ? ' is-on' : ''), pressed: on ? 'true' : 'false', toggle: function () { self.setState({ activePerson: self.state.activePerson === r.who ? null : r.who }); } };
    }) : [];
    return {
      evStatusLabel: orgView && prop ? 'Time proposed (prototype)' : 'Collecting responses',
      evGridCls: 'ev-grid ' + (showResults && orgView ? 'is-full ' : '') + this.screenClsOf(s),
      countLine: orgView && nResp <= 1 ? 'Just you so far.' : nResp + (nResp === 1 ? ' response' : ' responses'),
      showGuestStatus: guestView, showFresh: orgView && nResp <= 1, showResults: showResults, showOrgSide: orgView && nResp >= 2,
      isOrgView: orgView, isGuestView: guestView,
      hasBest: !!best, noBest: !best,
      bestDay: best ? best.slot.day : '', bestTime: bw ? fmtCompact(bw.s, bw.e) : '',
      bestDate: best ? (best.slot.short || best.slot.title) : '',
      bestLine: best ? best.go + (best.go === 1 ? ' person could make this work.' : ' people could make this work.') : '',
      dotRows: isEvent ? dotRowsFrom(sum.days.map(function (d) { return dayDots(ev, d); }), best ? best.slot.id : null, s.discsGrown, s.dotsSettled) : [],
      people: people,
      linkMsg: s.linkMsg,
      copyLink: function () { self.copy(FRESH_LINK, self.linkEl, 'linkMsg', 'Link copied.', "Couldn't copy automatically. The link is selected, so copy it from there."); },
      setLinkEl: function (el) { self.linkEl = el; },
      editMyResponse: function () { self.editMyResponse(); },
      previewGuest: function () { self.previewGuest(); },
      proposeLabel: prop ? 'Change proposal' : 'Propose a time',
      hasProposal: orgView && !!prop,
      proposalText: prop && propSlot ? propSlot.title + '. Replies by ' + prop.deadline.split('-').reverse().slice(0, 2).join('/') + '. Goes ahead if at least ' + prop.min + ' people commit.' : '',
      withdraw: function () { self.withdraw(); },
      reminderOpen: s.reminderOpen, reminderExpanded: s.reminderOpen ? 'true' : 'false',
      reminderText: "Hey, we're trying to lock in a time for " + ((ev && ev.name) || 'Weekend plans') + '. Add your availability when you get a chance!',
      remMsg: s.remMsg, noop: function () {},
      selectAll: function (e) { try { e.target.select(); } catch (err) {} },
      toggleReminder: function () { self.setState({ reminderOpen: !self.state.reminderOpen, remMsg: '' }); },
      copyReminder: function () { self.copy(self.renderValsReminder(), self.remEl, 'remMsg', 'Reminder copied.', "Couldn't copy automatically. The text is selected, so copy it from the box."); },
      setRemEl: function (el) { self.remEl = el; },
    };
  }
  }
  Showup.register(EventPageMixin);
})();
