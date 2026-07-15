// render.js - pure HTML rendering. Every page (gallery, wrapper, history, how-to-ship) is
// produced here from plain data + config, so the live server and the static builder render
// identically.
//
// Design: cool-stone + graphite, monochrome. Colour is reserved strictly for meaning (status
// pills and the version badge). All tokens live in one :root block (cssVars); per-surface CSS
// references var(...) only. URLs are prefixed with `base` (config.basePath); on a root-hosted
// site base is "". Internal links use path-style version URLs (/p/<slug>/v/<n>/) so they work
// as static folders and on the live server.

const { esc, fmtDate, STATUS_MAP } = require("./content");

// ---- colour helpers (kept for the one brand-tinted element: the version badge + favicon) ---

function hexToRgb(hex) {
  let h = String(hex || "").replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) h = "2A2D31"; // graphite fallback on a bad value
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x)))
    .toString(16).padStart(2, "0")).join("");
}
function tintOf(hex, amt) { // mix toward white; amt 0 = brand, 1 = white
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
}
function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function luminance(hex) { // relative luminance, 0 (black) to 1 (white)
  const c = hexToRgb(hex).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.2126 * c[2];
}

// The version badge is the single brand-tinted, meaning-bearing chrome element. Guard so a
// pale brand never drops the badge text below AA: fall back to graphite ink.
function palette(cfg) {
  const brand = cfg.brandColor || "#2A2D31";
  const ink = luminance(brand) > 0.4 ? "#17181A" : brand;
  return {
    brand,
    badgeInk: ink,
    badgeFill: tintOf(brand, 0.92),
    badgeSolid: brand,
  };
}

// ---- fonts ---------------------------------------------------------------------------

function fontStack(cfg) {
  const fam = cfg.font && cfg.font.family;
  const sys = "system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif";
  return fam ? `'${fam}',${sys}` : sys;
}
// Optional serif/display face for page headings. Defaults to the sans (so a single-font
// setup like Space Grotesk styles headings too).
function fontSerif(cfg) {
  const h = cfg.font && cfg.font.heading && cfg.font.heading.family;
  return h ? `'${h}',Georgia,'Times New Roman',serif` : "var(--font-sans)";
}
function fontHead(cfg) {
  const links = [];
  const sansUrl = cfg.font && cfg.font.cssUrl;
  const headUrl = cfg.font && cfg.font.heading && cfg.font.heading.cssUrl;
  if (sansUrl || headUrl) {
    links.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
    links.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
  }
  if (sansUrl) links.push(`<link rel="stylesheet" href="${esc(sansUrl)}">`);
  if (headUrl) links.push(`<link rel="stylesheet" href="${esc(headUrl)}">`);
  return links.join("");
}

// A self-contained SVG favicon (brand square + bulb glyph, or a letter). Data URI, no extra
// file, no /favicon.ico 404.
function faviconTag(cfg) {
  const useBulb = (cfg.icon || "") === "bulb";
  let svg;
  if (useBulb) {
    // Golden bulb outline, transparent background.
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${GOLD}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${BULB_PATH}</svg>`;
  } else {
    const brand = cfg.brandColor || "#2A2D31";
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${brand}"/><text x="16" y="21" font-family="system-ui,Arial,sans-serif" font-size="17" font-weight="700" fill="#ffffff" text-anchor="middle">${esc(cfg.mark || "P")}</text></svg>`;
  }
  return `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(svg)}">`;
}

// ---- inline SVG icons (decorative; the control carries the accessible name) -----------

const SVG_ATTR = 'width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
// Lightbulb (ideas / prototypes). Reused by the brand mark and the favicon.
const BULB_PATH = '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>';
const GOLD = "#D4AF37"; // golden bulb outline on a transparent background
const ICON = {
  back: `<svg ${SVG_ATTR}><path d="M15 18l-6-6 6-6"/></svg>`,
  history: `<svg ${SVG_ATTR}><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>`,
  download: `<svg ${SVG_ATTR}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  fullscreen: `<svg ${SVG_ATTR}><path d="M15 3h6v6"/><path d="M10 14L21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`,
  close: `<svg ${SVG_ATTR}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  grid: `<svg ${SVG_ATTR}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
  list: `<svg ${SVG_ATTR}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3.5" y1="6" x2="3.51" y2="6"/><line x1="3.5" y1="12" x2="3.51" y2="12"/><line x1="3.5" y1="18" x2="3.51" y2="18"/></svg>`,
};

