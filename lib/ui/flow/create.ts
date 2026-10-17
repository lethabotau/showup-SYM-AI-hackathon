// @ts-nocheck
// Ported verbatim from archive/showup-standalone/js/components/create.js. Only the export/import lines were added
// (the original files shared globals through classic <script> tags). Types come later.
import { TODAY } from '../config';
import { DAYS, MON, MONTHS } from '../data/constants';
import { steps, newId } from '../utils/helpers';
import { pad2 } from '../utils/format';
import { isoFromDate, slotFromIso } from '../utils/dates';
import { recordMyEvent, saveEventData } from '../services/storage';
import { respondFor } from '../state';
/* Create screen: calendar, time window, name */
export class CreateMixin {
  toggleDay(iso) {
    var list = this.state.pickDays.slice();
    var i = list.indexOf(iso);
    if (i >= 0) list.splice(i, 1); else list.push(iso);
    this.setState({ pickDays: list });
  }
  shiftMonth(d) {
    var p = this.state.calMonth.split('-').map(Number);
    var dt = new Date(p[0], p[1] - 1 + d, 1);
    var m = dt.getFullYear() + '-' + pad2(dt.getMonth() + 1);
    if (m < TODAY.slice(0, 7)) return;
    this.setState({ calMonth: m });
  }
  setFrom(m) { var u = this.state.until; if (u < m + 60) u = Math.min(1440, m + 60); this.setState({ from: m, until: u }); }
  setUntil(m) { var f = this.state.from; if (m < f + 60) f = Math.max(0, m - 60); this.setState({ until: m, from: f }); }
  createEvent() {
    var s = this.state;
    var n = (s.name || '').trim();
    var org = (s.orgName || '').trim();
    if (!n) { this.setState({ nameError: 'Give your event a name.' }); return; }
    if (s.pickDays.length < 2 || !org) return;
    var ev = { id: newId(), name: n, organiser: org, slots: s.pickDays.slice().sort().map(slotFromIso), win: { s: s.from, e: s.until }, note: s.note, responses: [], proposal: null };
    saveEventData(ev);
    recordMyEvent({ id: ev.id, name: ev.name, role: 'organising', who: org, status: 'Collecting responses' });
    this.go(Object.assign(respondFor(ev, 'organiser', org), { name: n, nameError: '', screen: 'respond', errors: {}, formError: '', noneWork: false, phase: 'editing', dirty: false, editing: false, sheet: null }));
  }

  createVals(s) {
    var self = this;
    var calCells = []; var createWheels = []; var calTitle = ''; var calHasPrev = false; var calPrevLabel = ''; var calNextLabel = ''; var calPrevAria = ''; var calNextAria = '';
    if (s.screen === 'create') {
      var cp = s.calMonth.split('-').map(Number);
      var first = new Date(cp[0], cp[1] - 1, 1);
      var offset = (first.getDay() + 6) % 7;
      var dim = new Date(cp[0], cp[1], 0).getDate();
      for (var b = 0; b < offset; b++) calCells.push({ isBlank: true, isDay: false });
      for (var dd = 1; dd <= dim; dd++) {
        (function (dnum) {
          var dt = new Date(cp[0], cp[1] - 1, dnum); var iso = isoFromDate(dt);
          var on = s.pickDays.indexOf(iso) >= 0; var past = iso < TODAY;
          calCells.push({
            isBlank: false, isDay: true, d: String(dnum),
            cls: 'cal-day' + (on ? ' glass-silver is-on' : '') + (iso === TODAY ? ' is-today' : ''),
            pressed: on ? 'true' : 'false', disabled: past,
            aria: DAYS[dt.getDay()] + ' ' + dnum + ' ' + MONTHS[dt.getMonth()] + (iso === TODAY ? ', today' : ''),
            toggle: function () { self.toggleDay(iso); }
          });
        })(dd);
      }
      calTitle = MONTHS[cp[1] - 1] + ' ' + cp[0];
      var prevD = new Date(cp[0], cp[1] - 2, 1); var nextD = new Date(cp[0], cp[1], 1);
      calHasPrev = s.calMonth > TODAY.slice(0, 7);
      calPrevLabel = MON[prevD.getMonth()]; calNextLabel = MON[nextD.getMonth()];
      calPrevAria = 'Previous month, ' + MONTHS[prevD.getMonth()]; calNextAria = 'Next month, ' + MONTHS[nextD.getMonth()];
      createWheels = [
        this.makeWheel('c-from', 'From', steps(0, 1380, 15), s.from, function (v) { self.setFrom(v); }),
        this.makeWheel('c-until', 'Until', steps(60, 1440, 15), s.until, function (v) { self.setUntil(v); })
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
      createEvent: function () { self.createEvent(); },
    };
  }
  }
