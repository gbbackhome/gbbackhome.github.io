// ===== 3D emoji: local PNG with unicode fallback =====
// Uses PNGs in assets/emoji/ when present, otherwise falls back to unicode.
const EMOJI = {
  rocket:    { file: "rocket_3d.png",          char: "🚀" },
  gear:      { file: "gear_3d.png",            char: "⚙️" },
  brain:     { file: "brain_3d.png",           char: "🧠" },
  bulb:      { file: "light_bulb_3d.png",      char: "💡" },
  wave:      { file: "waving_hand_3d.png",     char: "👋" },
  bar:       { file: "bar_chart_3d.png",       char: "📊" },
  chart:     { file: "chart_increasing_3d.png",char: "📈" },
  briefcase: { file: "briefcase_3d.png",       char: "💼" },
  books:     { file: "books_3d.png",           char: "📚" },
  target:    { file: "direct_hit_3d.png",      char: "🎯" },
};
// Emoji pool assigned to categories in order
const CAT_POOL = ["briefcase", "books", "bulb", "target", "bar", "chart"];

function setEmoji(img, key) {
  const e = EMOJI[key];
  if (!e) return;
  img.src = `assets/emoji/${e.file}`;
  img.alt = e.char;
  img.onerror = () => {
    const span = document.createElement("span");
    span.textContent = e.char;
    span.className = img.className;
    span.style.fontSize = (img.offsetWidth || 48) + "px";
    span.style.lineHeight = "1";
    img.replaceWith(span);
  };
}

// Apply static emojis
document.querySelectorAll("img[data-emoji]").forEach((img) =>
  setEmoji(img, img.dataset.emoji)
);

// ===== Render case studies =====
const grid = document.getElementById("caseGrid");
const filtersEl = document.getElementById("filters");
const emptyEl = document.getElementById("caseEmpty");
const statsEl = document.getElementById("stats");
let catEmojiMap = {};

function esc(s = "") {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

function emojiTag(key) {
  const e = EMOJI[key];
  return `<img class="case__emoji" src="assets/emoji/${e.file}" alt="${e.char}"
    onerror="this.outerHTML='<span class=&quot;case__emoji&quot; style=&quot;font-size:30px&quot;>${e.char}</span>'">`;
}

function cardHTML(d) {
  const key = catEmojiMap[d.cat] || "briefcase";
  const tags = (d.tags || []).map((t) => `<span>${esc(t)}</span>`).join("");
  const star = [
    d.s && `<p><b>Situation</b> ${esc(d.s)}</p>`,
    d.t && `<p><b>Task</b> ${esc(d.t)}</p>`,
    d.a && `<p><b>Action</b> ${esc(d.a)}</p>`,
  ].filter(Boolean).join("");

  return `<article class="case" data-cat="${esc(d.cat)}">
    <div class="case__top">${emojiTag(key)}<span class="case__cat">${esc(d.cat)}</span></div>
    ${d.r ? `<div class="case__result">${esc(d.r)}</div>` : ""}
    <h3 class="case__title">${esc(d.title)}</h3>
    <div class="case__star">${star}</div>
    ${tags ? `<div class="case__tags">${tags}</div>` : ""}
    ${d.demo ? `<span class="case__demo">Sample (fictional data)</span>` : ""}
  </article>`;
}

function renderFilters(cats) {
  const all = ["All", ...cats];
  filtersEl.innerHTML = all
    .map((c, i) => `<button class="filter${i === 0 ? " is-active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`)
    .join("");
  filtersEl.querySelectorAll(".filter").forEach((btn) =>
    btn.addEventListener("click", () => {
      filtersEl.querySelector(".is-active")?.classList.remove("is-active");
      btn.classList.add("is-active");
      const cat = btn.dataset.cat;
      grid.querySelectorAll(".case").forEach((card) => {
        card.style.display = cat === "All" || card.dataset.cat === cat ? "" : "none";
      });
    })
  );
}

function renderStats(data) {
  if (!data.length) return;
  statsEl.innerHTML = `<div class="stat"><div class="stat__num">${data.length}</div><div class="stat__label">Case studies</div></div>`;
  statsEl.hidden = false;
}

async function loadCases() {
  let data = [];
  try {
    const res = await fetch("data.json", { cache: "no-store" });
    if (res.ok) data = await res.json();
  } catch (_) {}

  if (!Array.isArray(data) || data.length === 0) {
    emptyEl.hidden = false;
    return;
  }

  const cats = [...new Set(data.map((d) => d.cat).filter(Boolean))];
  cats.forEach((c, i) => (catEmojiMap[c] = CAT_POOL[i % CAT_POOL.length]));

  grid.innerHTML = data.map(cardHTML).join("");
  renderFilters(cats);
  renderStats(data);
}

// ===== Smooth scroll + entrance animation =====
function initMotion() {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  // Lenis inertia scroll
  if (window.Lenis) {
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    if (window.gsap && window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
    }
  }

  // GSAP entrance animation (spring / bounce feel)
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    const targets = document.querySelectorAll(
      ".section__title, .skill-col, .case, .about, .contact__links, .stat"
    );
    targets.forEach((el) => {
      gsap.fromTo(el,
        { y: 36, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.8, ease: "back.out(1.6)",
          scrollTrigger: { trigger: el, start: "top 88%" },
        }
      );
    });
  }
}

document.getElementById("year").textContent = new Date().getFullYear();
loadCases().then(() => {
  // Initialize motion after cards are rendered
  initMotion();
});
