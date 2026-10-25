/* 金山地瓜地方誌：導覽、照片燈箱、回到頁首 */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var nav = document.querySelector('.top-nav');
  if (nav) {
    nav.id = 'primary-navigation';
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'menu-toggle';
    toggle.setAttribute('aria-controls', nav.id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '探索選單 ＋';
    nav.before(toggle);
    function setMenu(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? '收起選單 −' : '探索選單 ＋';
    }
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
    });
    var current = nav.querySelector('.current a');
    if (current) current.setAttribute('aria-current', 'page');
  }

  // Explore by interest; all chapters remain available when JavaScript is off.
  var explorer = document.querySelector('.journal-explorer');
  if (explorer) {
    var chapterCards = Array.from(document.querySelectorAll('.cards .card'));
    var queryInput = document.querySelector('#chapter-query');
    var status = document.querySelector('.chapter-status');
    var empty = document.querySelector('.chapter-empty');
    var routeButtons = Array.from(explorer.querySelectorAll('[data-route]'));
    var selectedRoute = 'all';
    var groups = { all: ['how', 'jinshan', 'yam', 'sweet', 'money', 'fun', 'people', 'about'], land: ['jinshan', 'sweet', 'money'], table: ['yam', 'fun'], people: ['how', 'people', 'about'] };
    var keywords = { how: '研究 採訪 問卷 出發 動機', jinshan: '田野 山海 地景 風景 地理', yam: '品種 歷史 滋味 飲食 餐桌', sweet: '種植 田野 土壤 農業 地瓜', money: '產業 農會 老街 商店 採訪 種植', fun: '料理 烹飪 食譜 餐桌 體驗 焢窯 挖地瓜', people: '人物 學生 老師 採訪 幕後 小組', about: '研究 計畫 幕後 簡報' };
    function filterChapters() {
      var query = queryInput.value.trim().toLocaleLowerCase();
      var count = 0;
      chapterCards.forEach(function (card) {
        var slug = card.getAttribute('href').split('/')[0];
        var matches = groups[selectedRoute].indexOf(slug) !== -1 && (card.textContent + ' ' + keywords[slug]).toLocaleLowerCase().indexOf(query) !== -1;
        card.hidden = !matches;
        if (matches) count++;
      });
      status.textContent = '顯示 ' + count + ' / ' + chapterCards.length + ' 個章節';
      empty.hidden = count !== 0;
      routeButtons.forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.route === selectedRoute)); });
    }
    routeButtons.forEach(function (button) {
      button.addEventListener('click', function () { selectedRoute = button.dataset.route; filterChapters(); });
    });
    queryInput.addEventListener('input', filterChapters);
    explorer.hidden = false;
    filterChapters();
  }

  // 分工取自原專題；停用 JavaScript 時仍可閱讀全部人物。
  var peopleFilters = document.querySelector('.people-filters');
  var peopleCards = Array.from(document.querySelectorAll('[data-person-roles].person-feature'));
  var selectedPeopleRole = 'all';
  function syncPeopleToc() {
    document.querySelectorAll('.article-toc a').forEach(function (link) {
      var target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
      var profile = target && target.closest('.person-feature');
      if (profile) link.closest('li').hidden = profile.hidden;
    });
  }
  function filterPeople(role) {
    selectedPeopleRole = role;
    document.querySelectorAll('[data-person-roles]').forEach(function (item) {
      item.hidden = role !== 'all' && item.dataset.personRoles.split(' ').indexOf(role) === -1;
    });
    if (peopleFilters) {
      peopleFilters.querySelectorAll('[data-person-filter]').forEach(function (button) {
        button.setAttribute('aria-pressed', String(button.dataset.personFilter === role));
      });
      peopleFilters.querySelector('.people-filter-status').textContent = '顯示 ' + peopleCards.filter(function (card) { return !card.hidden; }).length + ' / ' + peopleCards.length + ' 位夥伴';
    }
    syncPeopleToc();
    if (peopleToggle) updatePeopleToggle();
  }
  function revealLinkedPerson() {
    var id;
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch (e) { return; }
    var target = document.getElementById(id);
    var profile = target && target.closest('.person-feature');
    if (profile && profile.hidden) {
      filterPeople('all');
      target.scrollIntoView();
    }
  }
  if (peopleFilters) {
    peopleFilters.hidden = false;
    peopleFilters.querySelectorAll('[data-person-filter]').forEach(function (button) {
      button.addEventListener('click', function () { filterPeople(button.dataset.personFilter); });
    });
    filterPeople('all');
    window.addEventListener('hashchange', revealLinkedPerson);
  }

  var peopleToggle = document.querySelector('.people-expand-all');
  var personStories = Array.from(document.querySelectorAll('.person-story'));
  function visibleStories() {
    return personStories.filter(function (story) { return !story.closest('.person-feature').hidden; });
  }
  function updatePeopleToggle() {
    var allOpen = visibleStories().every(function (story) { return story.open; });
    var scope = selectedPeopleRole === 'all' ? '全部心得' : '目前心得';
    peopleToggle.textContent = (allOpen ? '收合' : '展開') + scope;
    peopleToggle.setAttribute('aria-pressed', String(allOpen));
  }
  if (peopleToggle) {
    peopleToggle.hidden = false;
    peopleToggle.addEventListener('click', function () {
      var stories = visibleStories();
      var open = !stories.every(function (story) { return story.open; });
      stories.forEach(function (story) { story.open = open; });
      updatePeopleToggle();
    });
    personStories.forEach(function (story) { story.addEventListener('toggle', updatePeopleToggle); });
  }

  // Article controls and a heading index follow each page's actual content.
  var article = document.querySelector('article.prose');
  if (article) {
    var readerTools = document.createElement('div');
    readerTools.className = 'reader-tools';
    var textLength = article.textContent.replace(/\s/g, '').length;
    var readingTime = document.createElement('span');
    readingTime.className = 'reader-time';
    readingTime.textContent = '慢慢讀 · 約 ' + Math.max(1, Math.ceil(textLength / 350)) + ' 分鐘';
    readerTools.appendChild(readingTime);
    var fontControls = document.createElement('div');
    fontControls.className = 'reader-font';
    fontControls.setAttribute('role', 'group');
    fontControls.setAttribute('aria-label', '內文字級');
    var fontSize = 1.04;
    try { fontSize = Number(localStorage.getItem('yam-reading-font')) || fontSize; } catch (e) { /* Storage is optional. */ }
    fontSize = Math.max(1, Math.min(1.5, fontSize));
    var smaller = document.createElement('button');
    smaller.type = 'button'; smaller.textContent = 'A−'; smaller.setAttribute('aria-label', '縮小內文字級');
    var resetFont = document.createElement('button');
    resetFont.type = 'button'; resetFont.setAttribute('aria-label', '恢復預設內文字級');
    var larger = document.createElement('button');
    larger.type = 'button'; larger.textContent = 'A＋'; larger.setAttribute('aria-label', '放大內文字級');
    fontControls.append(smaller, resetFont, larger);
    readerTools.appendChild(fontControls);
    article.before(readerTools);
    function setFont(value) {
      fontSize = Math.max(1, Math.min(1.5, value));
      article.style.setProperty('--article-font-size', fontSize + 'rem');
      smaller.disabled = fontSize <= 1;
      larger.disabled = fontSize >= 1.5;
      resetFont.textContent = Math.round(fontSize / 1.04 * 100) + '%';
      try { localStorage.setItem('yam-reading-font', String(fontSize)); } catch (e) { /* Browsing still works without storage. */ }
      updateReadingProgress();
    }
    smaller.addEventListener('click', function () { setFont(fontSize - .125); });
    larger.addEventListener('click', function () { setFont(fontSize + .125); });
    resetFont.addEventListener('click', function () { setFont(1.04); });

    var headings = Array.from(article.querySelectorAll('h2, h3')).filter(function (heading) { return !heading.closest('.person-story'); });
    if (headings.length) {
      var toc = document.createElement('details');
      toc.className = 'article-toc';
      var summary = document.createElement('summary');
      summary.textContent = '本頁導覽 · ' + headings.length + ' 個段落';
      var tocNav = document.createElement('nav');
      tocNav.setAttribute('aria-label', '本頁段落');
      var tocList = document.createElement('ol');
      headings.forEach(function (heading, index) {
        if (!heading.id) {
          var headingId = 'reading-section-' + (index + 1);
          while (document.getElementById(headingId)) headingId += '-next';
          heading.id = headingId;
        }
        var item = document.createElement('li');
        var link = document.createElement('a');
        link.href = '#' + encodeURIComponent(heading.id);
        link.textContent = heading.textContent;
        if (heading.tagName === 'H3') item.className = 'toc-subsection';
        item.appendChild(link); tocList.appendChild(item);
      });
      tocNav.appendChild(tocList); toc.append(summary, tocNav); readerTools.after(toc);
      syncPeopleToc();
    }
    var progress = document.createElement('div');
    progress.className = 'reading-progress';
    progress.setAttribute('aria-hidden', 'true');
    var progressFill = document.createElement('span');
    progress.appendChild(progressFill); document.body.appendChild(progress);
    function updateReadingProgress() {
      if (!progressFill) return;
      var rect = article.getBoundingClientRect();
      var offset = Math.min(150, window.innerHeight / 4);
      var range = Math.max(1, rect.height - window.innerHeight + offset);
      var value = Math.max(0, Math.min(1, (offset - rect.top) / range));
      progressFill.style.transform = 'scaleX(' + value + ')';
    }
    var progressTick = false;
    window.addEventListener('scroll', function () {
      if (progressTick) return;
      progressTick = true;
      requestAnimationFrame(function () { updateReadingProgress(); progressTick = false; });
    }, { passive: true });
    window.addEventListener('resize', updateReadingProgress);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(updateReadingProgress).observe(article);
    setFont(fontSize);
  }

  var box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', '照片放大檢視');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = '<button type="button" aria-label="關閉照片">×</button><img alt="">';
  document.body.appendChild(box);
  var boxImg = box.querySelector('img');
  var closeButton = box.querySelector('button');
  var previousFocus;
  var previousOverflow;
  function closeBox() {
    if (!box.classList.contains('open')) return;
    box.classList.remove('open');
    boxImg.removeAttribute('src');
    document.body.style.overflow = previousOverflow;
    if (previousFocus) previousFocus.focus();
  }
  box.addEventListener('click', closeBox);
  document.addEventListener('keydown', function (e) {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') closeBox();
    if (e.key === 'Tab') { e.preventDefault(); closeButton.focus(); }
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a.zoom');
    if (!a) return;
    e.preventDefault();
    var img = a.querySelector('img');
    previousFocus = a;
    previousOverflow = document.body.style.overflow;
    boxImg.src = a.getAttribute('href');
    boxImg.alt = img ? img.alt : '';
    box.classList.add('open');
    document.body.style.overflow = 'hidden';
    closeButton.focus();
  });

  var top = document.querySelector('.to-top');
  if (top) {
    var tick = false;
    function updateTop() { top.classList.toggle('show', window.scrollY > 400); tick = false; }
    updateTop();
    window.addEventListener('scroll', function () {
      if (tick) return;
      tick = true;
      requestAnimationFrame(updateTop);
    }, { passive: true });
  }
})();
