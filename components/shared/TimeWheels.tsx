// Shared markup, identical in Main.dc.html and Event.dc.html (or used twice in Main): the stand-in From/Until time wheels (Create, and each Respond range).
import { Fragment } from 'react';

export default function TimeWheels({ wheels }: { wheels: any[] }) {
  return (
    <div className="wheels">
      {(wheels || []).map((w: any, $index: number) => (
        <Fragment key={$index}>
          <div className="wheel-col">
            <p className="wheel-label" id={w.labelId}>{w.label}</p>
            <div className="wheel glass-control">
              <div className="wheel-band glass-silver" aria-hidden="true" />
              <div className="wheel-scroll" tabIndex={0} role="spinbutton" aria-labelledby={w.labelId} aria-valuetext={w.valueText} onScroll={w.onScroll} onKeyDown={w.onKey} onClick={w.onClick} ref={w.setEl}>
                <div className="wheel-pad" aria-hidden="true" />
                {(w.items || []).map((it: any, $index: number) => (
                  <Fragment key={$index}>
                    <div className={it.cls} aria-hidden="true">{it.label}</div>
                  </Fragment>
                ))}
                <div className="wheel-pad" aria-hidden="true" />
              </div>
            </div>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
