import Words from './Words';

// Live results for stored events. Every value comes from GET /api/events/{id}/results via resultsVals().
// Markup and classes follow the prototype's recommendation block and DotRows (styles/screens/event-flow.css).

// coming and maybe are disjoint subsets of free (engine: viable vs tentative); clamped so dots never exceed free.
function DotRow({ r }: { r: any }) {
  const free = Math.max(0, r.free);
  const coming = Math.min(Math.max(0, r.coming), free);
  const maybe = Math.min(Math.max(0, r.maybe), free - coming);
  const dots = Array.from({ length: free }, (_, i) => (i < coming ? 'is-on' : i < coming + maybe ? 'is-on lr-maybe' : ''));
  const aria = `${r.day}, ${r.time}: ${coming} coming${maybe > 0 ? `, ${maybe} maybe` : ''}, ${free} free${r.isBest ? ', best' : ''}`;
  return (
    <li className="dr lr-dr" role="img" aria-label={aria}>
      <span className="dr-label" aria-hidden="true">
        <span className="dr-day">{r.day}</span>
        <span className="dr-time">{r.time}</span>
      </span>
      <span className="dr-dots" aria-hidden="true">
        {dots.map((on, i) => (
          <span key={i} className="dot glass-silver">
            <span className={'dot-red glass-red ' + on} />
          </span>
        ))}
      </span>
      <span className="dr-num" aria-hidden="true">
        <span className={'dr-go' + (r.isBest ? ' is-best' : '')}>{coming}</span>
        <span className="label">{maybe > 0 ? `coming · ${maybe} maybe · ${free} free` : `of ${free} free`}</span>
      </span>
    </li>
  );
}

export default function LiveResults({ v }: { v: any }) {
  if (!v.showLiveResults) return null;
  return (
    <section className="live-results s-body su-stagger" aria-label="Results" aria-live="polite">
      {v.resultsLoading ? <p className="lr-note">Loading results…</p> : null}
      {v.resultsFailed ? (
        <p className="lr-note">
          Results aren't available right now.{' '}
          <button type="button" className="text-btn text-btn-muted" onClick={v.retryResults}>Try again</button>
        </p>
      ) : null}
      {v.resultsEmpty ? <p className="lr-note">No responses yet. Share the link to get responses.</p> : null}
      {v.resultsNoBest ? <p className="comp-h">No time works for confirmed attendees yet.</p> : null}
      {v.resultsHasBest ? (
        <div className="lr-rec">
          <p className="label-red">Best so far</p>
          <p className="rec-time">
            <span><Words text={v.resultsBestDay} /></span>
            <span className="comma">,{' '}</span>
            <span className="t2"><Words text={v.resultsBestTime} start={1} /></span>
          </p>
          <p className="rec-date">{v.resultsBestDate}</p>
          <p className="comp-h rec-viable">{v.resultsBestCount}</p>
        </div>
      ) : null}
      {v.resultsRows.length ? (
        <ul className="dotrows lr-rows su-stagger" aria-label="Days compared">
          {v.resultsRows.map((r: any) => (r.hasBar ? <DotRow key={r.key} r={r} /> : (
            <li key={r.key} className="dr lr-dr is-dim">
              <span className="dr-label">
                <span className="dr-day">{r.day}</span>
                <span className="dr-time">{r.time}</span>
              </span>
            </li>
          )))}
        </ul>
      ) : null}
      {v.resultsRows.length || v.showRespondents ? (
        <div className="lr-foot">
          {v.resultsRows.length ? <p className="small">Each dot is someone free. Red: coming. Pale red: maybe. Grey: free, not coming.</p> : null}
          {v.showRespondents ? <p className="lr-note">{v.respondentsLine}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
