// @ts-nocheck
// Ported verbatim from archive/showup-standalone/js/components/conditions-sheet.js. Only the export/import lines were added
// (the original files shared globals through classic <script> tags). Types come later.
import { NAMES } from '../data/constants';
import { cloneConds, sameConds } from '../utils/helpers';
import { joinList, chipLabel } from '../utils/format';
import { parseConditions } from '../utils/conditions-parser';
/* Conditions sheet ("If…") */
export class ConditionsSheetMixin {
  groupNames() {
    var s = this.state;
    if (s.mode === 'participant') return NAMES;
    if (s.mode === 'guest' && s.event) return (s.event.responses || []).map(function (r) { return r.who; }).filter(function (n) { return n !== s.myName; });
    return null;
  }
  openSheet(id) {
    var s = this.state; var stored = s.conds[id];
    var editing = s.will[id] === 'if' && !!(stored && stored.length);
    this.setState({
      sheet: { slotId: id, editing: editing, text: stored ? (s.condText[id] || '') : '', chips: cloneConds(stored), status: stored && stored.length ? 'ok' : 'empty', editIdx: null },
      sheetClosing: false, will: this.withKey('will', id, 'if'), errors: this.withKey('errors', id, false), formError: ''
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
    var self = this;
    this.patchSheet({ text: text });
    if (this.parseTimer) clearTimeout(this.parseTimer);
    this.parseTimer = setTimeout(function () {
      self.parseTimer = null;
      if (!self.state.sheet) return;
      var r = parseConditions(self.state.sheet.text, self.groupNames());
      self.patchSheet({ chips: r.chips, status: r.status, editIdx: null });
    }, 600);
  }
  editChip(i, p) { var cs = cloneConds(this.state.sheet.chips); cs[i] = Object.assign(cs[i], p); this.patchSheet({ chips: cs }); }
  removeChip(i) { var cs = cloneConds(this.state.sheet.chips); cs.splice(i, 1); this.patchSheet({ chips: cs, editIdx: null }); }
  validChips(chips) {
    return chips.filter(function (c) {
      if (c.type === 'person') return c.known !== false && /^[A-Za-z][A-Za-z' \-]{0,29}$/.test(String(c.name || '').trim());
      var n = parseInt(c.n, 10); return n >= 2 && n <= 20;
    });
  }
  confirmSheet() {
    var sh = this.state.sheet;
    if (!sh || this.state.sheetClosing) return;
    var seen = {};
    var out = this.validChips(sh.chips).map(function (c) {
      return c.type === 'person' ? { type: 'person', name: String(c.name).trim(), known: true } : { type: 'min', n: String(parseInt(c.n, 10)) };
    }).filter(function (c) { var k = c.type === 'person' ? 'p:' + c.name.toLowerCase() : 'min'; if (seen[k]) return false; seen[k] = true; return true; });
    if (!out.length) return;
    var id = sh.slotId;
    this.dismissSheet({ will: this.withKey('will', id, 'if'), conds: this.withKey('conds', id, out), condText: this.withKey('condText', id, sh.text), applied: this.withKey('applied', id, '') });
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
    var sheetChips = sh ? sh.chips.map(function (c, i) {
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
        remove: function () { self.removeChip(i); }
      };
    }) : [];
    var validCount = sh ? this.validChips(sh.chips).length : 0;
    var quietLine = sh && sh.status === 'unsupported' ? "That kind of condition isn't supported yet. Try who needs to be there, or how many."
      : (sh && sh.status === 'none' ? "We couldn't find a condition there. Try who needs to be there, or how many." : '');
    return {
      sheetOpen: !!sh, overlayCls: 'overlay' + (s.sheetClosing ? ' is-closing' : ''),
      setSheetEl: function (el) { self.sheetEl = el; },
      sheetText: sh ? sh.text : '',
      onSheetText: function (e) { self.onSheetText(e.target.value); },
      showChips: !!(sh && sh.chips.length), sheetChips: sheetChips,
      showQuiet: !!(sh && !sh.chips.length && quietLine), quietLine: quietLine,
      cannotConfirm: validCount === 0,
      confirmSheet: function () { self.confirmSheet(); },
      closeSheet: function () { self.closeSheet(); },
      sheetKey: function (e) { if (e.key === 'Escape') { e.stopPropagation(); self.closeSheet(); } }
    };
  }
  }
