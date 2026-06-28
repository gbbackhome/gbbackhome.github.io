// Method B: Google 서비스계정으로 비공개 시트에서 데이터 동기화
// 보안 원칙: A열·E열만 읽음. B열·D열은 절대 요청하지 않음.
//   - A열: 사용 여부/메모 등 자유 (참고용, 저장 안 함)
//   - E열: 위 스키마의 JSON 문자열 → 파싱해서 data.json 으로 저장
//
// 환경변수:
//   GOOGLE_SERVICE_ACCOUNT_JSON  서비스계정 키(JSON 전체 문자열)
//   SHEET_ID                     스프레드시트 ID
//   SHEET_NAME                   탭 이름 (기본: Sheet1)
import { writeFile, readFile } from "node:fs/promises";
import { google } from "googleapis";

const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || "Sheet1";
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

const REQUIRED = ["cat", "title", "s", "t", "a", "r", "tags"];
const out = [];
let skipped = 0;

for (let i = 0; i < rows; i++) {
  const raw = (colE[i]?.[0] || "").trim();
  if (!raw) { skipped++; continue; }                // E가 비면 건너뜀
  try {
    const obj = JSON.parse(raw);
    // 스키마 키만 추려서 정규화
    const item = {};
    for (const k of REQUIRED) {
      item[k] = k === "tags" ? (Array.isArray(obj.tags) ? obj.tags : []) : (obj[k] ?? "");
    }
    if (!item.title) { skipped++; continue; }        // 제목 없으면 무효 행
    out.push(item);
  } catch {
    skipped++;                                       // 파싱 실패 행 건너뜀
  }
}

// 변경이 있을 때만 파일을 갱신하도록, 동일하면 그대로 둠
const next = JSON.stringify(out, null, 2) + "\n";
let prev = "";
try { prev = await readFile("data.json", "utf8"); } catch {}
if (next !== prev) {
  await writeFile("data.json", next);
  console.log(`data.json 갱신: ${out.length}건 (건너뜀 ${skipped})`);
} else {
  console.log(`변경 없음: ${out.length}건 (건너뜀 ${skipped})`);
}
