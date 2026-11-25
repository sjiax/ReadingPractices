/* 阅读学习包 · 交互脚本（无依赖） */
(function () {
  'use strict';

  var DOC = window.DOC || { words: [], phrases: [] };
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
  function play(src, row) {
    if (!src) return;
    audio.src = src;
    audio.playbackRate = rate;
    audio.currentTime = 0;
    var p = audio.play();
    if (p && p.catch) p.catch(function () {});
    if (currentRow && currentRow !== row) currentRow.classList.remove('playing');
    currentRow = row || null;
    if (currentRow) currentRow.classList.add('playing');
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

  /* ---------- 短语注解开关 ---------- */
  var showNotes = document.getElementById('showNotes');
  if (showNotes) {
    var savedNotes = null;
    try { savedNotes = localStorage.getItem('rp.showNotes'); } catch (err) { savedNotes = null; }
    if (savedNotes === '0') showNotes.checked = false;
    document.body.classList.toggle('hide-notes', !showNotes.checked);
    showNotes.addEventListener('change', function () {
      document.body.classList.toggle('hide-notes', !showNotes.checked);
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

  /* ---------- 点击：发音 / 播句子 ---------- */
  document.addEventListener('click', function (e) {
    var chip = e.target.closest ? e.target.closest('.w, .ph') : null;
    if (chip) {
      toggleCard(chip);
      return;
    }
    // 短语注解：点这块只播"这一条短语"，绝不冒泡成整句
    var note = e.target.closest ? e.target.closest('.pnotes') : null;
    if (note) {
      var one = e.target.closest('.pnote');
      var pmini = one ? one.querySelector('.pmini') : null;
      if (pmini) play(pmini.getAttribute('data-play'), null);
      return;
    }
    if (!(e.target.closest && e.target.closest('#card'))) hideCard();
    var s = e.target.closest ? e.target.closest('.s') : null;
    if (s) {
      play(s.getAttribute('data-play'), s);
      return;
    }
    var btn = e.target.closest ? e.target.closest('[data-play]') : null;
    if (btn) play(btn.getAttribute('data-play'), null);
  });

  /* ---------- 悬停卡片 ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function itemOf(el) {
    if (el.classList.contains('w')) {
      return { kind: 'words', item: DOC.words[parseInt(el.getAttribute('data-w'), 10)] };
    }
    return { kind: 'phrases', item: DOC.phrases[parseInt(el.getAttribute('data-p'), 10)] };
  }

  function fillCard(el) {
    var found = itemOf(el);
    var it = found.item;
    if (!it) return false;
    var isWord = found.kind === 'words';
    var head = isWord
      ? '<span class="cw">' + esc(it.w) + '</span><span class="cipa">' + esc(it.ipa) + '</span>' +
        '<span class="cpos">' + esc(it.pos) + '</span>'
      : '<span class="cw">' + esc(it.p) + '</span>';

    // 构词拆解 + 记忆提示
    var extra = '';
    if (isWord && it.form && it.form.length) {
      extra += '<div class="cform"><span class="clabel">构词</span><span class="cparts">';
      extra += it.form.map(function (f) {
        return '<span class="cpart"><b>' + esc(f[0]) + '</b><i>' + esc(f[1]) + '</i></span>';
      }).join('<span class="cplus">+</span>');
      extra += '</span></div>';
    }
    if (isWord && it.note) {
      extra += '<div class="cnote"><span class="clabel">记</span><span class="cnotetext">' + esc(it.note) + '</span></div>';
    }

    card.innerHTML =
      '<div>' + head + '</div>' +
      '<div class="czh">' + esc(it.zh) + '</div>' +
      extra +
      '<div class="cex">' + esc(it.ex) + '<div class="cexz">' + esc(it.exZh) + '</div></div>' +
      '<div class="cfoot"><span class="tip">点单词听发音 · 点空白处关闭</span></div>';
    card.classList.toggle('ph-card', !isWord);

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

  function playWord(src) {
    if (!src) return;
    fx.src = src;
    fx.currentTime = 0;
    var p = fx.play();
    if (p && p.catch) p.catch(function () {});
  }

  function placeCard(el) {
    var r = el.getBoundingClientRect();
    var cw = card.offsetWidth;
    var ch = card.offsetHeight;
    var left = Math.min(Math.max(12, r.left + r.width / 2 - cw / 2), window.innerWidth - cw - 12);
    var top = r.bottom + 10;
    if (top + ch > window.innerHeight - 14) top = Math.max(12, r.top - ch - 10);
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

  var demo = /[?&]demo=([wp])(\d+)/.exec(location.search || '');
  if (demo) {
    var sel = demo[1] === 'w' ? '[data-w="' + demo[2] + '"]' : '[data-p="' + demo[2] + '"]';
    var target = document.querySelector(sel);
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
