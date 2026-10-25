/* 金山地瓜地方誌：導覽、探索篩選、閱讀工具、照片燈箱、進場動態與回到頁首 */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduceMotion() { return !!(motionQuery && motionQuery.matches); }
  function onFrame(fn) {
    var waiting = false;
    return function () {
      if (waiting) return;
      waiting = true;
      requestAnimationFrame(function () { waiting = false; fn(); });
    };
  }
  function replay(el, className) {
    // Re-adding a class in the same frame would not restart its animation; a reflow in between does.
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  }

  // 頁首：往下捲時版次列自然捲出畫面，主列固定並加上陰影。
  var header = document.querySelector('.site-header');
  var editionBar = header ? header.querySelector('.edition-bar') : null;
  var editionHeight = 0;
  function measureHeader() {
    editionHeight = editionBar ? editionBar.offsetHeight : 0;
    root.style.setProperty('--edition-h', editionHeight + 'px');
    root.style.setProperty('--bar-h', (header.offsetHeight - editionHeight) + 'px');
  }
  if (header) {
    measureHeader();
    window.addEventListener('resize', onFrame(measureHeader));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureHeader);
    var updateHeader = onFrame(function () { header.classList.toggle('is-scrolled', window.scrollY > editionHeight + 2); });
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

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
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') && header && !header.contains(e.target)) setMenu(false);
    });
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
      var shown = 0;
      chapterCards.forEach(function (card) {
        var slug = card.getAttribute('href').split('/')[0];
        var matches = groups[selectedRoute].indexOf(slug) !== -1 && (card.textContent + ' ' + keywords[slug]).toLocaleLowerCase().indexOf(query) !== -1;
        var wasHidden = card.hidden;
        card.hidden = !matches;
        if (!matches) return;
        count++;
        if (wasHidden && !reduceMotion()) {
          card.style.setProperty('--pop-delay', Math.min(shown++, 6) * 45 + 'ms');
          replay(card, 'card-pop');
        }
      });
      status.textContent = '顯示 ' + count + ' / ' + chapterCards.length + ' 個章節';
      replay(status, 'is-updated');
      empty.hidden = count !== 0;
      routeButtons.forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.route === selectedRoute)); });
    }
    routeButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        if (selectedRoute === button.dataset.route) return;
        selectedRoute = button.dataset.route;
        filterChapters();
      });
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
    document.querySelectorAll('.article-toc a, .reader-jump a, .side-reading a').forEach(function (link) {
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
      article.closest('main').style.setProperty('--article-font-size', fontSize + 'rem');
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
    var tocLinks = [];
    var tocCurrent = null;
    var activeHeading = null;
    if (headings.length) {
      var toc = document.createElement('details');
      toc.className = 'article-toc';
      var summary = document.createElement('summary');
      var summaryLabel = document.createElement('span');
      summaryLabel.textContent = '本頁導覽 · ' + headings.length + ' 個段落';
      tocCurrent = document.createElement('span');
      tocCurrent.className = 'toc-current';
      summary.append(summaryLabel, tocCurrent);
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
        tocLinks.push(link);
      });
      tocNav.appendChild(tocList); toc.append(summary, tocNav); readerTools.after(toc);
      syncPeopleToc();
      // The index sticks under the header as a jump menu; it closes after a jump, on an outside click or Escape.
      root.classList.add('has-toc');
      tocNav.addEventListener('click', function (e) { if (e.target.closest('a')) toc.open = false; });
      document.addEventListener('click', function (e) { if (toc.open && !toc.contains(e.target)) toc.open = false; });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && toc.open) { toc.open = false; summary.focus(); }
      });
    }
    // The index follows the reader: the last heading that has passed the stuck header is current.
    function updateToc() {
      if (!tocCurrent) return;
      if (toc.dataset.sharedReader === 'true') return;
      var offset = toc.getBoundingClientRect().bottom + 12;
      var active = null;
      for (var i = 0; i < headings.length; i++) {
        if (!headings[i].getClientRects().length) continue;
        if (headings[i].getBoundingClientRect().top <= offset) active = headings[i]; else break;
      }
      if (active === activeHeading) return;
      activeHeading = active;
      tocLinks.forEach(function (link, i) {
        var isActive = headings[i] === active;
        link.classList.toggle('is-active', isActive);
        if (isActive) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
      });
      tocCurrent.textContent = active ? '現在讀到：' + active.textContent.trim() : '';
    }
    var progressArticle = article;
    document.addEventListener('reader:active', function (event) { progressArticle = event.detail; updateReadingProgress(); });
    var progress = document.createElement('div');
    progress.className = 'reading-progress';
    progress.setAttribute('aria-hidden', 'true');
    var progressFill = document.createElement('span');
    progress.appendChild(progressFill); document.body.appendChild(progress);
    function updateReadingProgress() {
      if (!progressFill) return;
      var rect = progressArticle.getBoundingClientRect();
      var offset = Math.min(150, window.innerHeight / 4);
      var range = Math.max(1, rect.height - window.innerHeight + offset);
      var value = Math.max(0, Math.min(1, (offset - rect.top) / range));
      progressFill.style.transform = 'scaleX(' + value + ')';
      updateToc();
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

    // Photos fade in as they finish loading instead of popping into the layout.
    Array.from(article.querySelectorAll('img[loading="lazy"]')).forEach(function (img) {
      if (img.complete || reduceMotion()) return;
      img.classList.add('is-loading');
      var done = function () { img.classList.remove('is-loading'); };
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
  }

  // 照片燈箱：同一頁的照片可以左右翻閱，附圖說與張數。
  var box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', '照片放大檢視');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = '<button type="button" class="lightbox-close" aria-label="關閉照片">×</button>' +
    '<button type="button" class="lightbox-prev" aria-label="上一張照片"><span aria-hidden="true">‹</span></button>' +
    '<figure class="lightbox-figure"><img alt=""><figcaption><span class="lightbox-caption"></span><span class="lightbox-count"></span></figcaption></figure>' +
    '<button type="button" class="lightbox-next" aria-label="下一張照片"><span aria-hidden="true">›</span></button>';
  document.body.appendChild(box);
  var boxImg = box.querySelector('img');
  var boxFigure = box.querySelector('.lightbox-figure');
  var boxCaption = box.querySelector('.lightbox-caption');
  var boxCount = box.querySelector('.lightbox-count');
  var closeButton = box.querySelector('.lightbox-close');
  var prevButton = box.querySelector('.lightbox-prev');
  var nextButton = box.querySelector('.lightbox-next');
  var gallery = [];
  var galleryIndex = 0;
  var previousFocus;
  var previousOverflow;
  function lightboxOpen() { return box.classList.contains('open'); }
  function captionFor(link) {
    var figure = link.closest('figure');
    var figcaption = figure && figure.querySelector('figcaption');
    var img = link.querySelector('img');
    var text = figcaption ? figcaption.textContent : (img ? img.alt : '');
    return text.replace(/\s+/g, ' ').trim();
  }
  function showPhoto(index) {
    galleryIndex = (index + gallery.length) % gallery.length;
    var link = gallery[galleryIndex];
    var img = link.querySelector('img');
    box.classList.add('is-loading');
    boxImg.alt = img ? img.alt : '';
    boxImg.src = link.getAttribute('href');
    if (boxImg.complete) box.classList.remove('is-loading');
    boxCaption.textContent = captionFor(link);
    boxCount.textContent = gallery.length > 1 ? (galleryIndex + 1) + ' / ' + gallery.length : '';
    prevButton.hidden = gallery.length < 2;
    nextButton.hidden = gallery.length < 2;
    if (gallery.length > 1) {
      // Neighbours start downloading now so the next flip is instant.
      new Image().src = gallery[(galleryIndex + 1) % gallery.length].getAttribute('href');
      new Image().src = gallery[(galleryIndex - 1 + gallery.length) % gallery.length].getAttribute('href');
    }
  }
  function stepPhoto(delta) {
    if (gallery.length < 2) return;
    boxFigure.classList.remove('slide-left', 'slide-right');
    void boxFigure.offsetWidth;
    if (!reduceMotion()) boxFigure.classList.add(delta > 0 ? 'slide-left' : 'slide-right');
    showPhoto(galleryIndex + delta);
  }
  boxImg.addEventListener('load', function () { box.classList.remove('is-loading'); });
  boxImg.addEventListener('error', function () { box.classList.remove('is-loading'); });
  function openBox(link) {
    gallery = Array.from(document.querySelectorAll('a.zoom')).filter(function (a) { return a.getClientRects().length > 0; });
    if (gallery.indexOf(link) === -1) gallery = [link];
    previousFocus = link;
    previousOverflow = document.body.style.overflow;
    showPhoto(gallery.indexOf(link));
    box.classList.add('open');
    box.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeButton.focus();
  }
  function closeBox() {
    if (!lightboxOpen()) return;
    box.classList.remove('open');
    box.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = previousOverflow;
    setTimeout(function () { if (!lightboxOpen()) boxImg.removeAttribute('src'); }, 350);
    if (previousFocus) previousFocus.focus();
  }
  box.addEventListener('click', function (e) {
    if (e.target.closest('.lightbox-prev')) { stepPhoto(-1); return; }
    if (e.target.closest('.lightbox-next')) { stepPhoto(1); return; }
    closeBox();
  });
  var touchStartX = null;
  box.addEventListener('touchstart', function (e) { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (touchStartX === null) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(dx) > 48) { e.preventDefault(); stepPhoto(dx < 0 ? 1 : -1); }
  });
  document.addEventListener('keydown', function (e) {
    if (!lightboxOpen()) return;
    if (e.key === 'Escape') { closeBox(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); stepPhoto(1); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); stepPhoto(-1); return; }
    if (e.key === 'Tab') {
      // Focus stays inside the dialog and cycles through its buttons.
      var buttons = [closeButton, prevButton, nextButton].filter(function (b) { return !b.hidden; });
      var i = buttons.indexOf(document.activeElement);
      e.preventDefault();
      buttons[(i + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
    }
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a.zoom');
    if (!a) return;
    e.preventDefault();
    openBox(a);
  });

  var top = document.querySelector('.to-top');
  if (top) {
    var updateTop = onFrame(function () { top.classList.toggle('show', window.scrollY > 400); });
    updateTop();
    window.addEventListener('scroll', updateTop, { passive: true });
  }

  // 捲動顯示：第一屏以外的區塊在進入畫面時才淡入；偏好減少動態時全部直接顯示。
  if ('IntersectionObserver' in window && !reduceMotion()) {
    var revealSelector = ['.intro-section > *', '.stories-section .section-head', '.story-card', '.cards-section .section-head', '.route-intro', '.journal-explorer', '.cards .card', '.mascot-section', '.closing-note',
      '.journal-section', '.place-intro', '.research-intro', '.place-fact', '.process-phase', '.objective-card', '.pest-card', '.journal-entry', '.person-feature', '.people-directory', '.people-thanks-card',
      '.weather-notes > section', '.driving-notes > section', '.place-timeline > li', '.cultivation-overview', '.transport-card', '.variety-card', '.recipe-step', '.product-entry', '.shop-section', '.reference-entry', '.chapter-continue'].join(', ');
    var revealTargets = Array.from(document.querySelectorAll(revealSelector)).filter(function (el) {
      // Anything already on screen stays untouched so nothing flickers on load.
      return el.getBoundingClientRect().top > window.innerHeight;
    });
    if (revealTargets.length) {
      var revealObserver = new IntersectionObserver(function (entries) {
        var order = 0;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.style.setProperty('--reveal-delay', Math.min(order++, 5) * 70 + 'ms');
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
      revealTargets.forEach(function (el) {
        el.classList.add('reveal');
        el.addEventListener('animationend', function (e) {
          if (e.target !== el) return;
          el.classList.remove('reveal', 'is-visible');
          el.style.removeProperty('--reveal-delay');
        });
        revealObserver.observe(el);
      });
      root.classList.add('reveal-ready');
    }
  }
})();

/* 依篇幅提供連續閱讀與長篇閱讀工具；所有原始頁面與連結仍獨立存在。 */
(function () {
  'use strict';
  var manifestNode = document.getElementById('reader-manifest');
  var initialEntry = document.querySelector('.reader-entry');
  if (!manifestNode || !initialEntry) return;
  var manifest = JSON.parse(manifestNode.textContent);
  var initialIndex = manifest.index;
  var initialArticle = initialEntry.querySelector('article.prose');
  var initialURL = new URL(location.href);
  initialURL.hash = '';
  var pages = manifest.pages;
  var entries = new Map([[initialIndex, initialEntry]]);
  var activeIndex = initialIndex;
  var activeEntry = initialEntry;
  var main = initialEntry.closest('main');
  var sharedToc = initialEntry.querySelector('.article-toc');
  if (!sharedToc) {
    sharedToc = document.createElement('details');
    sharedToc.className = 'article-toc';
    sharedToc.innerHTML = '<summary><span></span><span class="toc-current"></span></summary><nav aria-label="本頁段落"></nav>';
  }
  sharedToc.dataset.sharedReader = 'true';
  main.insertBefore(sharedToc, initialEntry);
  var lastReadingY = scrollY;
  sharedToc.querySelector('summary').addEventListener('click', function (event) {
    event.preventDefault();
    sharedToc.open = !sharedToc.open;
    // Focusing a sticky disclosure can scroll its original document position into view.
    window.scrollTo({top: lastReadingY, behavior: 'instant'});
  });
  var start = initialIndex;
  var end = initialIndex;
  if (pages[initialIndex].short) {
    while (start > 0 && pages[start - 1].short) start--;
    while (end < pages.length - 1 && pages[end + 1].short) end++;
  }
  var initialStart = start;
  var initialEnd = end;
  var canFlow = (end > start || end < pages.length - 1) && /^https?:$/.test(location.protocol) && typeof fetch === 'function';
  var flowKey = 'yam-continuous-reading';
  var flowEnabled = true;
  try { flowEnabled = sessionStorage.getItem(flowKey) !== 'off'; } catch (e) { /* Optional. */ }
  var header = document.querySelector('.site-header');
  var stream = null;
  var loading = false;
  var flowReady = false;
  var status = null;
  var flowButton = null;
  var statusText = null;
  var nextLoader = null;
  var nextObserver = null;
  var nextLoading = false;
  var nextFailed = false;
  var nextAbort = null;
  var flowGeneration = 0;
  var initialPager = document.querySelector('.pager');
  var originalPager = initialPager && initialPager.innerHTML;
  var dock = document.createElement('nav');
  dock.className = 'reader-dock';
  dock.setAttribute('aria-label', '閱讀工具');
  dock.innerHTML = '<a class="reader-prev" aria-label="上一篇">↑</a><div class="reader-location"><span class="reader-location-label"></span><strong class="reader-current-title"></strong><span class="reader-percent"></span></div><details class="reader-jump"><summary>段落</summary><nav aria-label="快速前往段落"></nav></details><a class="reader-open" aria-label="開啟目前文章的單篇頁面">單篇</a><a class="reader-next" aria-label="下一篇">↓</a>';
  document.body.appendChild(dock);
  document.body.classList.add('has-reader-dock');
  var prev = dock.querySelector('.reader-prev');
  var next = dock.querySelector('.reader-next');
  var jump = dock.querySelector('.reader-jump');
  var percent = dock.querySelector('.reader-percent');
  var openSingle = dock.querySelector('.reader-open');
  var dockLabel = dock.querySelector('.reader-location-label');
  var dockTitle = dock.querySelector('.reader-current-title');

  var sidebar = document.querySelector('.side-nav');
  var sideReading = document.createElement('nav');
  sideReading.className = 'side-reading';
  sideReading.setAttribute('aria-label', '目前文章的小節');
  sideReading.innerHTML = '<p class="side-reading-label">本篇小節</p>';
  sideReading.hidden = true;

  function pageURL(index) { return new URL(pages[index].url, initialURL); }
  function offset() {
    var edge = header ? Math.max(0, header.getBoundingClientRect().bottom) + 24 : 150;
    var toc = sharedToc.hidden ? null : sharedToc;
    if (toc && getComputedStyle(toc).position === 'sticky') {
      edge = Math.max(edge, parseFloat(getComputedStyle(toc).top) + toc.offsetHeight + 12);
    }
    return Math.min(edge, innerHeight / 2);
  }
  async function settlePhotos(article, boundary) {
    await Promise.all(Array.from(article.querySelectorAll('img')).filter(function (img) {
      return !boundary || Boolean(img.compareDocumentPosition(boundary) & Node.DOCUMENT_POSITION_FOLLOWING);
    }).map(function (img) {
      img.loading = 'eager';
      return Promise.race([img.decode().catch(function () {}), new Promise(function (resolve) { setTimeout(resolve, 3000); })]);
    }));
  }
  async function positionAfterLayout(position) {
    position();
    // The shrinking header and current-section label can change height after scrolling.
    await new Promise(function (resolve) { requestAnimationFrame(function () { requestAnimationFrame(resolve); }); });
    position();
  }
  function jumpTo(entry, focus) {
    window.scrollTo({top: scrollY + entry.getBoundingClientRect().top - offset(), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    if (focus) entry.querySelector('.page-title').focus({preventScroll: true});
  }
  function keepPosition(change) {
    var before = initialEntry.getBoundingClientRect().top;
    change();
    var delta = initialEntry.getBoundingClientRect().top - before;
    if (Math.abs(delta) > 1) window.scrollTo({top: scrollY + delta, behavior: 'instant'});
  }
  function entryHeadings() {
    return Array.from(activeEntry.querySelectorAll('article.prose h2, article.prose h3')).filter(function (heading) {
      return !heading.closest('.person-story');
    });
  }
  function buildJump() {
    var headings = entryHeadings();
    headings.forEach(function (heading, index) {
      if (!heading.id) heading.id = 'flow-' + activeIndex + '-section-' + (index + 1);
    });
    var toc = headings.length ? document.createElement('ol') : null;
    headings.forEach(function (heading) {
      var item = document.createElement('li');
      var link = document.createElement('a');
      link.href = '#' + encodeURIComponent(heading.id);
      link.textContent = heading.textContent;
      item.hidden = Boolean(heading.closest('[hidden]'));
      if (heading.tagName === 'H3') item.className = 'toc-subsection';
      item.appendChild(link); toc.appendChild(item);
    });
    sharedToc.open = false;
    sharedToc.hidden = !toc;
    sharedToc.dataset.readerTitle = pages[activeIndex].title;
    document.documentElement.classList.toggle('has-toc', Boolean(toc));
    var topNav = sharedToc.querySelector('nav');
    topNav.replaceChildren();
    if (toc) topNav.appendChild(toc.cloneNode(true));
    sharedToc.querySelector('summary').setAttribute('aria-label', '本頁導覽：' + pages[activeIndex].title);
    var nav = jump.querySelector('nav');
    nav.replaceChildren();
    jump.hidden = !toc;
    if (toc) nav.appendChild(toc.cloneNode(true));
    var oldList = sideReading.querySelector('ol');
    if (oldList) oldList.remove();
    var currentLink = sidebar && sidebar.querySelector(':scope > ul > li > a[aria-current]');
    sideReading.hidden = !toc || !currentLink;
    if (!sideReading.hidden) {
      var list = toc.cloneNode(true);
      list.classList.add('side-subsections');
      sideReading.appendChild(list);
      sideReading.setAttribute('aria-label', pages[activeIndex].title + '的小節');
      currentLink.after(sideReading);
    }
  }
  var continueCard = document.querySelector('.chapter-continue');
  function updateContinue(index) {
    if (!continueCard) return;
    var more = index < pages.length - 1;
    var title = more ? pages[index + 1].title : continueCard.dataset.nextChapterTitle;
    continueCard.querySelector('.eyebrow').textContent = more ? 'CONTINUE READING' : 'NEXT CHAPTER';
    continueCard.querySelector('h2').textContent = (more ? '下一篇：' : '下一章：') + title;
    continueCard.querySelector('p:not(.eyebrow)').textContent = more ? '繼續閱讀「' + manifest.chapter + '」的下一段故事。' : '這個單元讀完了，接著翻開「' + title + '」。';
    var link = continueCard.querySelector('a');
    link.href = more ? pageURL(index + 1).href : new URL(continueCard.dataset.nextChapterUrl, initialURL).href;
    link.textContent = more ? '閱讀下一篇 ' : '探索下一章 ';
    var arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = more ? '→' : '↗';
    link.appendChild(arrow);
  }
  function setActive(index) {
    activeIndex = index;
    activeEntry = entries.get(index);
    dockLabel.textContent = manifest.chapter + ' · ' + String(index + 1).padStart(2, '0') + ' / ' + String(pages.length).padStart(2, '0');
    dockTitle.textContent = pages[index].title;
    updateContinue(index);
    openSingle.href = pageURL(index).href;
    openSingle.hidden = !flowReady;
    prev.hidden = index === 0;
    next.hidden = index === pages.length - 1;
    if (index > 0) { prev.href = pageURL(index - 1).href; prev.setAttribute('aria-label', '上一篇：' + pages[index - 1].title); }
    if (index < pages.length - 1) { next.href = pageURL(index + 1).href; next.setAttribute('aria-label', '下一篇：' + pages[index + 1].title); }
    if (initialPager && flowReady) {
      initialPager.innerHTML = (index > 0 ? '<a class="prev"><span class="k">上一篇</span></a>' : '<span></span>') + (index < pages.length - 1 ? '<a class="next"><span class="k">下一篇</span></a>' : '<span></span>');
      ['prev', 'next'].forEach(function (direction) {
        var link = initialPager.querySelector('.' + direction);
        if (!link) return;
        var target = index + (direction === 'prev' ? -1 : 1);
        link.href = pageURL(target).href;
        link.appendChild(document.createTextNode(pages[target].title));
      });
    }
    document.querySelectorAll('.side-nav > ul > li > a').forEach(function (link) {
      if (new URL(link.href).pathname === pageURL(index).pathname) link.setAttribute('aria-current', flowReady ? 'location' : 'page');
      else link.removeAttribute('aria-current');
    });
    buildJump();
    document.dispatchEvent(new CustomEvent('reader:active', {detail: activeEntry.querySelector('article.prose')}));
  }

  // Imported sections get their own IDs and absolute asset URLs, preserving original deep links.
  function importEntry(doc, index, url) {
    var entry = doc.querySelector('.reader-entry');
    if (!entry || !entry.querySelector('article.prose')) throw new Error('Missing reader content');
    var ids = new Map();
    entry.querySelectorAll('[id]').forEach(function (node) {
      var original = node.id;
      node.id = 'flow-' + index + '-' + original;
      ids.set(original, node.id);
    });
    entry.querySelectorAll('[aria-labelledby], [aria-describedby], [aria-controls], label[for]').forEach(function (node) {
      ['aria-labelledby', 'aria-describedby', 'aria-controls', 'for'].forEach(function (attr) {
        if (node.hasAttribute(attr)) node.setAttribute(attr, node.getAttribute(attr).split(' ').map(function (id) { return ids.get(id) || id; }).join(' '));
      });
    });
    entry.querySelectorAll('[src], [href], [poster]').forEach(function (node) {
      ['src', 'href', 'poster'].forEach(function (attr) {
        var value = node.getAttribute(attr);
        if (!value) return;
        var target = new URL(value, url);
        if (target.pathname === url.pathname && target.hash) {
          var id;
          try { id = decodeURIComponent(target.hash.slice(1)); } catch (e) { return; }
          if (ids.has(id)) { node.setAttribute(attr, '#' + ids.get(id)); return; }
        }
        node.setAttribute(attr, target.href);
      });
    });
    entry.querySelectorAll('[srcset]').forEach(function (node) {
      node.setAttribute('srcset', node.getAttribute('srcset').split(',').map(function (candidate) {
        var parts = candidate.trim().split(/\s+/); parts[0] = new URL(parts[0], url).href; return parts.join(' ');
      }).join(', '));
    });
    entry.querySelectorAll('script').forEach(function (node) { node.remove(); });
    var oldTitle = entry.querySelector('.page-title');
    var title = document.createElement('h2');
    title.className = oldTitle.className; title.id = oldTitle.id; title.textContent = oldTitle.textContent;
    oldTitle.replaceWith(title);
    title.tabIndex = -1;
    entry.classList.add('reader-loaded');
    entry.dataset.readerIndex = String(index);
    Array.from(entry.querySelectorAll('article.prose h2, article.prose h3')).filter(function (heading) {
      return !heading.closest('.person-story');
    }).forEach(function (heading, sectionIndex) {
      if (!heading.id) heading.id = 'flow-' + index + '-section-' + (sectionIndex + 1);
    });
    var imported = document.importNode(entry, true);
    // Imported teacher profiles retain their native details and the expand-all control.
    var importedToggle = imported.querySelector('.people-expand-all');
    if (importedToggle) {
      var stories = Array.from(imported.querySelectorAll('.person-story'));
      function updateImportedToggle() {
        var open = stories.every(function (story) { return story.open; });
        importedToggle.textContent = open ? '收合全部心得' : '展開全部心得';
        importedToggle.setAttribute('aria-pressed', String(open));
      }
      importedToggle.hidden = false;
      importedToggle.addEventListener('click', function () {
        var open = !stories.every(function (story) { return story.open; });
        stories.forEach(function (story) { story.open = open; });
        updateImportedToggle();
      });
      stories.forEach(function (story) { story.addEventListener('toggle', updateImportedToggle); });
    }
    return imported;
  }
  function setupNextLoader() {
    if (!stream || !flowReady) return;
    if (end >= pages.length - 1) {
      if (nextObserver) nextObserver.disconnect();
      if (nextLoader) nextLoader.remove();
      nextLoader = null;
      return;
    }
    if (!nextLoader) {
      nextLoader = document.createElement('div');
      nextLoader.className = 'reader-next-loader';
      nextLoader.innerHTML = '<p role="status"></p><button type="button" hidden>重新接續</button><a></a>';
      nextLoader.querySelector('button').addEventListener('click', function () { loadNext(true); });
      stream.appendChild(nextLoader);
      if (typeof IntersectionObserver !== 'undefined') {
        nextObserver = new IntersectionObserver(function (changes) {
          if (changes.some(function (entry) { return entry.isIntersecting; })) checkNext();
        }, {rootMargin: '0px 0px 600px 0px'});
        nextObserver.observe(nextLoader);
      }
    }
    nextLoader.querySelector('p').textContent = '往下滑，接著讀「' + pages[end + 1].title + '」。';
    var link = nextLoader.querySelector('a');
    link.href = pageURL(end + 1).href;
    link.textContent = '直接開啟這一篇 →';
  }
  function checkNext() {
    if (!flowReady || loading || nextLoading || nextFailed || !nextLoader || end >= pages.length - 1) return;
    var rect = nextLoader.getBoundingClientRect();
    if (rect.top <= innerHeight + 600 && rect.bottom >= -100) loadNext();
  }
  async function loadNext(retry) {
    if (!flowReady || nextLoading || end >= pages.length - 1 || (nextFailed && !retry)) return false;
    var generation = flowGeneration;
    var index = end + 1;
    var url = pageURL(index);
    nextLoading = true; nextFailed = false;
    setupNextLoader();
    nextLoader.setAttribute('aria-busy', 'true');
    nextLoader.querySelector('p').textContent = '正在接續「' + pages[index].title + '」…';
    nextLoader.querySelector('button').hidden = true;
    var controller = new AbortController(); nextAbort = controller;
    var timer = setTimeout(function () { controller.abort(); }, 12000);
    try {
      var response = await fetch(url.href, {signal: controller.signal});
      if (!response.ok) throw new Error('Page unavailable');
      var doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      var imported = importEntry(doc, index, url);
      if (generation !== flowGeneration || !flowReady) return false;
      stream.insertBefore(imported, nextLoader);
      entries.set(index, imported); end = index;
      statusText.textContent = '已接上 ' + entries.size + ' 篇 · 上下滑動即可繼續閱讀。';
      setupNextLoader();
      return true;
    } catch (e) {
      if (generation !== flowGeneration || !flowReady) return false;
      nextFailed = true;
      nextLoader.querySelector('p').textContent = '暫時無法接續「' + pages[index].title + '」，可重試或直接開啟這一篇。';
      nextLoader.querySelector('button').hidden = false;
      return false;
    } finally {
      clearTimeout(timer);
      if (generation === flowGeneration) {
        nextAbort = null; nextLoading = false;
        if (nextLoader) nextLoader.removeAttribute('aria-busy');
        requestAnimationFrame(function () { update(); checkNext(); });
      }
    }
  }
  async function loadFlow() {
    if (loading || flowReady) return;
    loading = true; flowButton.disabled = true;
    statusText.textContent = '正在準備接續同單元的小節…';
    try {
      var jobs = [];
      for (var i = start; i <= end; i++) {
        if (i === initialIndex) continue;
        jobs.push((async function (index) {
          var url = pageURL(index);
          var controller = new AbortController();
          var timer = setTimeout(function () { controller.abort(); }, 12000);
          try {
            var response = await fetch(url.href, {signal: controller.signal});
            if (!response.ok) throw new Error('Page unavailable');
            var doc = new DOMParser().parseFromString(await response.text(), 'text/html');
            return [index, importEntry(doc, index, url)];
          } finally { clearTimeout(timer); }
        })(i));
      }
      var loaded = await Promise.all(jobs);
      // Photos above the opened article must settle before its position is restored.
      await Promise.all(loaded.filter(function (pair) { return pair[0] < initialIndex; }).map(function (pair) {
        return Promise.all(Array.from(pair[1].querySelectorAll('img')).map(function (img) {
          img.loading = 'eager';
          return Promise.race([img.decode().catch(function () {}), new Promise(function (resolve) { setTimeout(resolve, 3000); })]);
        }));
      }));
      var enterAtTitle = start < initialIndex && initialEntry.getBoundingClientRect().top > offset();
      keepPosition(function () {
        stream = document.createElement('div'); stream.className = 'reader-stream';
        initialEntry.before(stream);
        loaded.forEach(function (pair) { entries.set(pair[0], pair[1]); });
        for (var index = start; index <= end; index++) stream.appendChild(entries.get(index));
      });
      if (enterAtTitle) window.scrollTo({top: scrollY + initialEntry.getBoundingClientRect().top - offset(), behavior: 'instant'});
      flowReady = true;
      statusText.textContent = '連續閱讀已開啟 · 往下滑即可接續下一小節。';
      flowButton.textContent = '切回單篇';
      setActive(initialIndex);
      setupNextLoader();
      var fragmentIndex = /^#flow-(\d+)-/.exec(location.hash);
      if (fragmentIndex) {
        var requestedIndex = Number(fragmentIndex[1]);
        while (requestedIndex < pages.length && end < requestedIndex) {
          if (!await loadNext(true)) break;
        }
      }
      var linkedTarget = null;
      try { linkedTarget = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (e) { /* Invalid fragment. */ }
      var linkedEntry = linkedTarget && linkedTarget.closest('.reader-loaded');
      if (linkedEntry) {
        setActive(Number(linkedEntry.dataset.readerIndex));
        await settlePhotos(stream, linkedTarget);
        await positionAfterLayout(function () {
          window.scrollTo({top: scrollY + linkedTarget.getBoundingClientRect().top - offset(), behavior: 'instant'});
        });
      }
      update();
    } catch (e) {
      statusText.textContent = '目前無法接上其他文章，仍可使用上一篇、下一篇繼續閱讀。';
      flowButton.textContent = '重新載入連續閱讀';
    } finally { loading = false; flowButton.disabled = false; checkNext(); }
  }
  if (canFlow) {
    status = document.createElement('div'); status.className = 'reader-flow-status';
    statusText = document.createElement('p');
    flowButton = document.createElement('button'); flowButton.type = 'button';
    status.append(statusText, flowButton);
    initialArticle.before(status);
    flowButton.addEventListener('click', function () {
      if (flowReady) {
        flowGeneration++;
        if (nextAbort) nextAbort.abort();
        if (nextObserver) nextObserver.disconnect();
        nextLoader = null; nextObserver = null; nextLoading = false; nextFailed = false; nextAbort = null;
        keepPosition(function () { stream.before(initialEntry); stream.remove(); });
        entries = new Map([[initialIndex, initialEntry]]); stream = null; flowReady = false;
        start = initialStart; end = initialEnd;
        if (initialPager) initialPager.innerHTML = originalPager;
        statusText.textContent = '目前為單篇閱讀，可隨時接續同單元的下一小節。';
        flowButton.textContent = '開啟連續閱讀';
        try { sessionStorage.setItem(flowKey, 'off'); } catch (e) { /* Optional. */ }
        setActive(initialIndex); update();
      } else {
        try { sessionStorage.setItem(flowKey, 'on'); } catch (e) { /* Optional. */ }
        loadFlow();
      }
    });
    if (flowEnabled) loadFlow();
    else { statusText.textContent = '目前為單篇閱讀，可隨時接續同單元的下一小節。'; flowButton.textContent = '開啟連續閱讀'; }
  }
  initialEntry.querySelector('.page-title').tabIndex = -1;
  document.addEventListener('click', function (event) {
    if (jump.open && !jump.contains(event.target)) jump.open = false;
    var link = event.target.closest('.reader-dock a, .side-nav li a, .pager a, .chapter-continue a');
    if (!link || link.classList.contains('reader-open') || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
    if (!flowReady) return;
    var targetURL = new URL(link.href);
    entries.forEach(function (entry, index) {
      if (pageURL(index).pathname === targetURL.pathname && !targetURL.hash) {
        event.preventDefault(); jump.open = false; setActive(index); jumpTo(entry, true);
      }
    });
  });
  async function navigateSection(event) {
    var link = event.target.closest('a');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (!target) return;
    event.preventDefault(); jump.open = false; sharedToc.open = false;
    await settlePhotos(target.closest('article.prose'), target);
    history.pushState(null, '', link.hash);
    await positionAfterLayout(function () {
      window.scrollTo({top: scrollY + target.getBoundingClientRect().top - offset(), behavior: 'instant'});
    });
    target.tabIndex = -1; target.focus({preventScroll: true});
  }
  jump.addEventListener('click', navigateSection);
  sideReading.addEventListener('click', navigateSection);
  sharedToc.addEventListener('click', navigateSection);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && jump.open) { jump.open = false; jump.querySelector('summary').focus(); }
  });

  var headings = Array.from(initialArticle.querySelectorAll('h2[id], h3[id]')).filter(function (node) { return !node.closest('.person-story'); });
  var resumeKey = 'yam-reading:' + initialURL.pathname;
  var lastSave = 0;
  var saved = null;
  var resume = null;
  if (!pages[initialIndex].short) {
    try { saved = JSON.parse(sessionStorage.getItem(resumeKey)); } catch (e) { /* Optional. */ }
    if (saved && Number.isFinite(saved.fraction) && saved.fraction >= 0 && saved.fraction <= 1 && !location.hash) {
      resume = document.createElement('div'); resume.className = 'reader-resume';
      var text = document.createElement('span'); text.textContent = '上次讀到這篇的 ' + saved.percent + '%';
      var button = document.createElement('button'); button.type = 'button'; button.textContent = '接續上次閱讀';
      resume.append(text, button); initialArticle.before(resume);
      button.addEventListener('click', async function () {
        button.disabled = true; button.textContent = '正在回到閱讀位置…';
        var target = Number.isInteger(saved.headingIndex) && saved.headingIndex >= 0 ? headings[saved.headingIndex] : saved.heading && document.getElementById(saved.heading);
        if (target && target.closest('[hidden]')) {
          var all = document.querySelector('[data-person-filter="all"]'); if (all) all.click();
        }
        var nextSavedHeading = target && headings[headings.indexOf(target) + 1];
        await settlePhotos(initialArticle, nextSavedHeading);
        var from = target || initialArticle;
        var nextHeading = headings[headings.indexOf(target) + 1];
        await positionAfterLayout(function () {
          var bottom = target && nextHeading ? nextHeading.getBoundingClientRect().top + scrollY : initialArticle.getBoundingClientRect().bottom + scrollY;
          var top = from.getBoundingClientRect().top + scrollY;
          window.scrollTo({top: top + (bottom - top) * saved.fraction - offset(), behavior: 'instant'});
        });
        button.disabled = true; button.textContent = '已回到閱讀位置';
      });
    }
  }
  function sizeSidebar() {
    if (!sidebar || !matchMedia('(min-width: 901px)').matches) return;
    var top = Math.max(header ? header.getBoundingClientRect().bottom + 16 : 100, parseFloat(getComputedStyle(sidebar).top) || 0);
    var room = Math.max(190, Math.min(innerHeight - 16, main.getBoundingClientRect().bottom) - top);
    sidebar.style.setProperty('--sidebar-room', room + 'px');
    sidebar.classList.toggle('side-compact', room < 560);
    sidebar.classList.toggle('side-tight', room < 360);
  }
  function revealSidebarSection(link) {
    if (!sidebar || !matchMedia('(min-width: 901px)').matches) return;
    var list = sidebar.querySelector(':scope > ul');
    if (!list) return;
    var area = list.getBoundingClientRect();
    var frame = sidebar.getBoundingClientRect();
    var pageLink = sideReading.previousElementSibling;
    var label = sideReading.querySelector('.side-reading-label');
    var visibleTop = Math.max(area.top, header ? header.getBoundingClientRect().bottom + 8 : 0);
    var visibleBottom = Math.min(area.bottom, frame.bottom, innerHeight - 16) - 8;
    // Reserve space for the pinned page name and the subsection label.
    var top = visibleTop + (pageLink ? pageLink.offsetHeight : 0) + (label ? label.offsetHeight : 0) + 12;
    var box = link.getBoundingClientRect();
    if (visibleBottom - top < box.height) top = visibleTop + 6;
    if (visibleBottom - top < box.height) return;
    if (box.top < top || box.bottom > visibleBottom) {
      list.scrollTop += (box.top + box.bottom - top - visibleBottom) / 2;
    }
  }
  function update() {
    var edge = offset();
    if (flowReady && !sharedToc.open) {
      var readingEdge = Math.max(edge, parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0);
      var candidate = start;
      entries.forEach(function (entry, index) { if (entry.getBoundingClientRect().top <= readingEdge + 30) candidate = Math.max(candidate, index); });
      if (candidate !== activeIndex) setActive(candidate);
    }
    sizeSidebar();
    var article = activeEntry.querySelector('article.prose');
    var rect = article.getBoundingClientRect();
    var ratio = Math.max(0, Math.min(1, (edge - rect.top) / Math.max(1, rect.height - innerHeight + edge + dock.offsetHeight)));
    percent.textContent = Math.round(ratio * 100) + '%';
    var currentHeading = null;
    entryHeadings().forEach(function (heading) {
      if (!heading.closest('[hidden], .person-story') && heading.getBoundingClientRect().top <= edge + 30) currentHeading = heading;
    });
    if (!currentHeading) currentHeading = entryHeadings().find(function (heading) { return !heading.closest('[hidden]'); }) || null;
    var sectionLinks = Array.from(sharedToc.querySelectorAll('a')).concat(Array.from(dock.querySelectorAll('.reader-jump a')), Array.from(sideReading.querySelectorAll('a')));
    sectionLinks.forEach(function (link) {
      var isCurrent = currentHeading && decodeURIComponent(link.hash.slice(1)) === currentHeading.id;
      link.classList.toggle('is-active', Boolean(isCurrent));
      if (isCurrent) {
        link.setAttribute('aria-current', 'location');
        if (link.closest('.side-reading')) revealSidebarSection(link);
      }
      else link.removeAttribute('aria-current');
    });
    var visibleCount = entryHeadings().filter(function (heading) { return !heading.closest('[hidden]'); }).length;
    sharedToc.querySelector('summary > span:first-of-type').textContent = '本頁導覽 · ' + visibleCount + ' 個段落';
    sharedToc.querySelector('.toc-current').textContent = pages[activeIndex].title + (currentHeading ? ' / ' + currentHeading.textContent.trim() : '');
    if (!sharedToc.open) lastReadingY = scrollY;
    if (!pages[activeIndex].short && rect.top < edge - 120 && rect.bottom > edge && Date.now() - lastSave > 500) {
      var heading = currentHeading;
      var startY = heading ? heading.getBoundingClientRect().top : rect.top;
      var activeHeadings = entryHeadings();
      var headingIndex = activeHeadings.indexOf(heading);
      var nextHeading = heading && activeHeadings[headingIndex + 1];
      var bottomY = nextHeading ? nextHeading.getBoundingClientRect().top : rect.bottom;
      var fraction = Math.max(0, Math.min(1, (edge - startY) / Math.max(1, bottomY - startY)));
      try { sessionStorage.setItem('yam-reading:' + pageURL(activeIndex).pathname, JSON.stringify({heading: heading && heading.id, headingIndex: headingIndex, fraction: fraction, percent: Math.round(ratio * 100)})); } catch (e) { /* Optional. */ }
      lastSave = Date.now();
    }
    checkNext();
  }
  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () { scheduled = false; update(); });
  }
  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', schedule);
  window.addEventListener('pagehide', function () { lastSave = 0; update(); });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(schedule).observe(main);
  setActive(initialIndex); update();
})();
