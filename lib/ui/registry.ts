/* Copies each mixin's methods onto the page's Component class (the same property descriptors a class body
   would give). Ported from archive/showup-standalone/js/registry.js. The original kept ONE global list
   (window.Showup.register); here each page passes its own list, because both pages define mixins with the
   same method names and now live in one bundle. Order matters: later mixins win, as before. */
export function mix(Target: any, mixins: any[]) {
  mixins.forEach(function (Mixin) {
    Object.getOwnPropertyNames(Mixin.prototype).forEach(function (key) {
      if (key === 'constructor') return;
      Object.defineProperty(Target.prototype, key, Object.getOwnPropertyDescriptor(Mixin.prototype, key) as PropertyDescriptor);
    });
  });
}
