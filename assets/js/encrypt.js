// 博文解密脚本（访客端）
// 依赖：crypto-js（head.html 中通过 CDN 引入）

document.addEventListener('DOMContentLoaded', function () {
  var bodyEl = document.getElementById('encrypt-body');
  var promptEl = document.getElementById('encrypt-prompt');
  var inputEl = document.getElementById('encrypt-input');
  var submitBtn = document.getElementById('encrypt-submit');
  var errorEl = document.getElementById('encrypt-error');

  // 非加密页面直接返回
  if (!bodyEl || !promptEl) return;

  // 从构建注入的全局变量读取密文（格式: ivBase64.密文Base64）
  var cipher = window.__ENCRYPTED_BODY__ || '';
  if (!cipher) {
    promptEl.innerHTML = '<p>⚠️ 文章未能正确加密，请检查部署配置。</p>';
    return;
  }

  var parts = cipher.split('.');
  if (parts.length !== 2) {
    promptEl.innerHTML = '<p>⚠️ 密文格式错误。</p>';
    return;
  }

  function tryDecrypt(password) {
    try {
      // crypto-js 的 AES-CBC 解密，key 由 sha256 生成，iv 从密文头部解析
      // 注意：这里为了保持前后端一致，直接使用 crypto-js 对 "iv.密文" 解密。
      // 我们使用 CryptoJS.AES.decrypt 的 passphrase 模式，它会自动从密文中取 salt。
      // 为与本项目后端(Node crypto)的 AES-256-CBC 对齐，需要自定义处理：
      var iv = CryptoJS.enc.Base64.parse(parts[0]);
      var ciphertext = parts[1];
      var key = CryptoJS.SHA256(password);
      var params = {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      };
      var decrypted = CryptoJS.AES.decrypt(
        { ciphertext: CryptoJS.enc.Base64.parse(ciphertext) },
        key,
        params
      );
      var plain = decrypted.toString(CryptoJS.enc.Utf8);
      return plain || null;
    } catch (e) {
      return null;
    }
  }

  function unlock(password) {
    var plain = tryDecrypt(password);
    if (plain === null || plain.length === 0) {
      errorEl.style.display = 'block';
      inputEl.value = '';
      inputEl.focus();
      return;
    }
    // 成功解锁
    bodyEl.innerHTML = plain;
    bodyEl.style.display = 'block';
    promptEl.style.display = 'none';
  }

  submitBtn.addEventListener('click', function () {
    unlock(inputEl.value);
  });

  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') unlock(inputEl.value);
  });
});
