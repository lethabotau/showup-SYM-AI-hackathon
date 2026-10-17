/* Respond screen: days, availability, willingness, submit */
(function () {
  class RespondMixin {
  slotById(id) { var l = this.state.slots; for (var i = 0; i < l.length; i++) { if (l[i].id === id) return l[i]; } return null; }
  focusSlot(id) { var el = this.slotEls[id]; if (!el) return; try { el.scrollIntoView({ block: 'center', behavior: this.motion() }); el.focus({ preventScroll: true }); } catch (e) {} }
  withKey(field, id, val) { var o = Object.assign({}, this.state[field]); o[id] = val; return o; }
  change(patch) { if (this.state.phase === 'saved' && this.state.mode === 'participant') patch.dirty = true; this.setState(patch); }

  myResponse() {
    var s = this.state;
    if (!s.event) return null;
    var role = s.mode === 'organiser' ? 'organiser' : 'guest';
    return (s.event.responses || []).filter(function (r) { return r.role === role && r.who === s.myName; })[0] || null;
  }
  editMyResponse() {
    var s = this.state;
    var mine = this.myResponse();
    var maps = emptyMaps(s.event.slots);
    if (mine) {
      ['avail', 'ranges', 'will', 'conds', 'condText'].forEach(function (k) { Object.assign(maps[k], clone(mine[k] || {})); });
    }
    this.go(Object.assign({ screen: 'respond', editing: !!mine, phase: 'editing', errors: {}, formError: '', noneWork: false, reminderOpen: false, slots: clone(s.event.slots), win: clone(s.event.win) }, maps));
  }

  setAvail(id, a) {
    var s = this.state; var prev = s.avail[id] || 0;
    if (prev === a) return;
    var slot = this.slotById(id);
    var patch = { avail: this.withKey('avail', id, a), formError: '', liveMsg: slot.day + ': ' + STATE_LABELS[a] };
    if (prev === 0 && a > 0) { patch.ranges = this.withKey('ranges', id, [{ s: s.win.s, e: s.win.e }]); patch.openWheel = this.withKey('openWheel', id, null); }
    if (a > 0) patch.noneWork = false;
    if (a === 0) { patch.errors = this.withKey('errors', id, false); patch.applied = this.withKey('applied', id, ''); patch.openWheel = this.withKey('openWheel', id, null); }
    this.change(patch);
  }
  setRanges(id, rs) {
    var merged = mergeRanges(rs);
    var patch = { ranges: this.withKey('ranges', id, merged) };
    if (merged.length !== (this.state.ranges[id] || []).length) patch.openWheel = this.withKey('openWheel', id, null);
    this.change(patch);
  }
  tapBar(id, e) {
    var w = this.state.win;
    if (!e || e.detail === 0) { this.toggleWheels(id, 0); return; }
    var rect = e.currentTarget.getBoundingClientRect();
    var ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    var m = w.s + ratio * (w.e - w.s);
    var cands = [w.s, w.e];
    for (var h = Math.ceil(w.s / 60) * 60; h <= w.e; h += 60) cands.push(h);
    var hit = cands[0];
    cands.forEach(function (c) { if (Math.abs(c - m) < Math.abs(hit - m)) hit = c; });
    var rs = mergeRanges(this.state.ranges[id] || []);
    if (!rs.length) rs = [{ s: w.s, e: w.e }];
    var inside = -1;
    rs.forEach(function (r, i) { if (hit >= r.s && hit <= r.e && inside < 0) inside = i; });
    if (inside >= 0) { var r = rs[inside]; if (hit - r.s < r.e - hit) r.s = hit; else r.e = hit; }
    else {
      var best = -1; var bestD = Infinity; var bestEnd = false;
      rs.forEach(function (r2, i) {
        var dd = hit < r2.s ? r2.s - hit : hit - r2.e; var isEnd = hit > r2.e;
        if (dd < bestD || (dd === bestD && isEnd)) { best = i; bestD = dd; bestEnd = isEnd; }
      });
      if (bestEnd) rs[best].e = hit; else rs[best].s = hit;
    }
    rs.forEach(function (r3) {
      if (r3.e - r3.s < 60) { if (r3.s + 60 <= w.e) r3.e = r3.s + 60; else { r3.e = w.e; r3.s = w.e - 60; } }
      r3.s = Math.max(w.s, r3.s); r3.e = Math.min(w.e, r3.e);
    });
    this.setRanges(id, rs);
  }
  setRangeEdge(id, idx, edge, val) {
    var w = this.state.win; var rs = clone(this.state.ranges[id] || []); var r = rs[idx];
    if (!r) return;
    if (edge === 's') { r.s = val; if (r.e < r.s + 60) r.e = Math.min(w.e, r.s + 60); }
    else { r.e = val; if (r.e < r.s + 60) r.s = Math.max(w.s, r.e - 60); }
    this.setRanges(id, rs);
  }
  toggleWheels(id, idx) { var cur = this.state.openWheel[id]; this.setState({ openWheel: this.withKey('openWheel', id, cur === idx ? null : idx) }); }
  addRangeFor(id) {
    var w = this.state.win; var rs = mergeRanges(this.state.ranges[id] || []);
    if (rs.length !== 1) return null;
    var r = rs[0];
    if (r.s - w.s >= 120) return [{ s: w.s, e: w.s + 60 }, r];
    if (w.e - r.e >= 120) return [r, { s: w.e - 60, e: w.e }];
    var len = r.e - r.s;
    var b = Math.round((r.s + len / 3) / 60) * 60; var c = Math.round((r.e - len / 3) / 60) * 60;
    if (b - r.s >= 60 && r.e - c >= 60 && c - b >= 60) return [{ s: r.s, e: b }, { s: c, e: r.e }];
    return null;
  }
  addRange(id) { var nx = this.addRangeFor(id); if (!nx) return; this.change({ ranges: this.withKey('ranges', id, nx), openWheel: this.withKey('openWheel', id, null) }); }
  removeRange(id, idx) { var rs = clone(this.state.ranges[id] || []); if (rs.length < 2) return; rs.splice(idx, 1); this.change({ ranges: this.withKey('ranges', id, rs), openWheel: this.withKey('openWheel', id, null) }); }
  pick(id, w) { if (w === 'if') { this.openSheet(id); return; } this.change({ will: this.withKey('will', id, w), errors: this.withKey('errors', id, false), formError: '' }); }

  markNone() {
    var avail = {}; var ow = {};
    this.state.slots.forEach(function (sl) { avail[sl.id] = 0; ow[sl.id] = null; });
    this.change({ avail: avail, openWheel: ow, noneWork: true, errors: {}, formError: '' });
  }

  submit() {
    var s = this.state; var self = this;
    var avIds = s.slots.filter(function (x) { return s.avail[x.id] > 0; }).map(function (x) { return x.id; });
    if (!avIds.length && !s.noneWork) { this.setState({ formError: 'Mark at least one day, or let us know none of them work.' }); return; }
    var missing = avIds.filter(function (id) { return !s.will[id]; });
    if (missing.length) {
      var errors = {}; missing.forEach(function (id) { errors[id] = true; });
      this.setState({ errors: errors, formError: "Tell us whether you'd actually go on " + joinList(missing.map(function (id) { return self.slotById(id).day; })) + '.' });
      this.focusSlot(missing[0]);
      return;
    }
    this.setState({ phase: 'saving', formError: '', errors: {} });
    this.timer = setTimeout(function () {
      if (self.state.mode === 'participant') { self.setState({ phase: 'saved', dirty: false }); return; }
      self.saveToEvent();
    }, 700);
  }
  saveToEvent() {
    var s = this.state;
    var ev = clone(s.event);
    var role = s.mode === 'organiser' ? 'organiser' : 'guest';
    var mine = { who: s.myName, role: role, avail: clone(s.avail), ranges: clone(s.ranges), will: clone(s.will), conds: clone(s.conds), condText: clone(s.condText) };
    var idx = -1;
    ev.responses.forEach(function (r, i) { if (r.role === role && r.who === s.myName) idx = i; });
    if (idx >= 0) ev.responses[idx] = mine; else ev.responses.push(mine);
    saveEventData(ev);
    recordMyEvent({ id: ev.id, name: ev.name, role: role === 'organiser' ? 'organising' : 'invited', who: s.myName, status: ev.proposal ? 'Time proposed' : 'Collecting responses' });
    this.go({ event: ev, screen: 'event', phase: 'saved', dirty: false, editing: false });
  }
  savedSummary() {
    var s = this.state;
    if (s.noneWork) return "You've let the organiser know none of these times work.";
    var free = s.slots.filter(function (x) { return s.avail[x.id] > 0; });
    var day = function (x) { return x.day; };
    var fav = free.filter(function (x) { return s.avail[x.id] === 2; }).map(day);
    var yes = free.filter(function (x) { return s.will[x.id] === 'yes'; }).map(day);
    var ifs = free.filter(function (x) { return s.will[x.id] === 'if'; }).map(day);
    var no = free.filter(function (x) { return s.will[x.id] === 'no'; }).map(day);
    var out = "You're free " + free.map(function (x) { return x.day + ' ' + (s.ranges[x.id] || []).map(rangeText).join(' and '); }).join(', and ') + '.';
    if (fav.length) out += ' ' + joinList(fav) + (fav.length > 1 ? ' are your favourites.' : ' is your favourite.');
    if (yes.length && ifs.length) out += " You'd go on " + joinList(yes) + ', and on ' + joinList(ifs) + ' if your conditions are met.';
    else if (yes.length) out += " You'd go on " + joinList(yes) + '.';
    else if (ifs.length) out += " You'd go on " + joinList(ifs) + ' if your conditions are met.';
    if (no.length) out += " You'd rather not go on " + joinList(no) + '.';
    return out;
  }

  respondVals(s) {
    var self = this;
    var participant = s.mode === 'participant';
    var w = s.win; var span = Math.max(1, w.e - w.s);
    var hours = []; for (var hh = Math.ceil(w.s / 60) * 60; hh <= w.e; hh += 60) hours.push(hh);
    var tickStep = hours.length > 10 ? 2 : 1;
    var ticks = hours.filter(function (v, i) { return i % tickStep === 0 || i === hours.length - 1; }).map(function (v) {
      return { label: fmtTick(v), left: String(((v - w.s) / span) * 100), cls: 'tl-h' + (v === w.s ? ' is-first' : '') + (v === w.e ? ' is-last' : '') };
    });
    var winValues = steps(w.s, w.e, 15);
    var slots = s.screen === 'respond' ? s.slots.map(function (sl) {
      var a = s.avail[sl.id] || 0; var wv = s.will[sl.id]; var c = s.conds[sl.id];
      var open = a > 0; var fav = a === 2; var rs = s.ranges[sl.id] || []; var ow = s.openWheel[sl.id];
      var showConds = open && wv === 'if' && !!(c && c.length);
      var at = self.segThumb(a, fav);
      var wIdx = wv === 'yes' ? 0 : wv === 'if' ? 1 : wv === 'no' ? 2 : -1;
      var wt = self.segThumb(wIdx, false);
      var ranges = rs.map(function (r, ri) {
        var wheelsOpen = open && ow === ri; var wheels = [];
        if (wheelsOpen) {
          wheels = [
            self.makeWheel('r-' + sl.id + '-' + ri + '-s', 'From', winValues.filter(function (v) { return v <= w.e - 60; }), r.s, function (v) { self.setRangeEdge(sl.id, ri, 's', v); }),
            self.makeWheel('r-' + sl.id + '-' + ri + '-e', 'Until', winValues.filter(function (v) { return v >= w.s + 60; }), r.e, function (v) { self.setRangeEdge(sl.id, ri, 'e', v); })
          ];
        }
        return {
          label: rangeText(r), aria: rangeText(r) + '. Change times', expanded: wheelsOpen ? 'true' : 'false', wheelsOpen: wheelsOpen, wheels: wheels,
          canRemove: rs.length > 1, toggleWheels: function () { self.toggleWheels(sl.id, ri); }, remove: function () { self.removeRange(sl.id, ri); }
        };
      });
      return {
        id: sl.id, title: sl.title, short: sl.short || sl.title, titleId: 'dt-' + sl.id, qId: 'q-' + sl.id,
        cardCls: 'day glass' + (open ? '' : ' is-slim'),
        availThumbCls: at.cls, availThumbX: at.x,
        notFreeCls: 'seg-opt' + (a === 0 ? ' is-on' : ''), notFreePressed: a === 0 ? 'true' : 'false',
        freeCls: 'seg-opt' + (a === 1 ? ' is-on' : ''), freePressed: a === 1 ? 'true' : 'false',
        favCls: 'seg-opt' + (a === 2 ? ' is-on-red' : ''), favPressed: a === 2 ? 'true' : 'false',
        setNotFree: function () { self.setAvail(sl.id, 0); }, setFree: function () { self.setAvail(sl.id, 1); }, setFav: function () { self.setAvail(sl.id, 2); },
        setEl: function (el) { self.slotEls[sl.id] = el; },
        revealCls: 'reveal' + (open ? ' is-open' : ''),
        fills: rs.map(function (r) { return { cls: 'tl-fill ' + (fav ? 'glass-red' : 'is-free'), left: String(((r.s - w.s) / span) * 100), width: String(((r.e - r.s) / span) * 100) }; }),
        ticks: ticks,
        barAria: sl.day + ' timeline. Tap an hour to move the nearest end of your time. Currently ' + rs.map(rangeText).join(' and ') + '.',
        tapBar: function (e) { self.tapBar(sl.id, e); },
        ranges: ranges, canAddRange: open && !!self.addRangeFor(sl.id), addRange: function () { self.addRange(sl.id); },
        willThumbCls: wt.cls, willThumbX: wt.x,
        yesCls: 'seg-opt' + (wv === 'yes' ? ' is-on' : ''), yesPressed: wv === 'yes' ? 'true' : 'false',
        ifCls: 'seg-opt' + (wv === 'if' ? ' is-on' : ''), ifPressed: wv === 'if' ? 'true' : 'false',
        noCls: 'seg-opt' + (wv === 'no' ? ' is-on' : ''), noPressed: wv === 'no' ? 'true' : 'false',
        pickYes: function () { self.pick(sl.id, 'yes'); }, pickIf: function () { self.pick(sl.id, 'if'); }, pickNo: function () { self.pick(sl.id, 'no'); },
        showError: open && !!s.errors[sl.id], showConds: showConds, condText: describe(c),
        editConds: function () { self.openSheet(sl.id); },
        canReuse: showConds && self.reuseTargets(sl.id).length > 0, reuse: function () { self.reuse(sl.id); },
        hasApplied: showConds && !!s.applied[sl.id], appliedNote: s.applied[sl.id]
      };
    }) : [];
    var saving = s.phase === 'saving';
    var savedClean = participant && s.phase === 'saved' && !s.dirty;
    return {
      editingResponse: s.screen === 'respond' && s.editing,
      backToEvent: function () { self.go({ screen: 'event', editing: false, sheet: null }); },
      showStartLine: s.mode === 'organiser' && !s.editing,
      slots: slots, liveMsg: s.liveMsg, noneWork: s.noneWork,
      hasFormError: !!s.formError, formError: s.formError,
      showSubmitRow: !savedClean, showNoneBtn: !s.noneWork,
      showDirtyNote: participant && s.phase === 'saved' && s.dirty,
      saving: saving, savingStr: saving ? 'true' : 'false',
      submitLabel: saving ? 'Saving…' : (s.editing || (participant && s.phase === 'saved') ? 'Save changes' : 'Submit response'),
      showSaved: savedClean, savedSummary: savedClean ? this.savedSummary() : '',
      submit: function () { self.submit(); }, markNone: function () { self.markNone(); },
      undoNone: function () { self.change({ noneWork: false }); },
      editResponse: function () { if (self.state.slots[0]) self.focusSlot(self.state.slots[0].id); },
      setSavedEl: function (el) { self.savedEl = el; },
    };
  }
  }
  Showup.register(RespondMixin);
})();
