// Portfolio app — Result-First cards + detail modal (2026 style)
const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const CAT_EMOJI = { AMC:"🧪",Performance:"📈",Influencer:"📣",Event:"🎪",Content:"✍️",Research:"🔍",CRM:"💬",Analytics:"📊" };
const EMOJI_UNICODE = { rocket:"🚀",gear:"⚙️",brain:"🧠",bulb:"💡",wave:"👋" };

const css = `
.rf-card{display:flex;flex-direction:column;gap:.7rem;background:#fff;border:1px solid #eef1f5;
  border-radius:18px;padding:1.5rem;box-shadow:0 4px 16px rgba(17,25,43,.05);cursor:pointer;
  transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease}
.rf-card:hover{transform:translateY(-5px);box-shadow:0 14px 36px rgba(49,130,246,.16);border-color:#c9e2ff}
.rf-card__cat{font-size:.8rem;font-weight:700;color:#3182f6;display:flex;align-items:center;gap:.4rem}
.rf-card__headline{font-size:1.18rem;font-weight:800;line-height:1.35;margin:.1rem 0 0;color:#191f28}
.rf-card__context{font-size:.93rem;line-height:1.55;color:#5a6472;margin:0}
.rf-card__metrics{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.2rem}
.rf-metric{background:#e8f3ff;color:#1b64da;font-weight:700;font-size:.82rem;padding:.35rem .75rem;border-radius:999px;white-space:nowrap}
.rf-card__tags{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:auto;padding-top:.6rem}
.rf-tag{font-size:.72rem;color:#9aa3af}
.rf-card__more{font-size:.8rem;color:#3182f6;font-weight:600;margin-top:.3rem}
.rf-filter{border:1px solid #e3e8ef;background:#fff;color:#5a6472;font-weight:600;font-size:.85rem;padding:.45rem .95rem;border-radius:999px;cursor:pointer;transition:all .2s ease}
.rf-filter:hover{border-color:#90c2ff;color:#1b64da}
.rf-filter.is-active{background:#3182f6;border-color:#3182f6;color:#fff}
#stats.stats{display:flex;flex-wrap:wrap;gap:1.5rem;justify-content:center;margin-top:1.5rem}
.rf-stat{display:flex;flex-direction:column;align-items:center}
.rf-stat__num{font-size:1.6rem;font-weight:800;color:#3182f6;line-height:1}
.rf-stat__label{font-size:.78rem;color:#8b95a1;margin-top:.25rem}
/* modal */
.rf-overlay{position:fixed;inset:0;background:rgba(17,25,43,.5);backdrop-filter:blur(4px);
  display:flex;align-items:flex-start;justify-content:center;padding:5vh 1rem;z-index:999;
  opacity:0;pointer-events:none;transition:opacity .25s ease;overflow-y:auto}
.rf-overlay.open{opacity:1;pointer-events:auto}
.rf-modal{background:#fff;border-radius:22px;max-width:680px;width:100%;padding:2.2rem;
  transform:translateY(20px);transition:transform .3s cubic-bezier(.2,.8,.2,1);box-shadow:0 24px 60px rgba(17,25,43,.3)}
.rf-overlay.open .rf-modal{transform:translateY(0)}
.rf-modal__cat{font-size:.82rem;font-weight:700;color:#3182f6}
.rf-modal__title{font-size:1.5rem;font-weight:800;line-height:1.3;margin:.3rem 0 1rem;color:#191f28}
.rf-modal__img{width:100%;border-radius:14px;margin-bottom:1.3rem;border:1px solid #eef1f5}
.rf-modal__metrics{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1.5rem}
.rf-modal h4{font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;color:#8b95a1;margin:1.3rem 0 .5rem}
.rf-modal p,.rf-modal li{font-size:.96rem;line-height:1.65;color:#3a4452}
.rf-modal ul{margin:0;padding-left:1.2rem}
.rf-modal li{margin-bottom:.4rem}
.rf-modal__skills{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.5rem}
.rf-modal__skills span{background:#f2f4f6;color:#5a6472;font-size:.78rem;padding:.3rem .7rem;border-radius:8px}
.rf-close{position:sticky;top:0;float:right;background:#f2f4f6;border:none;width:36px;height:36px;
  border-radius:50%;font-size:1.1rem;cursor:pointer;color:#5a6472}
`;
const styleEl=document.createElement("style");styleEl.textContent=css;document.head.appendChild(styleEl);

const yearEl=document.getElementById("year");if(yearEl)yearEl.textContent=new Date().getFullYear();

document.querySelectorAll("img[data-emoji]").forEach((img)=>{
  const name=img.dataset.emoji;img.src=`assets/emoji/${name}.png`;
  img.onerror=()=>{const s=document.createElement("span");s.textContent=EMOJI_UNICODE[name]||"";s.className=img.className;s.style.fontSize="3rem";img.replaceWith(s);};
});

let lenis=null;
if(typeof Lenis!=="undefined"&&!REDUCE){lenis=new Lenis({duration:1.1,smoothWheel:true});const raf=(t)=>{lenis.raf(t);requestAnimationFrame(raf);};requestAnimationFrame(raf);}
if(typeof gsap!=="undefined"&&typeof ScrollTrigger!=="undefined"){gsap.registerPlugin(ScrollTrigger);if(lenis)lenis.on("scroll",ScrollTrigger.update);if(!REDUCE)gsap.to(".float",{y:-10,duration:2.4,ease:"sine.inOut",repeat:-1,yoyo:true});}
function revealEls(els){if(REDUCE||typeof gsap==="undefined")return;els.forEach((el)=>gsap.from(el,{opacity:0,y:26,duration:.7,ease:"back.out(1.4)",scrollTrigger:{trigger:el,start:"top 88%"}}));}
revealEls(gsap?.utils?.toArray(".reveal")||[]);

