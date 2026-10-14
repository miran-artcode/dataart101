/*
 * ui.js — 공용 셸: 내비게이션 · 설명 팝업(ⓘ) · 토스트 · 안내 콜아웃
 * -----------------------------------------------------------------------------
 * 모든 페이지가 이 파일을 불러오고, <div id="app-header"></div> 한 줄만 두면
 * 상단 내비가 자동으로 채워진다. 설명 아이콘은 [data-info="key"] 만 달면 동작한다.
 */
(function (global) {
  'use strict';

  // 저장된 테마를 가능한 한 일찍 적용(깜빡임 최소화)
  try { if (localStorage.getItem('dn_theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark'); } catch (e) {}

  // 내비는 수업 순서(읽기 → 만들기 → 나누기)만 따른다. 도움말·교사는 끝으로.
  const NAV = [
    { label: '홈', href: 'hub.html' },
    { label: '1 읽기', drop: [
      { href: 'lab.html', t: '알고리즘 분석실', s: '한 그림을 일곱 방법으로' },
      { href: 'studio-object.html', t: '객체 감지', s: 'AI의 눈이 보는 것·못 보는 것' },
      { href: 'critique.html', t: '데이터 비평', s: '차트를 사실·해석·가치로' }
    ] },
    { label: '2 만들기', drop: [
      { href: 'studio-color.html', t: '색 군집 스튜디오', s: '그림 → 점' },
      { href: 'studio-data.html', t: '데이터 점 스튜디오', s: '숫자 표 → 점' },
      { href: 'studio-sound.html', t: '소리 스튜디오', s: '재료 만들기 → 데이터 점' },
      { href: 'studio-life.html', t: '내 삶 스튜디오', s: '재료 만들기 → 데이터 점' },
      { href: 'project.html', t: '사회문제 프로젝트', s: '재료 만들기 → 데이터 점' }
    ] },
    { label: '3 나누기', drop: [
      { href: 'gallery.html', t: '전시 갤러리', s: '작품 보고 피드백' },
      { href: 'exhibit.html', t: '키오스크 전시', s: '큰 화면 · QR' },
      { href: 'quiz.html', t: '분석 퀴즈', s: '문제 내고 풀기' }
    ] },
    { label: '내 기록', href: 'notes.html' },
    { label: '도움말', drop: [
      { href: 'start.html', t: '사용 안내', s: '5분 시작 · 낱말 사전' },
      { href: 'learn.html', t: '알고리즘 배움터', s: '원리를 깊게' },
      { href: 'journey.html', t: '학습 여정 · 평가', s: '학기 흐름' },
      { href: 'about.html', t: '사이트 소개', s: '기술 · 데이터 보관' }
    ] },
    { label: '교사', href: 'admin.html', teacher: true }
  ];

  // 페이지마다 "다음 단계" 하나. 막다른 화면을 없앤다.
  const NEXT = {
    'lab.html': ['studio-color.html', '재창조 이미지를 색 군집 스튜디오로 보내기'],
    'studio-object.html': ['studio-data.html', '감지 결과를 데이터 점 스튜디오로 보내기'],
    'critique.html': ['notes.html', '성찰을 작업 노트에 남기기'],
    'studio-sound.html': ['studio-data.html', '소리 표를 데이터 점 스튜디오로 보내기'],
    'studio-life.html': ['studio-data.html', '내 삶 표를 데이터 점 스튜디오로 보내기'],
    'project.html': ['studio-data.html', '정제한 CSV를 데이터 점 스튜디오로 보내기'],
    'studio-data.html': ['gallery.html', '저장한 작품을 전시 갤러리에서 보기'],
    'gallery.html': ['quiz.html', '친구 작품으로 분석 퀴즈 내기'],
    'quiz.html': ['notes.html', '오늘 배운 것을 작업 노트에 적기'],
    'learn.html': ['lab.html', '배운 알고리즘을 분석실에서 써 보기'],
    'start.html': ['studio-color.html', '색 군집 스튜디오에서 시작하기'],
    'journey.html': ['hub.html', '홈으로 가서 단원 고르기'],
    'about.html': ['hub.html', '홈으로 가기']
  };

  const UI = {};
  const cur = () => location.pathname.split('/').pop() || 'index.html';

  UI.mountHeader = function (activeOverride) {
    const host = document.getElementById('app-header');
    if (!host) return;
    const active = activeOverride || cur();
    const isTeacher = !!(global.Auth && Auth.isTeacher && Auth.isTeacher());
    const navHTML = NAV.filter(n => !n.teacher || isTeacher).map((n, i) => {
      if (n.drop) {
        const isActive = n.drop.some(d => d.href === active);
        const items = n.drop.map(d =>
          `<a href="${d.href}" class="${d.href === active ? 'active' : ''}">${d.t}${d.s ? `<small>${d.s}</small>` : ''}</a>`).join('');
        return `<div class="navdrop" data-drop="${i}">
            <button class="${isActive ? 'active' : ''}">${n.label} ▾</button>
            <div class="navdrop-menu">${items}</div></div>`;
      }
      return `<a href="${n.href}" class="${n.href === active ? 'active' : ''}">${n.label}</a>`;
    }).join('');

    host.outerHTML = `
      <header class="site-header">
        <a class="site-brand" href="index.html">보는 법</a>
        <nav class="site-nav">${navHTML}</nav>
        <button class="btn sm ghost" id="theme-toggle" title="밝은/어두운 테마" style="margin-right:4px">테마</button>
        <div class="site-user" id="site-user"></div>
      </header>`;

    // 드롭다운 토글
    document.querySelectorAll('.navdrop').forEach(dd => {
      dd.querySelector('button').addEventListener('click', e => {
        e.stopPropagation();
        document.querySelectorAll('.navdrop').forEach(o => { if (o !== dd) o.classList.remove('open'); });
        dd.classList.toggle('open');
      });
    });
    document.addEventListener('click', () => document.querySelectorAll('.navdrop').forEach(o => o.classList.remove('open')));

    const tt = document.getElementById('theme-toggle');
    if (tt) { updateThemeIcon(tt); tt.addEventListener('click', UI.toggleTheme); }
    UI.renderUser();
  };

  function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function updateThemeIcon(btn) { const light = currentTheme() === 'light'; btn.textContent = light ? '어둡게' : '밝게'; btn.title = light ? '어둡게' : '밝게'; }
  UI.toggleTheme = function () {
    const next = currentTheme() === 'light' ? 'dark' : 'light';
    if (next === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem('dn_theme', next); } catch (e) {}
    const tt = document.getElementById('theme-toggle'); if (tt) updateThemeIcon(tt);
  };

  UI.renderUser = function () {
    const el = document.getElementById('site-user');
    if (!el) return;
    const u = (global.Auth && Auth.current && Auth.current()) || null;
    if (u) {
      el.innerHTML = `<span class="dot"></span> <b>${escapeHTML(u.display || u.name)}</b>
        <button class="btn sm ghost" id="btn-logout">로그아웃</button>`;
      const lo = document.getElementById('btn-logout');
      if (lo) lo.addEventListener('click', () => { Auth.logout(); location.href = 'login.html'; });
    } else {
      el.innerHTML = `<span class="dot off"></span> <a href="login.html">로그인</a>`;
    }
  };

  /* ----------------------------- 모달 ----------------------------- */
  function ensureModal() {
    let m = document.getElementById('ui-modal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'ui-modal'; m.className = 'modal-bg';
    m.innerHTML = `<div class="modal-card"><div class="mc-head"><button class="modal-close" aria-label="닫기">✕</button>
      <h2 id="ui-modal-title"></h2><div class="lv" id="ui-modal-lv"></div></div><div class="mc-body" id="ui-modal-body"></div></div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) UI.closeModal(); });
    m.querySelector('.modal-close').addEventListener('click', UI.closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') UI.closeModal(); });
    return m;
  }
  UI.modal = function (title, bodyHTML, levelText) {
    const m = ensureModal();
    m.querySelector('#ui-modal-title').innerHTML = title;
    m.querySelector('#ui-modal-lv').innerHTML = levelText || '';
    m.querySelector('#ui-modal-body').innerHTML = bodyHTML;
    m.classList.add('show');
  };
  UI.closeModal = function () { const m = document.getElementById('ui-modal'); if (m) m.classList.remove('show'); };

  /* ----------------------------- 설명 팝업(ⓘ) ----------------------------- */
  UI.info = function (key) {
    const e = (global.EXPLAIN || {})[key];
    if (!e) { UI.toast('설명 준비 중: ' + key); return; }
    const badge = e.badge === 'adv' ? '<span class="badge adv">심화</span>' : '<span class="badge core">핵심</span>';
    let body = '';
    if (e.easy) body += section('easy', '쉽게 — 한눈에', e.easy);
    if (e.deep) body += section('deep', '더 깊이 — 원리', e.deep);
    if (e.limit) body += section('limit', '한계', e.limit);
    if (e.ideas && e.ideas.length) {
      body += section('idea', '이렇게 해보면 — 아이디어',
        '<ul>' + e.ideas.map(i => `<li>${i}</li>`).join('') + '</ul>');
    }
    UI.modal(escapeHTML(e.title) + ' ' + badge, body, 'ⓘ 설명은 쉬운 버전 → 깊은 버전 → 한계 → 아이디어 순서예요.');
  };
  function section(cls, head, html) {
    return `<div class="lvl ${cls}"><div class="lvl-h">${head}</div><div class="lvl-b">${html}</div></div>`;
  }
  UI.infoButton = function (key, label) {
    return `<button class="info-ic" data-info="${key}" title="${label || '설명 보기'}" aria-label="설명">ⓘ</button>`;
  };
  // 전역 위임: 어떤 페이지든 [data-info] 클릭이면 팝업
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-info]');
    if (b) { e.preventDefault(); UI.info(b.getAttribute('data-info')); }
  });

  /* ----------------------------- 토스트 ----------------------------- */
  UI.toast = function (msg, ms) {
    let t = document.getElementById('ui-toast');
    if (!t) { t = document.createElement('div'); t.id = 'ui-toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(UI.toast._t); UI.toast._t = setTimeout(() => t.classList.remove('show'), ms || 2400);
  };

  /* ----------------------------- 안내 콜아웃 / 아이디어 로테이터 ----------------------------- */
  UI.callout = function (html, type) {
    return `<div class="callout ${type || ''}"><div>${html}</div></div>`;
  };
  // 컨테이너(id)에 페이지별 아이디어를 한 개씩 돌려가며 보여줌
  UI.mountIdeaBar = function (containerId, pageKey) {
    const host = document.getElementById(containerId);
    if (!host) return;
    const list = ((global.GUIDE || {})[pageKey] || (global.GUIDE || {}).general || []).slice();
    if (!list.length) return;
    let i = Math.floor(Math.random() * list.length);
    const render = () => {
      host.innerHTML = `<div class="callout idea-rotator">
        <div><b>아이디어</b> · ${list[i]}</div><span class="next">다음 ▸</span></div>`;
      host.querySelector('.idea-rotator').addEventListener('click', () => { i = (i + 1) % list.length; render(); });
    };
    render();
  };

  function escapeHTML(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  UI.escapeHTML = escapeHTML;

  // 사이트 공통 푸터(저작권) — 모든 페이지 맨 아래
  UI.mountFooter = function () {
    if (document.getElementById('site-footer')) return;
    const f = document.createElement('footer');
    f.id = 'site-footer';
    f.style.cssText = 'text-align:center; color:var(--muted2); font-size:12px; padding:24px 18px 30px; border-top:1px solid var(--line); margin-top:28px;';
    const nx = NEXT[cur()];
    const nxHTML = nx ? '<p style="margin:0 0 14px; font-size:14px; color:var(--muted)">다음 단계 → <a href="' + nx[0] + '" style="font-weight:700; color:var(--text)">' + nx[1] + '</a></p>' : '';
    f.innerHTML = nxHTML + '© 2026 <b style="color:var(--muted)">MIRAN HWANG</b> · <a href="mailto:MIRAN726@GMAIL.COM" style="color:var(--muted)">MIRAN726@GMAIL.COM</a> · 데이터 미디어아트 스튜디오 · 교육용';
    document.body.appendChild(f);
  };

  // 어려운 낱말에 점선 밑줄 + 호버 정의(낱말 사전). 본문 프로즈 안에서 용어별 '첫 1회'만.
  // 단순 뜻을 넘어 '무엇을 기준으로/어떤 알고리즘인지/무엇으로 변환되는지'까지 짧게 가르친다.
  const GLOSS = {
    'K-means': '그림의 수많은 색을 비슷한 것끼리 K개 무리로 묶고, 무리마다 ‘가운데 색’ 하나로 대신하는 색 요약 알고리즘. K가 클수록 자세해요.',
    '대표색': 'K-means가 묶은 무리의 색. 개수(K)는 작으면(5~8) 단순·추상, 크면(20~50) 사진처럼 자세 — 이미지의 실제 색 수·성능에 맞춰 자동 조정돼요. 정답은 없고, 바꿔 비교하는 게 공부예요.',
    '알고리즘': '컴퓨터가 따르는, 차례가 정해진 방법(라면 끓이는 순서처럼). 이 사이트의 분석·요약·움직임이 모두 알고리즘이에요.',
    '군집': '비슷한 것끼리 모은 한 덩어리(무리). 색을 모으면 ‘색 군집’.',
    '매핑': '데이터의 한 값을 점의 한 특성에 이어 주는 것 — 예: 큰 값→큰 점, 높은 값→위쪽, 종류→색, 변화→떨림. 무엇을 어디에 잇느냐가 곧 해석이에요.',
    '정규화': '크기가 제각각인 숫자를 0~1로 맞춰 공평히 비교하는 것(키 cm와 몸무게 kg을 같은 잣대로).',
    '샘플링': '모든 픽셀 대신 일부만 골라 점으로 쓰는 것. 어디서 더 고를지(밝은 곳·윤곽)가 표현 선택이 돼요.',
    '헤르츠': '소리가 1초에 떨리는 횟수(Hz). 적으면 낮은 소리(둥둥), 많으면 높은 소리(삐-) — 소리의 ‘높낮이’예요.',
    'Hz': '헤르츠 — 소리가 1초에 떨리는 횟수. 음높이(피치)의 단위로, 가장 강한 주파수를 골라 구해요.',
    '음높이': '소리에서 가장 강한 주파수(Hz). 낮으면 저음, 높으면 고음 — 소리를 색·높이로 바꿀 때 쓰는 핵심 값.',
    '주파수': '소리의 떨림이 빠른 정도. 낮은 주파수=저음, 높은 주파수=고음. 저·중·고로 나눠 에너지를 재요.',
    '날카로움': '소리 에너지가 높은 주파수에 쏠린 정도(스펙트럼 무게중심). 높을수록 쉭·치 하는 밝고 날카로운 소리.'
  };
  UI.glossify = function () {
    try {
      if (document.getElementById('gloss-style')) return;
      const st = document.createElement('style'); st.id = 'gloss-style';
      st.textContent = '.gloss{border-bottom:1px dotted currentColor;cursor:help;position:relative}' +
        '.gloss-pop{position:absolute;left:0;bottom:130%;width:max-content;max-width:min(250px,calc(100vw - 32px));background:#11131d;color:#e8ecf6;border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:7px 10px;font-size:12px;line-height:1.5;box-shadow:0 8px 24px rgba(0,0,0,.4);display:none;z-index:50;pointer-events:none;white-space:normal;font-weight:400}' +
        // 숨김 상태는 display:none — 보이지 않는 풍선이 화면 오른쪽 밖으로 나가 가로 스크롤바를 만들지 않게
        '.gloss:hover .gloss-pop,.gloss:focus .gloss-pop{display:block}';
      document.head.appendChild(st);
      const SKIP = { SCRIPT: 1, STYLE: 1, A: 1, BUTTON: 1, INPUT: 1, TEXTAREA: 1, SELECT: 1, OPTION: 1, CODE: 1, H1: 1 };
      const terms = Object.keys(GLOSS), seen = {};
      const roots = document.querySelectorAll('.page-head, .card, .callout, .hint, .muted');
      roots.forEach(root => {
        if (terms.every(t => seen[t])) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode(n) {
            if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            let p = n.parentNode;
            while (p && p !== root.parentNode) { if (SKIP[p.nodeName] || (p.classList && p.classList.contains('gloss'))) return NodeFilter.FILTER_REJECT; p = p.parentNode; }
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        const nodes = []; let nd; while ((nd = walker.nextNode())) nodes.push(nd);
        nodes.forEach(textNode => {
          for (const term of terms) {
            if (seen[term]) continue;
            const idx = textNode.nodeValue.indexOf(term);
            if (idx < 0) continue;
            seen[term] = 1;
            const after = textNode.splitText(idx);
            after.nodeValue = after.nodeValue.slice(term.length);
            const span = document.createElement('span');
            span.className = 'gloss'; span.tabIndex = 0; span.textContent = term;
            const pop = document.createElement('span'); pop.className = 'gloss-pop'; pop.textContent = GLOSS[term];
            span.appendChild(pop);
            after.parentNode.insertBefore(span, after);
            break;   // 한 텍스트노드당 한 번
          }
        });
      });
    } catch (e) { /* 용어 툴팁은 보조 기능 — 실패해도 페이지는 그대로 동작 */ }
  };

  global.UI = UI;
  document.addEventListener('DOMContentLoaded', () => { UI.mountHeader(); UI.mountFooter(); UI.glossify(); });
})(window);
