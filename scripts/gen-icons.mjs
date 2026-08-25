#!/usr/bin/env node
/**
 * PWA 图标生成：从 public/favicon.svg 生成各尺寸 PNG。
 * 用法：npm run icons   （需要本机有 rsvg-convert 或 sips/macOS）
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SVG = path.join(ROOT, "public/favicon.svg");
const OUT = path.join(ROOT, "public/icons");

if (!existsSync(SVG)) {
  console.error("找不到 favicon.svg");
  process.exit(1);
}

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "maskable-512.png", size: 512, pad: true },
];

// macOS 自带 sips 不支持 svg→png，优先用 rsvg-convert，其次 qlmanage 兜底
function convert(svgPath, outPath, size) {
  if (execSync("command -v rsvg-convert || true", { encoding: "utf8" }).trim()) {
    execSync(`rsvg-convert -w ${size} -h ${size} "${svgPath}" -o "${outPath}"`);
    return true;
  }
  // macOS 兜底：qlmanage 能渲染 svg
  try {
    const tmp = `/tmp/stepwell-icon-${size}`;
    execSync(`qlmanage -t -s ${size} -o /tmp "${svgPath}" >/dev/null 2>&1`);
    execSync(`mv "/tmp/${path.basename(svgPath)}.png" "${outPath}"`);
    return existsSync(outPath);
  } catch {
    return false;
  }
}

let ok = 0;
for (const t of targets) {
  const out = path.join(OUT, t.file);
  if (convert(SVG, out, t.size)) ok++;
}
console.log(`图标生成完成：${ok}/${targets.length}`);
