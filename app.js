// Portfolio app — Result-First case cards (2026 style)
// Loads data.json, renders scannable cards, smooth scroll + reveal animations.

const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Category → emoji (unicode, always renders)
const CAT_EMOJI = {
  Performance: "📈", Influencer: "📣", Event: "🎪",
  Content: "✍️", Research: "🔍", CRM: "💬", Analytics: "📊",
};
// Hero/section 3D emojis: try local PNG, fall back to unicode
const EMOJI_UNICODE = { rocket: "🚀", gear: "⚙️", brain: "🧠", bulb: "💡", wave: "👋" };

/* ---------- inject self-contained card styles (won't touch existing CSS) ---------- */
const css = `
.rf-card{display:flex;flex-direction:column;gap:.7rem;background:#fff;border:1px solid #eef1f5;
  border-radius:18px;padding:1.5rem;box-shadow:0 4px 16px rgba(17,25,43,.05);
  transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease}
.rf-card:hover{transform:translateY(-5px);box-shadow:0 14px 36px rgba(49,130,246,.16);border-color:#c9e2ff}
.rf-card__cat{font-size:.8rem;font-weight:700;color:#3182f6;display:flex;align-items:center;gap:.4rem}
.rf-card__headline{font-size:1.18rem;font-weight:800;line-height:1.35;margin:.1rem 0 0;color:#191f28}
.rf-card__context{font-size:.93rem;line-height:1.55;color:#5a6472;margin:0}
.rf-card__metrics{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.2rem}
.rf-metric{background:#e8f3ff;color:#1b64da;font-weight:700;font-size:.82rem;
  padding:.35rem .75rem;border-radius:999px;white-space:nowrap}
.rf-card__tags{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:auto;padding-top:.6rem}
.rf-tag{font-size:.72rem;color:#9aa3af}
.rf-filter{border:1px solid #e3e8ef;background:#fff;color:#5a6472;font-weight:600;font-size:.85rem;
  padding:.45rem .95rem;border-radius:999px;cursor:pointer;transition:all .2s ease}
.rf-filter:hover{border-color:#90c2ff;color:#1b64da}
.rf-filter.is-active{background:#3182f6;border-color:#3182f6;color:#fff}
#stats.stats{display:flex;flex-wrap:wrap;gap:1.5rem;justify-content:center;margin-top:1.5rem}
.rf-stat{display:flex;flex-direction:column;align-items:center}
.rf-stat__num{font-size:1.6rem;font-weight:800;color:#3182f6;line-height:1}
.rf-stat__label{font-size:.78rem;color:#8b95a1;margin-top:.25rem}
`;
const styleEl = document.createElement("style");
styleEl.textContent = css;
document.head.appendChild(styleEl);

/* ---------- footer year ---------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- 3D emoji with graceful fallback ---------- */
document.querySelectorAll("img[data-emoji]").forEach((img) => {
  const name = img.dataset.emoji;
  img.src = `assets/emoji/${name}.png`;
  img.onerror = () => {
    const span = document.createElement("span");
    span.textContent = EMOJI_UNICODE[name] || "";
    span.className = img.className;
    span.style.fontSize = getComputedStyle(img).width || "3rem";
    img.replaceWith(span);
  };
});

/* ---------- smooth scroll (Lenis) + reveal (GSAP) ---------- */
let lenis = null;
if (typeof Lenis !== "undefined" && !REDUCE) {
  lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  if (lenis) lenis.on("scroll", ScrollTrigger.update);
  if (!REDUCE) {
    gsap.to(".float", { y: -10, duration: 2.4, ease: "sine.inOut", repeat: -1, yoyo: true });
  }
}
function revealEls(els) {
  if (REDUCE || typeof gsap === "undefined") return;
  els.forEach((el) =>
    gsap.from(el, {
      opacity: 0, y: 26, duration: .7, ease: "back.out(1.4)",
      scrollTrigger: { trigger: el, start: "top 88%" },
    })
  );
}
revealEls(gsap?.utils?.toArray(".reveal") || []);

/* ---------- render case studies ---------- */
const grid = document.getElementById("caseGrid");
const filtersEl = document.getElementById("filters");
const emptyEl = document.getElementById("caseEmpty");
const statsEl = document.getElementById("stats");

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function cardHTML(item) {
  const emoji = CAT_EMOJI[item.cat] || "•";
  const metrics = (item.metrics || []).map((m) => `<span class="rf-metric">${esc(m)}</span>`).join("");
  const tags = (item.tags || []).map((t) => `<span class="rf-tag">#${esc(t)}</span>`).join("");
  return `
    <article class="rf-card reveal" data-cat="${esc(item.cat)}">
      <span class="rf-card__cat">${emoji} ${esc(item.cat)}</span>
      <h3 class="rf-card__headline">${esc(item.headline)}</h3>
      <p class="rf-card__context">${esc(item.context)}</p>
      ${metrics ? `<div class="rf-card__metrics">${metrics}</div>` : ""}
      ${tags ? `<div class="rf-card__tags">${tags}</div>` : ""}
    </article>`;
}

function buildFilters(cats) {
  if (!filtersEl) return;
  const all = ["All", ...cats];
  filtersEl.innerHTML = all
    .map((c, i) => `<button class="rf-filter${i === 0 ? " is-active" : ""}" data-filter="${esc(c)}">${esc(c)}</button>`)
    .join("");
  filtersEl.querySelectorAll(".rf-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      filtersEl.querySelectorAll(".rf-filter").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const f = btn.dataset.filter;
      grid.querySelectorAll(".rf-card").forEach((card) => {
        card.style.display = (f === "All" || card.dataset.cat === f) ? "" : "none";
      });
      if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
    });
  });
}

function buildStats(data) {
  if (!statsEl) return;
  const cats = new Set(data.map((d) => d.cat).filter(Boolean));
  statsEl.innerHTML = `
    <div class="rf-stat"><span class="rf-stat__num">${data.length}</span><span class="rf-stat__label">Case studies</span></div>
    <div class="rf-stat"><span class="rf-stat__num">${cats.size}</span><span class="rf-stat__label">Disciplines</span></div>`;
  statsEl.hidden = false;
}

fetch("data.json")
  .then((r) => r.json())
  .then((data) => {
    if (!Array.isArray(data) || data.length === 0) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    grid.innerHTML = data.map(cardHTML).join("");
    const cats = [...new Set(data.map((d) => d.cat).filter(Boolean))];
    buildFilters(cats);
    buildStats(data);
    revealEls(gsap?.utils?.toArray("#caseGrid .reveal") || []);
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  })
  .catch(() => { if (emptyEl) emptyEl.hidden = false; });
