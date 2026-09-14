/* 博客通用交互脚本 */

document.addEventListener('DOMContentLoaded', function () {
  // ---------- 1. 主题切换 ----------
  var root = document.documentElement;
  var toggleBtn = document.getElementById('theme-toggle');

  function applyTheme(theme) {
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      var isDark = root.getAttribute('data-theme') === 'dark';
      var next = isDark ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  // ---------- 2. 阅读进度条 ----------
  var bar = document.getElementById('progress-bar');
  if (bar) {
    var onScroll = function () {
      var doc = document.documentElement;
      var scrollTop = window.pageYOffset || doc.scrollTop || document.body.scrollTop || 0;
      var height = doc.scrollHeight - doc.clientHeight;
      var percent = height > 0 ? (scrollTop / height) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, percent)) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---------- 3. 回到顶部 ----------
  var backTop = document.getElementById('back-to-top');
  if (backTop) {
    var toggleBackTop = function () {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (y > 360) {
        backTop.classList.add('show');
      } else {
        backTop.classList.remove('show');
      }
    };
    window.addEventListener('scroll', toggleBackTop, { passive: true });
    toggleBackTop();

    backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ---------- 4. 阅读时长估算（仅正文页，约 400 字/分钟） ----------
  var rtNode = document.querySelector('.rt-value');
  if (rtNode) {
    var content = document.querySelector('.post-content');
    if (content) {
      var text = (content.textContent || '').replace(/\s+/g, '');
      var minutes = Math.max(1, Math.round(text.length / 400));
      rtNode.textContent = minutes;
    }
  }

  // ---------- 5. 高亮当前导航 ----------
  var currentPath = window.location.pathname;
  var navLinks = document.querySelectorAll('.site-nav a');
  navLinks.forEach(function (link) {
    var href = link.getAttribute('href') || '';
    if (href === currentPath || (href !== '/' && currentPath.indexOf(href) === 0)) {
      link.classList.add('active');
    }
  });
});
