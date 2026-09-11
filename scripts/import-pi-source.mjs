/**
 * pi/docs/study → stepwell/content/series/pi-source 转换脚本
 *
 * 解决四件事：
 *  1) 排序：优先用各包「00-模块导读.md」课表里的课号，否则用原文件名数字前缀
 *  2) 编号：重建全局唯一编号（消除 coding-agent 的 95 处重号），并为待补写的 25 篇预留号位
 *  3) 链接：把 1700+ 处 ./xxx.md、../xxx.md 相对链接重写为 Astro 路由
 *  4) frontmatter：注入 title/summary/tags，并把正文首个 H1 去掉（阅读页已渲染 title）
 *
 * 幂等：每次运行会先清空输出目录。
 */
import fs from "node:fs";
import path from "node:path";

const PI = "/Users/lijunkai/Project/pi";
const SRC = path.join(PI, "docs/study");
const OUT = "/Users/lijunkai/Project/stepwell/content/series/pi-source";
const SERIES = "pi-source";
const posix = path.posix;

/** 包配置：src=docs 下目录名，dir=输出子目录，base=起始编号，reserve=为补写预留的号位数 */
const PKGS = [
  { src: "学前", dir: "prelude", base: 1, reserve: 0, label: "学前准备", tags: ["prelude"] },
  { src: "root", dir: "root", base: 4, reserve: 0, label: "仓库根", tags: ["root"] },
  { src: "ai", dir: "ai", base: 60, reserve: 11, label: "pi-ai · LLM 抽象层", tags: ["ai"] },
  { src: "agent", dir: "agent", base: 241, reserve: 8, label: "pi-agent-core · 运行时", tags: ["agent"] },
  { src: "chord", dir: "chord", base: 333, reserve: 0, label: "chord", tags: ["chord"] },
  { src: "protocol", dir: "protocol", base: 358, reserve: 0, label: "protocol · 线协议", tags: ["protocol"] },
  { src: "session-backends", dir: "session-backends", base: 367, reserve: 6, label: "session-backends · 持久化", tags: ["session-backends"] },
  { src: "client", dir: "client", base: 389, reserve: 0, label: "client · 瘦客户端", tags: ["client"] },
  { src: "server", dir: "server", base: 398, reserve: 0, label: "server · 受信任大脑", tags: ["server"] },
  { src: "telemetry", dir: "telemetry", base: 415, reserve: 0, label: "telemetry · 遥测", tags: ["telemetry"] },
  { src: "tui", dir: "tui", base: 422, reserve: 0, label: "tui · 终端 UI", tags: ["tui"] },
  { src: "coding-agent", dir: "coding-agent", base: 466, reserve: 0, label: "coding-agent · 产品总装", tags: ["coding-agent"] },
  { src: "evals", dir: "evals", base: 725, reserve: 0, label: "evals · 评测", tags: ["evals"] },
];

/**
 * 源文档中的笔误链接修正（键与值均为相对 docs/study 的路径）。
 * 27-interactive-mode.ts.md 里把 32-components.index.ts.md 写成了 28-…，此处纠正。
 */
const LINK_ALIASES = new Map([
  ["coding-agent/28-components.index.ts.md", "coding-agent/32-components.index.ts.md"],
]);

// ---------------- 工具函数 ----------------
function walkMd(root, rel) {
  const out = [];
  const abs = rel ? path.join(root, rel) : root;
  if (!fs.existsSync(abs)) return out;
  (function rec(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) rec(p);
      else if (e.name.endsWith(".md")) out.push(path.relative(root, p).split(path.sep).join("/"));
    }
  })(abs);
  return out;
}

const decodeSafe = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

function numOf(p) {
  const m = posix.basename(p).match(/^(\d+)/);
  return m ? Number(m[1]) : Infinity;
}

/** 解析导读课表：| 课号 | [标题](./文件.md) | ... | */
function parseRank(guideAbs) {
  const rank = new Map();
  if (!fs.existsSync(guideAbs)) return rank;
  for (const line of fs.readFileSync(guideAbs, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\|\s*(\d+)\s*\|[^|]*\]\(([^)]+)\)/);
    if (!m) continue;
    const tgt = decodeSafe(m[2].split("#")[0]);
    rank.set(posix.basename(tgt), Number(m[1]));
  }
  return rank;
}