const grid=document.getElementById("caseGrid");
const filtersEl=document.getElementById("filters");
const emptyEl=document.getElementById("caseEmpty");
const statsEl=document.getElementById("stats");
const esc=(s)=>String(s??"").replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let DATA=[];

function cardHTML(item,i){
  const emoji=CAT_EMOJI[item.cat]||"•";
  const metrics=(item.metrics||[]).map((m)=>`<span class="rf-metric">${esc(m)}</span>`).join("");
  const tags=(item.tags||[]).map((t)=>`<span class="rf-tag">#${esc(t)}</span>`).join("");
  const hasDetail=item.detail&&(item.detail.overview||item.detail.problem);
  return `<article class="rf-card reveal" data-cat="${esc(item.cat)}" data-i="${i}">
    <span class="rf-card__cat">${emoji} ${esc(item.cat)}</span>
    <h3 class="rf-card__headline">${esc(item.headline)}</h3>
    <p class="rf-card__context">${esc(item.context)}</p>
    ${metrics?`<div class="rf-card__metrics">${metrics}</div>`:""}
    ${tags?`<div class="rf-card__tags">${tags}</div>`:""}
    ${hasDetail?`<span class="rf-card__more">Read more →</span>`:""}
  </article>`;
}

// modal
const overlay=document.createElement("div");overlay.className="rf-overlay";
overlay.innerHTML=`<div class="rf-modal" role="dialog"><button class="rf-close" aria-label="Close">✕</button><div class="rf-modal__body"></div></div>`;
document.body.appendChild(overlay);
const modalBody=overlay.querySelector(".rf-modal__body");
function imgSrc(v){return /^https?:\/\//.test(v)?v:`assets/cases/${v}`;}
function openModal(item){
  const d=item.detail||{};
  const metrics=(item.metrics||[]).map((m)=>`<span class="rf-metric">${esc(m)}</span>`).join("");
  const actions=(d.actions||[]).map((a)=>`<li>${esc(a)}</li>`).join("");
  const impact=(d.impact||[]).map((x)=>`<li>${esc(x)}</li>`).join("");
  const skills=(d.skills||[]).map((s)=>`<span>${esc(s)}</span>`).join("");
  modalBody.innerHTML=`
    <span class="rf-modal__cat">${CAT_EMOJI[item.cat]||"•"} ${esc(item.cat)}</span>
    <h2 class="rf-modal__title">${esc(item.headline)}</h2>
    ${item.img?`<img class="rf-modal__img" src="${imgSrc(item.img)}" alt="" onerror="this.style.display='none'">`:""}
    ${metrics?`<div class="rf-modal__metrics">${metrics}</div>`:""}
    ${d.overview?`<p>${esc(d.overview)}</p>`:""}
    ${d.problem?`<h4>The problem</h4><p>${esc(d.problem)}</p>`:""}
    ${actions?`<h4>What I did</h4><ul>${actions}</ul>`:""}
    ${impact?`<h4>Impact</h4><ul>${impact}</ul>`:""}
    ${skills?`<h4>Skills</h4><div class="rf-modal__skills">${skills}</div>`:""}`;
  overlay.classList.add("open");document.body.style.overflow="hidden";
}
function closeModal(){overlay.classList.remove("open");document.body.style.overflow="";}
overlay.addEventListener("click",(e)=>{if(e.target===overlay||e.target.classList.contains("rf-close"))closeModal();});
document.addEventListener("keydown",(e)=>{if(e.key==="Escape")closeModal();});

function buildFilters(cats){
  if(!filtersEl)return;
  filtersEl.innerHTML=["All",...cats].map((c,i)=>`<button class="rf-filter${i===0?" is-active":""}" data-filter="${esc(c)}">${esc(c)}</button>`).join("");
  filtersEl.querySelectorAll(".rf-filter").forEach((btn)=>btn.addEventListener("click",()=>{
    filtersEl.querySelectorAll(".rf-filter").forEach((b)=>b.classList.remove("is-active"));
    btn.classList.add("is-active");const f=btn.dataset.filter;
    grid.querySelectorAll(".rf-card").forEach((card)=>{card.style.display=(f==="All"||card.dataset.cat===f)?"":"none";});
    if(typeof ScrollTrigger!=="undefined")ScrollTrigger.refresh();
  }));
}
function buildStats(data){
  if(!statsEl)return;const cats=new Set(data.map((d)=>d.cat).filter(Boolean));
  statsEl.innerHTML=`<div class="rf-stat"><span class="rf-stat__num">${data.length}</span><span class="rf-stat__label">Case studies</span></div>
    <div class="rf-stat"><span class="rf-stat__num">${cats.size}</span><span class="rf-stat__label">Disciplines</span></div>`;
  statsEl.hidden=false;
}

fetch("data.json").then((r)=>r.json()).then((data)=>{
  if(!Array.isArray(data)||data.length===0){if(emptyEl)emptyEl.hidden=false;return;}
  DATA=data;
  grid.innerHTML=data.map(cardHTML).join("");
  grid.querySelectorAll(".rf-card").forEach((card)=>card.addEventListener("click",()=>{
    const item=DATA[+card.dataset.i];if(item&&item.detail)openModal(item);
  }));
  buildFilters([...new Set(data.map((d)=>d.cat).filter(Boolean))]);
  buildStats(data);
  revealEls(gsap?.utils?.toArray("#caseGrid .reveal")||[]);
  if(typeof ScrollTrigger!=="undefined")ScrollTrigger.refresh();
}).catch(()=>{if(emptyEl)emptyEl.hidden=false;});
