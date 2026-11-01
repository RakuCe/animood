/* トップカード */
document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page !== "home") return;

  const cards = $$('[data-visual-card]');
  const candidates = WORKS.filter(work => work && work.img && work.title);
  if (!cards.length || !candidates.length) return;

  let previousIds = [];
  const DISPLAY_TIME = 5000;
  const FADE_TIME = 1000;

  /* 作品選択 */
  function pickWorks(count) {
    const pool = candidates.filter(work => !previousIds.includes(work.id));
    const source = pool.length >= count ? pool : candidates;
    const picked = [...source].sort(() => Math.random() - 0.5).slice(0, count);
    previousIds = picked.map(work => work.id);
    return picked;
  }

  /* 画像レイヤー */
  function ensureLayers(card) {
    let current = card.querySelector('.visual-img-current');
    let next = card.querySelector('.visual-img-next');

    if (!current) {
      current = card.querySelector('img');
      if (!current) {
        current = document.createElement('img');
        card.appendChild(current);
      }
      current.className = 'visual-img-current';
    }

    if (!next) {
      next = document.createElement('img');
      next.className = 'visual-img-next';
      next.alt = '';
      next.setAttribute('aria-hidden', 'true');
      card.appendChild(next);
    }

    current.style.opacity = '1';
    next.style.opacity = '0';
    return { current, next };
  }

  /* 初期表示 */
  function setInitial(card, work) {
    const { current, next } = ensureLayers(card);
    current.src = resolveImageUrl(thumbImagePath(work.img));
    current.alt = work.title;
    attachImageFallback(current, work);
    attachImageFallback(current, work);
    current.removeAttribute('aria-hidden');
    next.removeAttribute('src');
    next.alt = '';
    next.setAttribute('aria-hidden', 'true');
    card.dataset.workId = work.id;
    card.setAttribute('aria-label', work.title);
  }

  /* クロスフェード */
  function fadeTo(card, work) {
    if (card.dataset.fading === 'true') return;
    card.dataset.fading = 'true';

    const { current, next } = ensureLayers(card);
    const preload = new Image();
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;

        current.classList.remove('visual-img-current');
      current.classList.add('visual-img-next');
      current.style.opacity = '0';
      current.setAttribute('aria-hidden', 'true');
      current.alt = '';

      next.classList.remove('visual-img-next');
      next.classList.add('visual-img-current');
      next.style.opacity = '1';
      next.removeAttribute('aria-hidden');
      next.alt = work.title;

      card.dataset.workId = work.id;
      card.setAttribute('aria-label', work.title);
      card.dataset.fading = 'false';
    };

    preload.onload = () => {
        const ready = typeof preload.decode === 'function'
        ? preload.decode().catch(() => {})
        : Promise.resolve();

      ready.then(() => {
        next.src = preload.src;
        next.alt = work.title;
        next.removeAttribute('aria-hidden');

            requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            current.style.opacity = '0';
            next.style.opacity = '1';
          });
        });

        window.setTimeout(finish, FADE_TIME);
      });
    };

    preload.onerror = () => {
      card.dataset.fading = 'false';
    };
    preload.src = resolveImageUrl(thumbImagePath(work.img));
    attachImageFallback(preload, work);
  }

  /* 5秒表示 → 1秒クロスフェード → 5秒表示 */
  function rotateCards() {
    const nextWorks = pickWorks(cards.length);
    cards.forEach((card, index) => {
      if (nextWorks[index]) fadeTo(card, nextWorks[index]);
    });
  }

  pickWorks(cards.length).forEach((work, index) => setInitial(cards[index], work));
  window.setInterval(rotateCards, DISPLAY_TIME + FADE_TIME);
});

function fillRankPlaceholders(track, n) {
  track.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const item = document.createElement("div");
    item.className = "rank-item is-placeholder";
    item.innerHTML = `<span class="rank-num">${i + 1}</span><article class="card rank-ph" aria-hidden="true"><div class="card-img-wrap"></div><div class="card-body"><div class="card-title">&nbsp;</div></div></article>`;
    track.appendChild(item);
  }
}

function initRankCarousel(root, ids) {
  const track = root.querySelector(".rank-track");
  const prev = root.querySelector(".rank-prev");
  const next = root.querySelector(".rank-next");
  if (!track) return;
  const valid = (ids || []).map(id => findWork(id)).filter(Boolean).slice(0, 20);
  track.innerHTML = "";
  if (!valid.length) {
    fillRankPlaceholders(track, 5);
  } else {
    valid.forEach((work, i) => {
      const item = document.createElement("div");
      item.className = "rank-item";
      const num = document.createElement("span");
      num.className = "rank-num";
      num.textContent = String(i + 1);
      item.appendChild(num);
      item.appendChild(createCard(work));
      track.appendChild(item);
    });
  }
  root.hidden = false;
  const setArrow = (btn, off) => {
    if (!btn) return;
    btn.hidden = false;
    btn.style.visibility = off ? "hidden" : "visible";
    btn.style.pointerEvents = off ? "none" : "";
  };
  const updateArrows = () => {
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    setArrow(prev, track.scrollLeft <= 2);
    setArrow(next, track.scrollLeft >= max - 2);
  };
  const items = () => [...track.querySelectorAll(".rank-item")];
  const snapTo = (left) => {
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    track.scrollTo({ left: Math.max(0, Math.min(max, left)), behavior: "smooth" });
  };
  if (prev) prev.onclick = () => {
    const sl = track.scrollLeft;
    let edge = null;
    for (const el of items()) {
      if (el.offsetLeft + el.offsetWidth > sl + 8) { edge = el; break; }
    }
    if (!edge) return;
    snapTo(edge.offsetLeft + edge.offsetWidth - track.clientWidth);
  };
  if (next) next.onclick = () => {
    const visRight = track.scrollLeft + track.clientWidth;
    let edge = null;
    for (const el of items()) {
      if (el.offsetLeft < visRight - 8) edge = el;
    }
    if (!edge) return;
    snapTo(edge.offsetLeft);
  };
  track.onscroll = updateArrows;
  requestAnimationFrame(updateArrows);
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page !== "home") return;
  const rows = [
    ["rank-watched", "watched"],
    ["rank-watching", "watching"],
    ["rank-want", "want"]
  ];
  const base = (POPULAR_API || "").replace(/\/$/, "");
  rows.forEach(([elId, status]) => {
    const el = document.getElementById(elId);
    if (!el) return;
    el.hidden = false;
    const go = (ids) => initRankCarousel(el, ids);
    go([]);
    if (!base) return;
    fetch(base + "/popular?status=" + status + "&limit=20")
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const ids = (Array.isArray(data) ? data : []).map(x => x.id || x).filter(Boolean);
        go(ids);
      })
      .catch(() => go([]));
  });
});
