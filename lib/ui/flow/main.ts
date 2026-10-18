// @ts-nocheck
// Ported from archive/showup-standalone/js/main.js: the page Component (was built by window.DCComponentFactory).
// The class body is unchanged except where marked [port].
import { DCLogic } from '../dc-runtime';
import { mix } from '../registry';
import { FAMILY, DEFAULT_START, STORE_KEY, DOTS_KEY } from '../config';
import { baseState, seed, respondFor } from '../state';
import { loadMyEvents } from '../services/storage';
import { AppMixin } from './app';
import { LandingMixin } from './landing';
import { CreateMixin } from './create';
import { JoinMixin } from './join';
import { RespondMixin } from './respond';
import { ConditionsSheetMixin } from './conditions-sheet';
import { EventPageMixin } from './event-page';
import { ProposeSheetMixin } from './propose-sheet';
/* Entry point for Main.dc.html: builds the page's Component class and hands it to standalone-support.js. */
export var DCMeta = {"startAt":{"editor":"enum","options":["landing","create","respond","fresh","join","guest","participant"],"default":"landing","section":"Prototype"},"$preview":{"width":1440,"height":900}};

export class Component extends DCLogic {
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
    // [port] Entry points can hand in real data instead of the fixtures: `event` (e.g. loaded for
    // /e/[eventId]) replaces the seeded event and response maps; `initialState` is merged last.
    // Neither prop is passed by / or /preview/[startAt], so those behave exactly as before.
    if (props && props.event) Object.assign(st, respondFor(props.event, st.mode, st.myName));
    if (props && props.initialState) Object.assign(st, props.initialState);
    var discsSeen = false;
    try { discsSeen = window.sessionStorage.getItem(DOTS_KEY) === '1'; } catch (e) {}
    st.discsGrown = discsSeen || this.reduced();
    st.dotsSettled = st.discsGrown;
    this.state = st;
    this.slotEls = {};
    this.sheetEl = null; this.propEl = null; this.savedEl = null; this.headingEl = null; this.linkEl = null; this.remEl = null;
    this.timer = null; this.timers = {};
    this.parseTimer = null;
  }

  componentDidMount() {
    this._prev = this.state;
    this.maybeGrowDiscs();
    if (typeof this.tryRestoreGuest === 'function') this.tryRestoreGuest();
  }

  componentWillUnmount() {
    if (this.timer) clearTimeout(this.timer);
    if (this.parseTimer) clearTimeout(this.parseTimer);
    var t = this.timers; Object.keys(t).forEach(function (k) { clearTimeout(t[k]); });
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
  }
  }
mix(Component, [AppMixin, LandingMixin, CreateMixin, JoinMixin, RespondMixin, ConditionsSheetMixin, EventPageMixin, ProposeSheetMixin]);