// A self-contained, accessible custom dropdown (listbox), injected into pages that need it.
// Replaces native <select> so the OPEN menu matches the design (the native option list cannot
// be styled). Keyboard: Arrow/Home/End/Enter/Space/Escape/Tab + type-ahead. Returns
// {el, value(), set(v)}. No dependencies.
const CSELECT_JS = `
function CSelect(cfg){
  var host=typeof cfg.mount==='string'?document.querySelector(cfg.mount):cfg.mount;
  if(!host)return null;
  CSelect._n=(CSelect._n||0)+1; var uid='cs'+CSelect._n;
  var items=cfg.items||[]; var value=cfg.value||(items[0]?items[0].value:'');
  var open=false, active=0, typed='', typedT=0;
  function e2(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  var wrap=document.createElement('div'); wrap.className='cselect'; wrap.setAttribute('data-open','false');
  var trig=document.createElement('button'); trig.type='button'; trig.className='cselect-trigger';
  trig.setAttribute('aria-haspopup','listbox'); trig.setAttribute('aria-expanded','false');
  if(cfg.label)trig.setAttribute('aria-label',cfg.label);
  var val=document.createElement('span'); val.className='cselect-value';
  var car=document.createElement('span'); car.className='cselect-caret';
  car.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';
  trig.appendChild(val); trig.appendChild(car);
  var menu=document.createElement('ul'); menu.className='cselect-menu'; menu.id=uid+'-menu';
  menu.setAttribute('role','listbox'); menu.setAttribute('tabindex','-1');
  if(cfg.label)menu.setAttribute('aria-label',cfg.label);
  trig.setAttribute('aria-controls',menu.id);
  wrap.appendChild(trig); wrap.appendChild(menu);
  host.innerHTML=''; host.appendChild(wrap);
  var CHK='<svg class="check" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  function idx(){for(var i=0;i<items.length;i++){if(items[i].value===value)return i;}return 0;}
  function labelFor(v){for(var i=0;i<items.length;i++){if(items[i].value===v)return items[i].label;}return '';}
  function build(){var h='';for(var i=0;i<items.length;i++){var sel=items[i].value===value;h+='<li id="'+uid+'-opt-'+i+'" role="option" class="cselect-opt'+(i===active?' active':'')+'" data-i="'+i+'" aria-selected="'+(sel?'true':'false')+'"><span>'+e2(items[i].label)+'</span>'+CHK+'</li>';}menu.innerHTML=h;}
  function updTrigger(){val.textContent=labelFor(value);}
  function setActive(i){active=Math.max(0,Math.min(items.length-1,i));build();menu.setAttribute('aria-activedescendant',uid+'-opt-'+active);var el=menu.children[active];if(el&&el.scrollIntoView)el.scrollIntoView({block:'nearest'});}
  function openM(){if(open)return;open=true;active=idx();wrap.setAttribute('data-open','true');trig.setAttribute('aria-expanded','true');build();menu.setAttribute('aria-activedescendant',uid+'-opt-'+active);menu.focus();document.addEventListener('mousedown',outside,true);}
  function closeM(back){if(!open)return;open=false;wrap.setAttribute('data-open','false');trig.setAttribute('aria-expanded','false');menu.removeAttribute('aria-activedescendant');document.removeEventListener('mousedown',outside,true);if(back!==false)trig.focus();}
  function outside(ev){if(!wrap.contains(ev.target))closeM(false);}
  function choose(i){if(i<0||i>=items.length)return;var nv=items[i].value;var ch=nv!==value;value=nv;updTrigger();closeM();if(ch&&cfg.onChange)cfg.onChange(value);}
  trig.addEventListener('click',function(){open?closeM():openM();});
  trig.addEventListener('keydown',function(ev){if(ev.key==='ArrowDown'||ev.key==='ArrowUp'||ev.key==='Enter'||ev.key===' '){ev.preventDefault();openM();}});
  menu.addEventListener('keydown',function(ev){
    if(ev.key==='Escape'){ev.preventDefault();closeM();return;}
    if(ev.key==='ArrowDown'){ev.preventDefault();setActive(active+1);return;}
    if(ev.key==='ArrowUp'){ev.preventDefault();setActive(active-1);return;}
    if(ev.key==='Home'){ev.preventDefault();setActive(0);return;}
    if(ev.key==='End'){ev.preventDefault();setActive(items.length-1);return;}
    if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();choose(active);return;}
    if(ev.key==='Tab'){closeM(false);return;}
    if(ev.key.length===1){var now=Date.now();if(now-typedT>800)typed='';typedT=now;typed+=ev.key.toLowerCase();for(var i=0;i<items.length;i++){if(String(items[i].label||'').toLowerCase().indexOf(typed)===0){setActive(i);break;}}}
  });
  menu.addEventListener('click',function(ev){var li=ev.target.closest?ev.target.closest('.cselect-opt'):null;if(li)choose(parseInt(li.getAttribute('data-i'),10));});
  menu.addEventListener('mousemove',function(ev){var li=ev.target.closest?ev.target.closest('.cselect-opt'):null;if(li){var i=parseInt(li.getAttribute('data-i'),10);if(i!==active){var cur=menu.querySelector('.cselect-opt.active');if(cur)cur.classList.remove('active');li.classList.add('active');active=i;menu.setAttribute('aria-activedescendant',uid+'-opt-'+i);}}});
  updTrigger();
  return {el:wrap,value:function(){return value;},set:function(v){value=v;updTrigger();if(open)build();}};
}
`;

// ---- shared style layers -------------------------------------------------------------

function cssVars(cfg) {
  const pal = palette(cfg);
  return `:root{
--bg:#F6F7F8;--surface:#FFFFFF;--surface-raised:#F4F6F8;--surface-sunken:#F1F2F4;
--ink:#17181A;--text-secondary:#5A5F66;--text-muted:#6A7078;
--hairline:#E6E8EB;--hairline-strong:#D6D9DE;
--selected-fill:#F1F2F4;--selected-border:#D6D9DE;
--focus-ring:rgba(23,24,26,0.45);--focus-gap:#FFFFFF;
--badge-ink:${pal.badgeInk};--badge-fill:${pal.badgeFill};--badge-solid:${pal.badgeSolid};--gold:${GOLD};
--shadow-resting:0 1px 2px rgba(23,24,26,0.05);
--shadow-hover:0 2px 6px rgba(23,24,26,0.05),0 8px 24px rgba(23,24,26,0.08);
--shadow-bar:0 1px 2px rgba(23,24,26,0.05);
--shadow-panel:-16px 0 40px rgba(23,24,26,0.14);
--radius-xs:6px;--radius-sm:8px;--radius-md:10px;--radius-lg:12px;--radius-pill:999px;
--dur-fast:150ms;--dur-mid:200ms;--dur-slow:280ms;
--ease-standard:cubic-bezier(0.4,0,0.2,1);--ease-out:cubic-bezier(0.16,1,0.3,1);--ease-panel:cubic-bezier(0.32,0.72,0,1);
--font-sans:${fontStack(cfg)};--font-serif:${fontSerif(cfg)};
--font-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace;
}`;
}

// Reset + body + global focus-visible + reduced-motion. Shared by every page.
function baseCss() {
  return `
*{box-sizing:border-box;}
body{margin:0;font-family:var(--font-sans);background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}
a{color:inherit;text-decoration:none;}
:where(a,button,select,input,[tabindex]):focus-visible{outline:none;box-shadow:0 0 0 2px var(--focus-gap),0 0 0 4px var(--focus-ring);border-radius:var(--radius-sm);transition:box-shadow var(--dur-fast) var(--ease-standard);}
.hub-mark.hub-mark--bulb{background:transparent;color:var(--gold);}
.vh{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}
.cselect{position:relative;display:inline-block;}
.cselect-trigger{display:inline-flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-width:150px;font-family:inherit;font-size:13px;font-weight:600;color:var(--ink);background:var(--surface);border:1px solid var(--hairline);border-radius:var(--radius-sm);padding:9px 11px;cursor:pointer;transition:border-color var(--dur-fast) var(--ease-standard);}
.cselect-trigger:hover,.cselect[data-open="true"] .cselect-trigger{border-color:var(--hairline-strong);}
.cselect-value{flex:1;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cselect-caret{flex:none;display:flex;color:var(--text-muted);transition:transform var(--dur-fast) var(--ease-standard);}
.cselect[data-open="true"] .cselect-caret{transform:rotate(180deg);}
.cselect-menu{position:absolute;top:calc(100% + 6px);left:0;min-width:100%;max-width:320px;max-height:300px;overflow:auto;margin:0;padding:6px;list-style:none;background:var(--surface);border:1px solid var(--hairline);border-radius:var(--radius-md);box-shadow:var(--shadow-hover);z-index:50;outline:none;opacity:0;transform:translateY(-4px);pointer-events:none;transition:opacity var(--dur-fast) var(--ease-standard),transform var(--dur-fast) var(--ease-standard);}
.cselect[data-open="true"] .cselect-menu{opacity:1;transform:translateY(0);pointer-events:auto;}
.cselect-opt{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border-radius:var(--radius-sm);font-size:13px;color:var(--text-secondary);cursor:pointer;white-space:nowrap;}
.cselect-opt.active{background:var(--surface-sunken);color:var(--ink);}
.cselect-opt[aria-selected="true"]{color:var(--ink);font-weight:600;}
.cselect-opt .check{flex:none;opacity:0;color:var(--text-secondary);}
.cselect-opt[aria-selected="true"] .check{opacity:1;}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important;}
  .card{animation:none!important;opacity:1!important;transform:none!important;}
  .panel{transition:none!important;}
}`;
}

