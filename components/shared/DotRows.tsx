// Shared markup, identical in Main.dc.html and Event.dc.html (or used twice in Main): the "days compared" dot rows.
import { Fragment } from 'react';

export default function DotRows({ v }: { v: any }) {
  return (
    <ul className="dotrows">
      {(v.dotRows || []).map((x: any, $index: number) => (
        <Fragment key={$index}>
          <li className={x.cls} role="img" aria-label={x.aria}>
            <span className="dr-label" aria-hidden="true">
              <span className="dr-day">{x.title}</span>
              {x.hasTime ? (
                <>
                  <span className="dr-time">{x.time}</span>
                </>
              ) : null}
            </span>
            <span className="dr-dots" aria-hidden="true">
              {(x.dots || []).map((dt: any, $index: number) => (
                <Fragment key={$index}>
                  <span className="dot glass-silver">
                    <span className={dt.redCls} style={{ transitionDelay: `${dt.delay}ms` }} />
                  </span>
                </Fragment>
              ))}
            </span>
            <span className="dr-num" aria-hidden="true">
              {x.hasFree ? (
                <>
                  <span className={x.numCls}>{x.go}</span>
                  <span className="label">of {x.free} free</span>
                </>
              ) : null}
              {x.noFree ? (
                <>
                  <span className="label">Nobody free</span>
                </>
              ) : null}
            </span>
          </li>
        </Fragment>
      ))}
    </ul>
  );
}
