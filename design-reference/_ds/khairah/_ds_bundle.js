/* @ds-bundle: {"format":3,"namespace":"KhairahHoldingDesignSystem_52a247","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"SplitSection","sourcePath":"components/layout/SplitSection.jsx"},{"name":"Logo","sourcePath":"components/navigation/Logo.jsx"},{"name":"PillNav","sourcePath":"components/navigation/PillNav.jsx"},{"name":"LOGO","sourcePath":"components/navigation/logoData.js"}],"sourceHashes":{"components/core/Badge.jsx":"6d7a8de63f46","components/core/Button.jsx":"c63a1c205129","components/core/Card.jsx":"6db33566930a","components/core/IconButton.jsx":"1c0b2d9eb7f5","components/core/Tag.jsx":"de6bc42efe07","components/forms/Input.jsx":"feead1ffe3a9","components/forms/Select.jsx":"7f6c19ad6c2d","components/layout/SplitSection.jsx":"5d984468f6b7","components/navigation/Logo.jsx":"786a4e0afe14","components/navigation/PillNav.jsx":"84d38d3509a1","components/navigation/logoData.js":"c28a15287a5b","ui_kits/website/AboutPage.jsx":"c3696544f1bd","ui_kits/website/ContactPage.jsx":"8187bbfeb163","ui_kits/website/Footer.jsx":"1c8ebeddb311","ui_kits/website/Header.jsx":"65966394e7af","ui_kits/website/HomePage.jsx":"81894fa7d464","ui_kits/website/PortfolioPage.jsx":"73166fb4a2ca","ui_kits/website/data.js":"429d1fa7bc6c"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.KhairahHoldingDesignSystem_52a247 = window.KhairahHoldingDesignSystem_52a247 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Small status / category label. */
function Badge({
  children,
  variant = 'accent',
  dot = false,
  className = '',
  ...rest
}) {
  const classes = ['kh-badge', variant !== 'accent' ? `kh-badge--${variant}` : '', dot ? 'kh-badge--dot' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: classes
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Khairah Holding primary button. Pill-rounded, calm corporate styling.
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  as = 'button',
  className = '',
  ...rest
}) {
  const Tag = as;
  const classes = ['kh-btn', `kh-btn--${variant}`, size !== 'md' ? `kh-btn--${size}` : '', block ? 'kh-btn--block' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: classes,
    disabled: Tag === 'button' ? disabled : undefined,
    "aria-disabled": disabled || undefined
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Surface container. */
function Card({
  children,
  variant = 'default',
  interactive = false,
  flush = false,
  as = 'div',
  className = '',
  ...rest
}) {
  const Tag = as;
  const classes = ['kh-card', variant === 'raised' ? 'kh-card--raised' : '', interactive ? 'kh-card--interactive' : '', flush ? 'kh-card--flush' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: classes
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Circular icon button (pill). Use for compact toolbar / nav actions. */
function IconButton({
  children,
  variant = 'plain',
  size = 'md',
  disabled = false,
  label,
  className = '',
  ...rest
}) {
  const classes = ['kh-iconbtn', variant === 'solid' ? 'kh-iconbtn--solid' : '', size === 'sm' ? 'kh-iconbtn--sm' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: classes,
    disabled: disabled,
    "aria-label": label
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Removable filter / selection tag. */
function Tag({
  children,
  outline = false,
  onRemove,
  className = '',
  ...rest
}) {
  const classes = ['kh-tag', outline ? 'kh-tag--outline' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: classes
  }, rest), children, onRemove && /*#__PURE__*/React.createElement("span", {
    className: "kh-tag__x",
    role: "button",
    "aria-label": "Remove",
    onClick: onRemove
  }, "\xD7"));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let _id = 0;

/** Labelled text input with hint / error states. */
function Input({
  label,
  hint,
  error,
  id,
  className = '',
  ...rest
}) {
  const fieldId = id || `kh-input-${++_id}`;
  return /*#__PURE__*/React.createElement("div", {
    className: "kh-field"
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "kh-field__label",
    htmlFor: fieldId
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    className: ['kh-input', error ? 'kh-input--error' : '', className].filter(Boolean).join(' '),
    "aria-invalid": error ? 'true' : undefined
  }, rest)), (error || hint) && /*#__PURE__*/React.createElement("span", {
    className: ['kh-field__hint', error ? 'kh-field__hint--error' : ''].filter(Boolean).join(' ')
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let _sid = 0;

/** Labelled native select styled to match inputs. */
function Select({
  label,
  hint,
  error,
  id,
  options = [],
  children,
  className = '',
  ...rest
}) {
  const fieldId = id || `kh-select-${++_sid}`;
  return /*#__PURE__*/React.createElement("div", {
    className: "kh-field"
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "kh-field__label",
    htmlFor: fieldId
  }, label), /*#__PURE__*/React.createElement("select", _extends({
    id: fieldId,
    className: ['kh-input', error ? 'kh-input--error' : '', className].filter(Boolean).join(' ')
  }, rest), options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label)), children), (error || hint) && /*#__PURE__*/React.createElement("span", {
    className: ['kh-field__hint', error ? 'kh-field__hint--error' : ''].filter(Boolean).join(' ')
  }, error || hint));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/layout/SplitSection.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Signature 2-column content section: media on one side,
 * text + action on the other. Pass `reverse` to flip sides.
 */
function SplitSection({
  eyebrow,
  title,
  children,
  action,
  image,
  imageAlt = '',
  mediaLabel = 'Image',
  reverse = false,
  className = '',
  ...rest
}) {
  const media = image ? /*#__PURE__*/React.createElement("img", {
    className: "kh-media",
    src: image,
    alt: imageAlt,
    style: {
      display: 'block'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    className: "kh-media"
  }, mediaLabel);
  return /*#__PURE__*/React.createElement("section", _extends({
    className: ['kh-split-section', reverse ? 'kh-split-section--reverse' : '', className].filter(Boolean).join(' ')
  }, rest), media, /*#__PURE__*/React.createElement("div", null, eyebrow && /*#__PURE__*/React.createElement("div", {
    className: "kh-eyebrow",
    style: {
      marginBottom: 'var(--space-3)'
    }
  }, eyebrow), title && /*#__PURE__*/React.createElement("h2", {
    style: {
      marginBottom: 'var(--space-4)'
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-body)',
      marginBottom: action ? 'var(--space-5)' : 0
    }
  }, children), action));
}
Object.assign(__ds_scope, { SplitSection });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/SplitSection.jsx", error: String((e && e.message) || e) }); }

// components/navigation/PillNav.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Pill-shaped navigation bar — the brand's signature consolidated menu.
 * Pass an array of items; the active item gets a raised white pill.
 */
function PillNav({
  items = [],
  activeId,
  onSelect,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    className: ['kh-pillnav', className].filter(Boolean).join(' ')
  }, rest), items.map(item => {
    const isActive = item.id === activeId;
    const Tag = item.href ? 'a' : 'button';
    return /*#__PURE__*/React.createElement(Tag, {
      key: item.id,
      href: item.href,
      className: "kh-pillnav__item",
      "aria-current": isActive ? 'true' : undefined,
      onClick: e => {
        if (onSelect) {
          onSelect(item.id, e);
        }
      }
    }, item.label);
  }));
}
Object.assign(__ds_scope, { PillNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/PillNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/logoData.js
try { (() => {
const LOGO = {
  logo: "data:image/png;base64,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",
  logoWhite: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAyAAAADuCAYAAADBemMxAAAQAElEQVR4Aeydj73kNJa2b20CCxEsE8FCBAMRDEQwEAEQAT0RNETAEAFsBMNEMLMRMBsB80Vwv/epLlW7XJIt27It2W//rHZZlqWjR//OkWTf/3jxPxMwARMwARMwARMwARM4KYHX19cPTpr13bJtA2Q39E7YBEzABEzABEzABExgTwIyPj5V+m/lfGxIwAbIhrCdlAmYgAmYQCUELIYJmMDpCcj4+EgQfpbjrJOPrQjYANmKtNMxARMwARMwARMwARN4qQGBjA+2XWF8cP64BpnOJIMNkDOVtvNqAiZgAiZgAiZgAiYAgR/1XzA8PpBB4lUQAdnqsAGyFemndOxhAiZgAiZgAiZgAiawNQEZG2+U5udy3SMYI10//16JgA2QlcA6WhMwgYoJWDQTMAETMIFTEpDxgeHxXSTzf4z42WslAjZAVgLraE3ABEzABEzABJ4J2McE9iIg44NVDrZexUTAMIn5228FAjZAVoDqKE3ABEzABEzABEzABOohIOODl80xPjjHBPtIYY7+Hkgs37v42QDZBbsTNQETMAETMAETMAET2JAAxgcrIENJehVkiE7BezZACsJ0VI0QsJgmYAImYAImYAKnIaCVjdhL57H8fx3ztF95AjZAyjN1jCZgAiZgAgkC9jYBEzCBLQnI+GBVI/bSeUwMtmF9Grthv7IEbICU5enYTMAETMAETMAETKBGAqeTScYHW67YejUl77nGypQ4HbZHwAZID4gvTcAETMAETMAETMAE2iYg44OXzTE+OE/JzKd61qsgU4jNCHs+A2QGJD9iAiZgAiZgAiZgAibQFIGfJS0rIDpNPt5OfsIPTCJgA2QSLgc2ARNYQsDPmoAJmIAJmMDaBLSCgQGxZBXjY8Xxzdpynjl+GyBnLn3n3QRMwARM4CwEnE8TOAUBGQ5fKqMljIfvFNfcFRSJ4GOIgA2QITq+ZwImYAImYAImYAIm0ASBm8HA6kcJeXl35EfFyXlhfH68T8AGSJ+Ir03ABEzABEzABEzABJoicDMU/iahSxoMrIDwIrui9VGSgA2QkjQd1yAB3zQBEzABEzABEzCBlQjw0nlJ4yOI+bmMmxJbukJ8PouADRBB8GECJmACByfg7JmACZjAYQncDIQlL52PsXmrNFgNGQvn+5kEbIBkgnIwEzABEzABEzABE5hOwE+sSUCGAaseW/zxQG/FKliQNkAKwnRUJmACJmACJmACJmACmxJgexRGyNqJ8mlevrC1djqniH8zA+QUNJ1JEzABEzABEzABEzCBLQn8acPEtlhp2TA7+yVlA2Q/9k7ZBLYi4HRMwARMwARM4KgEtnw346PX11evghSoSTZACkB0FCZgAiZgAiYQJ2BfEzCBtQjIGFjzxfOU2FuuuKRkaN7fBkjzRegMmIAJmIAJmIAJmMApCfx7MNfr3Px8nWjPFasNkHOVt3NrAiZgAiZgAiZgAocgcLlc/rlHRnZaedkjq6ulaQNkNbTVRGxBTMAETMAETMAETOCoBH45asaOnC8bIEcuXefNBExgZwJO3gRMwARMYGUCP6wcv6NfgYANkBWgOkoTMAETMAETMIGdCTj5UxC4XC6/KqNeBRGElg4bIC2VlmU1ARMwARMwARMwARPoE/hKHlu+D7JlWspae8eYxDZAxgj5vgmYgAmYgAmYgAmYQLUEtArC17C+kICcdVr1+OctvVUTOXrkNkCOXsLO344EnLQJmIAJmIAJmMAWBGQU/EvpfCa3thHyk9LwsZCADZCFAP24CZiACZhAhQQskgmYwOkIyAhha9S3K2f8ryvHf4robYCcopidSRMwARMwARMwARPYhsCeqcgIwUDArSHG94p/7RWWNeSuLk4bINUViQUyARMwARMwARMwARNYQIBVELZkLYji6VEMj788+dpjFgEbILOw5TzkMCZgAiZgAiZgAiZgAlsTuK1S8GWskkl/dYu3ZJynjcsGyGmL3hk3gQMTcNZMwARMwAROTUDGQsm/D/KL4vPfGilYo2yAFITpqEzABEzABEzg7AScfxOoiABbsZaKw1au0qspS2Vq/nkbIM0XoTNgAiZgAiZgAiZgAibQJ6BVC4yHJS+k897HF4qHcz/6Gq+bkckGSDNFZUFNwARMwARMwARMwAQmEvhhYvhucN774NO+XT//LkDABkgBiI6iMgIWxwRMwARMwARMwAREQKsXGBCshOhq0oHx4fc+JiHLD2wDJJ+VQ5qACZiACYwQ8G0TMAETqJDATxNlwvhYsnVrYnLnC24D5Hxl7hybgAmYgAmYgAkcj4BzlCYwZSXDxkeaY7E7NkCKoXREJmACJmACJmACJmACtRG4bcPKEcvGRw6lAmGOZ4AUgOIoTMAETMAETMAETMAEDkWAvwuSyhBfueJrV952lSJU2N8GSGGgjs4EzkzAeTcBEzABEzCBSgnwMnpMNF5Q/0yrJFO2acXisd8EAjZAJsByUBMwARMwAROolIDFMgETGCbw/yK3MTo+kfGRMk4ij9irBAEbICUoOg4TMAETMAETMAETMIGWCHwrw4NtV2y/Wii3H59KwAbIVGIObwImYAImYAImYAIm0BqB8A4IW65Y9fi+tQwcSV4bIEcqzZ3z4uRNwARMwARMwARMoGICGB0YH95ytXMh2QDZuQCcvAmYgAkUIOAoTMAETMAEBghcLpdf5dh25S1XA5y2umUDZCvSTscETMAETMAETOCABJwlEzCBqQRsgEwl5vAmYAImYAImYAImYAImYAKzCRQzQGZL4AdNwARMwARMwARMwARMwAROQ8AGyGmK2hk9MAFnzQRMwARMwARMwASaIWADpJmisqAmYAImYAL1EbBEJmACJmACUwnYAJlKzOFNwARMwARMwARMwAT2J2AJmiVgA6TZorPgJmACJmACJmACJmACJtAeARsg7ZVZX2Jfm4AJmIAJmIAJmIAJmEAzBGyANFNUFtQETKA+ApbIBEzABEwAAq+vrx/JfSr35uZ+1vlvHRf8v5Tfxzxjd14CNkDOW/bOuQmYgAmYgAm0S8CS70pARgQGxzc6Y2j8LmF+k/ub3Hc397nOn3Zc8P9Rfv/QcxwYKBgmNkgE5UyHDZAzlbbzagImYAImYAImYAIzCchiwOh4qzPGBu6tosLQ+EDnOQcGCoYJBslviheD5qM5EfmZbQksTc0GyFKCft4ETMAETMAETMAEDkxAhgHbpljdwOj4Rlldw0ggTgwaDJEflaZXRQT6qIcNkKOWrPO1AQEnYQImYAImYALHJSAjAMMDo4NtU6xWbJXZL5UQqyJs0bIhIhhHO2yAHK1EnR8TMAETOAMB59EETGA1AjI8PpcLhgcrE6ulNRIxRg+GCCsie8oxIqZvTyVgA2QqMYc3ARMwARMwARMwgQMSkNHBOx5stfpZ2Usq/Lq39RFWRN5snbDTW4eADZB1uDpWEzABEzABEzABE2iGgIwPlHtWPVh1qFFuXnT/TnKyIuJtWTWW0ASZbIBMgPUY1FcmYAImYAImYAIm0DYBKfQfyLHqwdeoWsgMxgdGCAZTC/JaxggBGyARKPYyAROonIDFMwETMAETWExAhgerHTWvegzl0ashQ3Qqv2cDpPICsngmYAImYAImUBMBy3IMAjI+eK+ClQ+2NrWaKVZD+FIWnwZuNQ+nlNsGyCmL3Zk2ARMwARMwARM4KwEZH/y9DT6tewQEGFD8cUT+Iju/j5CnVB4O428D5DBFefyMqMP8WI6Zjq6jw2EG5PgANsqhGMMZrl3O/M7mXCKOjbLrZEzABEzgVATUP2N4HHHF4HMVJO+GsK1MP33UTMAGSM2lY9n6BJjZ+PTl5YXOJTg6HD4X+OJ/xQgwMwbXwDic4Z+bCGWyNI7ctBzOBEzABEwgg8DN+GDrVUboJoN8JKmZMPML6gJR85FtgKjS8m3oNzpfC1ZnCvkpb/L/VI5wzKByjoZ7etAeJjCfQNN1TO0ltBnaS3JgUDj+MBRhcCj384kNP4nBMRxi/G7TZTKevfOGcM5NwATaJKAxhJWP5BjTZq6SUvOCOvrqlImzZGS+UZ5AlgGiSkuF5SsJfKIN5YTzbzf/u1S6xuLkhSbuoyBxZjkse+vGPTL/MIETEFCbYUAIbYb2wl97pc3cO02FCZ9IZFWBMDgMfHeuheqIGH8ph2GHo++Kxqww3XD0hdFw9jSBpQRU19gKSRvXz+tBv+A6txRs28/Pll41iJVtdLnZcTT4IO0FXTXZpzeYp8OIPGqAqNIyk4mSFMs0yhL3XxSOgkYx6odDkULB6vv72gROTUBthsEA1+eAwY6xEfzZq0v7CtfhjB/3wrXPEwmoDIJxRx9H/4W7GnfdqG7h/iG/bjiUQ67l7cMEyhFQfaMPYNykjYeIr3661/UL93w2gSQB1RnGmbOOFeig9OkYYElGvrE9gVEDRCKNWY7h/lCnyCA/dF/JZB47B6Mhy6F4BEfD3lkqJ98ogT8PyN1tL0Phvh6Iw7fGCWBwdFmHJ67b4sKFzhiEKID6+XCwIuI+4AGJLwoQoF6iOMWisiIVo2K/KAHpK/Rvnih5eflGLFhFvE6aR2HZc1MCOQZIqhMMgo7dD+GaP6vy0ohxNOjgWAXygNB86daXAdW30LaGOswQZpMMHDCRIePhavjdyoH2nsr+NVzqpv1NYAaBofoWM4RnJOFHjk5AfRdjB5MnR89qbv5oOxghQ/1+blwOt5BAjgHyr5E0/nm7/+/bOXUau596rgp/NWQqbqrSYlnT0KuQ1UI0Q2CwTVwul3B/qA0O3WsGxI6CDhlwoU3T9ncU0UmfkEBo+92s+7cJZBOQzkLfhvHBOfu5EwSEBxPHOH6fIMt1ZnHUAJES9FeJnlJy/qX7v+g+B+dUp/mrwgVDhbAturDVLCX72P3Uc/Y/L4GfBrL+fefeULihe50o/DNBINW3EfzaZ6nv+pWLAZfq9wYe8S0TGCQwVOeG7g1G6punIsDODE+epIucCWVWQzIZpSPynXkERg2QW7Rf6HwdjHUOB9f4X681SDOQf6YLzjrdDzrLe7i77/F+2JI+XpmumiO1GYz2ryKJ4P+X4K9wfF2ua5CEW9/f7oVrn6cTGDLguveYiEnF/kPqhv1NYCYB2n/MsMXv25lx+rGDEbitcjzlSv5MiKJgP92b6EF9Q4cLrq/fTYyuuuCscmOEMMZWJ9zRBcoyQKTk/FPuE8HAYWR8wrUcRoi83x1cy/1BV4TBEe4z+VGJ5d308ZDXSE5QGiPex/FyTsoTUNtAsaXNYKRjjNBmvpD/Q5vRNUoH4QiD+8PNr7xQJ4pRDBl4UsZd1x/+DMJ9Ol8pjph/P5yvTSCbgOoUih7jLf0DfQGOMYbxdGwsyk7HAdslICMDA4MvpT1kQv4o1byr+uA/cBHqFkZv0NtUBa/Hh/qfOhcc4468LhfFR/0kPM9RT6mz8m7yCH8zBHZNZqBFobMMkJCxy+WCITK6nUrhBci6cAAAEABJREFUCIM7TEepPNH5p/Lzi+6n7gV8PptAlIDqznUro85/lUvWI90jHGFwLXf2UQ57eYorxsWgcacw/5ZjsGXQxQDEYGQwZuDdQnSncTICqm+0dwxclEAcExPJ/uFkeJzdlxfqAn3XS+8fxsfYjgzGDyZYmPAKdeuN6ly23qawQR/kOeopfSiO/hF9CcOmJ1rVl3z4gdUQVo+qFvQowk0yQI6S6QX5QAHpKxw0Yhrcgmj9qAmYwJ4ENJii7GHY4Rico+IoHIMuYZh0SIaLPmxPEzCBRgnUJ/atL3pYfdXqB3/rA0U6JTDhMWSZPPmWOFIB5/grvtCPksaHioOJGowR/WziwHDjb4bg+N2E0K0KaQNkQsmpcTELiqWvn/eDRtyapT8h1w5qAiZgAiZgAiZQMwEZHyjM3yVkZLUkbKPazCCQlsREDUYIKyNs1WpFV2IVhL+gPmTMJVDbO5dAtgGSG6HDmYAJmIAJmIAJmIAJbEogtvUKhZ9JUrZasfqxqUAhMRkirIzwvh2GCDtGWlg9xqDjD06/vRl3ITs+FyJgA6QQSEdjAisScNQmYAImYAImECUgBZmZembtu/dZ6cDwYJt413+33zJE2EXCFlYMEd5fwUDaTZ7MhNnWxrshMM58xMFyCGQZIKrcH8h9Kvfm5rAK+y7c+1JhCOuvCeSUgMOYgAiozXwk97kc7YgZl1T7om0xM6OnfJQiIO5whT1/nKrPnmv8uR/6N5dBKfjVx2MBTaB6Aqx+BCFR6ln14D2MalcaZIxgGGGIcA6y13pGn2UcaOrdEI1r6BWMWYxdyI8hJe+Hg61m3EPv6Buxq5bHoAEiERmU+Uuav0sKPvfG/kIclmDf4Y+jIRCWTCmKVzLG4P3N6+srzyiq+g7JRiEh64NbS1Kl97EcfKkY8CHd3+XHQSXhmnv+IzlrFcLO8aqgMeypd/+QKL/J0dZoQ8y40Fa6Dn8cbYt6Qh3hWSvCAjfnEH/aHwPKq56HK3z5tGWXe/iNP/dD/0YZ4EI7pSwYpBSVDxOYTkD1kf6AOhkmIuj/qV8pR90lTNVj63QSfmIKAdUbtjaFvie869GCUv8iI4QVEVZC+LpgfIvYFBjrh0VBR7dlPFg/tYkpqC7Qh9B/oFOiU+AYsxi7GMti+iR1h3voHfQpjGuc6Ve4N1GK/OBRA0SZwGpiQMYBPD/G55BkjMJ6q1t0pIr+NQZBt/c5JBDyUEjI2neLhFLcDCgoJwwUFCqK46siRemELxUDPqQblEnk4Zp7hKfCLy0HJemjFgKqF5Rn6Bwo76mi8Qx1lvpBXFOfP214scf4p+3hlrCjvYZ2SlnQTonztGyd8TwCtzrIuMCsI+Mik3w46k+YiKD/p36lHHWXMN2xlbiIl7qZJ4xDNUtA9QgF8etbBvjDtGy5wgi5ebVxkiHC1wX5yijGCCs4NQtO20LBp60xDu8uq+oBbZ5+gz6EMzoldWOObOSPvoV+hTGNvM6NazD9JwNEGQEoyjGd3uDDC26SwQWPF390kTxihtWJoYHFGAYUCg5DgwEF5YSBgkKF75QMEJbCx3jBLZKVyPZ0YoXyd2Wj391jzfq2Z5af0lamqQ90EiXKMtQN4nxKyx6PBMSejpk2WWV9k3z0Hzo9Ho+58BUERKi5vkQyoyigJDDG0maZdaQulugLwEJcxEsfS13Hz+64BNAryB3brVDe+d2skyHCyg3bsnh/pfZ80NaYAKTPLtV+s/OsvoSFAtKmP6HNo19mPz8hIP0I+Zyjuw4m82CAKEMkwOC8OcxBKSu5CR85lrdYzcAqxALGyKACwA2LMQwoKIalJaeCkWbL5YPivQab0qxXiU/1h46CBl06fhQb4i4d72HiE3u4w2hC+9ku+5KP/pf+Y7tE206pxb6EPflb1D/SYIyivrddypZ+iMD/6CarHi0o7BJ1/JARwrYsPt2Lq301hAzRZ29m8GucYLIbfZMdFKRNW0eONR1pFNc97waIMkUCdOic18xIU3GLC9Cx/jA0mLWCEbMOKDNYwFvnByUFmVotpzMbH3QW1JvcOsNSOgpLbniMENLIDX+acGrHtNXalbFW2/Re9ai5vkTK1db73OkTaq/36frjO4MEVJ/4OxtTxojB+Gq6Sd4kTyurIfTdGPwYIow1Er3swRgmh+GBWyWNEYnJI7rvSLD823cDRI8Q8VCHjiXK8hj79D5U5Xg6FAeVhfssBf5V10c4KGiU/rXzAl9cTjrI40Elh1QlYdRx0LZoY0MSoZzwjXT+Si3ti5mt6289xEt6tKuxwea7W1p6xAcExIOOk4kDLocc7Y+ZRP5gFrNv9GXBcY0/jn5wrByG0vG9cxOgnW9JACPEExNbEndaRQhoEOyuhrTQ5zLOM0GMQ3dczEHjV1jx2NzwiAiP7hnxnud1NUCUQaANdVAMyihCfNrtVypFLDn588dmuM/LUChSsWD2e3lhAMJAQ6FEwcGgu7qXl5cP5VB2CKOfyYOtYEUqeDIF3yhJgBcFUYRjcaL4sof3M7UhvpH+1NHKn5f0aFcY+dQbnonFRRpjhk7suSP7sTUSLqk8wvIrMaYNUg5v9JuZRfqy4LjGHwf/n1KR2d8ERgiwstkPgh/jLAYuYyfjAv2BqmL8UARMShCWsYQ6LK/kwcTEUBtIPugbJrA3AbUA2gb1nfPe4uSkj26GEYLjd84zD2Gkl/OOG0YHblYcDxFWeHE1QCTXl3KpgwGYQXmsg0s9f2Z/jAgGBwYVBhSMOLWlCwMLCg8KJXzvbC+XCxY/yg7hcfd7EZBWNCNQynkVjSnVxihf6kN2x6o6wgz8UN3gXaGiwrcamTpxJldS7MkWih/tknbKtZ0JrE2A8SA42r6a9IXVTsZZDFwmIRgXGD+SslwuFyYlCIsRwsQE/UIqPMbH0CRj6jn7m0AVBFTf0Y2YnMUxblYh14gQGA4YITh+jwR/edGYxUeN2OHClv+sZ0YjrTRAMED+lJCPQqZzS9y2940ASgwKJIMKjYPBRO3lwuCCocGgwoDyNLN9ez56ulwuDEBDiiZLcyhY0eftWQcBdSgsW6IAxAT6i8qZ+hO7l/S7PUNdi4WhA7MR8o4MK0/vfj3/T3ukjdLPPd+1z74EDpq62i6KFGMCjj5+cU5vcbIyNzRe/3lxQo7ABHYmoLqOroXBzXlnabKTx5DACMHxO/qgdAUmCXi5fGjSLPrsRp6MmcWS+g9lGMUIBSkWKTPxRROMJdKQHyyo9H1DA4MjzF7BbLJCmWKgxkZcKUWTx6xoQqFul+pw2LI4NGs5mCvVDZQXXCxcqk3Hwh7Zb6h9fCWGNj6OXPony5vqMyt5qT6Fz3a6XzhZnZib3ZqfUz3HiEcvwrXUh6MLYITwYSP+bMO1PUoPZzKZFY+x7cJ7FwtfXSsmAysgVwCJGL3P+eWFGSVmSVXnL2zVWMXQSPC/el8u15WQlKKZWr26Puv/qiDw3wkpMGYTt7K9U230j9kxHDSgOnVWB3GxHLJ9JdWmYuHtZwKtEGCCLCUrClDqnv1NoCkC0o0YQ1kNaa0v/1igMTYwRPjCKu954Cfvag+MPngXE3DQAFHhtlaoxcC8vLyLSgzYY1sDhx/eSfT0vweUJyTVeaSU4BKzCazKVZfhSgRKcUe8lOHGPTsTaJaAxixmhFNjVmoypNn8WvBzE6C+y7FVnS2I1P1zA1kv9ykddHaKGCBswYpFYMUmRmUnPzWwpOWpmd5UGe4krZPNJMD2usygyWCpOGqfTUlm6HqjzH9DxnmKW5mUHYsJ7Evg74nkh4zyxCP2NoH6CUhHYushX8py3/7ygv7OJETfvcz8h2EH35mPxx/DAInfeZeB1D3770OAShVL2cpmjErlfuowadSLpByIw0bpAFlxo2MeCOFbJtA0gVTfktUvNJ1zC39aAurXea8SI2RoG+LR+NDWmaDmdQHeRxaGC68L8OpA312Uef7UAytGMOJZeY0eP1wul9ywo5GFAEMGSAjjcz0EUgZIPRJakmwCJVauFEdqRrN4Z5GdMQc0ARPYm0BqFtiTVXuXjNNfnYCU5TdKBEMk1Q50u9pjimDkD8ODr2nyugDXOc+jN/D+cM6EBLpE8dUPhLQBAgU7E9iHwNAWoVyJUgpFbkeUm47DmYAJmIAJ7EhAE058Yp0vJvGHiN/oGvezznxZacgRDseXl3g+NW7smLuyScsIYQxkpn8V5bmstLNjoxx/1tPXl9lVDzhTD97qN+XddT/Kjy9t/a7w/J0RntXP0QPjBiNkNODUAEMGSI5lNDU9hzeBcQLpEK2uANERxnLFDETMf4pf6u9ctMpqSt4d1gRMwAQOS0AKI8YCSiRGBn8fAuWRLyahdH6njOP41DiTWUOOcDi+vMTzKKqK/pUzcZMGaR1K75MRwpebeDkdQ2QVJVplUNOBUUE9+EZCUd5dx98W4b5uZR/8/brVDLghA2SqoNk5csDZBFg2iz18CmVTnUmr+Uy9EPrl6+trqkxj5fzgp2fpaHAP/reLVJq32+c+id2hBtqSpem4TMAE9iGgfom/1cIqBUbBq6TAWECJxMiYPVYontSBnkfcpEFav0sGjBJm0FllOUQ/Kd2Bd/74XC/vSqRY2P+RAAYb27sefQteYYCkZmdfVBHXqPAFxT9PVLeyiJaHGlerinmxAhSflCJeLI25Eal86PRSZcRS6OSolV8GhtSzdBykOTnekQdSeRh5bLfbcEglzsCbumd/EzABE9iEAH25HJNRGACscrBKgVGwSfqRROgbmUFnlQWDhC09GEVR/SPyfJVeGodZDeEPF6JUD40NVcq/g1BsvVp1zMcAGUqgWqVuh8LYO0mWz2IyDJVfLPxufupkS3SqKYO59s6RL07E2LPsnTIkYuGDH4NVKs+zv1gxVEbqwJupazdIqbrC7RLb34jHzgRMwAQmE1Bfy2oHfT9GB+da9S3kwij6TTKzOtK0MaJx7K8qLF5QZ1VEP31ECPBC+2pbr0J6/6HCGBqk/xwCbnZ2Qk8E1OhRNFN7/YfK7ymunT1KKH0pJbjquqp2RqeXKitmvxiARotHdYGXEJmZYpYqFv6fSosvgMTu5filyigle06cu4QRh6EBBuasIs2VLfUH3TyzNpfohOfUDugTJzzhoCZQBwHqrhz9PYYHE4tL+qGtM8W407wxorGBz/XyXgjvh2zNsPb0GOs34cIKCDBS2zWYncX6JYzdDgTUUdE5oXByjknQxF5/5YN6RGcby8OLOoQhZbH7TCq/1NUSKyzdtEr/Hlr6RSFmdimpWIkh91j5SOUT5Zc0Zsmt+D/Wg6kyolPS7eaOVN9Ge2IgnZwhcaIcUmXwv5Mj9ANzCKTq6Zy4/IwJrE6AfkOua3isnubKCXSNEd5ZSfWJK4sxP3rpHczysxrS6vg2P/PxJ5ng5W+HoEvEQxT0DQbI/wzEyae7GKwHgjzfujW05xvvfKi47375/yQBMUTRQeEc4ut8qLIAABAASURBVJVSsJLxbn1D+cD4wIhKJT2l8Q8ZKtRV0kqls6u/OjvyOTSzQDljhLD/9kFWMcSPT+gR5uHe7YIOg46DNG5e+SfFT7zUtdRDQ31E6pka/IfkxuiD61Q5USJSz1AOqXuz/VU+vBQ6uR+enWDFD4oFdTW1IozksCIMv1tylvWABFRfWbVmsiOseBwwly8YHxghvDPCF7XQXV5a+Me4LIcRwuTdKv13CxwkI3n/Qiw463L9IxggKLGpRKlIKEVZip0aGzPRKDJDM1TfEW797LWZgth8LEeHNaRwhsx9rbBVDraSi69oYHhQH4aUpyElMeTzelbjQMHGXa97/5EGL8xhiFTJRPKzFYuOrif6/ZI8oECRD/YI4+BHfeDePWDnB213lvGhMqKuoVBT15LxS276iE6SbfyU3PBmViclMKwZOOnnUmGu/mIVymKoL1yLE4YSe7CRdyj9q6xH/U9lgKJDe0jVVbJO22fMolwxMofCEt7OBFYhcKuvGB6031XSqCxS2hpf1KKvov0101ddLhfGCr6UxfuajKmVoV1VHPI7S4dYItXVANEgTeI/DETE4IxCRIWiQ+f6HlyNDCUGfwYG3Filo5ISH4ME512dMoJyp9PzobxtLRvf+UYZpMOC07NQjz6Eg6NEfd1a1qH0+IQgxgcKw6PEj1fUPRr+o+/w1VBd5UmM3xqZXHlJQN5XId/6mTxoQ9QDHL+TAXUDBRvF9Br/6+tr7pkyIn54KZrkMcY7+WAlN4ZWnRCROvrb6+srdYbZO16yZCIlOPyoyygSQ2XBN9MpC+Jcw9Ef0N4p31f9Q15+n8XRN1IOcMjhS7liXDMrS/mehRNjcHJMywHnMMsIqG2y6kFdxeXW12WJ1vc07Y82R9sbG2OqkB5dWI53KFkRWWsyqYq8doRgQvcT5Ztzx3v9n1cD5JYMe+HGBk8qFB06FUpt7N2h51Fi8B8anBXs6WCmimf2dsjxJNzNY2vZlnRWi2RVfks+r+iyDr7YNFbvHiJSQ8FgGdqK1Q1fMk8l48opZ8LguvmJ/ab+zpEtFlffb+lL7f34Nr9WfWEgwY2lDUdm71DeUOKCw4++b+x5Zs7GwpS8j7xzyr3VZ3LaQoovk2at5nuO3NSNGIvcfjP2rP0yCEgroq9gsoJzxhOHD0LbY1cCEwFM5ixpx5vA0pjBS+p8shddY5M0d0qE/oCVj0k6WClZ7waIgDMjC/BScYd4iDf89tkEugT41BuzDV2/3N/U1c0t9lzhDhKOtju0XaylbJKPNesLdZnOfC4TP1eGAHW2TEzHjGUXReOYKJ9zJeODyYszr3o8Q3nvg+HBZA4T2BgkGCbv79b5i9Xzo7YZ/s4HxsdufebdAKHsZYQwQDNQc1nCkTE+dXZ0K7IEq9w4UHKO0CBQ2GbXNdXVULeos7nsHC6fAHWMzukQfDv1hfaTTyEv5KK6nJeEQ2UQoD9hvKFvyAh+yiA/nTLXo5leFkCGB1uu2AnCFsllkR3/aQwRtmRVbYioTJGRMm3BUJpSa8LYPnfyd0pag2EfDBBCaqDGWGD/G0LiNdcx0F/3lSlOBgbinRuXn3t5YVD9ViwZYCkftsy9NPiPeoViS51YJL5Y8JdNYcHWF/gsis8PXwnAEZ7Xtnv1Och/t/pC+yF/pXLFLNLiupwhDCt+tJ2MoKcLAhe+3oIhiMHMi6Qeb56rAXwYl5/v2Gc2ASmqKNRs10xte5sd9wkeRMkPhghbDXfPssqTd/8wPHit4EjGx3Vs1zj4B7kq+oG7AdItdQlHJx4UOzr37u2x32QMBRN3f1ZxMkh7EB2j93wfnrCj0lyNDrFE8WZpkIGWM2Gen6zHh/qE7Ci15KOovOKBJQ8LOLHXn4ZWT+7rlwRecIMf5fNGTPErLTnvkxQt+zkCKm+hvqCkzs0nz15ZzZFh6jOS+Rc56jh9KGnPlXtq0jWHp1+hztKvUH+vsooT/SP+8KJ/JNz13kn/YxzeylA+I2IbH8tLHUOEF9ZxuxgiN8ODssQdzZhkzKCfZOybXVpixJcgMdBSbpLBFjVAkO7WiaOI0IkHY4RMoED0Hf509AzIGB7cJ5oHpzjDIEp8zETavbykGFBZhOwCT2aunhSOy+XCi1Lf60yYi2DXxjXkgfO3knM1RUBxo3TAiZnQD3UNjxTb2vz3lAdWOLjB76meqV7NOVJ5mhNX8WdUP2g7X+n8oSJHqWdVhH5ryBGGsPDiWRQ7Pb7dIXnpQ0kbuembU5wP7S8OHPQryTqrAJQx/SPhztofkHfG5UWKx3Y1vK2UpJAxS340ZXXPQsD4wAjB8Xt1WVSGKNMYHbg5aTJmMsF6nwRZXei8BJAL3Zz2z5iRNV6JB9sJYcIHA/jyLWUh71e+msnHFeCUcqxmEZZn+Jokq4NJaZMGSPcJdeTMXGKMkAmU3b7Dn44+K4O3+Phkpd3lkmIwWVmvkOvkPHTr3dLf4pFia//39Y5Oainqp+cT7FdJ6ynxiR6SFaWe/q3fr/WvCUPYKvIhuVGwT1mXJxbxNbh4JVgl++AjhN+1D76CP+h/0rL4yhUz9wfN4a7ZwhBAicXxu7gwKr8pfzoilT5jAeMEE6zXySkFZKIqSxdW2DUO2vx1BVh93ldyo7KIBX9K443ObD3jc+cYGHwwgDo+hz/P8EEGDBLijRoiWQbIGoQcpwmYgAmYgAmYgAm0RkCKGgoVqx+tiV6fvMMSochihOD4PRx65C7lJsfMPDP5lN+SOFH0MT44X1OWss9ODCaqWJ3GsTOIlREMlWuYFf4jbtIgLVY7WPVMrgyH9MWBlY7AAsMDg6P0ah7thHj5m1VPrG2AhNLw2QRMwARMwARMwATGCfC1K5Sr8ZAOUYIAyitGCI7fk+KUss0MPwYHhgcz8x9NiuA5MFubHoyPfhAZI6xQszOI7c1hyyyrJKyQYDCw3Rfjof/o0DXGDs8RB6scGBtsCSYN0spZ7eA9Dliw0lGCxZC84R68KTvaTfB7sQFyR7Hbj8MnrMZPhWcZDseypzvuw5e6M2gCZQmoH2HGjr3J9CFJJaQXrvSMXtlMObbmCFC/JPTXcj62J0C7R5HF8TspAeUkR1/B7D6O7XJLdQ8MBpR9tjbxO5l+/8bNIGELLyskxIEBg/GgW5eLwqfe22NV43L7h8HBc8TBKgcGiR4dP8QCPQzDAyMMFuMPlQ/xVnIgwzVmGyBXDP5vLQKqbFR0KjzLcDgqH/sCrRisBd3xTiDgoC0QUD9Cf0E/wt5k+hAUEJb18b9nQeFCfxPCEYawSxWPexr+cXoC1DHXp32rAcYH7ZqXpPl9l0Z9wOdy9BH0F5wf+oh7wOk/WLXAGOA8/emRJ2RgpN45G13VGIpaLGowPLoiYhRSLl4B6VLx77IEVPFp+NeK1ouZzpu/Ftvz9qUJmIAJPBJQP0J/gUHBuXvzoX9RuHDdD4eC4v6mS66W323K8edCYqNY8vUktuWg2EoHHT6UbvjSJdtv2IaDMpw9C67nj3bwkjSGCJOa17MySFsvaSRSTqw6sGoxadVDsux2qD9kxZiv34XVn91kiSSMEfKpV0AiZOxVjACdQyoyrHIUg9R9+5vA2Qi4PcRLfEiZYG934DakGLJ1i33I8RTsawIZBKTUUYcwdDNCJ4Owhx+FFqODryexLQclN/lAuCHzhC+SMlPO9hu24aAUsy0nbOHhRWSMkmYU5ZC3hWfKhX6A88Ko7o/DkL+fQzlRZvcbtf9QPaXPZAWIXSf9CZm7+Dv/sAGycwEcPfn/OnoGnT8T2IBAU4PfCjzGBtCgEIZzSoSSykkqDfsfm8BYHRvKPQot7w5gfBRv0zJOMEx4ERmjhJeeWS1hheXMKyRD5TF0j9UlDA9WEIbCVXVPhgcTLax4sPNkrN/cXXavgOxeBIcW4P9GckeHPBJkzduO2wSqIvCnqqRpR5igYI3NIru/aadMa5V0iQGC8cHXkzbJmwwSVktYYcEQCZ+EDW1lExkaTITyuRoe4tdMfyHDg+1WGB1sVV1SR7cssl9tgGyJ+3xp0ZhTuaZzdGeYomP/wxDQ4MDWgMH83MKkBo4xxXow7mpv5gs21I+gJIR+5KeBKN3fDMDxrWwCf8wO+RzwR7XzoW3Jz08U8pEyHT4JizGCY2WEtlMoheajoY/B8MBIbKq/VZ0K2604t1IQrNbZAGmltFqUk05PcvOyXL+jQ2Hgk3O67cMEjktAgwPbfq4vR+o3nyB8Mkbkz8DBi5MpEH9P3TiDf6cf6WeXfoXtLJxfFI5tLShW/XAoFPRDfX9fm8CWBNgSw1eb6A/oF7ZM+56W2gnG+Lc6s02LdkG7ud8/2Q/yzjs0LRoevEfLigcrH9StloruOlnkFZCWiqxBWdXJXWcWJDpf+mBfJQoDDf6qNMjfhwkcmUAwOFA4+CNMKB+yOV75agvuVZkfG0B4qVTBznt0+hH6EBwv2zJjyWTGHYzC4c8ML2Fw12v5P4S7P+AfJrA9AfoE2j4rIqlVz02kUrvgZXYmA9mixVh9tnEZY6y5vuH19ZWxhHc9qEtz6wr5Zmyhn+w7DDMmbubGPfQcfy2eunbmz/AO8fG9kgTUyVHh+NIHX+2gYpeM3nGZQM0E/jshHAYJLnH77o2CcDal4J757g/1I2wjoQ/B8bJtlIvCoVQQBpcM143bv01gBwKsfPJ3anDfSKnM6Q9WEVNthrbFagiGCMpotG2tkvi+kcId/pTFvpJkpE4dkWPV462Cz1n1wOBgMpg/gMhEMB8soJ/sOyaKqQthlYznlGSR44cQi1dAAgmfTcAEtiNwnpSWzHCiBDCDfx5azqkJnI8AfQQKJasiKMNs1eSP6c1RMBfRkyHCZCHKaFA815oFXyRn4Yfhz2rU71Lu38jtZggO5UtyYSTNWfVgHMGoZMUYg4PJYPyGkrveu9UHJsGuRos8iSfrWYVNHdfVD27aAIGCnQmYgAmsQ2BuZ81zzEJxXkcyx3paAs54tQRQhtlewzthKMQYJCjHKMZ8YnUz5VjKJ4ons+CsjJyhH8Lg4+9mYAjCfMn2pmIVTIYHX7iiPoxt1Y2lycoFKx0YlYuMSdWHq3GqRKgTsXftdGv0oE7d5bABMsrLAUzABExgNgEGb2aN7p1uRkxsU2TQYI9uRnAHMQET2IjA1h+EwCBh5hvFmK03KMfSSV8xTHifjNUSjBMcBkrXoVBnY3l9fUXR7T5//a0I6Lvow/TzNAfM4QtvtmmVNPyyIapMMIJY9Zj69TTKjAksVjz4nZ3mWMCbIcLKPO/aTY37oR7ZABmj7fsmYAImMJPArbNm9olZI1wwSJiZwtAIjms6dZbJGTimduwzJfRjJmACEwjUMimAYYJyymoJxgkOA6XrWEGRDpt3iMHvct3nu7/ZIqbbpzswPMg7hghfMMMw2QSCSu2NEqIMkEE/sw9WJ5jAYmzJfmhqQI1ttIUpRsjD6gfp2QCBgt22BJyaCZzMjZhxAAAQAElEQVSQgDpsXvSkE8YgYWYKQyM4rnlh2obHCeuGs9wMgVWVumYonFNQViHYmoVhx5nr4iRkePB5XVY9MCqnxM/YwXjCH59cfcuc5MQAZmtYjoGEPA+rH2TMBggU7EzABEzgJAScTRMwgXkENImAIsXM77wI/NQRCLC1jZUQVkSCMfKlFHL8F+VPcWDUYHywwjUlrk1WPSQf2/TYkvabhGN1BiNEP0ePH9R2MJAeAtoAecDhCxMwARMwARMwARNIErh/RjQZIn3Dd45FAKMDY4QXxDFGeG8EBX2qAfEi5Z6tXqwoEGcuJZT6VVc9JNfHcuQJg4NtesiZs+oR8sDKP9vJwvX9bAPkjsI/TMAETMAETMAETGCQAO9rsRIyGMg3T0mAFQEUdD4SwHsjbNVidSSpsEu5D1uueJ9nCjQ+Z1v0XQ/JwocHkJePGmBMvUogVmTIE3nT5eSD9x6jD21vgETFsKcJmIAJmIAJmIAJ1E3gcrlgfHgVpO5iqkE6jI6wOoIxggsGCYo+DsUeBX/Kign1j3cGv7rVxUl5lZHBNirS7hoayIaxwSoHqzm8fzLX4OjKw3uNyfembIB0Ufm3CRycgLNnAiZgAiawjIAUP7aUsP1lWUR++kwEugYJij6OVY8pW65YfeNLiZwf2HUMC4wLHKsYOD7VzGoGDiODbVSk3TU0kO0hvgIXvCv19OJ5N14bIF0a/m0CJmACJmAC6xBwrMci8MWxsuPcNECAVQlefseYwF1XLmR8dA0LjAscqxg4jByew22VRVZpRldobIBsVRxOxwRMwARMwARM4BAEtArCDC/uEPlZOROsFrEVB8cXmzjjt3Ky3egP8ZvVEgyJ4NZYuSgBik8Bj7YNGyAlUDsOEzABEzABEzCBsxFgiwmzvWfL91h+UT4xNHgBmS1DOL7WhEM55Rz+MKsNkTGabd3nvQ9ekB+V2gbIKKLjBHBOTMAETMAETMAEyhDQKgh78YMijdKF4l0m8nZiwYCAA8YYhoWwXPg6E4YGf3iV+9HcXC4X7sPvMwVgVUQnHw0ToDy/zZXfBkguKYczARMwgfkE/KQJmMABCUiJ/rccihd73lG8L8omCjUKOYr5UYwSVnowEljZQMkMxgarG1+IwRs57iv70w6ek4MZxgiG3LQIHLoGAr+qDFnxypbFBkg2Kgc0ARMwARMwARNoj8C2EksRQxlDIUcx7xolKGjBMJmlrK+ck2BkYDghJ/JiGHyoPOEwOljZYJtNcfmVBn+0jjQ/VD5JP7l6ovs+6iGAkT35oww2QOopQEtiAiZgAiZgAiZwQAJSrjFKWCkJhgnKvLwvYcUERR/lG8UbhxGAkh/cHGU8GBQhDs7EHRxp4ljFuOhfMDIwnJATeZGbeDYrFcnBqhLpsyKCYguLzdJ3QpMIYHxQl9N1JBGdDZAEGHubgAmYgAmYgAmYwNoEpHCj5ONQ+FG8cRgBKHbBBSNBwbOPYFCEODgTd3CkiZtj3KyN5Rq/cvqLHEYIxgiGU7WyXgU+13/UV1b4JhsfYLIBAgU7E1iXgGM3ARMwARMwAROYSUBGCNuzMJwwRDBI/K7ITJaFHsP4YMVudnQ2QGaj84MmYAImYAL1E7CEJmACRyIgY4RVEZRf3hXhzDagI2Wx9rzwwQW4L5LTBsgifH7YBEzABEzABEzABEwgSmBFTxkivCvCTPwnSoaVEW/REogVD7a/seWqyOqTDZAVS8pRm4AJmIAJmIAJmIAJrEtAxkh3ixYGCZ8LRmFeN+HzxM6HADA+iq022QBZv/I8pfD6+vqx3Jub+/QpQAMekv0juU/lvpELeemfP9e9avInWZA5yPh5A5gt4ooEVB9oh9ThL/U71AvO1Gn8cR+sKIKjNoFsAqqjH8hRJ5MuOzIHNIEDE5Ax8k85PhfMqgjGCDP2s16UPjCm3KzBDZZ8FIHfuc+NhnsyQNTBoTT+Teeu+3I0ppEAio9Bvhsnv38eeexFz72VI+zdjT0z577SoHP/Wed7OvyeE9fQM4oTxfcfCvPdzZHeYr6KK3ooPZQp0ui6yekpHpS1ENfvSuw3ub/JvZULeemfKV/S1eOvnHl+F4XuVUaf5Oxyp6yRXd5lD6UVq+sfl03lXWxK66l9yG+VtEhRcf8oR1neHf6lndLAWKSM7unIb0Z5vZdMzxMndZA4X3WH+kAd/lG/u3WXdPDH/a7nfpMj37RdBZ1/KB5kIP2uI735kc58UrJQT/uMu3KN/cZYw6EQF23Xko3+5in9nKzqWfpy5ArPf5Pz3NwwSq+b1jXNuXF1n1O85COUEX0ujjqZdHqGgzqLHMjFeF60bLoy+rcJ1E5AhgjGCO8s8L4IL697ZSS/0MKqB8zyn8oM+WSA6Lmv5Zi17rqP5Df7UI9IXAzynLsuR1Fi8Og+w+/Zsgw8iCwoGMTfdQOPzLoVUzZQItcaJP4kKbv54XdWearcUAKQDWMDZQ3ZeX6OrDzH8wyOxDknDmVl9oGC2U8TZTSLxcRU/6zw5Lfr+mkrSJEj1j5WSUv1gfxgvHLuuiIZ6UVCOv32SBvtBRu/lNwo/fQ/1GPqILKPP/g+BHUEeVDWMUb4/f7utF88S/pdNytf05J9H1o8UGxpzzDpM+7KNfabNoVDIaZdo/SiMJeofym53mck/Qt5kCvIT3/zD/KdfmTRnW5aIc3ZESKn3BtFQH0NZTSFKWGRA7mYBKJsqLulykaiZR4OZgIVEZAxwsvrzOaHlREUa2/Tei4jmPDJZlY9+P0cooBPzAApEO37KNSRMrjSCb73fP9r8Vv076Oq/5dYMCigzPSFZcBgwO3773ItOZk1Q0HBoeDGZF4iG3GiyMFjSTxZzyo/Q3wZpLPicaD2CKjsgyKH4l8iA7QFVkNQtvldIs6t46D90S+XTpf2jMJM24Z76fhH41N5U86xvOFXfVu/yY/hgaz0W6N5zgzA+ELZpMbizGgczASOQUDGCCsjXWOEF9iLvd9QA6UZMrDF6spEfH6d8fykR1Y1QNSZ0oEyG8W5LxhLYqtnsJ/oztfMjKdEYOUpdW9rf2RhwF4zXeoEShwKw5rpEPdQGgzMhLE7EAH6HjkULhS5NXKGss2s+trtZA3Z/7hGpJ04advfif8efIaMQlY8KbeOqHX8FCtWpaivOPjVIZilMIETEJCyjTHC3xjhfRFWR75Vts+kn7LKgQHGH7tkVUjZX/9YzQChQ5X4KeODz6bxUpCCnOO48RhSdtnuNDR41gSKhkklpZF+JsH6jpUtKjP7B6nYCpI8mE1eSYm7pzlk+DHwDxko90j8oykCzPQOlSszPdRP6mm//nJN3aaOD9VfFEWM6LXrb2nwWynhcIHPUL9XOm9j8dHfUG5j4Ta7fxsbGCuH6ivyUBdDnaXeBkc9pU/mPuHsTCCbgOof73BhnLNVkfbKxIG8Bw9WOQmL47nwvhFtPjvtGgPKGOFrWt/rzDjAOyM1illKJvoNFgMwPDDAGBdLxT0az2oGiFJGAYhVxl9VsCioCnKqg0F4bOBj5aFWKNeKKuE+VPmxN5BlOhop5dl3GJhUZvYPMpvArMKQwUldUdTlD3Wh1EHcUOS8JzN03/caIqAyH3rPgw6WDpd6TP2knvbrL9fUbeo49ZeBiPofo0CbZhDmHLvfih8GF/nMdSi/tOm00vsu53BB6R9rg+9Cr/8/kzxrrYrNlZ76OsQHAwMFARfqLPU2OOopfTL3LxKCMqQ8KR/qu7x8mMB7AuojeR+I94LChw2og2zNZHJiqC6GSGhHhMXxHG2KcTwYL5xp96RD2PBcE2fxYWISJuSpCZknCMk2M/oH+gv6DfqJCY+XC7qKAaLCYxmZitmXlIwf3aLs5zlcD83ChzAYKeF3bee/yPDAsJg8oOk5ljcxOhkYY8/zkvDY7N9cHlncVWeb6yTnAjnycypH+h0GxFg2mT2m053U4ar+YpBQd+m0Y/FelezYjYb8aKPkM9eh/GLIYaCNTTDAB2WHcw1ImO3NUbJWl1X1lX4PF0uL8ZL6ioExZujdn7/VVwxoyocv/3TLJzuee4T+0SSBvtCqa4yzrFZgdKCjoW+s1SZpX9Rr0mG1BIdBwvula6XZz/Ksa3FiDAnvv+bEQZtCr2WMCBMzTFjFdJ2c+EqHoR9hzEMHY+KNv+VB/4DcpdOaFF9xA0SFx8uHVLy+IBQGHSLn/r1DX4sJyi2VuptPOPQrAB0EnUI33GF+MzAqMzRS8q6fD8daqz+xutjnjiCH5U7mTuSYtYpll6+fMHscq3ux8E9+qr/MRNOJP92TBwNrv43L+/iHuGC8wIW2HWtbQKAPZJaU3zU4FKNd5dC4gCKWqq9M9qAopHhmyx7KR2cOyin7WQdsnwD1TI56xscNmJyh3m2dMdo/YzErClV+lU2MwqoH2yGRN4cRhgbtlPGFyZswMcPKAsp+WJGkb8Q4wWEM8BwO4yAnnZwwxIcjDSbLkIE2j3zo3vQps8e/HAGmhilqgKgAqWCpQQYYJWGP5LWq23DpC8RsLK7vf+jtQGoN1IEf+pnWdfF3YFQfMSr6nS0DOg1UST4caxlAD4n4Yj0Ct/Jm5q2fCGVeRPFS/WXwiNUf0jx1HRIbBj9m22nj8Og7Vh5yB/b+s6Wv6W+YLCsd75T4UsogykyR+jpFGIc9HgH1iegewfCoKYOMzUwCYIxcV0b2FE6ckGfKqgfisisEvXZQqadfvDmMExzGAM/hMA50+/2hiOlDMVjGXP9Z4sORBisc9MeKrt6jmAGiAmT2jwoVyy3AU4NSLPzR/GLbgP5HmfxJrn+wZ7KvNPfDtH7NTHIsD9ShmP9cvxh3jJ+Y4cfqU0x5nZv2uZ/bJ/cpA4D+Z3CQmCKuhgoUV4ya/mOsgtSiYPdl2+RabODMdgTOsTRTZRQLW8qPsScmD1/q2qXNa7ykj4+xQE4bH6VK/qTxUL/kWG1AJ6Ou1UwCI4ktmmzT4mX2zeQVI1Y94ITL7btpo6ymMw4U56o+lBVlVlPGHP1a8fS3jLCIAaJCpBOnAGOyY4kxaxi7d3g/sUGp7lfsf6uSMctFBYoqMkcGo7zTgMl7P5t9Tv372dfiTlzMavSfgTvpx4yQmELQf97XFRK4lTdtrS/dtTPvexa4Tq2CxOpcgeTaiULtmz6NLQAxoffgQ3tPycPWlJica/vBIaZo8b4H8i5K3w+fl4D6QvQxthFRx1oCwZjNDpqwKsL1avKLE3xYHeKcmw56C6sMMf0hNw6HuxFYbICoEOlEqeycb9HeTyh7qY7/HujgP2Kz8N3K2/0dUJxBEY4NsiX/PkGsU0EZRTmCMytQnLsu9kz3vn/XSyBmfCAtK16cizop2UyqxOrwobdQ5kK88QltrfvYLiuNN3liWxKunyDtCrjR71g94fOf1KuNRHAyRyMgfSwYH5xbzh6rIqyIsD2raF7EqLvqEdNbU9xomxgfGCGpMPgXcZKTvokVIVaH+NIihpm8WIiJgQAAEABJREFUrwfXOO4X5VNE+MxIFhkgwkDhpYwPCunUS8k3PjGltrv1KqYgsT95Ves/s36sGYz6sWb8MSPuzv2mkPQVSDomOr415XLc6xBIGa8xA7+UBFGFtlTkB4gn1reRrZSxyL01HeNRv82THluxNutvM8cF5LIzgWwCqlcooil9LDueygIyHvNJX5TwxW1UjNDHpq56gISVyaJbeYm06yQbeh8GBYbFq+5RlqwIITN9Jvq2vK8H1zjuw4dnuL7ebOW/RQaIMsm2Kyq9fj4cdPLskeP8cONkF1ScbqUh+8xy3RUXKcLMEsaU8ZgCzfP1uzwJY/Um78mRUDRkBYl1Vn1ltH+tx15iM5P429VNIFberHit2Qf9PYbkVv9it87mF2tfMPhv/tva3fra2NY5+mj2ym8lUkpRYIZ1KxmczoEIqM+h/0NhpS4fKGf3rKBLhRUR8nq/kfNDfJhcRF/FTWHE+MGqR+q91Zzkk2EkF+8NssrDp5F5CR6DItU/JOPRDZ7BCNlrS6lEmH7MNkAEjg6bTPdTDQWGYt2/d7brmBERG5TvM/MdQDS4zqV/TiAQ5X5TQLrRRLdhqW5P7uC6kfr3LgRifVHMsC8pXCr+XetPyQwuievW3mKMduMjmVAk7hNAnfyx3YHZ1o7Xaj9jky9MTHnMXA354SOeqli3CoQ2OskQ0Xh+fUYZnqpT0XfxpalYf6Ho5h2Sh22o/D0WVmIoN+SbYhQNJcyXBlkRKRXfUFqL780yQASQt/+BFhOApSoKLnbvNH5ixCAbG2hixkbMKKGSTm0wLfGNsSk1AMe4PRkbUkbgjsHc5xZ7vh/G15UQUFtLdbb/t7KIqX4uVrdXFqXa6GNtOmYsbpkBtmLF0kMpSNWlWPi5frHtgqm6NDcNP7cPgc1TVf/HrPfZ+hz0z0FDRFzQoVgVYrJ8artGN2DlI9Z/zSpjycMXTpEHw4NPcKMjzopr5CHqAnViJNj+tycbIECU2CwT6fR08F1kLyO/wxKbhWeW62mgkSJMJX/yVzSxF9jl3fahOoSCH+sQFiuMipuOKRY3HUoMXMw/VnaxZ+1XBwE63JgksTYVCzfLT+02ZrzOiuvAD/1vbXlTudHf7rkVK9Y/VceptnKzPM8ENN5hzKPMPt88hw/jPYYI74igV1xzLS4wYUsTfK5+E/5Djy3yCoHkYOsXqxIYHRhCc+SZIPo9KMYODO4eNf6YZIAIJvCAGMsLf2XxzUvszjn97o2hk/3Y6ke4HXthk/2BscEqPNPqOaXgx4yBqXmMvcPB19hSymKMOzMn1PWpaTt8XQRSZb62lLu847B2pmbGHy0DjSUpo3FmMtMekxHCKn7MQKXPjfXd0xIYDh3Le0yW4Vh81wReXpqY6d6goGizGCHqWl4xPOAyR3fiRXP6hkUiSwgMD+LB8ECWtVY7huT8TnLske6QTA/3sg0QZYROk/1qDxHcLug8N/vcrmR5U9opH8VWGyQbjSFW8EOrQynlGwtf4h3jEBus8phyH10dmpJrxQ1z2Pcfe9p+FQJIEaHuMiMavMK5WH24RfhnybdGvb1F/+60x/8r5Su2TWWP7I2lGdsfPGfgG0un1fu0r5jsNTBKbcXipdCt5YsaajFw9jMBCKjfRTdAL+PS7j2BOUxof7zvMaSjvU8h8Utl0jU82Cm0dT/SlYy0kaHrV9XvXAPkPyU1Kx9kSD8fDgqOvXKcH26seAHU0o7GXErk2Cw8X+SJKbrXNKUIwy9mhJRWhK/p7fGfGieMmQ2IJT+0OhQLH/OLGR/80cexTiXGnZnQWH2PpZvjR95L11niy0l77TDIUdrFjNRUPqJh1aZixkEqDvufjIDqB8ZRaisW9XkqkdHw6gOZJImFo/+P+Uf9iEdu6oQG2zJS6UfTsWfVBFapo1XneB3h0MvQYekPZqeg9sgYz+oL5VJSd5gtkx6sus3nGiCAjVmVdJoUHGfl1YcqIRUPXn0YOQp2bKaeb0PH2Pfjr/YaJnIYHhixMTnpAPg6TezeFL/Y1q6YcdGPM1Y2lGPMoOk/62sTMIF2CdDv0P/0c8C+7ahh2w848TpqANyMoSlREQ+KzhRH/8t+eVahp6TlsJUR0HjK2EQdqEyyPcWZlTZGBysfnGdFoLJAR+PlctpXjWUS04tm5bX0Q7kGCMpYLG32y80uuFiEB/CjY4hlI0cRToVpahVEDZJlyOtnLfWbRsk+yKFBjy+nLTJilQ5GWqzxx4y6h/K5Df4xJaQp7g+Z8oUJmMAoAbV9+p2atmKNylwgQLUKSYG8nSUKj03LSxrddfYEunQO9BwmVln1WGOyYnkO38UQmxB/d2fn/3MNkJSYsa1GqbBn8Y917r9qoIspuA9MFIbBMLZdKKsCPURW/oI/cqM2N34oaf6oTpgRQPaUAaugLxixKcOL+7kuxp3tV7lxx15Gx4iKGTW5MjmcCZhA5QTU77JVj5WQvqS0fVYY+v6tX5Ov1vNwWvk1AjOepiY6c7igi1DncWxBxKF3cI1SnhPHEcIwacmL6+gok/KjMoA/hsfQxOqkOFcMjKFUpYGUa4BQYWN82F/GDHfs3pp+NJjSjga4SGZVSjp2KnU/ntgWn36YcB2bsacCUeFDmCOcMbYwPhZzv8GI8ck1PogiFXZy50RkEUc+S9dZ4osktbkXcpR2DIabZ2RBgn60bQLU39g4x1asWJ++d27pP/eWwenvQ2COMsn484XE/VAG9x/kmPnHvdFvHGMx12xHuijcJ3J8WCg1Lur2IQ5Y8tEJtibyThU6XDJj0vHQxdB5+SDTYNhkJPvcIJ/7pDyQaq4BggJNBY5FhRHC58Zi91bxuzUYGk0xJ0HJo06LjtgsPBFmN2LljbCxweVIS64ol3R0qToFs2ynTgEjgVmh/jOxVY1+mOu1uKN8xGZ/SnH/SWkUq68hrqvwO/8XZCl5Vpb+LufDBDYhoLpLn5vcilVQCNJ5ik592CRlRvLSV2E00ZcOOcI9pXc8j1PlaNYXAlVnhj5H/wBQYflozvc6X40W3aRtHLku0f5Y7cQQua6KqE0+6BS6Roln1QN9Q0iaOqr8NHyuAfKiikgFTCmMfG+4xUIpXYOis/BiFx10BhLHCOnfLv1Vpn78a1/DgPrDLAsOhb9UmjEjYc5nfWNGqP8mSKlSWi+e6MCoAaPGmev1KDjmRQTUT6PIx/peXjItMsmmNKJ1VYKjAOmUfyguJjToS5NOsTGLrZOPAxGY068xUYxyPVlPUz1jKzN/541VkT+II4ZvyfFbUVZ1oMexyvG7xpB/yLH9nHc92FY+uZ0qZ+g+9C1ww2HUfSb/4NCt8Uc/SvUPCr7oeDCmFsUUe3imX7YBQvyqiIACEpd9xzLW5Mrdj6TVa1VSKm2scsa2VI1lM/XMnnxpGDSiMUe4WP5oAKwC8Hzs/iw/cYc5MxP952OKRD9M/zr1TMzA6T/r6/0I0MHHUqfOxfxL+s1RBkqmX3tctM/aZezKxxgXq09Msq1Z1lvU1W4+/btdArHxLic3tEX0tFmGCAlIB2RiD8MXQwRFuuh4ThqVOdo8vKe+64EuQV/Cdje2vTFJADccK1G8Fxwcxh3+bIPDyPtQDGCLrh3ri3T7GMckA4QsqwICFTBc9h2Ve08luS/PltepF/L/LSWZl5mznYSm0uH08+HYUxHmS1U0ojFHA0oZIdSP0gNtqr793wzudNAx2cdWnx4KyRenIhCrz94+9r4K0KbeX91+aRypUnGRXPS7jHE3SR9OzII+eMy8iM0eo+jMjM6PnYWAxrRYfzM1+7RJxmIMkbeKk+upcbArBkU6zOJX2Z4nZ2rZA+gO9B0YHF+oL8GwiLX1wVT0HCtOsCUuDD1WR+iXBp9r8eZkA4RMChBgbIQAQ04NmE4hpQjzshJLd1MdcSr2h4OtAC0MVNSPWIOho2Np8yFTCy9SRhnKwlTmhI/xpSxY4Vooqh9fiUCqk2fmaqUkHW0mgf/KDLcgWNlHNb4xe4nrR8wk0tSZ0H4cXMfqa5V7tBHWrioCsfFproCMx9RnDBEcxsjkyTa1F2bygyESq9tz5WvxOXQFXBHZxRZjhO2fGCKxL/UVSWevSGYZIAgrMCiZWHxc9h3WdUoh74c9wvWWeU0p3NVwVN2gXmC1x2Sig6PTi92b5CfDDwWTTnTSczMDV899Zr6af0z1LTXo/eeambvVv1gSKXliYY/uF2uf9A+155vxLTaJwlasWJ6m5CeWf/qyKXE4rAmUJECdZlxmwpR3H3C8+4Aux9ehcIzdGOGP7vX1ei1hMI4w3GPtRrcPf5B/Jj4x5nCzDLoYJY1xGCK8z4WhN4dvlavysw2QGyRgxDpTblNxt1TMSXMvt6Vy2gRTNRisdTqjWJkwiNNYY/em+G3JnU6WTnqKfA67HYGY0l+ijg3lIFUfYrIMxXPIezLQmAmMKdbV81H/xSAfm0QhT0tXcf83UuB83tOrrBEw9tqFAPWctou+wdehcBgn7BJIOZRvjBie3UXoihJlbIAFzDDmeJkdnZjPei/RJdC3MUTon6Zkt8o+d5EBcuukh4wQLMC1lYAphVA87OvrK/nDFY87ESEDFZ1C4nZV3swixio+HRSNkfMsgW/KzdYDdivcZzFt/CE65n4WGED7fiWvU5/DjMlSMt1W4kq1z5gCXl2eNL4xiRLb244CsaQviMVJ/lPvEXLPzgRMoF0C6Ij0GRhpGHCskEiNecUwYaUJh07ESlNw6M/44wj3quzzR56ZAJmqO6UmgxXlfsciAwSx1UljiaWMECABD/gEP6LbchY+8GtioLrVDYyQIHf3TJ1gVqXrN+U3yg31a8ozS8PuUdZLZT748/fsRZeYX19fqSf3QIV/xAwcvp9Pn1g4qSajS7WXlAJeYybpv2LliXIwq/9Rv8ikTMxI5VOpzJzWyMEyVUBAdaeltlMBsepFQA9iHMFhoKATBccKCv44ws3NDC+0x/qwufEVe26xAYIkahRk7qxGCJUGDF3Hp+qEZfmhSGOWK3sxmxioRIAOM7aVQVl7YTlyroKYUm74AoWSXXZIOGY/dXo4+Jsgc+V9iMgXxQlQz2KRrmKsy7BhUIi1wZQcMdkO63fjA6N+HtnL3Awj9SIYC7H+C+ODmch+/nKvY39ziGe/479mnAXdg0DMeN1DDqfZBoHUn3XYXfoiBgi5UEd9OiNEgyzKKAMRCLouZjR070/5nao8pD0lnt3Cqm68UeKpTpNlx5gip0fih7gTPqbclLT0UwrCKgptPKf2zSWgOkb9QlnsP7LWrHJKUUzVm75c3etYH9K939RvtU/yw1aDmNwl+8ZY/MX9VLeYjIgZTUwEze2HUxyor3PjLJ53R1glgTl9TJUZsVDLCGQ8zWR46ou1GY+vG6SYAYKY6qjPZoSkZuF/gEchx0AF1350X/c9Kr/mD+vE8oGyMnUmMbbqRPZTxhr3JjnVZRRaXP85FARk7vv7en8CqfAWiv4AAA52SURBVHaXUoZnSSwFG+MX13+ezj5WZ/rh+td8XvtIdQreqS0DrSpPvPjZLzeup/ZdPMPfUMBYTikGTMqk+F2f93+nJkC9iY2lp4bizEcJsIU0eqMGz6IGCBmS4kbDOPx2LCkhKAyxmSr2gDO4gGOxu/HECOnHxXagZgYp5QMmqUGclzpZJennMXV9M/webrO1g475wXPhRUpZipX7wqT8eAEClD/9Tz8qZqrZT9v3n3x9a/d82ST2bGyrTj8c7aDvx3XzdQo2crBJTRDw9wJiKwnkv2qn/gvDMla+jANzZY/FR1zEybuTMSOX+3YnJqC6SB+XmmxplQzti74h1T+2mq895WZHCEz3lGEw7eIGCKndGsiYEUInS/BWXWqQTSmtS/KZmtlvahVE9QIFMWZMwYZP844OuFJwCMMWLJ7pulS83TBTf6fibIr71Ey3Gl71i4E5pdTx0nCqzWZlWXUPg58vmMT6LiYeqN9jcTHQxsIgH/HH7tXp15FKbGD7m7yGDKnUBIQeq/9Q/WKSJFV+kzOg+FC2UvWVOoYRQr3g9+T4/cBxCajuFK2LO5FifKVP+IPy84ncZ3L8wT0c7YL+fCfRmk+Wfqrq1Q8Ir2KAELEqEpUHAJzx6jo6VDpXzl3/ln7HZuGRP0cJIVy2E0saaozj0GCfHf/GAakTDLyxZNl6MFYnUtyLG37ijpyxGQS2zMSMoFie7LchAZUZ+/XpfGOpUr9+lrI8uez0DCsoGB8pI4F6HUvzwU/yIRv16sFfF9R7+kQUTlYEuZZ3fYdYUP+RkY9IwDTn05B/ueW9vgxNkyirnHOjFJMxRZJ6xyc74cxKXla9UBnxuXbGB0+W5BZGY+EkbmqSV7eqPBhLMSwwNFT1L19cLpfv5R76Q67l3sh9qFzQ3h7uy8/HMAF0xa/Ej/NwyJ3vrmaAkC8BYLClkcRAMJAz4GZ1qMRXi1Pnjuy4vkgsecXy2g835zpm2DDIMPM4J75dnlGdgA+dSix9FMPknmpxp64wqPafZe89nVvfv8R1yrDxwF6C7jpxpN43IjXqT1DoeJ+HOof/g6OuyaFkYxAws897DdS/h3C3Czp7+rrb5egpVaeIH4UTQ4c/XiURFh0ot6PC3ALQF2clpvD/kENGmND/ILe8ksdf1e6nyJKMaO8bygfljBJVUpSh+ko68IUz29uoF/xNAMoLx98MoI7yOzjqK0Yh4anvxGF3MAKqi4yl6FdMutSmpNNO0FlY4QgGB2cMi+yxWnmk72BFhHwyEXuwUiyenWudEDf4F4+8dISrGiAIewNB5QEMXl2HEk+nSQfb9c/4vWuQ1Cx8aqtUCWFTSktzX2VSnaADSg3izPKhhMWYMZjG6sqaHVMqbmSJyWi/nQmofjEYp/qcIB0KHcYuxsiT4q1AKHAo2dTFqJGiMBwYHwy0/M51eysMWw5OzHCmJhxyedUWrmj5deor9TYnr4ybbEXF8TU26ii/gxuqrznxO0wjBFR3ePfxW51R0j+R2Cj8jK2MW4yzuXVKj04+6EdIg/6PNDGk2UolcS6c6Rtp/4SZHHn3gcvlwvtjxE8+SS+mT3YfOeNvyhojj3JpIv+rGyBQUOUBSEohoDNtzQhBeSFrXUeDoNF3/Yr9vjGkgvXjRGFvbsBRfpgRpV7088M174NQL/jddalVh5Rx1n121m/JSbnS4fWf5yMA5zVC+jQqu1a5UbcYrBYPfomsUS++UjqxupF45J23nuFZBlPO7zy3/X8tJt1c0FexxQKFqOvf/O9b+Q0ZVZPLVXFSX1Egtyib5svAGXgmQB2SQ+FnlYG2hzLK+xXyvlz0BPULPSw42iaGw5AjTAjPGcPicvvHb9KgHyRNdoBQj5XUOofSZbcDbY++HdnoZ9ZJrK1Y6Tcoj1X5l0ayiQGC0Ko4gKECxzpnlE1mGwlatdNUKUpndBZeeYzlrWR+Ul++QKaS6WwVV0oJgy+z03c5xB0ji3py97v94OVf6tbtcpVTamWrudWnVehUGintUY4+h4GqZNvE6KCz5zwr95KLOotCwMAxK44FD6FwlOTRFYV8oZCg+Kw2IdNNMON3cSVF5Ue5sRISSz7VT8fC3v0UJ7PZ1FcUrEGZ7w9N/3Etn+mP+YnWCah+MVaykhBcMFYwHlKOMCE8Z+rP7iiUF9oKsmGI0F5oj7vLtZMAvF+HIbhWn75atjYzQMiBKg2Vlw42BooXG2MKJo92HXF0r9f8HavUKMKxNFNKaizsXL9aBvS58j88p/rAIIty+OB/u+hzxii53Xo4rbb6EVKRnHCP1dmUTOHRcOZZ8hqu1zyT1t5tZK38zcqXyg9FcelARfld41F8KNhcL8qn4mE2j/4QhzEzK38DQlAXnm4rXfwxfqjXT/cneBAPfSRcUAIwOhYZZhPSnhJ0lb5ZHOm7yHeoC/BAGWB1d4p8D2EVb9j3TtxLywjZiANZay2fh/z7wgSmELi1F/pQ+jT60SmPzwlbyzO0bQyPRf3Nnpl5MkBUmGRIp4ejWAYVK1b4hzrHjqcBOBKISlacmdLButfp4aBSP6Slu1jdOj0ddPIPYUtfKEUUFp2eDhSAaHIKObk8E8+gaETTWOKptBhsdXo6+ALGPWrdpd7o9HQk835/uMAPpRqrs6zgPMWusH3mPEtn8RR2qYfS6h+khSK0NOqn55VQVht5enCGh9JiRk6nhwMlakZsL/zhN2bMqGu0aeoWZ+JjNYBBi/odHG0ZfxxljOKGY6918XJUDuGKUYPyrstiR7JtKAX6ErZp6Ofsg7pGXYcLbIuxkUSx8mcbycvQv8RzlOfQY7PvKT3yTd3Qzws8So6VxH0tIwnYra/kJ9TVcKauBkedpVwu+odsxMG4Vax8JI8PE6iKgOo6OgJGO5NNtIVVxsFKMk3fznhB+69EpOliPBkg06PwE6cj4AybQMMENFBhjKD0o5Sh6KL8o7AFh8KGP459zVbcGi7vI4iuOtutr9TPUFfDmboaHHW2acXkCGXmPOxDQG2FyRUmAjBEMEiO1H+TF9o8kz7NG1g2QPZpI07VBEzABGYR8EMmYAImYALDBGSIMNHEKiKGCKuCLRvlGBts72RFs+V8PBSaDZAHHL4wARMwARMwARMwgSgBezZIQMYIq4JsY2QLP1tuW8oF260wPFjVaUnuUVltgIwicgATMAETMAETMAETMIGWCcgQCe+J8B4g25lqzQ4rHsHwOMR2qxjo6QZILBb7mYAJmIAJmIAJmIAJmED9BPjiav9LmzVIjVHEx1FY8cDw4LoGuVaRwQbIKlgdqQmsQ8CxmoAJmIAJmIAJLCLw3cDTfI2V7Vp8SYsvzrEaMRB88S2MDFY7+KoVhgcfR1k7zcVCl4jABkgJio7DBEzABEzg6AScPxMwgcYJvL6+fqos4HSKHry8zlfn+KocX5xju1ZJgwSDA8OGlY5gdLDageETFeionjZAjlqyzpcJmIAJmIAJmIAJHIJAsUwMrX5EE7lcLn2DJBglfOaXlRIcL7fzharguMYfRziMGP5WEKscGDasdJzO6OgCtgHSpeHfJmACJmACJmACJmAChyOg1Q/e/Rha/SDPhOGcdDJIwioJn/llpQT3lfz5Gx3BcY0/jnAYMafYWpUE17thA6QHpOZLy2YCJmACJmACJmACJjCLwNcZT30gQ+WDjHAOspCADZCFAP24CZjAKQg4kyZgAiZgAm0T+DxT/LFVksxoHGyIgA2QITq+ZwImYAImYAImsDMBJ28CywhoVQOjIndl44/LUvPTOQRsgORQchgTMAETMAETMAETMIFWCWCA5Mqeu1KSG1/b4VaS3gbISmAdrQmYgAmYgAmYgAmYQBUEpqxqfKQVk9GX0avIVcNC2ABpuPAs+mYEnJAJmIAJmIAJmEC7BKYaFDkvrLdLowLJbYBUUAgWwQRMwARMIEXA/iZgAiawmEDu+x8hoS+1CvJRuPC5PAEbIOWZOkYTMAETMAETMAETaJ/AAXIgQ2LK+x/dHE/+o4Xdh/17mIANkGE+vmsCJmACJmACJmACJnA+AqyCzDVezkdrYo5tgIwDcwgTMAETMAETMAETMIHzEXirFZSp27fOR2lGjm2AzIDmR0zABLYi4HRMwARMwARMYDcCvLz+drfUD5ywDZADF66zZgImYAImYAKzCfhBEzABCLAV6w0/7MoRsAFSjqVjMgETMAETMAETMAETqIvAPwuI893r6+uXBeLJjuLoAW2AHL2EnT8TMAETMAETMAETOCmBy+Xy70JZ/1FGiFdCCsG0AVIIpKNZg4DjNAETMAETMAETMIHFBH5dHMO7CFgJ+fzdT/+/hIANkCX0/KwJmIAJHJWA82UCJmACxyHw94JZ+bpgXKeNygbIaYveGTcBEzABEzABE6iRgGUqTuCXgjGWNGYKitVWVDZA2iovS2sCJmACJmACJmACJjCBwOVy4UX0f014JBWUeL5P3bR/PoGKDZD8TDikCZiACZiACZiACZiACQwQ+MvAvZxbvMz+mYwZzjnhHWaAgA2QATi+ZQKnJeCMm4AJmIAJmMCxCLANa+4qCEaHjY+C9cEGSEGYjsoETMAETMAElhLw8yZgAuUJ3FYu5q6CfKvn2X5VXrCTxmgD5KQF72ybgAmYgAmYgAmYwJkIyIj4q/I79Ele3X46/nJ77umGPeYTsAEyn52fNAETMAETMAETMAETaIvAVxKXLVU6jR6/yvjwHx8cxTQ9gA2Q6cyO/4RzaAImYAImYAImYAIHJCCDgvdAMELGcoeR8sVYIN+fR8AGyDxufsoETMAEViHgSE3ABEzABNYlICOEF9LHjJCvFA4jZF1hThq7DZCTFryzbQImYAImYAIm8EDAFyciIOOC90FSRsgvuo+RciIi22bVBsi2vJ2aCZiACZiACZiACZhABQRkZGCEsM2qu9LB165ShkkFUh9DhP8PAAD//9cyye8AAAAGSURBVAMAjOtlMIoJ8uIAAAAASUVORK5CYII=",
  mark: "data:image/png;base64,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",
  markWhite: "data:image/png;base64,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"
};
Object.assign(__ds_scope, { LOGO });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/logoData.js", error: String((e && e.message) || e) }); }

// components/navigation/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Khairah Holding logo. Self-contained (assets inlined).
 * `tone` picks color vs white knockout; `mark` shows just the symbol.
 */
function Logo({
  tone = 'color',
  mark = false,
  height = 40,
  alt = 'Khairah Holding',
  className = '',
  ...rest
}) {
  const src = mark ? tone === 'white' ? __ds_scope.LOGO.markWhite : __ds_scope.LOGO.mark : tone === 'white' ? __ds_scope.LOGO.logoWhite : __ds_scope.LOGO.logo;
  return /*#__PURE__*/React.createElement("img", _extends({
    src: src,
    alt: alt,
    className: className,
    style: {
      height,
      width: 'auto',
      display: 'block'
    }
  }, rest));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Logo.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/AboutPage.jsx
try { (() => {
function AboutPage({
  onNavigate,
  lang
}) {
  const {
    Button
  } = window.KhairahHoldingDesignSystem_52a247;
  const D = window.KH_DATA;
  const isAr = lang === 'ar';
  const t = (en, ar) => isAr ? ar : en;
  const mandate = [{
    h: t('Own assets', 'تملّك الأصول'),
    p: t('The company exists for the purpose of owning assets and holding them for the long term.', 'توجد الشركة لغرض تملّك الأصول والاحتفاظ بها على المدى الطويل.')
  }, {
    h: t('Gain control', 'السيطرة'),
    p: t('It is formed to gain control over one or more operating companies and steer their direction.', 'تتأسس للسيطرة على شركة تشغيلية أو أكثر وتوجيه مسارها.')
  }, {
    h: t('No direct operations', 'دون تشغيل مباشر'),
    p: t('It does not buy or sell products and services itself — operations belong to the subsidiaries.', 'لا تشتري المنتجات والخدمات أو تبيعها بنفسها — فالتشغيل من اختصاص الشركات التابعة.')
  }];
  const openCompany = c => window.open(c.url, '_blank', 'noopener');
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("section", {
    className: "edx-pagehead"
  }, /*#__PURE__*/React.createElement("img", {
    className: "edx-pagehead__photo",
    src: "../../assets/imagery/photo-corporate-towers.jpg",
    alt: "",
    style: {
      objectPosition: 'center 70%'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "edx-pagehead__scrim"
  }), /*#__PURE__*/React.createElement("div", {
    className: "ed-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "edx-pill edx-pill--glass"
  }, isAr ? 'من نحن' : 'About Us'), /*#__PURE__*/React.createElement("h1", {
    className: "edx-pagehead__title"
  }, isAr ? 'تعرّف على شركتنا' : 'Get to know about our company'), /*#__PURE__*/React.createElement("p", {
    className: "edx-pagehead__lead"
  }, isAr ? 'الشركة القابضة لا تمارس عمليات تشغيلية بنفسها، بل توجد لتملّك الأصول.' : "A holding company doesn't conduct operations or active tasks for itself — instead, it exists for the purpose of owning assets."))), /*#__PURE__*/React.createElement("section", {
    className: "ed-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "edy-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "edx-pill"
  }, isAr ? '٠١ — من نحن' : '01 — Who we are'), /*#__PURE__*/React.createElement("h2", null, t('A holding company built on disciplined ownership', 'شركة قابضة قائمة على تملّك منضبط'))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "lead"
  }, t('Khairah Holding exists to own assets and gain control over operating companies — steering them to build enduring value.', 'توجد خيرة القابضة لتملّك الأصول والسيطرة على شركات تشغيلية — وتوجيهها لبناء قيمة مستدامة.')), /*#__PURE__*/React.createElement("p", {
    className: "body"
  }, t('From its head office in Riyadh, the group oversees specialised subsidiaries serving the water-treatment and utilities sectors. The holding company itself does not buy or sell products and services; its role is ownership, control, and long-term stewardship.', 'من مقرها الرئيسي في الرياض، تشرف المجموعة على شركات تابعة متخصصة تخدم قطاعي معالجة المياه والمرافق. ولا تمارس الشركة القابضة نفسها بيع المنتجات والخدمات أو شراءها؛ فدورها هو التملّك والسيطرة والإشراف طويل الأمد.')))), /*#__PURE__*/React.createElement("div", {
    className: "edy-facts"
  }, /*#__PURE__*/React.createElement("div", {
    className: "edy-fact"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, t('Riyadh', 'الرياض')), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, t('Head office — Saudi Arabia', 'المقر الرئيسي — السعودية'))), /*#__PURE__*/React.createElement("div", {
    className: "edy-fact"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, isAr ? '٠٢' : '02'), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, t('Operating companies', 'شركات تشغيلية'))), /*#__PURE__*/React.createElement("div", {
    className: "edy-fact"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, isAr ? '٠٢' : '02'), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, t('Core sectors', 'قطاعات أساسية')))))), /*#__PURE__*/React.createElement("section", {
    className: "ed-section",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "edx-section__head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "edx-pill"
  }, isAr ? '٠٢ — تفويضنا' : '02 — Our mandate'), /*#__PURE__*/React.createElement("h2", null, t('What we are set up to do', 'ما الذي تأسسنا للقيام به')))), /*#__PURE__*/React.createElement("div", {
    className: "edy-rows"
  }, mandate.map((m, i) => /*#__PURE__*/React.createElement("div", {
    className: "edy-row",
    key: m.h
  }, /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, isAr ? ['٠١', '٠٢', '٠٣'][i] : String(i + 1).padStart(2, '0')), /*#__PURE__*/React.createElement("h3", null, m.h), /*#__PURE__*/React.createElement("p", null, m.p)))))), /*#__PURE__*/React.createElement("section", {
    className: "ed-section ed-band"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "edx-section__head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "edx-pill"
  }, isAr ? '٠٣ — هيكل المجموعة' : '03 — Group structure'), /*#__PURE__*/React.createElement("h2", null, t('One group, two operating companies', 'مجموعة واحدة، وشركتان تشغيليتان')))), /*#__PURE__*/React.createElement("div", {
    className: "edy-org"
  }, /*#__PURE__*/React.createElement("div", {
    className: "edy-org__parent"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/khairah-logo-white.png",
    alt: "Khairah Holding"
  }), /*#__PURE__*/React.createElement("div", {
    className: "role"
  }, t('Holding company — owns & steers', 'الشركة القابضة — تملك وتوجّه'))), /*#__PURE__*/React.createElement("div", {
    className: "edy-org__stem"
  }), /*#__PURE__*/React.createElement("div", {
    className: "edy-org__children"
  }, D.companies.map(c => /*#__PURE__*/React.createElement("div", {
    className: "edy-org__child",
    key: c.name
  }, /*#__PURE__*/React.createElement("span", {
    className: "sector"
  }, isAr ? c.sectorAr : c.sector), /*#__PURE__*/React.createElement("h3", null, c.name), /*#__PURE__*/React.createElement("p", null, isAr ? c.descAr : c.desc), /*#__PURE__*/React.createElement("button", {
    className: "visit",
    onClick: () => openCompany(c)
  }, t('Visit website', 'زيارة الموقع'), " \u2197"))))))), /*#__PURE__*/React.createElement("section", {
    className: "ed-cta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-wrap ed-cta__inner"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ed-kicker"
  }, isAr ? 'تواصل' : 'Get in touch'), /*#__PURE__*/React.createElement("div", {
    className: "ed-cta__row"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "ed-cta__head"
  }, isAr ? /*#__PURE__*/React.createElement(React.Fragment, null, "\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 ", /*#__PURE__*/React.createElement("span", {
    className: "accent"
  }, "\u062E\u064A\u0631\u0629 \u0627\u0644\u0642\u0627\u0628\u0636\u0629.")) : /*#__PURE__*/React.createElement(React.Fragment, null, "Partner with ", /*#__PURE__*/React.createElement("span", {
    className: "accent"
  }, "Khairah\xA0Holding."))), /*#__PURE__*/React.createElement(Button, {
    variant: "inverse",
    onClick: () => onNavigate('contact')
  }, isAr ? 'تواصل معنا' : 'Get in touch')))));
}
window.AboutPage = AboutPage;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/AboutPage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/ContactPage.jsx
try { (() => {
function ContactPage({
  onNavigate,
  lang
}) {
  const {
    Input,
    Select,
    Button
  } = window.KhairahHoldingDesignSystem_52a247;
  const D = window.KH_DATA;
  const isAr = lang === 'ar';
  const t = (en, ar) => isAr ? ar : en;
  const [sent, setSent] = React.useState(false);
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("section", {
    className: "edx-pagehead"
  }, /*#__PURE__*/React.createElement("img", {
    className: "edx-pagehead__photo",
    src: "../../assets/imagery/photo-riyadh-skyline.jpg",
    alt: "",
    style: {
      objectPosition: 'center 55%'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "edx-pagehead__scrim"
  }), /*#__PURE__*/React.createElement("div", {
    className: "ed-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "edx-pill edx-pill--glass"
  }, isAr ? 'تواصل' : 'Contact'), /*#__PURE__*/React.createElement("h1", {
    className: "edx-pagehead__title"
  }, isAr ? 'تواصل معنا' : 'Get in touch'), /*#__PURE__*/React.createElement("p", {
    className: "edx-pagehead__lead"
  }, isAr ? 'لاستفسارات الاستثمار أو الشراكة أو الإعلام، تواصل مع فريقنا في الرياض.' : 'For investment, partnership, or media enquiries, reach our team in Riyadh.'))), /*#__PURE__*/React.createElement("section", {
    className: "ed-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-contact",
    style: {
      borderTop: 'none',
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "edx-infocard"
  }, /*#__PURE__*/React.createElement("img", {
    className: "mark",
    src: "../../assets/logo/khairah-mark.png",
    alt: ""
  }), /*#__PURE__*/React.createElement("div", {
    className: "grp"
  }, /*#__PURE__*/React.createElement("h4", null, t('Contact', 'تواصل')), /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, t('Phone', 'الهاتف')), /*#__PURE__*/React.createElement("span", {
    className: "v",
    dir: "ltr"
  }, D.contact.phone)), /*#__PURE__*/React.createElement("div", {
    className: "grp"
  }, /*#__PURE__*/React.createElement("h4", null, t('Open time', 'ساعات العمل')), /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, t('Working hours', 'ساعات العمل')), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, isAr ? D.contact.hoursAr : D.contact.hours)), /*#__PURE__*/React.createElement("div", {
    className: "grp"
  }, /*#__PURE__*/React.createElement("h4", null, t('Address', 'العنوان')), /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, t('Head office', 'المقر الرئيسي')), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, isAr ? D.contact.locationAr : D.contact.location))), /*#__PURE__*/React.createElement("div", {
    className: "ed-map",
    "data-comment-anchor": "contact-map"
  }, t('Map — Riyadh head office', 'خريطة — المقر الرئيسي، الرياض'))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '0 0 0.4rem',
      fontSize: 'clamp(1.3rem, 2.2vw, 1.7rem)',
      fontWeight: 700,
      letterSpacing: '-0.015em'
    }
  }, t('Send an enquiry', 'أرسل استفساراً')), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 1.5rem',
      color: 'var(--text-body)',
      fontSize: '0.98rem',
      lineHeight: 1.6
    }
  }, t('For investment, partnership, or media matters — our team in Riyadh will direct your enquiry to the right company.', 'لشؤون الاستثمار أو الشراكة أو الإعلام — سيوجّه فريقنا في الرياض استفسارك إلى الجهة المناسبة.')), sent ? /*#__PURE__*/React.createElement("div", {
    className: "ed-contact__sent"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-contact__check"
  }, "\u2713"), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '0 0 0.5rem'
    }
  }, t('Thank you', 'شكراً لك')), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 0,
      color: 'var(--text-body)'
    }
  }, t('We have received your message and will respond shortly.', 'استلمنا رسالتك وسنرد قريباً.')), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: () => setSent(false)
  }, t('Send another', 'إرسال أخرى'))) : /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      setSent(true);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-form-grid"
  }, /*#__PURE__*/React.createElement(Input, {
    label: t('Full name', 'الاسم الكامل'),
    placeholder: t('Your name', 'اسمك'),
    required: true
  }), /*#__PURE__*/React.createElement(Input, {
    label: t('Email', 'البريد الإلكتروني'),
    type: "email",
    placeholder: "name@company.com",
    required: true
  }), /*#__PURE__*/React.createElement(Select, {
    label: t('Enquiry type', 'نوع الاستفسار'),
    options: [{
      value: 'investment',
      label: t('Investment', 'استثمار')
    }, {
      value: 'partnership',
      label: t('Partnership', 'شراكة')
    }, {
      value: 'media',
      label: t('Media', 'إعلام')
    }]
  }), /*#__PURE__*/React.createElement(Input, {
    label: t('Organisation', 'المؤسسة'),
    placeholder: t('Company name', 'اسم الشركة')
  })), /*#__PURE__*/React.createElement("label", {
    className: "kh-field__label",
    style: {
      marginTop: '1rem',
      display: 'block'
    }
  }, t('Message', 'الرسالة')), /*#__PURE__*/React.createElement("textarea", {
    className: "ed-textarea",
    rows: "4",
    style: {
      marginTop: '0.4rem'
    },
    placeholder: t('How can we help?', 'كيف يمكننا المساعدة؟')
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '1.25rem'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    type: "submit",
    block: true
  }, t('Send message', 'إرسال الرسالة')))))))));
}
window.ContactPage = ContactPage;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/ContactPage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Footer.jsx
try { (() => {
function Footer({
  onNavigate,
  lang
}) {
  const {
    Logo
  } = window.KhairahHoldingDesignSystem_52a247;
  const D = window.KH_DATA;
  const isAr = lang === 'ar';
  const t = (en, ar) => isAr ? ar : en;
  const goExternal = url => window.open(url, '_blank', 'noopener');
  return /*#__PURE__*/React.createElement("footer", {
    className: "ed-footer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-footer__top"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Logo, {
    tone: "white",
    height: 42
  }), /*#__PURE__*/React.createElement("p", null, t('A holding company that exists to own assets and steer its companies for the long term.', 'شركة قابضة توجد لتملّك الأصول وتوجيه شركاتها على المدى الطويل.'))), /*#__PURE__*/React.createElement("div", {
    className: "ed-footer__cols"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h5", null, t('Company', 'الشركة')), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNavigate('about');
    }
  }, t('About', 'من نحن'))), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNavigate('portfolio');
    }
  }, t('Our Companies', 'شركاتنا'))), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNavigate('contact');
    }
  }, t('Contact', 'تواصل'))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h5", null, t('Companies', 'الشركات')), /*#__PURE__*/React.createElement("ul", null, D.companies.map(c => /*#__PURE__*/React.createElement("li", {
    key: c.name
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      goExternal(c.url);
    }
  }, c.name, " \u2197"))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h5", null, t('Contact', 'تواصل')), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: 'tel:' + D.contact.phone.replace(/\s/g, ''),
    dir: "ltr"
  }, D.contact.phone)), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", null, isAr ? D.contact.hoursAr : D.contact.hours)), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", null, isAr ? D.contact.locationAr : D.contact.location)))))), /*#__PURE__*/React.createElement("div", {
    className: "ed-footer__bottom"
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 ", t('KHAIRAH HOLDING CO.', 'شركة خيرة القابضة')), /*#__PURE__*/React.createElement("span", null, t('RIYADH · SAUDI ARABIA', 'الرياض · السعودية')))));
}
window.Footer = Footer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Header.jsx
try { (() => {
function Header({
  active,
  onNavigate,
  lang,
  onToggleLang
}) {
  const {
    Logo,
    Button
  } = window.KhairahHoldingDesignSystem_52a247;
  const isAr = lang === 'ar';
  const items = window.KH_DATA.nav.map(n => ({
    ...n,
    label: isAr ? n.labelAr : n.label
  }));
  return /*#__PURE__*/React.createElement("header", {
    className: "ed-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-wrap ed-header__inner"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNavigate('home');
    },
    "aria-label": "Khairah Holding home",
    style: {
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    height: 36
  })), /*#__PURE__*/React.createElement("nav", {
    className: "edx-nav",
    "aria-label": "Primary"
  }, items.map(n => /*#__PURE__*/React.createElement("a", {
    key: n.id,
    href: "#",
    className: active === n.id ? 'on' : '',
    onClick: e => {
      e.preventDefault();
      onNavigate(n.id);
    }
  }, n.label))), /*#__PURE__*/React.createElement("div", {
    className: "ed-header__right"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ed-lang",
    onClick: onToggleLang,
    "aria-label": "Toggle language"
  }, isAr ? 'EN' : 'ع'), /*#__PURE__*/React.createElement("div", {
    className: "ed-header__cta"
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    onClick: () => onNavigate('contact')
  }, isAr ? 'تواصل' : 'Get in touch')))));
}
window.Header = Header;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/HomePage.jsx
try { (() => {
function HomePage({
  onNavigate,
  lang
}) {
  const {
    Button
  } = window.KhairahHoldingDesignSystem_52a247;
  const D = window.KH_DATA;
  const isAr = lang === 'ar';
  const t = (en, ar) => isAr ? ar : en;
  const sectors = [{
    img: '../../assets/imagery/photo-water.jpg',
    label: t('Water Treatment', 'معالجة المياه')
  }, {
    img: '../../assets/imagery/photo-utilities.jpg',
    label: t('Utilities & Engineering', 'المرافق والهندسة')
  }, {
    img: '../../assets/imagery/photo-towers-up.jpg',
    label: t('Asset Ownership', 'تملّك الأصول')
  }];
  const principles = [{
    h: t('Owns assets', 'تملّك الأصول'),
    p: t('The company exists for the purpose of owning assets.', 'توجد الشركة لغرض تملّك الأصول.')
  }, {
    h: t('Gains control', 'السيطرة'),
    p: t('Formed to gain control over one or more operating companies.', 'تتأسس للسيطرة على شركة تشغيلية أو أكثر.')
  }, {
    h: t('Long-term value', 'قيمة طويلة الأمد'),
    p: t('Steers its subsidiaries to build enduring value.', 'توجّه شركاتها التابعة لبناء قيمة مستدامة.')
  }, {
    h: t('Not operational', 'دون تشغيل مباشر'),
    p: t('It does not buy or sell products and services itself.', 'لا تشتري المنتجات والخدمات أو تبيعها بنفسها.')
  }];
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("section", {
    className: "edx-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "edx-hero__card"
  }, /*#__PURE__*/React.createElement("img", {
    className: "edx-hero__photo",
    src: "../../assets/imagery/photo-riyadh-skyline.jpg",
    alt: isAr ? 'أفق مدينة الرياض مع برج المملكة' : 'Riyadh city skyline with Kingdom Tower'
  }), /*#__PURE__*/React.createElement("div", {
    className: "edx-hero__scrim"
  }), /*#__PURE__*/React.createElement("div", {
    className: "c"
  }, /*#__PURE__*/React.createElement("span", {
    className: "edx-hero__kicker"
  }, t('Khairah Holding Co.', 'شركة خيرة القابضة')), /*#__PURE__*/React.createElement("h1", {
    className: "edx-hero__title"
  }, t('Owning assets, growing companies for the long term.', 'نملك الأصول، وننمّي الشركات على المدى الطويل.')), /*#__PURE__*/React.createElement("p", {
    className: "edx-hero__lead"
  }, t('Khairah Holding exists to own assets and gain control over operating companies — building long-term value across its subsidiaries.', 'تأسست خيرة القابضة لتملّك الأصول والسيطرة على شركات تشغيلية، وبناء قيمة طويلة الأمد عبر شركاتها التابعة.')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '0.9rem',
      flexWrap: 'wrap',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "inverse",
    onClick: () => onNavigate('portfolio'),
    iconRight: /*#__PURE__*/React.createElement("span", null, isAr ? '←' : '→')
  }, t('Our companies', 'شركاتنا')), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: () => onNavigate('about')
  }, t('About us', 'من نحن'))), /*#__PURE__*/React.createElement("span", {
    className: "edx-hero__loc"
  }, t('Riyadh, Kingdom of Saudi Arabia', 'الرياض، المملكة العربية السعودية'))), /*#__PURE__*/React.createElement("div", {
    className: "edx-hero__cards"
  }, /*#__PURE__*/React.createElement("div", {
    className: "edx-glass"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, t('Sectors', 'القطاعات')), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, t('Water treatment, utilities & engineering, asset ownership.', 'معالجة المياه، المرافق والهندسة، تملّك الأصول.'))), /*#__PURE__*/React.createElement("div", {
    className: "edx-glass"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, t('Owned & operated', 'شركاتنا التابعة')), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, t('Liquids Technology Trading · USTC Utilities Solutions.', 'ليكويدز تكنولوجي للتجارة · USTC لحلول المرافق.')))))), /*#__PURE__*/React.createElement("section", {
    className: "edx-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "edx-about"
  }, /*#__PURE__*/React.createElement("div", {
    className: "edx-about__body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "edx-pill"
  }, t('About us', 'من نحن')), /*#__PURE__*/React.createElement("h2", null, t('Get to know Khairah Holding', 'تعرّف على خيرة القابضة')), /*#__PURE__*/React.createElement("p", null, t('A holding company does not run operations itself. It exists to own assets and to gain control over one or more companies — not to buy or sell products and services. We steer our subsidiaries for the long term.', 'الشركة القابضة لا تمارس عمليات تشغيلية بنفسها، بل توجد لتملّك الأصول والسيطرة على شركة أو أكثر — لا لشراء المنتجات والخدمات أو بيعها. نوجّه شركاتنا التابعة على المدى الطويل.')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    onClick: () => onNavigate('about'),
    iconRight: /*#__PURE__*/React.createElement("span", null, isAr ? '←' : '→')
  }, t('Learn more', 'اقرأ المزيد')))), /*#__PURE__*/React.createElement("div", {
    className: "edx-about__media"
  }, /*#__PURE__*/React.createElement("img", {
    className: "photo",
    src: "../../assets/imagery/photo-towers-up.jpg",
    alt: t('Portfolio of modern high-rise assets', 'محفظة أصول عمرانية حديثة')
  }), /*#__PURE__*/React.createElement("div", {
    className: "edx-statcard edx-statcard--a"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, D.stats[2].value, " ", /*#__PURE__*/React.createElement("em", null, isAr ? D.stats[2].labelAr : D.stats[2].label)), /*#__PURE__*/React.createElement("div", {
    className: "s"
  }, t('Delivered across the water treatment and utilities sectors.', 'أُنجزت عبر قطاعي معالجة المياه والمرافق.'))), /*#__PURE__*/React.createElement("div", {
    className: "edx-statcard edx-statcard--b"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, D.companies.length < 10 ? '0' + D.companies.length : D.companies.length, " ", /*#__PURE__*/React.createElement("em", null, t('Companies', 'شركات'))), /*#__PURE__*/React.createElement("div", {
    className: "s"
  }, t('Operating subsidiaries owned and steered by the group.', 'شركات تشغيلية تابعة تملكها المجموعة وتوجّهها.'))))))), /*#__PURE__*/React.createElement("section", {
    className: "edx-section",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "edx-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "edx-section__head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "edx-pill"
  }, t('Sectors', 'القطاعات')), /*#__PURE__*/React.createElement("h2", null, t('Where we own and operate', 'أين نتملّك ونعمل'))), /*#__PURE__*/React.createElement("p", {
    className: "edx-section__lead"
  }, t('We believe in disciplined ownership — steering companies across essential infrastructure sectors.', 'نؤمن بالتملّك المنضبط — نوجّه شركات تعمل في قطاعات البنية الأساسية.'))), /*#__PURE__*/React.createElement("div", {
    className: "edx-cardgrid"
  }, sectors.map(s => /*#__PURE__*/React.createElement("div", {
    className: "edx-card",
    key: s.label,
    onClick: () => onNavigate('portfolio')
  }, /*#__PURE__*/React.createElement("img", {
    src: s.img,
    alt: ""
  }), /*#__PURE__*/React.createElement("span", {
    className: "label"
  }, s.label), /*#__PURE__*/React.createElement("span", {
    className: "go"
  }, "\u2197")))), /*#__PURE__*/React.createElement("div", {
    className: "edx-panel__foot"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: () => onNavigate('portfolio')
  }, t('View all companies', 'عرض كل الشركات'), " ", isAr ? '←' : '→'))))), /*#__PURE__*/React.createElement("section", {
    className: "edx-section",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "edx-section__head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "edx-pill"
  }, t('How we work', 'كيف نعمل')), /*#__PURE__*/React.createElement("h2", null, t('What a holding company does', 'ما الذي تقوم به الشركة القابضة'))), /*#__PURE__*/React.createElement("p", {
    className: "edx-section__lead"
  }, t('Ownership, control and stewardship — not day-to-day operations.', 'تملّك وسيطرة وإشراف — لا عمليات تشغيلية يومية.'))), /*#__PURE__*/React.createElement("div", {
    className: "edx-benefits"
  }, principles.map((v, i) => /*#__PURE__*/React.createElement("div", {
    className: "edx-benefit",
    key: v.h
  }, /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, isAr ? ['٠١', '٠٢', '٠٣', '٠٤'][i] : String(i + 1).padStart(2, '0')), /*#__PURE__*/React.createElement("h3", null, v.h), /*#__PURE__*/React.createElement("p", null, v.p)))))), /*#__PURE__*/React.createElement("section", {
    className: "ed-cta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-wrap ed-cta__inner"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ed-kicker"
  }, t('Get in touch', 'تواصل')), /*#__PURE__*/React.createElement("div", {
    className: "ed-cta__row"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "ed-cta__head"
  }, isAr ? /*#__PURE__*/React.createElement(React.Fragment, null, "\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 ", /*#__PURE__*/React.createElement("span", {
    className: "accent"
  }, "\u062E\u064A\u0631\u0629 \u0627\u0644\u0642\u0627\u0628\u0636\u0629.")) : /*#__PURE__*/React.createElement(React.Fragment, null, "Partner with ", /*#__PURE__*/React.createElement("span", {
    className: "accent"
  }, "Khairah\xA0Holding."))), /*#__PURE__*/React.createElement(Button, {
    variant: "inverse",
    onClick: () => onNavigate('contact')
  }, isAr ? `اتصل ${D.contact.phone}` : `Call ${D.contact.phone}`)))));
}
window.HomePage = HomePage;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/HomePage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/PortfolioPage.jsx
try { (() => {
function PortfolioPage({
  onNavigate,
  lang
}) {
  const {
    Button
  } = window.KhairahHoldingDesignSystem_52a247;
  const D = window.KH_DATA;
  const isAr = lang === 'ar';
  const t = (en, ar) => isAr ? ar : en;
  const openCompany = c => window.open(c.url, '_blank', 'noopener');
  const media = {
    'Water Treatment': '../../assets/imagery/photo-water.jpg',
    'Utilities & Engineering': '../../assets/imagery/photo-utilities.jpg'
  };
  const domain = url => url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("section", {
    className: "edx-pagehead"
  }, /*#__PURE__*/React.createElement("img", {
    className: "edx-pagehead__photo",
    src: "../../assets/imagery/photo-construction.jpg",
    alt: "",
    style: {
      objectPosition: 'center 40%'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "edx-pagehead__scrim"
  }), /*#__PURE__*/React.createElement("div", {
    className: "ed-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "edx-pill edx-pill--glass"
  }, isAr ? 'شركاتنا' : 'Our Companies'), /*#__PURE__*/React.createElement("h1", {
    className: "edx-pagehead__title"
  }, isAr ? 'الشركات التي نملكها' : 'The companies we own'), /*#__PURE__*/React.createElement("p", {
    className: "edx-pagehead__lead"
  }, isAr ? 'تملك خيرة القابضة شركات متخصصة تخدم قطاعي معالجة المياه والمرافق بالمكوّنات والكيماويات والحلول الهندسية المتكاملة.' : 'Khairah Holding owns specialised businesses serving the water-treatment and utilities sectors with components, chemicals, and complete engineering solutions.'))), /*#__PURE__*/React.createElement("section", {
    className: "ed-section",
    style: {
      paddingBottom: 'clamp(2rem,4vw,3.5rem)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "edx-section__head",
    style: {
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "edx-pill"
  }, isAr ? '٠١ — المحفظة' : '01 — Portfolio'), /*#__PURE__*/React.createElement("h2", null, t('Two operating companies, two essential sectors', 'شركتان تشغيليتان في قطاعين أساسيين'))), /*#__PURE__*/React.createElement("p", {
    className: "edx-section__lead"
  }, t('Each company is owned and steered by the group for the long term.', 'كل شركة مملوكة للمجموعة وتوجّهها على المدى الطويل.'))), D.companies.map((c, i) => /*#__PURE__*/React.createElement("div", {
    className: 'edy-profile' + (i % 2 === 1 ? ' edy-profile--rev' : ''),
    key: c.name
  }, /*#__PURE__*/React.createElement("div", {
    className: "edy-profile__media"
  }, /*#__PURE__*/React.createElement("img", {
    src: media[c.sector],
    alt: ""
  })), /*#__PURE__*/React.createElement("div", {
    className: "edy-profile__body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "edx-pill"
  }, isAr ? c.sectorAr : c.sector), /*#__PURE__*/React.createElement("h3", null, c.name), /*#__PURE__*/React.createElement("p", null, isAr ? c.descAr : c.desc), /*#__PURE__*/React.createElement("div", {
    className: "edy-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "edy-kv__row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "edy-kv__k"
  }, t('Sector', 'القطاع')), /*#__PURE__*/React.createElement("span", {
    className: "edy-kv__v"
  }, isAr ? c.sectorAr : c.sector)), /*#__PURE__*/React.createElement("div", {
    className: "edy-kv__row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "edy-kv__k"
  }, t('Role in group', 'الدور في المجموعة')), /*#__PURE__*/React.createElement("span", {
    className: "edy-kv__v"
  }, t('Operating subsidiary', 'شركة تشغيلية تابعة'))), /*#__PURE__*/React.createElement("div", {
    className: "edy-kv__row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "edy-kv__k"
  }, t('Website', 'الموقع الإلكتروني')), /*#__PURE__*/React.createElement("span", {
    className: "edy-kv__v",
    dir: "ltr"
  }, domain(c.url)))), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: () => openCompany(c)
  }, t('Visit website', 'زيارة الموقع'), " \u2197")))))), /*#__PURE__*/React.createElement("section", {
    className: "ed-cta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-wrap ed-cta__inner"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ed-kicker"
  }, isAr ? 'تواصل' : 'Get in touch'), /*#__PURE__*/React.createElement("div", {
    className: "ed-cta__row"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "ed-cta__head"
  }, isAr ? /*#__PURE__*/React.createElement(React.Fragment, null, "\u0647\u0644 \u0644\u062F\u064A\u0643 ", /*#__PURE__*/React.createElement("span", {
    className: "accent"
  }, "\u0627\u0633\u062A\u0641\u0633\u0627\u0631\u061F")) : /*#__PURE__*/React.createElement(React.Fragment, null, "Have an ", /*#__PURE__*/React.createElement("span", {
    className: "accent"
  }, "enquiry?"))), /*#__PURE__*/React.createElement(Button, {
    variant: "inverse",
    onClick: () => onNavigate('contact')
  }, isAr ? 'تواصل معنا' : 'Get in touch')))));
}
window.PortfolioPage = PortfolioPage;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/PortfolioPage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/data.js
try { (() => {
// Khairah Holding — real content sourced from khayiraholding.com (index page).
// Note: the live site's stat figures (945 / 1,280 / 578 / 26) appear to be
// template defaults; replace with verified numbers when available.
window.KH_DATA = {
  stats: [{
    value: '945',
    label: 'Work Hours',
    labelAr: 'ساعة عمل'
  }, {
    value: '1,280',
    label: 'Great Reviews',
    labelAr: 'تقييم ممتاز'
  }, {
    value: '578',
    label: 'Projects Done',
    labelAr: 'مشروع منجز'
  }, {
    value: '26',
    label: 'Awards Won',
    labelAr: 'جائزة'
  }],
  sectors: [{
    id: 'Water Treatment',
    name: 'Water Treatment',
    nameAr: 'معالجة المياه'
  }, {
    id: 'Utilities & Engineering',
    name: 'Utilities & Engineering',
    nameAr: 'المرافق والهندسة'
  }],
  companies: [{
    name: 'Liquids Technology Trading',
    sector: 'Water Treatment',
    sectorAr: 'معالجة المياه',
    url: 'http://liquidstechnology.com/',
    desc: 'Carries several global brands for components and chemicals for the water treatment industry.',
    descAr: 'تقدّم عدداً من العلامات العالمية للمكوّنات والكيماويات الخاصة بصناعة معالجة المياه.'
  }, {
    name: 'USTC — Utilities Solutions Trading',
    sector: 'Utilities & Engineering',
    sectorAr: 'المرافق والهندسة',
    url: 'https://www.ustc.com.sa/',
    desc: 'Complete engineering solutions delivering a wide range of products for the utilities sector.',
    descAr: 'حلول هندسية متكاملة تقدّم مجموعة واسعة من المنتجات لقطاع المرافق.'
  }],
  contact: {
    phone: '+966 11 812 5290',
    hours: 'Sun – Thu, 08:00 – 17:00',
    hoursAr: 'الأحد - الخميس، ٠٨:٠٠ - ١٧:٠٠',
    location: 'Riyadh, Saudi Arabia',
    locationAr: 'الرياض، المملكة العربية السعودية'
  },
  nav: [{
    id: 'home',
    label: 'Home',
    labelAr: 'الرئيسية'
  }, {
    id: 'about',
    label: 'About',
    labelAr: 'من نحن'
  }, {
    id: 'portfolio',
    label: 'Our Companies',
    labelAr: 'شركاتنا'
  }, {
    id: 'contact',
    label: 'Contact',
    labelAr: 'تواصل'
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.SplitSection = __ds_scope.SplitSection;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.PillNav = __ds_scope.PillNav;

__ds_ns.LOGO = __ds_scope.LOGO;

})();
