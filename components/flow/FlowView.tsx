// Ported mechanically from Main.dc.html (whole template). Values and handlers come from the page's
// renderVals() (see lib/ui), exactly as the template's {{holes}} did.
import Landing from './screens/Landing';
import Create from './screens/Create';
import Join from './screens/Join';
import Respond from './screens/Respond';
import ConditionsSheet from './sheets/ConditionsSheet';

export default function FlowView({ v }: { v: any }) {
  return (
    <>
    <div className="su">
      <div className="ambient" aria-hidden="true" />
      <div className="layer">
        {v.isLanding ? <Landing v={v} /> : null}
        {v.isCreate ? <Create v={v} /> : null}
        {v.isJoin ? <Join v={v} /> : null}
        {v.isRespond ? <Respond v={v} /> : null}
        {v.sheetOpen ? <ConditionsSheet v={v} /> : null}
      </div>
    </div>
    </>
  );
}
