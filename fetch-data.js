// Method B: Google 서비스계정으로 비공개 시트에서 데이터 동기화
// 보안 원칙: A열·E열만 읽음. B열·D열은 절대 요청하지 않음.
//   - A열: 메모 등 자유 (참고용, 저장 안 함)
//   - D열: 날것 원본 (내부 DB용, 사이트엔 안 올림 — 애초에 읽지도 않음)
//   - E열: JSON 문자열 → 파싱해서 data.json 으로 저장
//   - 스키마: { cat, headline, context, metrics[], tags[], img, detail{} }
//   - 익명화: 시트는 날것 그대로, 사이트로 나가기 직전 sanitize.js 가 치환 + 잔존 검사(실패 시 빌드 중단)
import { writeFile, readFile } from "node:fs/promises";
import { google } from "googleapis";
import { loadRules, sanitizeAll } from "./sanitize.js";

const rules = loadRules(); // ANONYMIZE_RULES 없으면 여기서 즉시 종료 — 규칙 없는 공개 빌드 금지

const SHEET_ID = process.env.SHEET_ID || "1aIwM45AcTbIvsNUIuLALSdexe7rM26Ll3lBT_FqMqK4";
const SHEET_NAME = process.env.SHEET_NAME || "tab1";
const KEY = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

if (!SHEET_ID || !KEY) {
  console.error("환경변수 SHEET_ID / GOOGLE_SERVICE_ACCOUNT_JSON 가 필요합니다.");
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(KEY),
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });

// A열과 E열만 콕 집어서 요청 (B·C·D는 네트워크로도 가져오지 않음)
const { data } = await sheets.spreadsheets.values.batchGet({
  spreadsheetId: SHEET_ID,
  ranges: [`${SHEET_NAME}!A2:A`, `${SHEET_NAME}!E2:E`],
});

const colA = data.valueRanges?.[0]?.values || [];
const colE = data.valueRanges?.[1]?.values || [];
const rows = Math.max(colA.length, colE.length);

const STR_KEYS = ["cat", "headline", "context", "img"];
const out = [];
let skipped = 0;

for (let i = 0; i < rows; i++) {
  const raw = (colE[i]?.[0] || "").trim();
  if (!raw) { skipped++; continue; }                 // E가 비면 건너뜀
  try {
    const obj = JSON.parse(raw);
    const item = {};
    for (const k of STR_KEYS) item[k] = typeof obj[k] === "string" ? obj[k] : "";
    item.metrics = Array.isArray(obj.metrics) ? obj.metrics : [];
    item.tags = Array.isArray(obj.tags) ? obj.tags : [];
    item.detail = (obj.detail && typeof obj.detail === "object") ? obj.detail : null;
    if (!item.headline) { skipped++; continue; }       // headline 없으면 무효 행
    out.push(item);
  } catch {
    skipped++;                                         // 파싱 실패 행 건너뜀
  }
}

// 공개 경계 게이트: 테스트 행 스킵 → 클라이언트명 치환 → headline 중복 제거 → 잔존 검사
const { out: pub, skipped: testRows, deduped, leaks } = sanitizeAll(out, rules);
if (leaks.length) {
  for (const l of leaks) console.log(`::error::잔존 클라이언트명 "${l.match}" at ${l.path}`);
  console.error(`익명화 실패 ${leaks.length}건 — data.json 을 갱신하지 않습니다.`);
  process.exit(1);
}

// 변경이 있을 때만 파일을 갱신하도록, 동일하면 그대로 둠
const next = JSON.stringify(pub, null, 2) + "\n";
let prev = "";
try { prev = await readFile("data.json", "utf8"); } catch {}
const stat = `${pub.length}건 (무효 ${skipped}, 테스트행 ${testRows}, 중복 ${deduped})`;
if (next !== prev) {
  await writeFile("data.json", next);
  console.log(`data.json 갱신: ${stat}`);
} else {
  console.log(`변경 없음: ${stat}`);
}
