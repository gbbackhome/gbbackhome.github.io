// 3D 이모지(Microsoft Fluent Emoji, MIT) 로컬 다운로드
// 실행: node scripts/download-emoji.mjs
// 결과: assets/emoji/*.png  (외부 핫링크 대신 로컬 저장)
import { mkdir, writeFile } from "node:fs/promises";

const OUT = "assets/emoji";
// 폴더명(Display Name) → 저장 파일명
const ITEMS = {
  "Rocket": "rocket_3d.png",
  "Gear": "gear_3d.png",
  "Brain": "brain_3d.png",
  "Light Bulb": "light_bulb_3d.png",
  "Waving Hand": "waving_hand_3d.png",
  "Bar Chart": "bar_chart_3d.png",
  "Chart Increasing": "chart_increasing_3d.png",
  "Briefcase": "briefcase_3d.png",
  "Books": "books_3d.png",
  "Direct Hit": "direct_hit_3d.png",
};

const RAW = (name, file) =>
  `https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/${encodeURIComponent(name)}/3D/${file}`;

await mkdir(OUT, { recursive: true });

let ok = 0;
for (const [name, file] of Object.entries(ITEMS)) {
  try {
    const res = await fetch(RAW(name, file));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(`${OUT}/${file}`, buf);
    console.log(`✓ ${file}`);
    ok++;
  } catch (e) {
    console.error(`✗ ${file} — ${e.message}`);
  }
}
console.log(`\n완료: ${ok}/${Object.keys(ITEMS).length}`);
