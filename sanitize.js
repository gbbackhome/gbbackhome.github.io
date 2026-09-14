// 공개 경계 익명화 게이트 — 시트(비공개 원본)와 사이트(공개) 사이의 마지막 관문.
// 원칙: 시트는 날것 그대로 두고, 사이트로 나가는 순간에만 치환·검사한다.
//
// 규칙은 이 퍼블릭 리포에 두지 않는다(규칙 파일 자체가 클라이언트명 목록이 되므로).
// 환경변수 ANONYMIZE_RULES 에 JSON 문자열로 주입한다 (GitHub Secret / 로컬 비공개 파일).
//   {
//     "replace":      { "원문": "대체 표현", ... },   // 긴 키부터 먼저 치환, 단어 경계 기준
//     "deny":         [ "정규식", ... ],               // 치환 후에도 남아 있으면 빌드 실패
//     "skipHeadline": [ "정규식", ... ]                // 테스트/초안 행 — 사이트에 싣지 않음
//   }
//
// 사용:
//   import { loadRules, sanitizeItem, findLeaks, shouldSkip } from "./sanitize.js";
//   node sanitize.js data.json        → 기존 data.json 을 검사·치환 (CI 게이트 / 로컬 점검)
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function loadRules(env = process.env) {
  const raw = env.ANONYMIZE_RULES;
  if (!raw) throw new Error("환경변수 ANONYMIZE_RULES 가 없습니다 — 익명화 규칙 없이 공개 빌드를 진행하지 않습니다.");
  const r = JSON.parse(raw);
  const replace = Object.entries(r.replace || {})
    .sort((a, b) => b[0].length - a[0].length) // 긴 표현 우선 ("Hill's Pet Food" > "Hill's")
    .map(([from, to]) => [new RegExp(`\\b${escapeRe(from)}\\b`, "g"), to]);
  const deny = (r.deny || []).map((p) => new RegExp(p, "g"));
  const skipHeadline = (r.skipHeadline || []).map((p) => new RegExp(p));
  return { replace, deny, skipHeadline };
}

export function sanitizeText(s, rules) {
  let out = s;
  for (const [re, to] of rules.replace) out = out.replace(re, to);
  // 관사 중복 보정: "A Hills campaign" → "A a global … campaign" → "A global … campaign"
  return out.replace(/\b([Aa]|[Tt]he) (?:a|an|the|its) (?=\w)/g, "$1 ");
}

// 문자열이 들어 있는 모든 깊이의 값에 치환 적용 (객체 키는 건드리지 않음)
export function sanitizeDeep(v, rules) {
  if (typeof v === "string") return sanitizeText(v, rules);
  if (Array.isArray(v)) return v.map((x) => sanitizeDeep(x, rules));
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, x] of Object.entries(v)) o[k] = sanitizeDeep(x, rules);
    return o;
  }
  return v;
}

export const sanitizeItem = sanitizeDeep;

// 치환 후 잔존 매치 목록 — 비어 있지 않으면 게시하면 안 됨
export function findLeaks(v, rules, path = "$") {
  const hits = [];
  if (typeof v === "string") {
    for (const re of rules.deny) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(v))) hits.push({ path, match: m[0] });
    }
  } else if (Array.isArray(v)) {
    v.forEach((x, i) => hits.push(...findLeaks(x, rules, `${path}[${i}]`)));
  } else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) hits.push(...findLeaks(x, rules, `${path}.${k}`));
  }
  return hits;
}

export function shouldSkip(item, rules) {
  return rules.skipHeadline.some((re) => re.test(item.headline || ""));
}

// 전체 케이스 배열 처리: 스킵 → 치환 → headline 기준 중복 제거 → 잔존 검사
export function sanitizeAll(items, rules) {
  const seen = new Set();
  const out = [];
  let skipped = 0, deduped = 0;
  for (const raw of items) {
    if (shouldSkip(raw, rules)) { skipped++; continue; }
    const item = sanitizeItem(raw, rules);
    if (seen.has(item.headline)) { deduped++; continue; }
    seen.add(item.headline);
    out.push(item);
  }
  const leaks = out.flatMap((it, i) => findLeaks(it, rules, `[${i}] ${it.headline.slice(0, 40)}`));
  return { out, skipped, deduped, leaks };
}

// CLI: node sanitize.js data.json  (치환 결과를 제자리에 쓰고, 잔존 시 exit 1)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = process.argv[2] || "data.json";
  const rules = loadRules();
  const items = JSON.parse(await readFile(file, "utf8"));
  const { out, skipped, deduped, leaks } = sanitizeAll(items, rules);
  const next = JSON.stringify(out, null, 2) + "\n";
  const changed = next !== (await readFile(file, "utf8"));
  if (changed) await writeFile(file, next);
  console.log(`${file}: ${items.length}→${out.length}건 (스킵 ${skipped}, 중복 ${deduped}, ${changed ? "치환 적용" : "변경 없음"})`);
  if (leaks.length) {
    for (const l of leaks) console.log(`::error file=${file}::잔존 클라이언트명 "${l.match}" at ${l.path}`);
    process.exit(1);
  }
}
