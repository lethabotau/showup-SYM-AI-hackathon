// Live results for stored events. Every value comes from GET /api/events/{id}/results via resultsVals().
export default function LiveResults({ v }: { v: any }) {
  if (!v.showLiveResults) return null;
  return (
    <section className="live-results s-body" aria-label="Results" aria-live="polite">
      {v.resultsLoading ? <p className="lr-note">Loading results…</p> : null}
      {v.resultsFailed ? (
        <p className="lr-note">
          Results aren't available right now.{' '}
          <button type="button" className="text-btn text-btn-muted" onClick={v.retryResults}>Try again</button>
        </p>
      ) : null}
      {v.resultsEmpty ? <p className="lr-note">No responses yet. Share the link to get responses.</p> : null}
      {v.resultsNoBest ? <p className="lr-best">No time works for confirmed attendees yet.</p> : null}
      {v.resultsHasBest ? <p className="lr-best">{v.resultsBestLine}</p> : null}
      {v.resultsRows.length ? (
        <ul className="lr-rows">
          {v.resultsRows.map((r: any) => (
            <li key={r.key} className={r.cls}>
              <p className="lr-label">
                {r.label}
                {r.isBest ? <span className="lr-tag">Best</span> : null}
              </p>
              {r.counts ? <p className="lr-counts">{r.counts}</p> : null}
              {r.hasBar ? (
                <span className="lr-bar" role="img" aria-label={r.aria}>
                  <span className="lr-free" style={{ width: `${r.freePct}%` }} />
                  <span className="lr-coming" style={{ width: `${r.comingPct}%` }} />
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {v.resultsRows.length ? <p className="small">Bars: light shows who's free, red shows who's actually coming.</p> : null}
      {v.showRespondents ? <p className="lr-note">{v.respondentsLine}</p> : null}
    </section>
  );
}
