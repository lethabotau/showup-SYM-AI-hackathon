function dateFromIso(iso) { var p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function isoFromDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function slotFromIso(iso) {
  var d = dateFromIso(iso);
  return { id: 'd' + iso.replace(/-/g, ''), iso: iso, day: DAYS[d.getDay()], title: DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()], short: DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()] };
}