// The glyph inside the brand mark: a bulb icon (default) or a letter (white-label fallback).
function brandGlyph(cfg, px) {
  if ((cfg.icon || "") === "bulb") {
    const s = Math.round(px * 0.85); // no square behind it, so the bulb fills the mark
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${BULB_PATH}</svg>`;
  }
  return esc(cfg.mark || "P");
}
// The brand mark (chrome identity): a golden bulb on transparent, or a graphite letter square.
function brandMark(cfg, size) {
  const s = size || 32;
  const bulb = (cfg.icon || "") === "bulb";
  const cls = "hub-mark" + (bulb ? " hub-mark--bulb" : "");
  const fs = Math.round(s * 0.47);
  return `<span class="${cls}" style="width:${s}px;height:${s}px;font-size:${fs}px" aria-hidden="true">${brandGlyph(cfg, s)}</span>`;
}

// ---- gallery -------------------------------------------------------------------------

function galleryCss() {
  return `
.topbar{height:58px;background:var(--surface);border-bottom:1px solid var(--hairline-strong);box-shadow:var(--shadow-bar);display:flex;align-items:center;justify-content:space-between;padding:0 24px;}
.brand{display:flex;align-items:center;gap:10px;}
.hub-mark{border-radius:var(--radius-sm);background:var(--badge-solid);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:600;flex:none;}
.brand-name{font-weight:600;font-size:15px;color:var(--ink);letter-spacing:-.01em;}
.count{font-size:12px;font-weight:600;color:var(--text-muted);background:var(--surface);border:1px solid var(--hairline);padding:3px 10px;border-radius:var(--radius-pill);white-space:nowrap;}
.wrap{max-width:1100px;margin:0 auto;padding:30px 22px 64px;}
.h1{font-family:var(--font-serif);font-size:24px;font-weight:600;color:var(--ink);margin:0 0 4px;letter-spacing:-.02em;}
.sub{color:var(--text-muted);font-size:14px;margin:0 0 22px;}
.toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:20px;}
.toolbar input,.toolbar select{font-family:inherit;font-size:13px;color:var(--ink);border:1px solid var(--hairline);background:var(--surface);border-radius:var(--radius-sm);padding:9px 11px;outline:none;transition:border-color var(--dur-fast) var(--ease-standard);}
.toolbar select{cursor:pointer;}
.toolbar input:hover,.toolbar select:hover{border-color:var(--hairline-strong);}
.toolbar input[type=search]{flex:1;min-width:200px;}
.toolbar .sel-host{flex:none;display:inline-flex;}
.viewtoggle{display:inline-flex;border:1px solid var(--hairline);border-radius:var(--radius-sm);overflow:hidden;background:var(--surface);flex:none;}
.vt{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;font-family:inherit;font-size:13px;font-weight:600;color:var(--text-muted);background:var(--surface);border:0;cursor:pointer;transition:background-color var(--dur-fast) var(--ease-standard),color var(--dur-fast) var(--ease-standard);}
.vt+.vt{border-left:1px solid var(--hairline);}
.vt:hover{color:var(--ink);}
.vt[aria-pressed="true"]{background:var(--surface-sunken);color:var(--ink);}
.vt svg{display:block;}
#grid.is-tile{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:16px;}
#grid.is-list{display:block;}
.card{background:var(--surface);border:1px solid var(--hairline);border-radius:var(--radius-lg);padding:16px 20px;display:flex;flex-direction:column;gap:10px;box-shadow:var(--shadow-resting);cursor:pointer;
  transition:box-shadow var(--dur-mid) var(--ease-standard),border-color var(--dur-fast) var(--ease-standard),background-color var(--dur-fast) var(--ease-standard);
  opacity:0;animation:cardIn var(--dur-slow) var(--ease-out) forwards;animation-delay:calc(var(--i,0) * 40ms);}
#grid.is-tile.ready .card{animation:none;opacity:1;transform:none;}
@keyframes cardIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
.card:hover{box-shadow:var(--shadow-hover);border-color:var(--hairline-strong);}
.card:active{background:var(--surface-sunken);box-shadow:var(--shadow-resting);}
.card:focus-visible{box-shadow:0 0 0 2px var(--focus-gap),0 0 0 4px var(--focus-ring);border-color:var(--hairline-strong);border-radius:var(--radius-lg);}
.card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.card-title{font-size:15px;font-weight:600;color:var(--ink);letter-spacing:-.01em;}
.card-desc{font-size:14px;color:var(--text-secondary);line-height:1.5;min-height:42px;}
.card-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.card-meta .left{display:flex;gap:6px;align-items:center;}
.who{font-size:12px;font-weight:500;color:var(--text-muted);}
.chip{font-size:11px;font-weight:600;padding:3px 9px;border-radius:var(--radius-pill);letter-spacing:.01em;white-space:nowrap;}
.vbadge{font-size:11px;font-weight:600;color:var(--badge-ink);background:var(--badge-fill);padding:2px 7px;border-radius:var(--radius-xs);}
.prod{font-size:11px;font-weight:600;color:var(--text-secondary);background:var(--surface-sunken);padding:2px 8px;border-radius:var(--radius-xs);}
.list{width:100%;border:1px solid var(--hairline);border-radius:var(--radius-lg);overflow:hidden;background:var(--surface);box-shadow:var(--shadow-resting);}
.list table{width:100%;border-collapse:collapse;}
.list th{text-align:left;font-size:12px;font-weight:600;color:var(--text-muted);padding:11px 14px;background:var(--surface-raised);border-bottom:1px solid var(--hairline);white-space:nowrap;cursor:pointer;user-select:none;transition:color var(--dur-fast) var(--ease-standard);}
.list th:hover{color:var(--ink);}
.list th.sorted{color:var(--ink);}
.list th .th-in{display:inline-flex;align-items:center;gap:4px;}
.list th .caret{display:block;}
.list td{padding:12px 14px;border-bottom:1px solid var(--hairline);font-size:13px;color:var(--text-secondary);vertical-align:middle;}
.list tbody tr:last-child td{border-bottom:0;}
.list tbody tr{cursor:pointer;transition:background-color var(--dur-fast) var(--ease-standard);}
.list tbody tr:hover{background:var(--surface-sunken);}
.list .lt-title{font-weight:600;color:var(--ink);}
.list .col-versions{color:var(--text-muted);}
.pager{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:24px;flex-wrap:wrap;}
.pager button{min-width:34px;height:34px;padding:0 10px;border:1px solid var(--hairline);background:var(--surface);color:var(--text-secondary);border-radius:var(--radius-sm);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background-color var(--dur-fast) var(--ease-standard),border-color var(--dur-fast) var(--ease-standard),color var(--dur-fast) var(--ease-standard);}
.pager button:hover:not(:disabled){border-color:var(--hairline-strong);color:var(--ink);}
.pager button[aria-current="page"]{background:var(--badge-solid);color:#fff;border-color:var(--badge-solid);}
.pager button:disabled{opacity:.5;cursor:default;}
.pager .ellipsis{color:var(--text-muted);padding:0 2px;}
.empty{background:var(--surface);border:1px dashed var(--hairline-strong);border-radius:var(--radius-lg);padding:40px;text-align:center;color:var(--text-muted);}
.empty a{color:var(--ink);font-weight:600;text-decoration:underline;text-underline-offset:2px;cursor:pointer;}
.foot{margin-top:28px;font-size:13px;color:var(--text-muted);}
.foot a{color:var(--ink);text-decoration:underline;text-underline-offset:2px;}
@media (max-width:760px){ #grid .col-product, #grid .col-owner{display:none;} }
@media (max-width:520px){
  .topbar{padding:0 16px;}
  .wrap{padding:24px 16px 48px;}
  .toolbar input[type=search]{flex-basis:100%;}
  .toolbar .sel-host{flex:1 1 140px;}
  .cselect-trigger{min-width:0;}
  .viewtoggle{flex:1 1 100%;justify-content:center;}
  #grid .col-updated{display:none;}
}`;
}

function galleryHTML(items, cfg, base) {
  const pal = palette(cfg);
  const json = JSON.stringify(items).replace(/</g, "\\u003c");
  const statusJson = JSON.stringify(STATUS_MAP).replace(/</g, "\\u003c");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(cfg.name)}</title>
${faviconTag(cfg)}
${fontHead(cfg)}
<style>${cssVars(cfg)}${baseCss()}${galleryCss()}</style></head>
<body>
  <div class="topbar">
    <div class="brand">${brandMark(cfg, 32)}<div class="brand-name">${esc(cfg.name)}</div></div>
    <span class="count" id="count" role="status" aria-live="polite"></span>
  </div>
  <div class="wrap">
    <h1 class="h1">Prototypes</h1>
    <p class="sub">${esc(cfg.tagline || "")}</p>
    <div class="toolbar">
      <input type="search" id="q" aria-label="Search prototypes" placeholder="Search title, description, tags, owner">
      <span class="sel-host" id="sel-product"></span>
      <span class="sel-host" id="sel-status"></span>
      <span class="sel-host" id="sel-sort"></span>
      <div class="viewtoggle" role="group" aria-label="View">
        <button type="button" class="vt" id="vt-tile" aria-pressed="true" aria-label="Tile view">${ICON.grid}<span class="label">Tiles</span></button>
        <button type="button" class="vt" id="vt-list" aria-pressed="false" aria-label="List view">${ICON.list}<span class="label">List</span></button>
      </div>
    </div>
    <div class="is-tile" id="grid"></div>
    <div id="pager"></div>
    <p class="foot">Need to add one? See <a href="${base}/how-to-ship">How to ship</a>.</p>
  </div>
<script id="data" type="application/json">${json}</script>
<script>
${CSELECT_JS}
const BASE=${JSON.stringify(base || "")};
const STATUS=${statusJson};
const DATA=JSON.parse(document.getElementById('data').textContent);
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function chip(s){var m=STATUS[s];if(!m)return '';return '<span class="chip" style="background:'+m[0]+';color:'+m[1]+'">'+esc(m[2])+'</span>';}
var CUP='<svg class="caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg>';
var CDN='<svg class="caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';
var PAGE_SIZE={tile:12,list:20};
var COLS=[{key:'title',label:'Title',dir:'asc'},{key:'product',label:'Product',dir:'asc'},{key:'status',label:'Status',dir:'asc'},{key:'versions',label:'Version',dir:'desc'},{key:'updated',label:'Updated',dir:'desc'},{key:'owner',label:'Owner',dir:'asc'}];
var qEl=document.getElementById('q'),grid=document.getElementById('grid'),countEl=document.getElementById('count'),pagerEl=document.getElementById('pager'),tileBtn=document.getElementById('vt-tile'),listBtn=document.getElementById('vt-list');
var products=[...new Set(DATA.map(p=>p.product).filter(Boolean))].sort();
var view='tile',page=1,sort={key:'updated',dir:'desc'},firstRender=true;
var productSel=CSelect({mount:'#sel-product',label:'Filter by product',value:'',items:[{value:'',label:'All products'}].concat(products.map(function(p){return {value:p,label:p};})),onChange:function(){page=1;render();}});
var statusSel=CSelect({mount:'#sel-status',label:'Filter by status',value:'',items:[{value:'',label:'All statuses'},{value:'review',label:'In review'},{value:'final',label:'Final'},{value:'approved',label:'Approved'}],onChange:function(){page=1;render();}});
var sortSel=CSelect({mount:'#sel-sort',label:'Sort',value:'updated',items:[{value:'updated',label:'Recently updated'},{value:'title-asc',label:'Title A-Z'},{value:'title-desc',label:'Title Z-A'},{value:'versions',label:'Most versions'}],onChange:function(){sort=sortFromDropdown(sortSel.value());page=1;render();}});

function sortFromDropdown(v){
  if(v==='title-asc')return {key:'title',dir:'asc'};
  if(v==='title-desc')return {key:'title',dir:'desc'};
  if(v==='versions')return {key:'versions',dir:'desc'};
  return {key:'updated',dir:'desc'};
}
function compareBy(a,b,key){
  if(key==='versions')return (a.versionCount||0)-(b.versionCount||0);
  if(key==='updated')return (a.updatedMs||0)-(b.updatedMs||0);
  var av,bv;
  if(key==='status'){av=a.statusLabel||a.status||'';bv=b.statusLabel||b.status||'';}
  else if(key==='product'){av=a.product||'';bv=b.product||'';}
  else if(key==='owner'){av=a.owner||'';bv=b.owner||'';}
  else{av=a.title||'';bv=b.title||'';}
  return av.localeCompare(bv);
}
function filtered(){
  var q=qEl.value.trim().toLowerCase(),prod=productSel.value(),st=statusSel.value();
  return DATA.filter(function(p){
    if(prod&&p.product!==prod)return false;
    if(st&&p.status!==st)return false;
    if(q){var hay=(p.title+' '+p.description+' '+(p.tags||[]).join(' ')+' '+p.owner).toLowerCase();if(hay.indexOf(q)===-1)return false;}
    return true;
  });
}
function card(p,i){
  var v=p.versionCount>1?'<span class="vbadge">v'+p.currentVersion+'</span>':'';
  var prod=p.product?'<span class="prod">'+esc(p.product)+'</span>':'';
  return '<a class="card" style="--i:'+Math.min(i,8)+'" href="'+BASE+'/p/'+encodeURIComponent(p.slug)+'/">'
    +'<div class="card-head"><div class="card-title">'+esc(p.title)+'</div>'+chip(p.status)+'</div>'
    +'<div class="card-desc">'+(p.description?esc(p.description):'<span style="color:var(--text-muted)">No description</span>')+'</div>'
    +'<div class="card-meta"><span class="left">'+prod+v+'</span>'
    +'<span class="who">'+(p.updatedLabel?'Updated '+esc(p.updatedLabel):'')+'</span></div>'
    +'<div class="card-meta"><span class="who">'+(p.owner?esc(p.owner):'Unassigned')+'</span></div>'
    +'</a>';
}
function listHTML(rows){
  var head=COLS.map(function(c){
    var active=sort.key===c.key;
    var aria=active?(sort.dir==='asc'?'ascending':'descending'):'none';
    var caret=active?(sort.dir==='asc'?CUP:CDN):'';
    return '<th data-key="'+c.key+'" class="col-'+c.key+(active?' sorted':'')+'" aria-sort="'+aria+'"><span class="th-in">'+esc(c.label)+caret+'</span></th>';
  }).join('');
  var body=rows.map(function(p){
    var href=BASE+'/p/'+encodeURIComponent(p.slug)+'/';
    var ver=p.versionCount>0?('v'+(p.currentVersion||1)):'-';
    return '<tr data-href="'+href+'">'
      +'<td class="col-title"><a class="lt-title" href="'+href+'">'+esc(p.title)+'</a></td>'
      +'<td class="col-product">'+(p.product?'<span class="prod">'+esc(p.product)+'</span>':'')+'</td>'
      +'<td class="col-status">'+chip(p.status)+'</td>'
      +'<td class="col-versions">'+ver+'</td>'
      +'<td class="col-updated">'+esc(p.updatedLabel||'')+'</td>'
      +'<td class="col-owner">'+(p.owner?esc(p.owner):'Unassigned')+'</td>'
      +'</tr>';
  }).join('');
  return '<div class="list"><table><thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody></table></div>';
}
function emptyHTML(){return '<div class="empty">No prototypes match. <a href="#" id="clear">Clear filters</a></div>';}
function pageWindow(cur,total){
  var res=[],i;
  if(total<=7){for(i=1;i<=total;i++)res.push(i);return res;}
  res.push(1);
  var s=Math.max(2,cur-1),e=Math.min(total-1,cur+1);
  if(s>2)res.push('...');
  for(i=s;i<=e;i++)res.push(i);
  if(e<total-1)res.push('...');
  res.push(total);
  return res;
}
function pagerHTML(cur,pages){
  if(pages<=1)return '';
  var out='<nav class="pager" aria-label="Pagination">';
  out+='<button type="button" data-page="'+(cur-1)+'"'+(cur<=1?' disabled':'')+' aria-label="Previous page">Prev</button>';
  pageWindow(cur,pages).forEach(function(n){
    if(n==='...')out+='<span class="ellipsis">\\u2026</span>';
    else out+='<button type="button" data-page="'+n+'"'+(n===cur?' aria-current="page"':'')+'>'+n+'</button>';
  });
  out+='<button type="button" data-page="'+(cur+1)+'"'+(cur>=pages?' disabled':'')+' aria-label="Next page">Next</button>';
  out+='</nav>';
  return out;
}
function readHash(){
  var h=new URLSearchParams(location.hash.slice(1));
  if(h.get('q'))qEl.value=h.get('q');
  if(h.get('product'))productSel.set(h.get('product'));
  if(h.get('status'))statusSel.set(h.get('status'));
  if(h.get('sort'))sortSel.set(h.get('sort'));
  if(h.get('view')==='list')view='list';
  sort=sortFromDropdown(sortSel.value());
}
function writeHash(){
  var h=new URLSearchParams();
  if(qEl.value)h.set('q',qEl.value);
  if(productSel.value())h.set('product',productSel.value());
  if(statusSel.value())h.set('status',statusSel.value());
  if(sortSel.value()&&sortSel.value()!=='updated')h.set('sort',sortSel.value());
  if(view!=='tile')h.set('view',view);
  var s=h.toString();
  history.replaceState(null,'',s?('#'+s):location.pathname);
}
function applyView(){
  tileBtn.setAttribute('aria-pressed',view==='tile'?'true':'false');
  listBtn.setAttribute('aria-pressed',view==='list'?'true':'false');
  sortSel.el.style.display=view==='list'?'none':'';
}
function render(){
  var rows=filtered();
  rows.sort(function(a,b){var d=compareBy(a,b,sort.key);return sort.dir==='asc'?d:-d;});
  var total=rows.length;
  var size=PAGE_SIZE[view];
  var pages=Math.max(1,Math.ceil(total/size));
  if(page>pages)page=pages;
  if(page<1)page=1;
  var start=(page-1)*size;
  var slice=rows.slice(start,start+size);
  if(view==='list'){
    grid.className='is-list';
    grid.innerHTML=total?listHTML(slice):emptyHTML();
  }else{
    grid.className='is-tile'+(firstRender?'':' ready');
    grid.innerHTML=total?slice.map(card).join(''):emptyHTML();
  }
  pagerEl.innerHTML=pagerHTML(page,pages);
  countEl.textContent=total+' of '+DATA.length+' prototype'+(DATA.length===1?'':'s');
  writeHash();
  firstRender=false;
}
qEl.addEventListener('input',function(){page=1;render();});
tileBtn.addEventListener('click',function(){if(view==='tile')return;view='tile';sort=sortFromDropdown(sortSel.value());page=1;applyView();render();});
listBtn.addEventListener('click',function(){if(view==='list')return;view='list';page=1;applyView();render();});
grid.addEventListener('click',function(e){
  var t=e.target;
  var clr=t.closest&&t.closest('#clear');
  if(clr){e.preventDefault();qEl.value='';productSel.set('');statusSel.set('');page=1;render();return;}
  var th=t.closest&&t.closest('th[data-key]');
  if(th){var k=th.getAttribute('data-key'),def='asc',i;for(i=0;i<COLS.length;i++){if(COLS[i].key===k)def=COLS[i].dir;}if(sort.key===k){sort.dir=sort.dir==='asc'?'desc':'asc';}else{sort={key:k,dir:def};}page=1;render();return;}
  var tr=t.closest&&t.closest('tr[data-href]');
  if(tr&&!(t.closest&&t.closest('a'))){location.href=tr.getAttribute('data-href');}
});
pagerEl.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('button[data-page]');
  if(!b||b.disabled)return;
  var n=parseInt(b.getAttribute('data-page'),10);
  if(!isNaN(n)){page=n;render();window.scrollTo(0,0);}
});
readHash();applyView();render();
</script>
</body></html>`;
}

// ---- wrapper (chrome bar + iframe) ---------------------------------------------------

function wrapperCss() {
  return `
html,body{height:100%;}
.bar{height:52px;background:var(--surface-raised);border-bottom:1px solid var(--hairline-strong);box-shadow:var(--shadow-bar);display:flex;align-items:center;justify-content:space-between;padding:0 16px;gap:12px;}
.left{display:flex;align-items:center;gap:12px;min-width:0;}
.home{display:flex;align-items:center;gap:8px;color:var(--text-secondary);font-size:13px;font-weight:600;white-space:nowrap;transition:color var(--dur-fast) var(--ease-standard);}
.home:hover{color:var(--ink);}
.hub-mark{border-radius:var(--radius-sm);background:var(--badge-solid);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:600;flex:none;}
.divider{width:1px;height:22px;background:var(--hairline-strong);flex:none;}
.title{font-weight:600;color:var(--ink);font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.01em;}
.badge-latest{color:var(--badge-ink);font-weight:600;font-size:12px;white-space:nowrap;}
.badge-old{color:#fff;background:var(--badge-solid);font-weight:600;font-size:12px;white-space:nowrap;padding:2px 8px;border-radius:var(--radius-xs);}
.right{display:flex;align-items:center;gap:10px;}
.btn{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--text-secondary);border:1px solid var(--hairline);background:var(--surface);padding:7px 12px;border-radius:var(--radius-sm);cursor:pointer;font-family:inherit;transition:background-color var(--dur-fast) var(--ease-standard),border-color var(--dur-fast) var(--ease-standard),color var(--dur-fast) var(--ease-standard);}
.btn:hover{border-color:var(--hairline-strong);color:var(--ink);}
.btn:active{background:var(--surface-sunken);}
.bar .sel-host{display:inline-flex;}
.bar .cselect-trigger{min-width:0;padding:7px 10px;color:var(--text-secondary);}
.bar .cselect-trigger:hover{color:var(--ink);}
.bar .cselect-menu{left:auto;right:0;min-width:220px;}
.frame{width:100%;height:calc(100vh - 52px);border:0;display:block;background:#fff;}
.panel{position:fixed;top:0;right:0;width:360px;max-width:90vw;height:100vh;background:var(--surface);border-left:1px solid var(--hairline);box-shadow:var(--shadow-panel);transform:translateX(100%);transition:transform var(--dur-slow) var(--ease-panel);z-index:20;display:flex;flex-direction:column;}
.panel.open{transform:translateX(0);}
.panel-head{height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;background:var(--surface-raised);border-bottom:1px solid var(--hairline);font-weight:600;color:var(--ink);}
.x{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:0;background:none;color:var(--text-muted);cursor:pointer;border-radius:var(--radius-sm);transition:background-color var(--dur-fast) var(--ease-standard),color var(--dur-fast) var(--ease-standard);}
.x:hover{background:var(--surface-sunken);color:var(--ink);}
.panel-body{overflow:auto;padding:8px;}
.vrow{display:block;padding:12px;border-radius:var(--radius-md);border:1px solid transparent;transition:background-color var(--dur-fast) var(--ease-standard);}
.vrow:hover{background:var(--surface-sunken);}
.vrow.here{background:var(--selected-fill);border-color:var(--selected-border);}
.vrow-top{display:flex;align-items:center;gap:8px;font-size:13px;}
.vrow-v{font-weight:600;color:var(--ink);}
.vrow-latest{color:var(--ink);font-weight:600;}
.vrow-date{margin-left:auto;color:var(--text-muted);font-size:12px;}
.vrow-notes{margin-top:4px;font-size:13px;color:var(--text-secondary);line-height:1.45;}
.scrim{position:fixed;inset:0;background:rgba(23,24,26,.28);opacity:0;pointer-events:none;transition:opacity var(--dur-mid) var(--ease-standard);z-index:15;}
.scrim.open{opacity:1;pointer-events:auto;}
@media (max-width:768px){
  .bar{padding:0 12px;gap:8px;}
  .btn .label{display:none;}
  .btn{width:36px;height:36px;padding:0;justify-content:center;}
  .right{gap:8px;}
}
@media (max-width:560px){
  .home .label{display:none;}
  .divider,.badge-latest{display:none;}
  #verSel{display:none;}
  .title{font-size:14px;}
}
@media (max-width:420px){ .panel{width:100vw;max-width:100vw;} }`;
}

function wrapperHTML(p, sel, vs, cfg, base) {
  const slug = p.slug;
  const hasVersions = !!vs;
  const isLatest = !hasVersions || (sel && sel.v === vs.current);
  const iframeSrc = sel ? `${base}/raw/${esc(slug)}/v/${sel.v}/` : `${base}/raw/${esc(slug)}/`;
  const dlHref = iframeSrc + "index.html";
  const dlName = sel ? `${slug}-v${sel.v}.html` : `${slug}.html`;

  let versionBadge = "";
  if (hasVersions && sel) {
    versionBadge = isLatest
      ? `<span class="badge-latest">v${sel.v} (latest)</span>`
      : `<span class="badge-old">Viewing v${sel.v} (not latest)</span>`;
  }

  let dropdown = "";
  let historyBtn = "";
  let panel = "";
  let verData = "null";
  if (hasVersions) {
    const verItems = vs.versions.slice().sort((a, b) => b.v - a.v).map((v) => {
      const tag = v.v === vs.current ? " (latest)" : "";
      const d = v.date ? " - " + fmtDate(v.date, cfg.timezone) : "";
      return { value: String(v.v), label: "v" + v.v + d + tag };
    });
    verData = JSON.stringify({ items: verItems, cur: String(sel ? sel.v : ""), base: base, slug: slug }).replace(/</g, "\\u003c");
    dropdown = `<span class="sel-host" id="verSel"></span>`;
    historyBtn = `<button class="btn" id="histbtn" type="button" aria-expanded="false" aria-controls="panel">${ICON.history}<span class="label">History</span></button>`;
    const rows = vs.versions.slice().sort((a, b) => b.v - a.v).map((v) => {
      const here = sel && v.v === sel.v;
      const tag = v.v === vs.current ? `<span class="vrow-latest">latest</span>` : "";
      return `<a class="vrow${here ? " here" : ""}" href="${base}/p/${esc(slug)}/v/${v.v}/">
        <div class="vrow-top"><span class="vrow-v">v${v.v}</span> ${tag}<span class="vrow-date">${esc(fmtDate(v.date, cfg.timezone))}</span></div>
        <div class="vrow-notes">${esc(v.notes || "")}</div></a>`;
    }).join("");
    panel = `<div class="panel" id="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title" inert>
      <div class="panel-head"><span id="panel-title">Version history</span><button class="x" id="panelx" type="button" aria-label="Close version history">${ICON.close}</button></div>
      <div class="panel-body">${rows}</div></div>
      <div class="scrim" id="scrim" aria-hidden="true"></div>`;
  }

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(p.title)} - ${esc(cfg.name)}</title>
${faviconTag(cfg)}
${fontHead(cfg)}
<style>${cssVars(cfg)}${baseCss()}${wrapperCss()}</style></head>
<body>
  <div class="bar">
    <div class="left">
      <a class="home" href="${base}/" aria-label="All prototypes">${brandMark(cfg, 26)}<span class="label">All prototypes</span></a>
      <span class="divider" aria-hidden="true"></span>
      <span class="title">${esc(p.title)}</span>
      ${versionBadge}
    </div>
    <div class="right">
      ${dropdown}
      ${historyBtn}
      <a class="btn" href="${dlHref}" download="${esc(dlName)}" aria-label="Download this prototype">${ICON.download}<span class="label">Download</span></a>
      <a class="btn" href="${iframeSrc}" target="_blank" rel="noopener" aria-label="Open fullscreen in a new tab">${ICON.fullscreen}<span class="label">Fullscreen</span></a>
    </div>
  </div>
  <iframe class="frame" title="${esc(p.title)} prototype" src="${iframeSrc}"></iframe>
  ${panel}
<script>
${CSELECT_JS}
var VER=${verData};
if(VER&&document.getElementById('verSel')){
  CSelect({mount:'#verSel',label:'Select version',value:VER.cur,items:VER.items,onChange:function(v){location.href=VER.base+'/p/'+encodeURIComponent(VER.slug)+'/v/'+v+'/';}});
}
(function(){
  var btn=document.getElementById('histbtn'),panel=document.getElementById('panel'),
      scrim=document.getElementById('scrim'),closeBtn=document.getElementById('panelx');
  if(!btn||!panel)return;
  var last=null;
  function items(){return panel.querySelectorAll('a[href],button:not([disabled]),select,[tabindex]:not([tabindex="-1"])');}
  function open(){
    last=document.activeElement;
    panel.removeAttribute('inert');
    panel.classList.add('open');scrim.classList.add('open');
    btn.setAttribute('aria-expanded','true');
    (closeBtn||items()[0]||panel).focus();
    document.addEventListener('keydown',onKey);
  }
  function close(){
    panel.classList.remove('open');scrim.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
    panel.setAttribute('inert','');
    document.removeEventListener('keydown',onKey);
    (last&&last.focus?last:btn).focus();
  }
  function onKey(e){
    if(e.key==='Escape'){e.preventDefault();close();return;}
    if(e.key==='Tab'){
      var f=items();if(!f.length)return;
      var first=f[0],lastEl=f[f.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();lastEl.focus();}
      else if(!e.shiftKey&&document.activeElement===lastEl){e.preventDefault();first.focus();}
    }
  }
  btn.onclick=open;if(closeBtn)closeBtn.onclick=close;if(scrim)scrim.onclick=close;
})();
</script>
</body></html>`;
}

// ---- standalone history page ---------------------------------------------------------

function historyCss() {
  return `
.topbar{height:58px;background:var(--surface);border-bottom:1px solid var(--hairline-strong);box-shadow:var(--shadow-bar);display:flex;align-items:center;padding:0 24px;}
.home{display:flex;align-items:center;gap:8px;color:var(--text-secondary);font-size:13px;font-weight:600;transition:color var(--dur-fast) var(--ease-standard);}
.home:hover{color:var(--ink);}
.hub-mark{border-radius:var(--radius-sm);background:var(--badge-solid);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:600;flex:none;}
.wrap{max-width:720px;margin:0 auto;padding:30px 22px 64px;}
.h1{font-family:var(--font-serif);font-size:22px;font-weight:600;color:var(--ink);margin:0 0 4px;letter-spacing:-.02em;}
.sub{color:var(--text-muted);font-size:14px;margin:0 0 22px;}
.vitem{background:var(--surface);border:1px solid var(--hairline);border-radius:var(--radius-lg);box-shadow:var(--shadow-resting);padding:16px;margin-bottom:12px;}
.vitem-top{display:flex;align-items:center;gap:8px;font-size:14px;}
.vitem-v{font-weight:600;color:var(--ink);}
.vitem-latest{color:var(--ink);font-weight:600;}
.vitem-date{margin-left:auto;color:var(--text-muted);font-size:12px;}
.vitem-notes{margin-top:6px;color:var(--text-secondary);font-size:14px;line-height:1.5;}
@media (max-width:520px){.topbar{padding:0 16px;}.wrap{padding:24px 16px 48px;}}`;
}

function historyHTML(p, vs, cfg, base) {
  const rows = vs.versions.slice().sort((a, b) => b.v - a.v).map((v) => {
    const tag = v.v === vs.current ? `<span class="vitem-latest">latest</span>` : "";
    return `<div class="vitem">
      <div class="vitem-top"><a class="vitem-v" href="${base}/p/${esc(p.slug)}/v/${v.v}/">v${v.v}</a>${tag}
        <span class="vitem-date">${esc(fmtDate(v.date, cfg.timezone))}</span></div>
      <div class="vitem-notes">${esc(v.notes || "")}</div></div>`;
  }).join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(p.title)} history - ${esc(cfg.name)}</title>
${faviconTag(cfg)}
${fontHead(cfg)}
<style>${cssVars(cfg)}${baseCss()}${historyCss()}</style></head>
<body>
  <div class="topbar"><a class="home" href="${base}/p/${esc(p.slug)}/">${ICON.back}Back to ${esc(p.title)}</a></div>
  <div class="wrap">
    <h1 class="h1">${esc(p.title)} history</h1>
    <p class="sub">${vs.versions.length} version${vs.versions.length === 1 ? "" : "s"}. Newest first.</p>
    ${rows}
  </div>
</body></html>`;
}

// ---- how-to-ship page (unified: server and static both call this) --------------------

function howToShipHTML(md, cfg, base) {
  const body = String(md == null ? "" : md).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const S = 'width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const ok = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  const no = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const pill = (bg, fg, label) => `<span class="g-pill" style="background:${bg};color:${fg}">${label}</span>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>How to ship - ${esc(cfg.name)}</title>
${faviconTag(cfg)}
${fontHead(cfg)}
<style>${cssVars(cfg)}${baseCss()}
.topbar{height:58px;background:var(--surface);border-bottom:1px solid var(--hairline-strong);box-shadow:var(--shadow-bar);display:flex;align-items:center;padding:0 24px;}
.home{display:flex;align-items:center;gap:8px;color:var(--text-secondary);font-size:13px;font-weight:600;transition:color var(--dur-fast) var(--ease-standard);}
.home:hover{color:var(--ink);}
.g-wrap{max-width:820px;margin:0 auto;padding:34px 22px 72px;}
.g-title{font-family:var(--font-serif);font-size:26px;font-weight:600;letter-spacing:-.02em;margin:0 0 6px;}
.g-intro{color:var(--text-muted);font-size:15px;line-height:1.55;margin:0 0 22px;max-width:660px;}
.g-tabs{display:flex;gap:2px;border-bottom:1px solid var(--hairline);margin:0 0 30px;}
.g-tab{appearance:none;border:0;background:none;font-family:inherit;font-size:14px;font-weight:600;color:var(--text-muted);padding:10px 14px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color var(--dur-fast) var(--ease-standard),border-color var(--dur-fast) var(--ease-standard);}
.g-tab:hover{color:var(--ink);}
.g-tab.is-on{color:var(--ink);border-bottom-color:var(--ink);}
.g-section{margin:0 0 34px;}
.g-h2{font-size:12px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--text-muted);margin:0 0 14px;}
.g-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;}
.g-card{background:var(--surface);border:1px solid var(--hairline);border-radius:var(--radius-lg);padding:18px;box-shadow:var(--shadow-resting);}
.g-ic{width:36px;height:36px;border-radius:var(--radius-sm);background:var(--surface-sunken);display:grid;place-items:center;color:var(--ink);margin-bottom:12px;}
.g-card h3{font-size:15px;margin:0 0 6px;color:var(--ink);}
.g-card p{font-size:13.5px;color:var(--text-secondary);line-height:1.55;margin:0;}
.g-list{list-style:none;margin:0;padding:0;}
.g-list li{display:flex;gap:10px;align-items:flex-start;font-size:14px;color:var(--text-secondary);line-height:1.5;padding:7px 0;}
.g-list li svg{flex:none;margin-top:1px;}
.g-do svg{color:#1E6B3B;}
.g-dont svg{color:#B42318;}
.g-rule{margin-top:14px;padding-top:14px;border-top:1px solid var(--hairline);font-size:13.5px;color:var(--text-muted);line-height:1.55;}
.g-srow{display:flex;gap:12px;align-items:baseline;padding:10px 0;border-bottom:1px solid var(--hairline);}
.g-srow:first-child{padding-top:0;}
.g-srow:last-child{border-bottom:0;padding-bottom:0;}
.g-pill{flex:none;font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;white-space:nowrap;}
.g-srow span{font-size:14px;color:var(--text-secondary);line-height:1.5;}
.g-steps{display:flex;flex-direction:column;gap:12px;}
.g-step{display:flex;gap:14px;background:var(--surface);border:1px solid var(--hairline);border-radius:var(--radius-lg);padding:16px 18px;box-shadow:var(--shadow-resting);}
.g-num{flex:none;width:28px;height:28px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700;}
.g-step h3{font-size:14.5px;margin:0 0 4px;color:var(--ink);}
.g-step p{font-size:13.5px;color:var(--text-secondary);line-height:1.5;margin:0;}
.g-step code,.g-rule code{background:var(--surface-sunken);padding:1px 6px;border-radius:5px;font:12.5px var(--font-mono);color:var(--ink);}
.g-callout{display:flex;gap:12px;background:var(--surface-raised);border:1px solid var(--hairline);border-radius:var(--radius-lg);padding:16px 18px;font-size:13.5px;color:var(--text-secondary);line-height:1.55;margin-top:16px;}
.g-callout svg{flex:none;color:var(--text-muted);margin-top:1px;}
.g-callout a{color:var(--ink);text-decoration:underline;text-underline-offset:2px;}
.g-readme{white-space:pre-wrap;word-wrap:break-word;font:13.5px/1.6 var(--font-mono);color:var(--ink);background:var(--surface);border:1px solid var(--hairline);border-radius:var(--radius-lg);box-shadow:var(--shadow-resting);padding:22px;}
@media (max-width:520px){.topbar{padding:0 16px;}.g-wrap{padding:26px 16px 56px;}}
</style></head>
<body>
  <div class="topbar"><a class="home" href="${base}/">${ICON.back}All prototypes</a></div>
  <div class="g-wrap">
    <h1 class="g-title">How to ship a prototype</h1>
    <p class="g-intro">How to add a prototype, and what it needs first. The Read me tab has the exact commands.</p>
    <div class="g-tabs" role="tablist" aria-label="How to ship">
      <button class="g-tab is-on" role="tab" id="tab-guide" aria-controls="panel-guide" aria-selected="true" tabindex="0">Guide</button>
      <button class="g-tab" role="tab" id="tab-readme" aria-controls="panel-readme" aria-selected="false" tabindex="-1">Read me</button>
    </div>

    <section id="panel-guide" role="tabpanel" aria-labelledby="tab-guide">
      <div class="g-section">
        <h2 class="g-h2">How it works</h2>
        <div class="g-cards">
          <div class="g-card"><div class="g-ic"><svg ${S}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>
            <h3>One link per prototype</h3><p>The link never changes. Ship a new version and it shows the latest, so you send the link once.</p></div>
          <div class="g-card"><div class="g-ic"><svg ${S}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg></div>
            <h3>Old versions stay</h3><p>Each release is saved with your change note. Viewers can open the history and compare.</p></div>
          <div class="g-card"><div class="g-ic"><svg ${S}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
            <h3>Opens in the browser</h3><p>No install. Your HTML loads in a frame with a title bar, a version dropdown and a download button.</p></div>
        </div>
      </div>

      <div class="g-section">
        <h2 class="g-h2">Is your prototype ready?</h2>
        <div class="g-card">
          <ul class="g-list g-do">
            <li>${ok}<span>It is one HTML file, or a folder with an <code>index.html</code> plus its own images.</span></li>
            <li>${ok}<span>Any fonts or scripts it loads come from the web (Google Fonts and CDN links are fine).</span></li>
          </ul>
          <ul class="g-list g-dont">
            <li>${no}<span>It points to files on your computer (paths like <code>C:\\...</code> or <code>file://</code>).</span></li>
            <li>${no}<span>It needs <code>localhost</code> or something only running on your machine.</span></li>
          </ul>
          <p class="g-rule">Test it: open the file on another computer, or a fresh browser tab. If it still looks right, it is ready.</p>
        </div>
      </div>

      <div class="g-section">
        <h2 class="g-h2">Statuses</h2>
        <div class="g-card">
          <div class="g-srow">${pill("#ECEDEF", "#5A5F66", "Draft")}<span>Hidden from the gallery. Only people with the link can open it.</span></div>
          <div class="g-srow">${pill("#F6EAD2", "#7A5300", "In review")}<span>Shared to gather feedback.</span></div>
          <div class="g-srow">${pill("#E4ECF8", "#234C86", "Final")}<span>Finished.</span></div>
          <div class="g-srow">${pill("#E2F1E6", "#1E6B3B", "Approved")}<span>Signed off.</span></div>
        </div>
      </div>

      <div class="g-section">
        <h2 class="g-h2">Adding a prototype</h2>
        <div class="g-steps">
          <div class="g-step"><div class="g-num">1</div><div><h3>Add your file</h3><p>Put your HTML in a folder under <code>prototypes/</code>, named in lowercase-with-dashes. That name becomes its link, for example <code>checkout-redesign</code>.</p></div></div>
          <div class="g-step"><div class="g-num">2</div><div><h3>Describe it</h3><p>Add a title, product, owner and a one-line description. This becomes the gallery card.</p></div></div>
          <div class="g-step"><div class="g-num">3</div><div><h3>Release a version</h3><p>Publish it with a short note saying what changed. Viewers read these notes in the history, so make them clear.</p></div></div>
        </div>
        <div class="g-callout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span>Using Claude Code? <code>/ship-prototype</code> does all three. The exact commands are in the <strong>Read me</strong> tab.</span>
        </div>
      </div>
    </section>

    <section id="panel-readme" role="tabpanel" aria-labelledby="tab-readme" hidden>
      <pre class="g-readme">${body}</pre>
    </section>
  </div>
<script>
(function(){
  var tabs=[document.getElementById('tab-guide'),document.getElementById('tab-readme')];
  var panels={'tab-guide':document.getElementById('panel-guide'),'tab-readme':document.getElementById('panel-readme')};
  function select(tab,focus){
    tabs.forEach(function(t){
      var on=t===tab;
      t.setAttribute('aria-selected',on?'true':'false');
      t.classList.toggle('is-on',on);
      t.tabIndex=on?0:-1;
      panels[t.id].hidden=!on;
    });
    if(focus)tab.focus();
  }
  tabs.forEach(function(t,i){
    t.addEventListener('click',function(){select(t,false);});
    t.addEventListener('keydown',function(e){
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
        e.preventDefault();
        select(tabs[(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length],true);
      }
    });
  });
})();
</script>
</body></html>`;
}

module.exports = {
  galleryHTML, wrapperHTML, historyHTML, howToShipHTML,
  palette, fontStack, fontSerif, fontHead, cssVars,
};