const yamlStr = (s) => JSON.stringify(String(s));

function splitTitleBody(content) {
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  let title = "";
  if (i < lines.length && /^#\s+/.test(lines[i])) {
    title = lines[i].replace(/^#\s+/, "").trim();
    i++;
  }
  while (i < lines.length && lines[i].trim() === "") i++;
  return { title, body: lines.slice(i).join("\n") };
}

function extractSummary(body) {
  for (const b of body.split(/\n\s*\n/)) {
    const t = b.trim();
    if (!t) continue;
    if (/^(#|```|>|\||:::|-|\*|\d+\.)/.test(t)) continue;
    // 跳过文档头部的元信息块（路径：/npm 名：/版本：/源码：/被谁调用：）
    if (/^\s*(路径|npm 名|版本|命令名|源码|被谁调用|依赖|上游)[：:]/.test(t)) continue;
    const clean = t
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[`*_]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (clean.length >= 12) return clean.slice(0, 118);
  }
  return "";
}

// ---------------- 主流程 ----------------
fs.rmSync(OUT, { recursive: true, force: true });

const records = [];
const reservations = [];
const stats = [];

// 总导读（docs/study/README.md）放在卷零首位
records.push({ srcRel: "README.md", dir: "prelude", num: 0, label: "学前准备", tags: ["prelude"], isGuide: true });

for (const p of PKGS) {
  const files = walkMd(SRC, p.src);
  const guideRel = posix.join(p.src, "00-模块导读.md");
  const hasGuide = files.includes(guideRel);
  const rank = hasGuide ? parseRank(path.join(SRC, guideRel)) : new Map();

  const unnumbered = files.filter((f) => numOf(f) === Infinity).length;
  const useRank = files.length > 0 && unnumbered / files.length > 0.3;

  const keyOf = (f) => {
    if (f === guideRel) return -1;
    const r = rank.get(posix.basename(f));
    const n = numOf(f);
    if (useRank) return r !== undefined ? r : n === Infinity ? 9999 : n;
    return n === Infinity ? (r !== undefined ? r : 9999) : n;
  };

  const sorted = [...files].sort((a, b) => {
    const ka = keyOf(a), kb = keyOf(b);
    if (ka !== kb) return ka - kb;
    return posix.basename(a).localeCompare(posix.basename(b), "zh");
  });

  sorted.forEach((f, idx) => {
    records.push({ srcRel: f, dir: p.dir, num: p.base + idx, label: p.label, tags: p.tags });
  });

  for (let k = 0; k < p.reserve; k++) {
    reservations.push({ dir: p.dir, num: p.base + files.length + k, label: p.label });
  }

  stats.push({
    pkg: p.src,
    dir: p.dir,
    files: files.length,
    numbered: files.length - unnumbered,
    unnumbered,
    useRank,
    rankHit: files.filter((f) => rank.has(posix.basename(f))).length,
    range: files.length ? `${p.base} - ${p.base + files.length - 1}` : "-",
  });
}

// 新文件名与路由
for (const r of records) {
  const base = posix.basename(r.srcRel, ".md");
  let stripped = r.srcRel === "README.md" ? "总导读" : base.replace(/^\d+-/, "");
  // URL 友好：文件名里的点会被 Astro 的 slug 化吃掉（run.ts -> runts），统一换成连字符
  stripped = stripped.replace(/\./g, "-");
  r.outBase = `${String(r.num).padStart(3, "0")}-${stripped}`;
  r.outRel = posix.join(r.dir, r.outBase + ".md");
  r.route = `/series/${SERIES}/${r.dir}/${encodeURI(r.outBase)}/`;
}

const routeMap = new Map(records.map((r) => [r.srcRel, r.route]));

// 写文件
let linkRewritten = 0;
let linkMissed = 0;
const missedSamples = [];
let containerCount = 0;
const containerFiles = [];

for (const r of records) {
  const raw = fs.readFileSync(path.join(SRC, r.srcRel), "utf8");
  const { title, body } = splitTitleBody(raw);
  const summary = extractSummary(body);

  if (/^:::/m.test(body)) {
    containerCount += (body.match(/^:::/gm) ?? []).length;
    containerFiles.push(r.srcRel);
  }

  const srcDir = posix.dirname(r.srcRel);
  const newBody = body.replace(/(!?\[[^\]]*\]\()([^)\s]+)(\))/g, (full, pre, target, post) => {
    if (/^(https?:|mailto:|data:|#|\/)/.test(target)) return full;
    const hashIdx = target.indexOf("#");
    const pathPart = hashIdx >= 0 ? target.slice(0, hashIdx) : target;
    const hash = hashIdx >= 0 ? target.slice(hashIdx) : "";
    if (!/\.md$/.test(pathPart)) return full;
    let resolved = posix.normalize(posix.join(srcDir, decodeSafe(pathPart)));
    if (!routeMap.has(resolved) && LINK_ALIASES.has(resolved)) resolved = LINK_ALIASES.get(resolved);
    const route = routeMap.get(resolved);
    if (!route) {
      linkMissed++;
      if (missedSamples.length < 12) missedSamples.push(`${r.srcRel} -> ${target}`);
      return full;
    }
    linkRewritten++;
    return pre + route + hash + post;
  });

  const fm = [
    "---",
    `title: ${yamlStr(title || r.outBase)}`,
    `summary: ${yamlStr(summary)}`,
    `tags: [${["pi", ...r.tags].join(", ")}]`,
    "---",
    "",
  ].join("\n");

  const dest = path.join(OUT, r.outRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, fm + newBody, "utf8");
}

// 编号连续性校验
const nums = records.map((r) => r.num).sort((a, b) => a - b);
const dupes = nums.filter((n, i) => i > 0 && n === nums[i - 1]);
const reserveNums = new Set(reservations.map((x) => x.num));
const gaps = [];
for (let i = nums[0]; i <= nums[nums.length - 1]; i++) {
  if (!nums.includes(i) && !reserveNums.has(i)) gaps.push(i);
}

// ---------------- 报告 ----------------
console.log("### 每包统计 ###");
console.log("包 | 输出目录 | 文件数 | 有编号 | 无编号 | 用课表 | 课表命中 | 编号区间");
console.log("---|---|---|---|---|---|---|---");
for (const s of stats) {
  console.log(`${s.pkg} | ${s.dir} | ${s.files} | ${s.numbered} | ${s.unnumbered} | ${s.useRank ? "是" : "否"} | ${s.rankHit} | ${s.range}`);
}
console.log(`\n总记录: ${records.length}（含总导读 1 篇）`);
console.log(`预留号位: ${reservations.length}`);
console.log(`编号范围: ${nums[0]} - ${nums[nums.length - 1]}`);
console.log(`重复编号: ${dupes.length}${dupes.length ? " -> " + dupes.slice(0, 10).join(",") : ""}`);
console.log(`空洞(非预留): ${gaps.length}${gaps.length ? " -> " + gaps.slice(0, 20).join(",") : ""}`);
console.log(`\n链接重写: ${linkRewritten} 成功, ${linkMissed} 未命中`);
if (missedSamples.length) {
  console.log("未命中样例:");
  missedSamples.forEach((s) => console.log("  " + s));
}
console.log(`\nVitePress 容器语法 ::: 共 ${containerCount} 处，分布于 ${containerFiles.length} 个文件`);
containerFiles.slice(0, 8).forEach((f) => console.log("  " + f));

fs.writeFileSync("/tmp/pi-source-reservations.json", JSON.stringify(reservations, null, 2));
console.log("\n预留清单已写入 /tmp/pi-source-reservations.json");

// ---------------- 生成系列元卡 _meta.md ----------------
const META = [
  "---",
  'title: "Pi 源码逐文件解析"',
  'en: "PI SOURCE WALKTHROUGH"',
  'sub: "对 pi 仓库每一个源码文件的逐篇拆解：从 ai 抽象层一路读到 coding-agent 产品总装，共 737 讲。"',
  "intro: >",
  "  与《Pi Agent Harness 源码精读》的「讲课」路线互补，这一套是「逐文件」路线：pi 仓库里每一个真正参与构建的源码文件，",
  "  都有一篇对应的解析——它在哪、被谁调用、解决什么问题、关键函数怎么走。按包编排成十三卷：",
  "  学前准备（TypeScript 读法、术语表、断点调试）、仓库根（构建与发布脚本）、pi-ai（LLM 抽象层与 40+ 厂商适配）、",
  "  pi-agent-core（Agent 循环、harness 可恢复会话）、chord、protocol（CBOR 线协议）、session-backends（SQLite 持久化）、",
  "  client / server（信任边界与进程分离）、telemetry（埋点契约）、tui（手写差分渲染）、coding-agent（259 篇，产品总装）、",
  "  evals（轨迹评测）。适合当作常备的源码字典：读到哪个文件卡住，就翻哪一篇。",
  "category: source",
  "level: deep",
  'hue: "#1E4A6B"',
  'hue2: "#7FA8C8"',
  "status: ongoing",
  "order: 4",
  "phases:",
  '  - name: "卷零 · 学前准备：怎么读这套文档（0-3）"',
  '    slugPrefix: "0-3"',
  '  - name: "卷一 · 仓库根：构建、发布与工程配置（4-59）"',
  '    slugPrefix: "4-59"',
  '  - name: "卷二 · pi-ai：LLM 抽象层与 40+ 厂商适配（60-240）"',
  '    slugPrefix: "60-240"',
  '  - name: "卷三 · pi-agent-core：Agent 循环与可恢复会话（241-332）"',
  '    slugPrefix: "241-332"',
  '  - name: "卷四 · chord：轮式服务与状态打包（333-357）"',
  '    slugPrefix: "333-357"',
  '  - name: "卷五 · protocol：CBOR 线协议与分帧（358-366）"',
  '    slugPrefix: "358-366"',
  '  - name: "卷六 · session-backends：SQLite 会话仓库（367-388）"',
  '    slugPrefix: "367-388"',
  '  - name: "卷七 · client：瘦控制器与连接（389-397）"',
  '    slugPrefix: "389-397"',
  '  - name: "卷八 · server：受信任大脑与会话管理（398-414）"',
  '    slugPrefix: "398-414"',
  '  - name: "卷九 · telemetry：遥测契约与埋点（415-421）"',
  '    slugPrefix: "415-421"',
  '  - name: "卷十 · tui：终端 UI 与差分渲染（422-465）"',
  '    slugPrefix: "422-465"',
  '  - name: "卷十一 · coding-agent：产品总装（466-724）"',
  '    slugPrefix: "466-724"',
  '  - name: "卷十二 · evals：轨迹评测与回归（725-736）"',
  '    slugPrefix: "725-736"',
  "---",
  "",
  "这一套文档的组织方式和《Pi Agent Harness 源码精读》不同。那套是 46 讲课程，按「世界观 → 地基 → 心脏 → 手脚」的线索把仓库讲一遍；这一套是**逐文件字典**——你打开 `packages/` 下任何一个文件，都能在这里找到对应的那一篇。",
  "",
  "每篇的结构基本一致：先一句话说明这个文件干什么、被谁调用，再讲它解决问题的具体机制，必要时贴上关键代码段与源码行号。包内顺序不是按字母，而是按调用关系与依赖层次。",
  "",
  "十三卷的划分对应 pi 的依赖分层：`ai` 是最底层（不带任何 Agent 概念，只管和模型说话），`agent` 是循环内核，`coding-agent` 在最上层把一切焊成产品；`protocol` / `client` / `server` 是信任边界那一刀，`tui` 与 `session-backends` 分别是脸面和记忆。",
  "",
  "读法建议：第一次跟路径时，按卷次从学前准备一路往下读；之后当作字典用——在源码里遇到不认识的模块，直接搜文件名跳到对应篇目。",
  "",
].join("\n");

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "_meta.md"), META, "utf8");
console.log("系列元卡 _meta.md 已生成");
