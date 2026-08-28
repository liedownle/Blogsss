#!/usr/bin/env node
/*
 * 加密构建脚本
 * 作用：扫描 Jekyll 生成的 _site 目录，找到标记为加密的博文页面，
 *       把页面正文（#encrypt-body 内的明文）用密钥加密成密文，
 *       替换回页面，并在页面注入全局变量 window.__ENCRYPTED_BODY__。
 *
 * 密钥来源：环境变量 BLOG_SECRET_KEY（由 GitHub Secrets 注入，仓库中无明文）
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEY = process.env.BLOG_SECRET_KEY || '';
if (!KEY) {
  console.error('[encrypt] 未设置 BLOG_SECRET_KEY，跳过加密。');
  process.exit(0);
}

const SITE_DIR = path.resolve(process.cwd(), '_site');
if (!fs.existsSync(SITE_DIR)) {
  console.error('[encrypt] 未找到 _site 目录。');
  process.exit(1);
}

// AES-256-CBC 加密
function encrypt(plaintext, password) {
  const key = crypto.createHash('sha256').update(password).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  // 格式：iv(base64).密文(base64)
  return iv.toString('base64') + '.' + encrypted;
}

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (entry.isFile() && full.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

let encryptedCount = 0;
const htmlFiles = walk(SITE_DIR);

for (const file of htmlFiles) {
  let html = fs.readFileSync(file, 'utf8');

  // 只处理加密页面：页面含 #encrypt-body 容器
  if (!html.includes('id="encrypt-body"')) continue;

  // 提取明文正文：使用 HTML 注释标记精确切分，避免嵌套 div 干扰
  const START = '<!-- ENCRYPT:START -->';
  const END = '<!-- ENCRYPT:END -->';
  const startIdx = html.indexOf(START);
  const endIdx = html.indexOf(END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    console.error(`[encrypt] 未找到加密标记: ${file}`);
    continue;
  }

  const plaintext = html.slice(startIdx + START.length, endIdx).trim();

  // 只加密非空正文
  if (!plaintext) {
    console.log(`[encrypt] 跳过空正文: ${file}`);
    continue;
  }

  const ciphertext = encrypt(plaintext, KEY);

  // 把正文替换为密文容器（隐藏，由 JS 解密后显示）
  const newBody = `\n<div id="encrypt-ciphertext" style="display:none;">${ciphertext}</div>\n`;

  html = html.slice(0, startIdx) + newBody + html.slice(endIdx + END.length);

  // 注入全局密文变量，供 encrypt.js 读取
  const injectScript = `<script>window.__ENCRYPTED_BODY__ = ${JSON.stringify(ciphertext)};</script>`;
  // 在 </body> 前注入
  if (html.includes('</body>')) {
    html = html.replace('</body>', injectScript + '\n</body>');
  } else {
    html += injectScript;
  }

  fs.writeFileSync(file, html, 'utf8');
  encryptedCount++;
  console.log(`[encrypt] 已加密: ${file}`);
}

console.log(`[encrypt] 完成，共加密 ${encryptedCount} 个页面。`);
