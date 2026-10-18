// @ts-nocheck
// Ported verbatim from archive/showup-standalone/js/components/create.js. Only the export/import lines were added
// (the original files shared globals through classic <script> tags). Types come later.
import { DAYS, MON, MONTHS } from '../data/constants';
import { pad2 } from '../utils/format';
import { isoFromDate, todayIso } from '../utils/dates';
import { untilFromWheel, wheelMinute } from '../utils/wheel-time';
/* Create screen: calendar, time window, name */
export class CreateMixin {
  toggleDay(iso) {
    var list = this.state.pickDays.slice();
    var i = list.indexOf(iso);
    if (i >= 0) list.splice(i, 1); else list.push(iso);
    this.setState({ pickDays: list, createError: '' });
  }
  shiftMonth(d) {
    var p = this.state.calMonth.split('-').map(Number);
    var dt = new Date(p[0], p[1] - 1 + d, 1);
    var m = dt.getFullYear() + '-' + pad2(dt.getMonth() + 1);
    if (m < todayIso().slice(0, 7)) return;
    this.setState({ calMonth: m });
  }
  setFrom(m) { var u = this.state.until; if (u < m + 60) u = m + 60; this.setState({ from: m, until: u, createError: '' }); }
  setUntil(m) { var f = this.state.from; if (m < f + 60) f = Math.max(0, m - 60); this.setState({ until: m, from: f, createError: '' }); }
  // Saves the event on the server, then opens its organiser link. The server validates everything again;
  // its message is shown under the name (title errors) or under the button (everything else).
  createEvent() {
    var s = this.state; var self = this;
    var n = (s.name || '').trim();
    var org = (s.orgName || '').trim();
    if (!n) { this.setState({ nameError: 'Give your event a name.' }); return; }
    if (s.pickDays.length < 2 || !org || s.creating) return;
    var tz = 'UTC';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) {}
    var body = { title: n, organiserName: org, timezone: tz, days: s.pickDays.slice().sort().map(function (iso) { return { date: iso, start: s.from, end: s.until }; }) };
    this.setState({ creating: true, createError: '', nameError: '' });
    var fallback = "We couldn't create your event. Try again in a moment.";
    fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, j: j }; }, function () { return { ok: false, j: null }; }); })
      .then(function (r) {
        var path = r.ok && r.j && r.j.organiserPath;
        if (typeof path === 'string' && path.indexOf('/e/') === 0) { window.location.assign(path); return; }
        var err = (r.j && r.j.error) || {};
        if (err.field === 'title') self.setState({ creating: false, nameError: err.message || fallback });
        else self.setState({ creating: false, createError: err.message || fallback });
      }, function () {
        self.setState({ creating: false, createError: "We couldn't reach the server. Check your connection and try again." });
      });
  }

  createVals(s) {
    var self = this;
    var calCells = []; var createWheels = []; var calTitle = ''; var calHasPrev = false; var calPrevLabel = ''; var calNextLabel = ''; var calPrevAria = ''; var calNextAria = '';
    var today = todayIso();
    if (s.screen === 'create') {
      var cp = s.calMonth.split('-').map(Number);
      var first = new Date(cp[0], cp[1] - 1, 1);
      var offset = (first.getDay() + 6) % 7;
      var dim = new Date(cp[0], cp[1], 0).getDate();
      for (var b = 0; b < offset; b++) calCells.push({ isBlank: true, isDay: false });
      for (var dd = 1; dd <= dim; dd++) {
        (function (dnum) {
          var dt = new Date(cp[0], cp[1] - 1, dnum); var iso = isoFromDate(dt);
          var on = s.pickDays.indexOf(iso) >= 0; var past = iso < today;
          calCells.push({
            isBlank: false, isDay: true, d: String(dnum),
            cls: 'cal-day' + (on ? ' glass-silver is-on' : '') + (iso === today ? ' is-today' : ''),
            pressed: on ? 'true' : 'false', disabled: past,
            aria: DAYS[dt.getDay()] + ' ' + dnum + ' ' + MONTHS[dt.getMonth()] + (iso === today ? ', today' : ''),
            toggle: function () { self.toggleDay(iso); }
          });
        })(dd);
      }
      calTitle = MONTHS[cp[1] - 1] + ' ' + cp[0];
      var prevD = new Date(cp[0], cp[1] - 2, 1); var nextD = new Date(cp[0], cp[1], 1);
      calHasPrev = s.calMonth > today.slice(0, 7);
      calPrevLabel = MON[prevD.getMonth()]; calNextLabel = MON[nextD.getMonth()];
      calPrevAria = 'Previous month, ' + MONTHS[prevD.getMonth()]; calNextAria = 'Next month, ' + MONTHS[nextD.getMonth()];
      createWheels = [
        { key: 'c-from', label: 'From', value: wheelMinute(s.from), onChange: function (v) { self.setFrom(v); } },
        { key: 'c-until', label: 'Until', value: wheelMinute(s.until), onChange: function (v) { self.setUntil(untilFromWheel(v, self.state.from)); } }
      ];
    }
    var winLen = s.until - s.from; var winH = Math.floor(winLen / 60); var winM = winLen % 60;
    var windowLen = (winH ? winH + ' hr' : '') + (winM ? (winH ? ' ' : '') + winM + ' min' : '') + ' window';
    var nDays = s.pickDays.length;
    var orgOk = !!(s.orgName || '').trim();
    var createHint = nDays < 2 ? 'Pick at least two days.' : (!orgOk ? 'Add your name.' : '');
    return {
      daysCount: nDays ? nDays + (nDays === 1 ? ' day selected' : ' days selected') : '',
      calCells: calCells, calTitle: calTitle, calHasPrev: calHasPrev, calNoPrev: !calHasPrev,
      calPrevLabel: calPrevLabel, calNextLabel: calNextLabel, calPrevAria: calPrevAria, calNextAria: calNextAria,
      calPrev: function () { self.shiftMonth(-1); }, calNext: function () { self.shiftMonth(1); },
      createWheels: createWheels, windowLen: windowLen,
      orgName: s.orgName, setOrgName: function (e) { self.setState({ orgName: e.target.value }); },
      moreOpen: s.moreOpen, moreExpanded: s.moreOpen ? 'true' : 'false',
      toggleMore: function () { self.setState({ moreOpen: !self.state.moreOpen }); },
      note: s.note, setNote: function (e) { self.setState({ note: e.target.value }); },
      cannotCreate: nDays < 2 || !orgOk, createHint: createHint,
      createDisabled: nDays < 2 || !orgOk || !!s.creating, createLabel: s.creating ? 'Creating…' : 'Create event',
      hasCreateError: !!s.createError, createError: s.createError,
      createEvent: function () { self.createEvent(); },
    };
  }
  }
