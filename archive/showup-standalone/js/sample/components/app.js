/* App shell: render values */
(function () {
  class AppMixin {
  shellVals(s) {
    var p = s.proposal;
    return {
      statusLabel: p ? 'Time proposed (prototype)' : 'Collecting responses',
    };
  }

  renderVals() {
    var s = this.state;
    return Object.assign({}, this.shellVals(s), this.resultsVals(s), this.inviteVals(s), this.proposeVals(s));
  }
  }
  Showup.register(AppMixin);
})();
