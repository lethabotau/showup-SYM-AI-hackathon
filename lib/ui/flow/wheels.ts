// @ts-nocheck
// Ported verbatim from archive/showup-standalone/js/components/wheels.js. Only the export/import lines were added
// (the original files shared globals through classic <script> tags). Types come later.
import { ITEM_H } from '../config';
import { fmtWheel } from '../utils/format';
/* Time wheels (the stand-in picker) */
export class WheelsMixin {
  registerWheel(key, el) {
    if (!el) { delete this.wheelEls[key]; return; }
    if (this.wheelEls[key] !== el) {
      this.wheelEls[key] = el;
      var def = this.wheelDefs[key];
      if (def) { try { el.scrollTop = def.idx * ITEM_H; } catch (e) {} }
    }
  }
  wheelScrolled(key, el) {
    var self = this;
    if (this.wheelTimers[key]) clearTimeout(this.wheelTimers[key]);
    this.wheelTimers[key] = setTimeout(function () {
      delete self.wheelTimers[key];
      var def = self.wheelDefs[key];
      if (!def) return;
      var i = Math.max(0, Math.min(def.values.length - 1, Math.round(el.scrollTop / ITEM_H)));
      if (i !== def.idx) def.commit(def.values[i]);
      else if (Math.abs(el.scrollTop - i * ITEM_H) > 1) { try { el.scrollTo({ top: i * ITEM_H, behavior: self.motion() }); } catch (e) {} }
    }, 120);
  }
  syncWheels() {
    var self = this;
    Object.keys(this.wheelEls).forEach(function (key) {
      var el = self.wheelEls[key]; var def = self.wheelDefs[key];
      if (!el || !def || self.wheelTimers[key]) return;
      var top = def.idx * ITEM_H;
      if (Math.abs(el.scrollTop - top) > 1) { try { el.scrollTo({ top: top, behavior: self.motion() }); } catch (e) { el.scrollTop = top; } }
    });
  }
  makeWheel(key, label, values, current, commit) {
    var self = this;
    var idx = values.indexOf(current);
    if (idx < 0) { idx = 0; values.forEach(function (v, i) { if (Math.abs(v - current) < Math.abs(values[idx] - current)) idx = i; }); }
    this.wheelDefs[key] = { values: values, idx: idx, commit: commit };
    return {
      key: key, label: label, labelId: 'wl-' + key, valueText: fmtWheel(values[idx]),
      items: values.map(function (v, i) { return { label: fmtWheel(v), cls: 'w-item' + (i === idx ? ' is-sel' : '') }; }),
      onScroll: function (e) { self.wheelScrolled(key, e.currentTarget); },
      onKey: function (e) {
        var d = 0;
        if (e.key === 'ArrowDown') d = 1; else if (e.key === 'ArrowUp') d = -1; else if (e.key === 'PageDown') d = 4; else if (e.key === 'PageUp') d = -4;
        if (!d) return;
        e.preventDefault();
        var def = self.wheelDefs[key];
        var ni = Math.max(0, Math.min(def.values.length - 1, def.idx + d));
        if (ni !== def.idx) def.commit(def.values[ni]);
      },
      onClick: function (e) {
        var el = e.currentTarget; var rect = el.getBoundingClientRect();
        var y = e.clientY - rect.top + el.scrollTop - 80;
        var def = self.wheelDefs[key]; var ni = Math.floor(y / ITEM_H);
        if (ni >= 0 && ni < def.values.length && ni !== def.idx) def.commit(def.values[ni]);
      },
      setEl: function (el) { self.registerWheel(key, el); }
    };
  }
  }
