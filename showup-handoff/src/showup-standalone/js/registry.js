/* Components are plain classes whose methods get mixed into the page's Component class (see main.js). */
window.Showup = (function () {
  var mixins = [];
  return {
    register: function (Mixin) { mixins.push(Mixin); },
    mix: function (Target) {
      mixins.forEach(function (Mixin) {
        Object.getOwnPropertyNames(Mixin.prototype).forEach(function (key) {
          if (key === 'constructor') return;
          Object.defineProperty(Target.prototype, key, Object.getOwnPropertyDescriptor(Mixin.prototype, key));
        });
      });
    }
  };
})();
