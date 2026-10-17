// Ported mechanically from Main.dc.html (<sc-if> section). Values and handlers come from the page's
// renderVals() (see lib/ui), exactly as the template's {{holes}} did.

export default function Join({ v }: { v: any }) {
  return (
    <>
      <header className="wrap header">
        <button type="button" className="wordmark" onClick={v.goHome} aria-label="showup. home">
          showup
          <span className="dot">.</span>
        </button>
      </header>
      <main className="wrap page-main">
        <div className="col-grid">
          <div className={`col-main ${v.screenCls}`}>
            <h1 className="display vt-title" tabIndex={-1} ref={v.setHeadingEl}>{v.eventName}</h1>
            <p className="j-org s-head">Organised by {v.organiser}</p>
            <div className="j-form s-body">
              <div className="field">
                <label className="field-label" htmlFor="j-name">Your name</label>
                <input id="j-name" className="input-line input-lg" type="text" maxLength={30} autoComplete="given-name" value={v.joinName} onChange={v.setJoinName} onKeyDown={v.joinKey} />
                {v.hasJoinError ? (
                  <>
                    <p className="field-error" role="alert">{v.joinError}</p>
                  </>
                ) : null}
              </div>
              <div>
                <button type="button" className="btn btn-primary" onClick={v.joinContinue}>Continue</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
