// @ts-nocheck
import { cloneConds, sameConds } from '../utils/helpers';
import { joinList, chipLabel, describe } from '../utils/format';
import { parseConditions } from '../utils/conditions-parser';
import { chipsToViews, interpretOffline, readback } from '../../conditions/fallback';

export class ConditionsSheetMixin {
  groupNames() {
    var s = this.state;
    if (s.mode === 'participant') return ['Alex', 'Sam', 'Jess', 'Drew', 'Maya', 'Nina', 'Leo', 'Kai'];
    if (s.event) return (s.event.responses || []).map(function (r) { return r.who; }).filter(function (n) { return n !== s.myName; });
    return null;
  }

  openSheet(id) {
    var s = this.state; var stored = s.conds[id];
    var editing = s.will[id] === 'if' && !!(stored && stored.length);
    this.setState({
      sheet: {
        slotId: id, editing: editing, text: stored ? (s.condText[id] || '') : '', chips: [], status: 'empty', editIdx: null,
        interpreted: false, readback: '', selfError: '', offline: !!(s.event && s.event.persisted),
      },
      sheetClosing: false, will: this.withKey('will', id, 'if'), errors: this.withKey('errors', id, false), formError: '',
    });
  }

  dismissSheet(patch) {
    var self = this; var id = this.state.sheet ? this.state.sheet.slotId : null;
    if (this.parseTimer) { clearTimeout(this.parseTimer); this.parseTimer = null; }
    this.setState({ sheetClosing: true });
    setTimeout(function () {
      self.change(Object.assign({ sheet: null, sheetClosing: false }, patch || {}));
      setTimeout(function () { if (id) self.focusSlot(id); }, 30);
    }, this.reduced() ? 150 : 200);
  }

  closeSheet() {
    var sh = this.state.sheet;
    if (!sh || this.state.sheetClosing) return;
    if (sh.editing) this.dismissSheet({}); else this.dismissSheet({ will: this.withKey('will', sh.slotId, null) });
  }

  patchSheet(p) { this.setState({ sheet: Object.assign({}, this.state.sheet, p) }); }

  onSheetText(text) {
    this.patchSheet({ text: text, interpreted: false, readback: '', selfError: '', chips: [], status: 'empty' });
  }

  interpretSheet() {
    var sh = this.state.sheet;
    if (!sh) return;
    var roster = this.groupNames() || [];
    if (sh.offline) {
      var r = interpretOffline(sh.text, { self: this.state.myName, roster: roster });
      if (r.status === 'self') { this.patchSheet({ selfError: "A condition can't depend on you coming. If nothing else needs to happen, choose Yes.", interpreted: false }); return; }
      if (r.status === 'empty' || r.status === 'none') { this.patchSheet({ status: r.status, chips: [], readback: '', interpreted: false }); return; }
      var views = chipsToViews(r.chips);
      this.patchSheet({ chips: r.chips, status: r.status, views: views, readback: views.map(readback).join(' '), interpreted: true, selfError: '' });
      return;
    }
    var legacy = parseConditions(sh.text, roster);
    this.patchSheet({ chips: legacy.chips, status: legacy.status, interpreted: legacy.status === 'ok', readback: legacy.chips.length ? describe(legacy.chips) : '' });
  }

  editChip(i, p) { var cs = cloneConds(this.state.sheet.chips); cs[i] = Object.assign(cs[i], p); this.patchSheet({ chips: cs, interpreted: false }); }
  removeChip(i) { var cs = cloneConds(this.state.sheet.chips); cs.splice(i, 1); this.patchSheet({ chips: cs, editIdx: null, interpreted: false }); }

