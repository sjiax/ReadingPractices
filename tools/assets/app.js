/* 阅读学习包 · 交互脚本（无依赖） */
(function () {
  'use strict';

  var DOC = window.DOC || { words: [] };
  var audio = document.getElementById('main');
  var card = document.getElementById('card');
  var autoSound = document.getElementById('autoSound');
  var fx = new Audio();
  fx.preload = 'auto';

  var rate = 1;
  var currentRow = null;
  var cardEl = null;
  var hideTimer = null;
  var lastFocus = null;

  /* ---------- 播放 ---------- */
  // 网慢时直接 play() 只响前半段：统一等 canplaythrough（整段能连续播）再开声，
  // 超时兜底先播，避免点了没反应。句子/短语走 #main（点击播），生词卡走 fx（自动播）。
  var playSeq = 0;
  var wordSeq = 0;

  function playWhenReady(el, src, isCurrent, timeoutMs, prep) {
    function start() {
      if (prep) prep();
      try { el.currentTime = 0; } catch (err) { /* 还没元数据时忽略 */ }
      var p = el.play();
      if (p && p.catch) p.catch(function () {});
    }

    if (el.getAttribute('src') === src && el.readyState >= 4) {
      start();
      return;
    }

    el.pause();
    el.src = src;
    el.load();

    if (el.readyState >= 4) {
      start();
      return;
    }

    var done = false;
    var timer = null;
    function go() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      el.removeEventListener('canplaythrough', go);
      if (!isCurrent()) return;
      start();
    }
    el.addEventListener('canplaythrough', go);
    timer = setTimeout(go, timeoutMs || 4000);
  }

  function play(src, row) {
    if (!src) return;
    var seq = ++playSeq;

    if (currentRow && currentRow !== row) currentRow.classList.remove('playing');
    currentRow = row || null;
    if (currentRow) currentRow.classList.add('playing');

    playWhenReady(audio, src, function () { return seq === playSeq; }, 4000, function () {
      audio.playbackRate = rate;
    });
  }

  function playWord(src) {
    if (!src) return;
    var seq = ++wordSeq;
    playWhenReady(fx, src, function () { return seq === wordSeq; }, 3000);
  }

  audio.addEventListener('ended', function () {
    if (currentRow) currentRow.classList.remove('playing');
    currentRow = null;
  });

  /* ---------- 语速 ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-rate]'), function (btn) {
    btn.addEventListener('click', function () {
      rate = parseFloat(btn.getAttribute('data-rate')) || 1;
      audio.playbackRate = rate;
      Array.prototype.forEach.call(document.querySelectorAll('[data-rate]'), function (b) {
        b.classList.toggle('on', b === btn);
      });
    });
  });

  /* ---------- 译文与注解开关（总开关 + 每句的单行开关） ---------- */
  function setRowToggle(row, show) {
    if (!row) return;
    row.classList.toggle('row-hide', !show);
    var b = row.querySelector('.snote');
    if (b) {
      b.classList.toggle('off', !show);
      b.setAttribute('aria-pressed', show ? 'true' : 'false');
    }
  }

  function allRowsShown() {
    var rows = document.querySelectorAll('.s');
    for (var i = 0; i < rows.length; i += 1) {
      if (rows[i].classList.contains('row-hide')) return false;
    }
    return true;
  }

  function setAllRows(show) {
    Array.prototype.forEach.call(document.querySelectorAll('.s'), function (row) {
      setRowToggle(row, show);
    });
  }

  var showNotes = document.getElementById('showNotes');
  if (showNotes) {
    var savedNotes = null;
    try { savedNotes = localStorage.getItem('rp.showNotes'); } catch (err) { savedNotes = null; }
    // 首次打开（没有存过）默认全部收起；存过 '1' 才全开
    var startShown = savedNotes === '1';
    setAllRows(startShown);
    showNotes.checked = startShown;
    showNotes.addEventListener('change', function () {
      setAllRows(showNotes.checked);
      try { localStorage.setItem('rp.showNotes', showNotes.checked ? '1' : '0'); } catch (err) { /* ignore */ }
    });
  }

  /* ---------- 答案：展开后才标出正确项 ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.q details'), function (d) {
    d.addEventListener('toggle', function () {
      var q = d.closest('.q');
      if (q) q.classList.toggle('revealed', d.open);
    });
  });

  /* ---------- 点击：生词弹卡；句子只有点 ▶ 才朗读；短语只有点 ▶ 才播放 ---------- */
  document.addEventListener('click', function (e) {
    // 每句右侧的单行开关：只收/放这一行的译文与注解（总开关全开/全关时同样有效）
    var rowBtn = e.target.closest ? e.target.closest('.snote') : null;
    if (rowBtn) {
      var row = rowBtn.closest('.s');
      if (row) {
        setRowToggle(row, row.classList.contains('row-hide'));
        if (showNotes) showNotes.checked = allRowsShown();
      }
      return;
    }

    var word = e.target.closest ? e.target.closest('.w') : null;
    if (word) {
      toggleCard(word);
      return;
    }

    if (!(e.target.closest && e.target.closest('#card'))) hideCard();
    // 只有带 data-play 的按钮（句子的 ▶、短语的 ▶、生词表的 ▶、播放条按钮）才播放
    var btn = e.target.closest ? e.target.closest('[data-play]') : null;
    if (btn) {
      // 只有句子的播放键才给整句高亮，短语/单词按钮不点亮句子
      play(btn.getAttribute('data-play'), btn.classList.contains('play') ? btn.closest('.s') : null);
    }
  });

  /* ---------- 悬停卡片 ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function itemOf(el) {
    return { item: DOC.words[parseInt(el.getAttribute('data-w'), 10)] };
  }

  function fillCard(el) {
    var it = itemOf(el).item;
    if (!it) return false;
    var head = '<span class="cw">' + esc(it.w) + '</span><span class="cipa">' + esc(it.ipa) + '</span>' +
      '<span class="cpos">' + esc(it.pos) + '</span>';

    // 构词拆解 + 记忆提示
    var extra = '';
    if (it.form && it.form.length) {
      extra += '<div class="cform"><span class="clabel">构词</span><span class="cparts">';
      extra += it.form.map(function (f) {
        return '<span class="cpart"><b>' + esc(f[0]) + '</b><i>' + esc(f[1]) + '</i></span>';
      }).join('<span class="cplus">+</span>');
      extra += '</span></div>';
    }
    if (it.infl) {
      extra += '<div class="cinfl"><span class="clabel">变形</span><span class="cnotetext">' + esc(it.infl) + '</span></div>';
    }
    if (it.note) {
      extra += '<div class="cnote"><span class="clabel">记</span><span class="cnotetext">' + esc(it.note) + '</span></div>';
    }

    card.innerHTML =
      '<button class="cclose" type="button" aria-label="关闭" title="关闭">✕</button>' +
      '<div>' + head + '</div>' +
      '<div class="czh">' + esc(it.zh) + '</div>' +
      extra +
      '<div class="cex">' + esc(it.ex) + '<div class="cexz">' + esc(it.exZh) + '</div></div>' +
      '<div class="cfoot"><span class="tip">点单词听发音 · 点空白处关闭</span></div>';

    var closeBtn = card.querySelector('.cclose');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        hideCard();
      });
    }

    // 点气泡里的词本身即发音（不再放底部按钮）
    var wordEl = card.querySelector('.cw');
    if (wordEl && it.audio) {
      wordEl.classList.add('sayable');
      wordEl.setAttribute('role', 'button');
      wordEl.setAttribute('tabindex', '0');
      wordEl.setAttribute('title', '点一下听发音');
      wordEl.addEventListener('click', function (ev) {
        ev.stopPropagation();
        playWord(it.audio);
      });
      wordEl.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          ev.stopPropagation();
          playWord(it.audio);
        }
      });
    }
    return true;
  }

  // 宽屏时样式里用 zoom 把整页放大（--rp-zoom），getBoundingClientRect 返回的是放大后的坐标，
  // 而卡片的 left/top 和 offsetWidth 用的是未放大的布局坐标，所以这里统一除以缩放比。
  var pageZoom = 1;
  (function () {
    var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rp-zoom'));
    if (isFinite(v) && v > 0) pageZoom = v;
  })();

  function placeCard(el) {
    var r = el.getBoundingClientRect();
    var cw = card.offsetWidth;
    var ch = card.offsetHeight;
    var vw = window.innerWidth / pageZoom;
    var vh = window.innerHeight / pageZoom;
    var left = Math.min(Math.max(12, r.left / pageZoom + r.width / pageZoom / 2 - cw / 2), vw - cw - 12);
    var top = r.bottom / pageZoom + 10;
    if (top + ch > vh - 14) top = Math.max(12, r.top / pageZoom - ch - 10);
    card.style.left = Math.round(left) + 'px';
    card.style.top = Math.round(top) + 'px';
  }

  function showCard(el) {
    clearTimeout(hideTimer);
    if (cardEl && cardEl !== el) cardEl.classList.remove('on');
    cardEl = el;
    el.classList.add('on');
    if (!fillCard(el)) return;
    card.classList.add('show');
    placeCard(el);
    if (soundOn()) soundWord(el);
  }

  function soundWord(el) {
    var found = itemOf(el);
    if (!found.item) return;
    playWord(found.item.audio);
  }

  function hideCard() {
    card.classList.remove('show');
    if (cardEl) cardEl.classList.remove('on');
    cardEl = null;
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideCard, 180);
  }

  function toggleCard(el) {
    if (cardEl === el && card.classList.contains('show')) hideCard();
    else showCard(el);
  }

  function soundOn() {
    return !autoSound || autoSound.checked;
  }

  /* 卡片跟随滚动/缩放，点空白处或 Esc 关闭 */
  window.addEventListener('scroll', function () {
    if (cardEl && card.classList.contains('show')) placeCard(cardEl);
  }, { passive: true });
  window.addEventListener('resize', function () {
    if (cardEl && card.classList.contains('show')) placeCard(cardEl);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideCard(); });

  /* 键盘：Tab 到生词上按 Enter 或空格，与鼠标点击一致 */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target.closest ? e.target.closest('.w') : null;
    if (!el) return;
    e.preventDefault();
    toggleCard(el);
  });

  /* ---------- 溢出诊断（?debug=overflow） ---------- */
  if (/[?&]debug=overflow/.test(location.search || '')) {
    var maxR = 0, who = '';
    Array.prototype.forEach.call(document.querySelectorAll('body *'), function (el) {
      if (el.id === 'card') return;
      var r = el.getBoundingClientRect();
      if (r.right > maxR) { maxR = r.right; who = el.tagName + '|' + (el.className || '') + '|' + Math.round(r.width); }
    });
    var offs = [];
    Array.prototype.forEach.call(document.querySelectorAll('section[id]'), function (s) {
      offs.push(s.id + '=' + Math.round(s.getBoundingClientRect().top + window.pageYOffset));
    });
    document.title = 'SW=' + document.documentElement.scrollWidth +
      ' IW=' + window.innerWidth +
      ' BH=' + document.body.offsetHeight +
      ' MAX=' + Math.round(maxR) + ' ' + who +
      ' | ' + offs.join(' ');
  }

  /* ---------- 截图定位（?scroll=words / quiz） ---------- */
  var sc = /[?&]scroll=([a-z]+)/.exec(location.search || '');
  if (sc) {
    var sec = document.getElementById(sc[1]);
    if (sec) {
      setTimeout(function () {
        window.scrollTo(0, sec.getBoundingClientRect().top + window.pageYOffset - 30);
      }, 80);
    }
  }

  /* ---------- 演示：展开第一题答案（?demo=open） ---------- */
  if (/[?&]demo=open/.test(location.search || '')) {
    var firstQ = document.querySelector('.q details');
    if (firstQ) setTimeout(function () { firstQ.open = true; }, 100);
  }

  /* ---------- 演示：模拟点击某个生词（?demo=c16） ---------- */
  var cdemo = /[?&]demo=c(\d+)/.exec(location.search || '');
  if (cdemo) {
    var ctarget = document.querySelector('[data-w="' + cdemo[1] + '"]');
    if (ctarget) setTimeout(function () {
      ctarget.scrollIntoView({ block: 'center' });
      ctarget.click();
    }, 150);
  }

  var demo = /[?&]demo=w(\d+)/.exec(location.search || '');
  if (demo) {
    var target = document.querySelector('[data-w="' + demo[1] + '"]');
    if (target) {
      setTimeout(function () {
        card.style.transition = 'none';
        showCard(target);
        card.style.left = '140px';
        card.style.top = '200px';
      }, 200);
    }
  }
})();
