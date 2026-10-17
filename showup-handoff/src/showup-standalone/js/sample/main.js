/* Entry point for Event.dc.html: builds the page's Component class and hands it to standalone-support.js. */
window.DCMeta = {"showRoster":{"editor":"boolean","default":false,"section":"Prototype"},"$preview":{"width":1440,"height":1500}};

window.DCComponentFactory = function (DCLogic) {
  class Component extends DCLogic {
  constructor(props) {
    super(props);
    var seen = false;
    try { seen = window.sessionStorage.getItem(DOTS_KEY) === '1'; } catch (e) {}
    this.state = {
      linkMsg: '', remMsg: '', reminderOpen: false,
      proposeOpen: false, proposeClosing: false, form: { time: 'sat', deadline: '2026-10-22', min: '4' }, formError: '',
      proposal: null, grown: seen || reducedMotion(), settled: seen || reducedMotion(), activePerson: null
    };
    this.timers = {};
    this.linkEl = null; this.remEl = null; this.sheetEl = null;
  }

  componentDidMount() {
    var self = this;
    this._prev = this.state;
    if (!this.state.grown) {
      this.timers.grow = setTimeout(function () {
        self.setState({ grown: true });
        self.timers.settle = setTimeout(function () { self.setState({ settled: true }); }, 900);
        try { window.sessionStorage.setItem(DOTS_KEY, '1'); } catch (e) {}
      }, 60);
    }
  }

  componentWillUnmount() { var t = this.timers; Object.keys(t).forEach(function (k) { clearTimeout(t[k]); }); }

  componentDidUpdate(prevProps) {
    var prevState = this._prev || this.state;
    this._prev = this.state;
    if (!prevState.proposeOpen && this.state.proposeOpen && this.sheetEl) {
      try { this.sheetEl.focus({ preventScroll: true }); } catch (e) {}
    }
  }
  }
  Showup.mix(Component);
  return Component;
};
