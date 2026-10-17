// Ported mechanically from Main.dc.html (whole template). Values and handlers come from the page's
// renderVals() (see lib/ui), exactly as the template's {{holes}} did.
import Landing from './screens/Landing';

export default function FlowView({ v }: { v: any }) {
  return (
    <>
    <div className="su">
      <div className="ambient" aria-hidden="true" />
      <div className="layer">
        {v.isLanding ? <Landing v={v} /> : null}
      </div>
    </div>
    </>
  );
}