  validChips(chips) {
    return chips.filter(function (c) {
      if (c.type === 'person') return c.known !== false && /^[A-Za-z][A-Za-z' \-]{0,29}$/.test(String(c.name || '').trim());
      if (c.type === 'tentative') return true;
      var n = parseInt(c.n, 10); return n >= 2 && n <= 20;
    });
  }

  confirmSheet() {
    var sh = this.state.sheet;
    if (!sh || this.state.sheetClosing || !sh.interpreted) return;
    var id = sh.slotId;
    var s = this.state;
    if (sh.offline && sh.views) {
      var out = sh.views.map(function (v) {
        var row = { type: v.type, source: 'fallback', readback: readback(v) };
        if (v.type === 'requires' || v.type === 'requires_any') row.people = v.people.map(function (p) { return { name: p.name, pending: p.pending }; });
        else if (v.type === 'min_attendees') row.n = v.n;
        else if (v.type === 'time') { if (v.earliest_start != null) row.earliest_start = v.earliest_start; if (v.latest_end != null) row.latest_end = v.latest_end; }
        else if (v.type === 'unresolvable') row.summary = v.summary;
        return row;
      });
      if (!out.length) return;
      this.dismissSheet({ will: this.withKey('will', id, 'if'), conds: this.withKey('conds', id, out), condText: this.withKey('condText', id, sh.readback), applied: this.withKey('applied', id, '') });
      return;
    }
    var seen = {};
    var outLegacy = this.validChips(sh.chips).map(function (c) {
      return c.type === 'person' ? { type: 'person', name: String(c.name).trim(), known: true } : c.type === 'tentative' ? { type: 'person', name: 'Tentative', known: false } : { type: 'min', n: String(parseInt(c.n, 10)) };
    }).filter(function (c) { var k = c.type === 'person' ? 'p:' + c.name.toLowerCase() : 'min'; if (seen[k]) return false; seen[k] = true; return true; });
    if (!outLegacy.length) return;
    this.dismissSheet({ will: this.withKey('will', id, 'if'), conds: this.withKey('conds', id, outLegacy), condText: this.withKey('condText', id, sh.text), applied: this.withKey('applied', id, '') });
  }

  reuseTargets(id) {
    var s = this.state; var src = s.conds[id];
    return s.slots.filter(function (sl) { return sl.id !== id && s.avail[sl.id] > 0 && s.will[sl.id] !== 'no' && !(s.will[sl.id] === 'if' && sameConds(s.conds[sl.id], src)); });
  }

  reuse(id) {
    var s = this.state; var targets = this.reuseTargets(id);
    if (!targets.length) return;
    var will = Object.assign({}, s.will); var conds = Object.assign({}, s.conds); var condText = Object.assign({}, s.condText); var errors = Object.assign({}, s.errors);
    targets.forEach(function (t) { will[t.id] = 'if'; conds[t.id] = cloneConds(s.conds[id]); condText[t.id] = s.condText[id]; errors[t.id] = false; });
    this.change({ will: will, conds: conds, condText: condText, errors: errors, applied: this.withKey('applied', id, 'Also applied to ' + joinList(targets.map(function (t) { return t.day; })) + '.') });
  }

  sheetVals(s) {
    var self = this;
    var sh = s.sheet;
    var group = sh ? this.groupNames() : null;
    var sheetChips = sh && !sh.offline ? sh.chips.map(function (c, i) {
      var editing = sh.editIdx === i; var isPerson = c.type === 'person';
      var n = parseInt(c.n, 10) || 2;
      return {
        label: chipLabel(c),
        cls: 'cchip glass-silver' + (c.known === false ? ' is-unknown' : '') + (editing ? ' is-editing' : ''),
        expanded: editing ? 'true' : 'false', editing: editing,
        toggle: function () { self.patchSheet({ editIdx: self.state.sheet.editIdx === i ? null : i }); },
        showOptions: isPerson && !!group, showFreeName: isPerson && !group, isMin: !isPerson,
        options: isPerson && group ? group.map(function (g) {
          var on = c.known !== false && g === c.name;
          return { name: g, cls: 'name-opt' + (on ? ' is-on' : ''), pressed: on ? 'true' : 'false', pick: function () { self.editChip(i, { name: g, known: true }); self.patchSheet({ editIdx: null }); } };
        }) : [],
        name: c.name || '',
        setName: function (e) { self.editChip(i, { name: e.target.value, known: true }); },
        n: String(n), atMinN: n <= 2, atMaxN: n >= 20,
        dec: function () { self.editChip(i, { n: String(Math.max(2, n - 1)) }); },
        inc: function () { self.editChip(i, { n: String(Math.min(20, n + 1)) }); },
        remove: function () { self.removeChip(i); },
      };
    }) : [];
    var quietLine = sh && sh.selfError ? sh.selfError
      : (sh && sh.status === 'unsupported' ? "That kind of condition isn't supported yet. Try who needs to be there, or how many."
        : (sh && (sh.status === 'none' || sh.status === 'empty') && sh.interpreted === false && sh.offline ? "Enter what it depends on, then check it."
          : (sh && sh.status === 'none' ? "We couldn't find a condition there. Try who needs to be there, or how many." : '')));
    return {
      sheetOpen: !!sh, overlayCls: 'overlay' + (s.sheetClosing ? ' is-closing' : ''),
      setSheetEl: function (el) { self.sheetEl = el; },
      sheetText: sh ? sh.text : '',
      onSheetText: function (e) { self.onSheetText(e.target.value); },
      showOfflineNote: !!(sh && sh.offline), showInterpretBtn: !!(sh && sh.offline),
      interpretSheet: function () { self.interpretSheet(); },
      showReadback: !!(sh && sh.interpreted && sh.readback), sheetReadback: sh ? sh.readback : '',
      showChips: !!(sh && sh.chips.length && !sh.offline), sheetChips: sheetChips,
      showQuiet: !!(sh && quietLine && !sh.readback), quietLine: quietLine,
      cannotConfirm: !sh || !sh.interpreted || (sh.offline ? !sh.readback : self.validChips(sh.chips).length === 0),
      confirmSheet: function () { self.confirmSheet(); },
      closeSheet: function () { self.closeSheet(); },
      sheetKey: function (e) { if (e.key === 'Escape') { e.stopPropagation(); self.closeSheet(); } },
    };
  }
}
