/**
 * Themed animated loading screen for Pirate Bay & all clones.
 * Each game sets `window.__PB_LOADER__ = { title, subtitle, emojis, bg, accent, font }`
 * BEFORE this script loads. The overlay covers the page until the Phaser
 * canvas is created and a short minimum display time has elapsed.
 */
(function () {
  var cfg = window.__PB_LOADER__ || {};
  var TITLE = cfg.title || "PIRATE BAY";
  var SUBTITLE = cfg.subtitle || "Hoisting the sails…";
  var EMOJIS = cfg.emojis && cfg.emojis.length ? cfg.emojis : ["🏴‍☠️", "⚓", "💰", "🗺️"];
  var BG = cfg.bg || "radial-gradient(ellipse at center,#3a1a0a 0%,#0a0402 100%)";
  var ACCENT = cfg.accent || "#ffb800";
  var ACCENT2 = cfg.accent2 || "#ff7a00";
  var FONT = cfg.font || '"Trebuchet MS",serif';
  var EMBLEM = cfg.emblem || "";

  // Inject styles
  var style = document.createElement("style");
  style.textContent = [
    "#pb-loader{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;background:" + BG + ";font-family:" + FONT + ";transition:opacity .6s ease;}",
    "#pb-loader.hide{opacity:0;pointer-events:none;}",
    "#pb-loader .pb-vignette{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,.7) 100%);pointer-events:none;}",
    "#pb-loader .pb-emblem{position:absolute;inset:0;background:" + (EMBLEM ? "url('"+EMBLEM+"') center/35% no-repeat" : "none") + ";opacity:.12;animation:pb-pulse 4s ease-in-out infinite;}",
    "#pb-loader .pb-rays{position:absolute;inset:-50%;background:conic-gradient(from 0deg,transparent 0deg,"+ACCENT+"22 10deg,transparent 20deg,transparent 40deg,"+ACCENT+"22 50deg,transparent 60deg);animation:pb-spin 18s linear infinite;}",
    "#pb-loader .pb-title{position:relative;font-size:54px;font-weight:900;letter-spacing:8px;text-transform:uppercase;color:"+ACCENT+";text-shadow:0 0 18px "+ACCENT+",0 0 4px #000,3px 3px 0 rgba(0,0,0,.8);animation:pb-glow 2s ease-in-out infinite alternate;text-align:center;padding:0 12px;}",
    "#pb-loader .pb-sub{position:relative;margin-top:8px;font-size:13px;letter-spacing:6px;text-transform:uppercase;color:#ffe9b0;opacity:.85;}",
    "#pb-loader .pb-emojis{position:relative;margin-top:24px;display:flex;gap:18px;font-size:42px;}",
    "#pb-loader .pb-emojis span{display:inline-block;animation:pb-bob 1.6s ease-in-out infinite;filter:drop-shadow(0 4px 6px rgba(0,0,0,.6));}",
    "#pb-loader .pb-emojis span:nth-child(2){animation-delay:.2s;}",
    "#pb-loader .pb-emojis span:nth-child(3){animation-delay:.4s;}",
    "#pb-loader .pb-emojis span:nth-child(4){animation-delay:.6s;}",
    "#pb-loader .pb-bar{position:relative;margin-top:30px;width:280px;max-width:70vw;height:14px;background:rgba(0,0,0,.6);border:2px solid "+ACCENT+"99;border-radius:10px;overflow:hidden;box-shadow:0 0 12px "+ACCENT+"55, inset 0 0 6px #000;}",
    "#pb-loader .pb-bar-fill{height:100%;width:0%;background:linear-gradient(90deg,"+ACCENT2+","+ACCENT+","+ACCENT2+");background-size:200% 100%;animation:pb-shine 1.4s linear infinite;transition:width .3s ease;}",
    "#pb-loader .pb-pct{position:relative;margin-top:8px;font-size:11px;letter-spacing:3px;color:"+ACCENT+";font-family:monospace;}",
    "#pb-loader .pb-coin{position:absolute;font-size:22px;animation:pb-fall linear infinite;opacity:.85;filter:drop-shadow(0 2px 3px rgba(0,0,0,.6));}",
    "@keyframes pb-glow{from{filter:brightness(1);}to{filter:brightness(1.3) drop-shadow(0 0 10px "+ACCENT+");}}",
    "@keyframes pb-bob{0%,100%{transform:translateY(0) rotate(-3deg);}50%{transform:translateY(-12px) rotate(3deg);}}",
    "@keyframes pb-spin{to{transform:rotate(360deg);}}",
    "@keyframes pb-pulse{0%,100%{opacity:.10;}50%{opacity:.18;}}",
    "@keyframes pb-shine{from{background-position:0% 0;}to{background-position:200% 0;}}",
    "@keyframes pb-fall{from{transform:translateY(-40px) rotate(0);}to{transform:translateY(110vh) rotate(720deg);}}",
    "@media(max-width:600px){#pb-loader .pb-title{font-size:34px;letter-spacing:5px;}#pb-loader .pb-emojis{font-size:34px;gap:12px;}}",
  ].join("");
  document.head.appendChild(style);

  // Build overlay
  var el = document.createElement("div");
  el.id = "pb-loader";
  el.innerHTML =
    '<div class="pb-rays"></div>' +
    '<div class="pb-emblem"></div>' +
    '<div class="pb-vignette"></div>' +
    '<div class="pb-title">' + TITLE + '</div>' +
    '<div class="pb-sub">' + SUBTITLE + '</div>' +
    '<div class="pb-emojis">' + EMOJIS.slice(0,4).map(function(e){return '<span>'+e+'</span>';}).join('') + '</div>' +
    '<div class="pb-bar"><div class="pb-bar-fill"></div></div>' +
    '<div class="pb-pct">0%</div>';

  // Falling coins / themed particles
  for (var i = 0; i < 14; i++) {
    var c = document.createElement("div");
    c.className = "pb-coin";
    c.textContent = EMOJIS[i % EMOJIS.length];
    c.style.left = (Math.random() * 100) + "%";
    c.style.fontSize = (16 + Math.random() * 18) + "px";
    c.style.animationDuration = (4 + Math.random() * 5) + "s";
    c.style.animationDelay = (Math.random() * 5) + "s";
    el.appendChild(c);
  }

  function attach() {
    if (document.body) { document.body.appendChild(el); return true; }
    return false;
  }
  if (!attach()) {
    document.addEventListener("DOMContentLoaded", attach);
  }

  // Animated progress: climbs to 90% then waits for canvas
  var fill = el.querySelector(".pb-bar-fill");
  var pct = el.querySelector(".pb-pct");
  var p = 0, start = Date.now(), MIN_MS = 1800;
  var tick = setInterval(function () {
    var canvas = document.querySelector("canvas");
    var target = canvas ? 100 : Math.min(90, p + Math.random() * 6);
    p = p + (target - p) * 0.18;
    if (fill) fill.style.width = p.toFixed(1) + "%";
    if (pct) pct.textContent = Math.round(p) + "%";
    if (canvas && p > 99 && Date.now() - start > MIN_MS) {
      clearInterval(tick);
      el.classList.add("hide");
      setTimeout(function () { el.remove(); }, 700);
    }
  }, 120);

  // Safety: never block longer than 20s
  setTimeout(function () {
    clearInterval(tick);
    if (el.parentNode) { el.classList.add("hide"); setTimeout(function(){ el.remove(); }, 700); }
  }, 20000);
})();