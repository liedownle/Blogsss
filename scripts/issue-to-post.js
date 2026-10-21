#!/usr/bin/env node
/**
 * Issue → Jekyll 博文（由 .github/workflows/issue-to-post.yml 调用）
 * - issue 标题 → 文章标题 / 文件名
 * - issue 正文 → 正文；开头可自写 front matter 覆盖 categories / encrypted / date
 * - 正文里粘贴的 GitHub 附件图片自动下载到 assets/images/ 并改写路径
 * - 同一 issue 重复触发（编辑后重新打标签）会更新同一篇文章，靠 front matter 里的 issue_number 识别
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const POSTS = path.join(ROOT, '_posts');
const IMAGES = path.join(ROOT, 'assets', 'images');
const IMG_RE =
  /https:\/\/(?:github\.com\/user-attachments\/assets|(?:private-)?user-images\.githubusercontent\.com)\/[^\s)"'<>]+/g;

function configValue(key) {
  try {
    const re = new RegExp(`^${key}:\\s*["']?([^"'\\r\\n#]*)["']?`, 'm');
    const m = fs.readFileSync(path.join(ROOT, '_config.yml'), 'utf8').match(re);
    return m ? m[1].trim() : '';
  } catch {
    return '';
  }
}
const baseurl = configValue('baseurl').replace(/\/+$/, '');

function bjNow() {
  const t = new Date(Date.now() + 8 * 3600e3);
  const p = (n) => String(n).padStart(2, '0');
  const ymd = `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
  const hms = `${p(t.getUTCHours())}:${p(t.getUTCMinutes())}:${p(t.getUTCSeconds())}`;
  return { ymd, full: `${ymd} ${hms} +0800` };
}

function slugify(text, max = 40) {
  let s = String(text)
    .replace(/[\\/:*?"<>|#%&{}@`$!'^~+=;,()\[\]\r\n\t]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  if (!s) s = 'post';
  return s.slice(0, max).replace(/[-.]+$/g, '') || 'post';
}

/** 正文开头的可选 front matter（看起来不像就当普通正文） */
function splitFrontMatter(raw) {
  const m = raw.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!m) return { extra: '', body: raw };
  const ok = m[1]
    .split('\n')
    .every(
      (line) =>
        line.trim() === '' ||
        /^\s*#/.test(line) ||
        /^[A-Za-z_][\w-]*\s*:/.test(line) ||
        /^\s+\S/.test(line) ||
        /^-\s/.test(line)
    );
  return ok ? { extra: m[1], body: raw.slice(m[0].length) } : { extra: '', body: raw };
}

function yamlKeys(yaml) {
  const keys = new Set();
  String(yaml || '')
    .split('\n')
    .forEach((line) => {
      const m = line.match(/^([A-Za-z_][\w-]*)\s*:/);
      if (m) keys.add(m[1]);
    });
  return keys;
}

function frontMatterValue(content, key) {
  const m = content.match(/^---[ \t]*\n([\s\S]*?)\n---/);
  if (!m) return '';
  const v = m[1].match(new RegExp(`^${key}\\s*:\\s*(.+?)\\s*$`, 'm'));
  return v ? v[1].replace(/^["']|["']$/g, '') : '';
}

function findExistingPost(num) {
  if (!fs.existsSync(POSTS)) return null;
  for (const f of fs.readdirSync(POSTS)) {
    if (!f.endsWith('.md')) continue;
    const p = path.join(POSTS, f);
    if (frontMatterValue(fs.readFileSync(p, 'utf8').slice(0, 800), 'issue_number') === String(num)) return p;
  }
  return null;
}

function extOf(type, url) {
  const t = String(type || '').split(';')[0].trim().toLowerCase();
  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
  };
  if (map[t]) return map[t];
  const m = url.match(/\.(png|jpe?g|gif|webp|svg|avif)(?:\?|$)/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'png';
}

async function localizeImages(body, num) {
  const urls = [...new Set(body.match(IMG_RE) || [])];
  if (!urls.length) return body;
  fs.mkdirSync(IMAGES, { recursive: true });
  let out = body;
  for (const url of urls) {
    try {
      const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 10);
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get('content-type') || '';
      if (!/^image\//i.test(type)) throw new Error(`不是图片: ${type}`);
      const name = `issue-${num}-${hash}.${extOf(type, url)}`;
      const dest = path.join(IMAGES, name);
      if (!fs.existsSync(dest)) {
        fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
        console.log(`[image] 已保存 assets/images/${name}`);
      }
      out = out.split(url).join(`${baseurl}/assets/images/${name}`);
    } catch (err) {
      console.warn(`[image] 下载失败，保留原链接: ${url} (${err.message})`);
    }
  }
  return out;
}

function readIssue() {
  const p = process.env.GITHUB_EVENT_PATH;
  if (p && fs.existsSync(p)) {
    try {
      const ev = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (ev.issue) return ev.issue;
    } catch {
      /* 回退到环境变量 */
    }
  }
  return {
    number: Number(process.env.ISSUE_NUMBER || 0),
    title: process.env.ISSUE_TITLE || '',
    body: process.env.ISSUE_BODY || '',
  };
}

function setOutput(key, value) {
  const line = `${key}=${String(value).replace(/\n/g, ' ')}\n`;
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, line);
  console.log(`[output] ${line.trim()}`);
}

async function main() {
  const issue = readIssue();
  const num = Number(issue.number) || 0;
  const title =
    String(issue.title || '')
      .replace(/^\[post\]\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim() || `Issue ${num}`;
  const raw = String(issue.body || '').replace(/\r\n/g, '\n');

  const { extra, body } = splitFrontMatter(raw);
  const content = (await localizeImages(body, num)).replace(/^\n+/, '').replace(/\s+$/, '');

  const existing = findExistingPost(num);
  const oldDate = existing ? frontMatterValue(fs.readFileSync(existing, 'utf8'), 'date') : '';
  const custom = yamlKeys(extra);
  const now = bjNow();
  const dateValue = frontMatterValue(extra, 'date') || oldDate || now.full;

  const lines = ['---'];
  if (!custom.has('layout')) lines.push('layout: post');
  if (!custom.has('title')) lines.push(`title: ${JSON.stringify(title)}`);
  if (!custom.has('date')) lines.push(`date: ${dateValue}`);
  if (!custom.has('categories')) lines.push('categories: 随笔');
  if (!custom.has('issue_number')) lines.push(`issue_number: ${num}`);
  if (extra.trim()) lines.push(extra.trimEnd());
  lines.push('---', '');

  let file;
  if (existing) {
    file = existing;
  } else {
    const ymd = /^\d{4}-\d{2}-\d{2}/.test(dateValue) ? dateValue.slice(0, 10) : now.ymd;
    file = path.join(POSTS, `${ymd}-${slugify(title)}.md`);
    if (fs.existsSync(file)) file = path.join(POSTS, `${ymd}-${slugify(title)}-i${num}.md`);
  }

  const output = `${lines.join('\n')}\n${content}\n`;
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;

  if (before === output) {
    console.log('[skip] 文章内容无变化');
    setOutput('changed', 'false');
  } else {
    fs.mkdirSync(POSTS, { recursive: true });
    fs.writeFileSync(file, output);
    console.log(`[post] 已写入 ${path.relative(ROOT, file)}`);
    setOutput('changed', 'true');
  }
  setOutput('file', path.relative(ROOT, file).replace(/\\/g, '/'));
  setOutput('title', title);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
