/* Entry point for Main.dc.html: builds the page's Component class and hands it to standalone-support.js. */
window.DCMeta = {"startAt":{"editor":"enum","options":["landing","create","respond","fresh","join","guest","participant"],"default":"landing","section":"Prototype"},"$preview":{"width":1440,"height":900}};

window.DCComponentFactory = function (DCLogic) {
  class Component extends DCLogic {
  constructor(props) {
    super(props);
    var start = (props && props.startAt) || DEFAULT_START;
    var st = seed(start);
    if (start === 'landing') {
      try {
        var raw = window.sessionStorage.getItem(STORE_KEY);
        if (raw) {
          var saved = JSON.parse(raw);
          if (saved && saved.family === FAMILY && saved.screen) {
            window.sessionStorage.removeItem(STORE_KEY);
            delete saved.family;
            st = Object.assign(baseState(), saved, { sheet: null, sheetClosing: false, proposeOpen: false, proposeClosing: false, linkMsg: '', remMsg: '', liveMsg: '', leaving: false, anim: '', myEvents: loadMyEvents() || [] });
          }
        }
      } catch (e) {}
    }
    var discsSeen = false;
    try { discsSeen = window.sessionStorage.getItem(DOTS_KEY) === '1'; } catch (e) {}
    st.discsGrown = discsSeen || this.reduced();
    st.dotsSettled = st.discsGrown;
    this.state = st;
    this.slotEls = {};
    this.sheetEl = null; this.propEl = null; this.savedEl = null; this.headingEl = null; this.linkEl = null; this.remEl = null;
    this.timer = null; this.timers = {};
    this.parseTimer = null;
    this.wheelDefs = {}; this.wheelEls = {}; this.wheelTimers = {};
  }

  componentDidMount() { this._prev = this.state; this.maybeGrowDiscs(); }

  componentWillUnmount() {
    if (this.timer) clearTimeout(this.timer);
    if (this.parseTimer) clearTimeout(this.parseTimer);
    var t = this.timers; Object.keys(t).forEach(function (k) { clearTimeout(t[k]); });
    var wt = this.wheelTimers; Object.keys(wt).forEach(function (k) { clearTimeout(wt[k]); });
  }

  componentDidUpdate(prevProps) {
    var prevState = this._prev || this.state;
    this._prev = this.state;
    if (prevProps && prevProps.startAt !== this.props.startAt) {
      this.setState(Object.assign(seed(this.props.startAt || DEFAULT_START), { discsGrown: this.state.discsGrown }));
      return;
    }
    if (prevState.screen !== this.state.screen) {
      try { window.scrollTo(0, 0); } catch (e) {}
      if (this.headingEl && this.state.screen !== 'create') { try { this.headingEl.focus({ preventScroll: true }); } catch (e) {} }
    }
    if (!prevState.sheet && this.state.sheet && this.sheetEl) { try { this.sheetEl.focus({ preventScroll: true }); } catch (e) {} }
    if (!prevState.proposeOpen && this.state.proposeOpen && this.propEl) { try { this.propEl.focus({ preventScroll: true }); } catch (e) {} }
    if (prevState.phase !== 'saved' && this.state.phase === 'saved' && this.state.screen === 'respond' && this.savedEl) {
      try { this.savedEl.focus({ preventScroll: true }); this.savedEl.scrollIntoView({ block: 'center', behavior: this.motion() }); } catch (e) {}
    }
    this.maybeGrowDiscs();
    this.syncWheels();
  }
  }
  Showup.mix(Component);
  return Component;
};
