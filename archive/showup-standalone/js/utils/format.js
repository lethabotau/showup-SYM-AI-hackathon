function joinList(list) {
  if (list.length <= 1) return list.join('');
  return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}
function chipLabel(c) {
  if (c.type === 'person') return c.known === false ? c.name + '?' : (c.name || 'Someone') + ' goes';
  return c.n + '+ people';
}
function describe(cs) { return (cs || []).map(chipLabel).join(' · '); }
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function fmtShort(m) {
  var h = Math.floor(m / 60) % 24; var mm = m % 60;
  return (h % 12 || 12) + (mm ? ':' + pad2(mm) : '') + (h < 12 ? 'am' : 'pm');
}
function fmtNum(m) { var h = Math.floor(m / 60) % 24; var mm = m % 60; return (h % 12 || 12) + (mm ? ':' + pad2(mm) : ''); }
function suffix(m) { return (Math.floor(m / 60) % 24) < 12 ? 'am' : 'pm'; }
function fmtCompact(s, e) { return suffix(s) === suffix(e) ? fmtNum(s) + ' – ' + fmtNum(e) + suffix(e) : fmtShort(s) + ' – ' + fmtShort(e); }
function fmtWheel(m) {
  var h = Math.floor(m / 60) % 24; var mm = m % 60;
  return (h % 12 || 12) + ':' + pad2(mm) + ' ' + (h < 12 ? 'am' : 'pm');
}
function fmtTick(m) { var h = Math.floor(m / 60) % 24; return (h % 12 || 12) + (h < 12 ? 'a' : 'p'); }
function rangeText(r) { return fmtShort(r.s) + ' – ' + fmtShort(r.e); }
