/*!
 * standalone-support.js — SHOWUP standalone stand-in for the Claude Design canvas runtime (`support.js`).
 *
 * Lets the unmodified Main.dc.html / Event.dc.html run in a plain browser with no build step.
 * It reproduces the behaviour of the canvas runtime that these two files rely on:
 *
 *   - React 18.3.1 + ReactDOM 18.3.1 (the exact builds the canvas pins, vendored in ./vendor/)
 *   - reading the raw file source, so <select>/<sc-for> and camelCase attributes survive parsing
 *   - <helmet> contents hoisted into <head> (fonts, styles)
 *   - template compilation: {{holes}}, <sc-if>, <sc-for>, attribute → React prop mapping
 *   - the DCLogic base class and the host component that drives it
 *   - default props from data-props, mounted into #dc-root
 *
 * Faithful-by-design: where the canvas runtime has a quirk, this file reproduces it (see notes marked CANVAS).
 * No network access is required except Google Fonts, which the .dc.html files themselves link to;
 * a local copy of Manrope (./fonts/) is registered first as an offline fallback.
 */
(function () {
  'use strict';

  var self = document.currentScript;
  var BASE = self && self.src ? self.src.replace(/[^\/?#]*([?#].*)?$/, '') : './';
  var RAW_ID = '__dc_raw_source';

  /* ---- 1. Offline font fallback (same family name; Google's stylesheet, loaded later, wins when online) ---- */
  var fontCss = '@font-face{font-family:"Manrope";font-style:normal;font-display:swap;font-weight:200 800;' +
    'src:url("' + BASE + 'fonts/manrope-latin-wght-normal.woff2") format("woff2-variations"),' +
    'url("' + BASE + 'fonts/manrope-latin-wght-normal.woff2") format("woff2");}';

  /* ---- 2. Load React synchronously, then swallow the rest of the document as raw text ----
     The canvas runtime re-reads the raw file (fetch(location.href)) so that HTML-parser rewrites
     (dropped <sc-for> inside <select>, lower-cased attribute names) do not reach the template.
     fetch() is unavailable on file://, so the raw text is captured with <plaintext> instead. */
  document.write(
    '<style>' + fontCss + '</style>' +
    '<script src="' + BASE + 'vendor/react.production.min.js"><\/script>' +
    '<script src="' + BASE + 'vendor/react-dom.production.min.js"><\/script>' +
    '<plaintext id="' + RAW_ID + '" style="display:none">'
  );

  /* ---- 3. Template semantics (mirrors the canvas runtime) ---- */
  var CAMEL = 'sc-camel-';
  var RAW_TAGS = { select: 'sc-raw-select', table: 'sc-raw-table', tbody: 'sc-raw-tbody', thead: 'sc-raw-thead', tfoot: 'sc-raw-tfoot', tr: 'sc-raw-tr', td: 'sc-raw-td', th: 'sc-raw-th', caption: 'sc-raw-caption' };
  var RAW_BACK = {}; Object.keys(RAW_TAGS).forEach(function (k) { RAW_BACK[RAW_TAGS[k]] = k; });
  var BOOL_PROPS = {}; 'allowFullScreen async autoFocus autoPlay checked controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden itemScope loop multiple muted noModule noValidate open playsInline readOnly required reversed scoped seamless selected'.split(' ').forEach(function (k) { BOOL_PROPS[k] = 1; });
  var EVENTS = { onclick: 'onClick', onchange: 'onChange', oninput: 'onInput', onsubmit: 'onSubmit', onkeydown: 'onKeyDown', onkeyup: 'onKeyUp', onkeypress: 'onKeyPress', onmousedown: 'onMouseDown', onmouseup: 'onMouseUp', onmouseenter: 'onMouseEnter', onmouseleave: 'onMouseLeave', onfocus: 'onFocus', onblur: 'onBlur', ondoubleclick: 'onDoubleClick', oncontextmenu: 'onContextMenu', onmousemove: 'onMouseMove', onmouseover: 'onMouseOver', onmouseout: 'onMouseOut', onpointerdown: 'onPointerDown', onpointerup: 'onPointerUp', onpointermove: 'onPointerMove', onpointerenter: 'onPointerEnter', onpointerleave: 'onPointerLeave', onpointercancel: 'onPointerCancel', onscroll: 'onScroll', onwheel: 'onWheel', ontouchstart: 'onTouchStart', ontouchmove: 'onTouchMove', ontouchend: 'onTouchEnd', ondrag: 'onDrag', ondrop: 'onDrop', ondragstart: 'onDragStart', ondragend: 'onDragEnd', ondragenter: 'onDragEnter', ondragleave: 'onDragLeave', ondragover: 'onDragOver', onanimationstart: 'onAnimationStart', onanimationend: 'onAnimationEnd', onanimationiteration: 'onAnimationIteration', ontransitionend: 'onTransitionEnd' };
  var HOIST = { LINK: 1, STYLE: 1, META: 1, SCRIPT: 1, TITLE: 1, BASE: 1 };

  function camel(s) { return s.replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); }); }

  /* Raw-source preprocessing: helmet → sc-helmet, camelCase attribute names encoded, table/select tags renamed. */
  var ATTR_VAL = '(?:=\\s*"[^"]*"|=\\s*\'[^\']*\'|=(?!\\s*["\'])|[^>=])*';
  var TAG_RE = new RegExp('(<!---?>|<!--[\\s\\S]*?--!?>)|(<(script|style|textarea|title)(?=[\\s/>])' + ATTR_VAL + '>)([\\s\\S]*?<\\/\\3(?=[\\s/>])[^>]*>)|<[a-zA-Z][^\\s/>]*(?=[\\s/>])' + ATTR_VAL + '>', 'gi');
  var CAMEL_ATTR = /=\s*"[^"]*"|=\s*'[^']*'|(\s)([a-z]+[A-Z][A-Za-z0-9]*)(?=\s*=)/g;
  function encodeCamel(src) {
    var enc = function (tag) { return tag.replace(CAMEL_ATTR, function (m, sp, name) { return name === undefined ? m : sp + CAMEL + name.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }); }); };
    return src.replace(TAG_RE, function (m, comment, open, tagName, rest) { return comment !== undefined ? m : open ? enc(open) + rest : enc(m); });
  }
  function preprocess(src) {
    src = src.replace(/<(x-import|dc-import)((?:[^>"']|"[^"]*"|'[^']*')*)\/>/gi, function (m, t, a) { return '<' + t + a + '></' + t + '>'; });
    src = src.replace(/<helmet(\s|>)/gi, '<sc-helmet$1').replace(/<\/helmet\s*>/gi, '</sc-helmet>');
    src = encodeCamel(src);
    Object.keys(RAW_TAGS).forEach(function (t) { src = src.replace(new RegExp('(</?)' + t + '(?=[\\s>])', 'gi'), '$1' + RAW_TAGS[t]); });
    return src;
  }

  /* {{ hole }} evaluation: dotted paths, literals, !, ==/!=/===/!== (same grammar as the canvas). */
  var IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*/;
  var NUM = /^-?\d+(\.\d+)?$/;
  function balanced(e) { var d = 0; for (var i = 0; i < e.length - 1; i++) { if (e[i] === '(') d++; else if (e[i] === ')' && --d === 0) return false; } return true; }
  function findOp(e) {
    var d = 0;
    for (var i = 0; i < e.length; i++) {
      var c = e[i];
      if (c === '[' || c === '(') d++; else if (c === ']' || c === ')') d--;
      else if (d === 0 && (c === '=' || c === '!') && e[i + 1] === '=') {
        if ((i > 0 && (e[i - 1] === '=' || e[i - 1] === '!')) || !e.slice(0, i).trim()) continue;
        return { index: i, op: e[i + 2] === '=' ? c + '==' : c + '=' };
      }
    }
    return null;
  }
  function path(scope, e) {
    var m = e.match(IDENT); if (!m) return undefined;
    var v = scope == null ? undefined : scope[m[0]]; var i = m[0].length;
    while (i < e.length) {
      if (e[i] === '.') { var s = e.slice(i + 1).match(IDENT) || e.slice(i + 1).match(/^\d+/); if (!s) return undefined; v = v == null ? undefined : v[s[0]]; i += 1 + s[0].length; }
      else if (e[i] === '[') { var j = e.indexOf(']', i); if (j < 0) return undefined; var k = lookup(scope, e.slice(i + 1, j)); v = v == null ? undefined : v[k]; i = j + 1; }
      else return undefined;
    }
    return v;
  }
  function lookup(scope, expr) {
    var e = String(expr).trim(); if (!e) return undefined;
    if (e[0] === '(' && e[e.length - 1] === ')' && balanced(e)) return lookup(scope, e.slice(1, -1));
    var op = findOp(e);
    if (op) {
      var a = lookup(scope, e.slice(0, op.index)), b = lookup(scope, e.slice(op.index + op.op.length));
      switch (op.op) { case '===': return a === b; case '!==': return a !== b; case '==': return a == b; default: return a != b; }
    }
    if (e[0] === '!') return !lookup(scope, e.slice(1));
    if (e === 'true') return true; if (e === 'false') return false; if (e === 'null') return null; if (e === 'undefined') return undefined;
    if (NUM.test(e)) return Number(e);
    if (e.length >= 2 && (e[0] === '"' || e[0] === "'") && e[e.length - 1] === e[0]) return e.slice(1, -1);
    return path(scope, e);
  }
  function getter(text) {
    var whole = text.match(/^\s*\{\{([\s\S]+?)\}\}\s*$/);
    if (whole) { var ex = whole[1]; return function (s) { return lookup(s, ex); }; }
    if (text.indexOf('{{') >= 0) {
      var parts = text.split(/\{\{([\s\S]+?)\}\}/g);
      return function (s) { return parts.map(function (p, i) { if (!(i & 1)) return p; var v = lookup(s, p); return v == null ? '' : v; }).join(''); };
    }
    return function () { return text; };
  }
  function styleObject(str) {
    var o = {};
    str.split(';').forEach(function (decl) { var i = decl.indexOf(':'); if (i < 0) return; var k = decl.slice(0, i).trim(); o[k.indexOf('--') === 0 ? k : camel(k)] = decl.slice(i + 1).trim(); });
    return o;
  }

  var warned = {};
  function warnOnce(name, msg) { var k = name + '\u0000' + msg; if (warned[k]) return; warned[k] = 1; console.warn('[standalone-support] ' + name + ': ' + msg); }

  function compile(templateSrc, ctx) {
    var R = window.React, h = R.createElement;
    var tplEl = document.createElement('template');
    tplEl.innerHTML = preprocess(templateSrc);

    function children(node) { return Array.prototype.map.call(node.childNodes, compileNode).filter(function (f) { return f != null; }); }
    function compileNode(node) {
      if (node.nodeType === 3) return compileText(node);
      if (node.nodeType !== 1) return null;
      var tag = node.tagName.toLowerCase();
      if (tag === 'sc-for') return compileFor(node);
      if (tag === 'sc-if') return compileIf(node);
      if (tag === 'sc-helmet') return compileHelmet(node);
      return compileElement(node);
    }
    function compileText(node) {
      var t = node.nodeValue || '';
      if (t.indexOf('{{') < 0) return (!t.trim() && t.indexOf(' ') < 0) ? null : function () { return t; };
      var parts = t.split(/\{\{([\s\S]+?)\}\}/g);
      return function (scope, host, key) {
        return h.apply(null, [R.Fragment, { key: key }].concat(parts.map(function (p, i) {
          if (!(i & 1)) return p;
          var v = lookup(scope, p);
          if (v === undefined) { warnOnce(ctx.name, '{{ ' + p.trim() + ' }} never resolved — rendered as empty'); return null; }
          if (R.isValidElement(v) || Array.isArray(v)) return h(R.Fragment, { key: i }, v);
          if (v === null || typeof v === 'boolean') return null;
          return h('span', { key: i, className: 'sc-interp' }, String(v));   // CANVAS: text holes render inside span.sc-interp
        })));
      };
    }
    function compileFor(node) {
      var listG = getter(node.getAttribute('list') || ''), as = node.getAttribute('as') || 'item', kids = children(node), listSrc = node.getAttribute('list') || '';
      return function (scope, host, key) {
        var list = listG(scope);
        if (!Array.isArray(list)) { if (list != null) warnOnce(ctx.name, 'sc-for list="' + listSrc + '" is not an array'); list = []; }
        return h(R.Fragment, { key: key }, list.map(function (item, i) {
          var s = Object.assign({}, scope); s[as] = item; s.$index = i;
          return h(R.Fragment, { key: i }, kids.map(function (k, j) { return k(s, host, j); }));
        }));
      };
    }
    function compileIf(node) {
      var cond = getter(node.getAttribute('value') || ''), kids = children(node);
      return function (scope, host, key) {
        return cond(scope) ? h(R.Fragment, { key: key }, kids.map(function (k, j) { return k(scope, host, j); })) : null;
      };
    }
    function compileHelmet(node) {
      // CANVAS: helmet children are hoisted into <head> once (deduplicated); nothing renders in place.
      Array.prototype.forEach.call(node.children, function (el) {
        var tag = el.tagName.toUpperCase();
        if (!HOIST[tag]) return;
        var clone = document.createElement(tag.toLowerCase());
        Array.prototype.forEach.call(el.attributes, function (a) {
          var n = a.name.indexOf(CAMEL) === 0 ? a.name.slice(CAMEL.length).replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); }) : a.name;
          clone.setAttribute(n, a.value);
        });
        if (el.textContent) clone.textContent = el.textContent;
        var sig = tag + '|' + (clone.getAttribute('href') || clone.getAttribute('src') || clone.textContent.slice(0, 200));
        if (ctx.hoisted[sig]) return;
        ctx.hoisted[sig] = 1;
        document.head.appendChild(clone);
      });
      return null;
    }
    function compileElement(node) {
      var tag = RAW_BACK[node.localName] || node.localName;
      var getters = [];
      Array.prototype.forEach.call(node.attributes, function (a) {
        var name = a.name, val = a.value;
        if (name === 'sc-name' || name === 'data-dc-tpl') return;
        if (name.indexOf(CAMEL) === 0) name = camel(name.slice(CAMEL.length));
        if (name === 'hint-size' || name.indexOf('style-') === 0) return;
        if (name === 'class') name = 'className';
        else if (name === 'for') name = 'htmlFor';
        else if (name.indexOf('on') === 0) name = EVENTS[name] || ('on' + name[2].toUpperCase() + name.slice(3));
        else if (name === 'checked' && tag === 'input' && val.indexOf('{{') < 0) { getters.push(['defaultChecked', function () { return true; }]); return; }
        else if (val === '' && BOOL_PROPS[name]) { getters.push([name, function () { return true; }]); return; }
        getters.push([name, getter(val)]);
      });
      var kids = children(node);
      return function (scope, host, key) {
        var props = { key: key };
        for (var i = 0; i < getters.length; i++) {
          var n = getters[i][0], v = getters[i][1](scope);
          if (n === 'style' && typeof v === 'string') v = styleObject(v);
          if ((n === 'value' || n === 'checked') && v === undefined) v = n === 'checked' ? false : '';
          props[n] = v;
        }
        return h.apply(null, [tag, props].concat(kids.map(function (k, j) { return k(scope, host, j); })));
      };
    }

    var roots = children(tplEl.content);
    return function (scope, host) { return roots.map(function (r, i) { return r(scope || {}, host, i); }); };
  }

  /* ---- 4. DCLogic base class and host component (same contract as the canvas) ---- */
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (patch, cb) { if (this.__host) this.__host.__setLogicState(patch, cb); };
  DCLogic.prototype.forceUpdate = function () { if (this.__host) this.__host.forceUpdate(); };
  DCLogic.prototype.componentDidMount = function () {};
  DCLogic.prototype.componentDidUpdate = function () {};
  DCLogic.prototype.componentWillUnmount = function () {};
  DCLogic.prototype.renderVals = function () { return {}; };
  window.DCLogic = DCLogic;
  window.StreamableLogic = DCLogic;

  function makeHost(R, name, Logic, tpl) {
    function userProps(p) { var o = {}; Object.keys(p).forEach(function (k) { if (k.indexOf('__') !== 0) o[k] = p[k]; }); return o; }
    function Host(props) {
      R.Component.call(this, props);
      this.state = { __v: 0 };
      try { this.logic = new Logic(userProps(props)); }
      catch (e) { console.error(e); this.logic = new DCLogic(userProps(props)); }
      this.logic.__host = this;
    }
    Host.prototype = Object.create(R.Component.prototype);
    Host.prototype.constructor = Host;
    Host.prototype.__setLogicState = function (patch, cb) {
      // CANVAS: logic.state is replaced immediately (so code can read it straight after setState),
      // then React re-renders; the callback runs after the DOM commit.
      var prev = this.logic.state, upd = typeof patch === 'function' ? patch(prev) : patch;
      this.logic.state = Object.assign({}, prev, upd);
      this.setState(function (d) { return { __v: d.__v + 1 }; }, cb);
    };
    Host.prototype.componentDidMount = function () { try { this.logic.componentDidMount(); } catch (e) { console.error(e); } };
    Host.prototype.componentDidUpdate = function (prevProps) {
      this.logic.props = userProps(this.props);
      // CANVAS: only prevProps is passed on; prevState is NOT. Reproduced deliberately.
      try { this.logic.componentDidUpdate(prevProps); } catch (e) { console.error(e); }
    };
    Host.prototype.componentWillUnmount = function () { try { this.logic.componentWillUnmount(); } catch (e) { console.error(e); } };
    Host.prototype.render = function () {
      var p = userProps(this.props);
      this.logic.props = p;
      var vals = p;
      try { vals = Object.assign({}, p, this.logic.renderVals() || {}); } catch (e) { console.error(name + '.renderVals():', e); }
      return R.createElement('div', { className: 'sc-host', 'data-sc-name': name }, tpl(vals, this));
    };
    return Host;
  }

  /* ---- 5. Boot ---- */
  function parseSource(raw) {
    var open = /<x-dc(?:\s[^>]*)?>/.exec(raw);
    var close = raw.lastIndexOf('</x-dc>');
    if (!open || close < open.index) return null;
    var template = raw.slice(open.index + open[0].length, close);
    var doc = new DOMParser().parseFromString(raw, 'text/html');
    var script = doc.querySelector('script[data-dc-script]');
    var meta = null;
    try { meta = JSON.parse(script && script.getAttribute('data-props') || 'null'); } catch (e) { meta = null; }
    if (!meta && window.DCMeta) meta = window.DCMeta;
    var props = {}, preview = null;
    if (meta && typeof meta === 'object') Object.keys(meta).forEach(function (k) {
      if (k === '$preview') preview = meta[k];
      else if (k[0] !== '$' && meta[k] && meta[k].default !== undefined) props[k] = meta[k].default;
    });
    return { template: template, js: script ? script.textContent : '', props: props, preview: preview };
  }

  function boot() {
    var R = window.React, RD = window.ReactDOM;
    if (!R || !RD) { console.error('[standalone-support] React failed to load from ' + BASE + 'vendor/'); return; }
    var holder = document.getElementById(RAW_ID);
    if (!holder) { console.error('[standalone-support] raw source not captured'); return; }
    var raw = holder.textContent;
    holder.parentNode.removeChild(holder);
    var src = parseSource(raw);
    if (!src) { console.error('[standalone-support] no <x-dc> block found'); return; }

    var name = (decodeURIComponent(location.pathname).split('/').pop() || 'Root').replace(/\.dc\.html$|\.html?$/, '') || 'Root';
    var ctx = { name: name, hoisted: {} };
    var Logic;
    try {
      // Pages that keep their logic in external files register a factory (window.DCComponentFactory) instead of an inline <script data-dc-script>.
      if (typeof window.DCComponentFactory === 'function') Logic = window.DCComponentFactory(DCLogic, DCLogic, R) || DCLogic;
      else Logic = new Function('DCLogic', 'StreamableLogic', 'React', src.js + '\n;return (typeof Component!=="undefined"&&Component)||undefined;')(DCLogic, DCLogic, R) || DCLogic;
    } catch (e) { console.error('[standalone-support] script error in ' + name + ':', e); Logic = DCLogic; }

    var tpl = compile(src.template, ctx);
    var root = document.createElement('div');
    root.id = 'dc-root';
    document.body.appendChild(root);
    if (!src.preview) {
      var st = document.createElement('style');
      st.textContent = 'html,body{height:100%;margin:0}#dc-root,#dc-root>.sc-host{height:100%}';
      document.head.appendChild(st);
    }
    var Host = makeHost(R, name, Logic, tpl);
    RD.createRoot(root).render(R.createElement(Host, src.props));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
