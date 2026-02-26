(function () {
  'use strict';

  const catalogEl = document.getElementById('catalog');
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  const emptyState = document.getElementById('empty-state');
  const productCount = document.getElementById('product-count');
  const pdfBtn = document.getElementById('pdf-btn');
  const pdfProgress = document.getElementById('pdf-progress');
  const installBtn = document.getElementById('install-btn');

  let allProducts = [];
  let categories = [];
  let deferredPrompt = null;

  /* ── Helpers ── */

  function esc(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  function fmt(price) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(price);
  }

  function groupByCategory(products) {
    const map = new Map();
    for (const p of products) {
      const cat = p.category || 'Без категории';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(p);
    }
    return map;
  }

  /* ── Price row builder ── */

  function priceRows(p) {
    const tiers = [
      { label: 'до 200 шт',  price: p.prices.upTo200, economy: null,                margin: p.margin.upTo200 },
      { label: 'от 200 шт',  price: p.prices.from200, economy: p.economy.from200,   margin: p.margin.from200 },
      { label: 'от 500 шт',  price: p.prices.from500, economy: p.economy.from500,   margin: p.margin.from500 },
      { label: 'Контейнер',  price: p.prices.container, economy: p.economy.container, margin: p.margin.container },
    ];

    return tiers.map(t => {
      const isBest = t.price === p.bestPrice;
      const rowClass = isBest ? ' class="row--best"' : '';
      const priceClass = isBest ? 'cell-price cell-price--best' : 'cell-price';
      const bestTag = isBest ? '<span class="best-badge-inline">Выгодно</span>' : '';
      const econTag = t.economy > 0
        ? `<span class="economy-tag">-${t.economy}%</span>`
        : '<span style="color:#bbb">—</span>';
      const marginVal = t.margin > 0 ? `${t.margin}%` : '—';

      return `<tr${rowClass}>
        <td>${t.label}</td>
        <td class="${priceClass}">${fmt(t.price)}${bestTag}</td>
        <td class="cell-economy">${econTag}</td>
        <td class="cell-margin">${marginVal}</td>
      </tr>`;
    }).join('');
  }

  /* ── Card HTML ── */

  function cardHTML(p) {
    const badges = [];
    if (p.hit) badges.push('<span class="badge badge--hit">Хит продаж</span>');

    return `
      <article class="card">
        <div class="card__img-wrap">
          ${badges.length ? `<div class="card__badges">${badges.join('')}</div>` : ''}
          <img
            class="card__img"
            src="${p.image}"
            alt="${esc(p.name)}"
            loading="lazy"
            onerror="this.parentNode.innerHTML='<svg class=card__img-placeholder width=64 height=64 viewBox=&quot;0 0 24 24&quot; fill=none stroke=#ccc stroke-width=1.5><rect x=3 y=3 width=18 height=18 rx=2/><circle cx=8.5 cy=8.5 r=1.5/><path d=&quot;M21 15l-5-5L5 21&quot;/></svg>'"
          >
        </div>
        <div class="card__body">
          <h2 class="card__name">${esc(p.name)}</h2>
          <p class="card__desc">${esc(p.description)}</p>
          <div class="card__meta">
            <span class="card__package">📦 ${esc(p.package)}</span>
            ${p.rrp > 0 ? `<span class="card__rrp">РРЦ ${fmt(p.rrp)}</span>` : ''}
          </div>
          <table class="price-table">
            <thead>
              <tr><th>Объём</th><th>Цена</th><th>Экономия</th><th>Маржа</th></tr>
            </thead>
            <tbody>${priceRows(p)}</tbody>
          </table>
        </div>
      </article>`;
  }

  /* ── Render ── */

  function render(products) {
    if (!products.length) {
      catalogEl.innerHTML = '';
      emptyState.style.display = 'block';
      productCount.textContent = '';
      return;
    }
    emptyState.style.display = 'none';
    productCount.textContent = `Найдено товаров: ${products.length}`;

    const grouped = groupByCategory(products);
    let html = '';

    for (const [cat, items] of grouped) {
      html += `
        <section class="category-section">
          <h2 class="category-section__title">${esc(cat)}</h2>
          <div class="category-section__grid">
            ${items.map(cardHTML).join('')}
          </div>
        </section>`;
    }

    catalogEl.innerHTML = html;
  }

  /* ── Load Data ── */

  async function loadProducts() {
    try {
      const res = await fetch('products.json');
      allProducts = await res.json();

      categories = [...new Set(allProducts.map(p => p.category))].sort();
      categoryFilter.innerHTML = '<option value="">Все категории</option>' +
        categories.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');

      render(allProducts);
    } catch (err) {
      catalogEl.innerHTML = '<p style="padding:20px;color:#999">Не удалось загрузить каталог.</p>';
    }
  }

  /* ── Search & Filter ── */

  function applyFilters() {
    const q = searchInput.value.trim().toLowerCase();
    const cat = categoryFilter.value;

    let filtered = allProducts;
    if (q) filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    if (cat) filtered = filtered.filter(p => p.category === cat);

    render(filtered);
  }

  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(applyFilters, 200);
  });

  categoryFilter.addEventListener('change', applyFilters);

  /* ── PDF Generation ── */

  pdfBtn.addEventListener('click', generatePDF);

  function pdfPriceRows(p) {
    const tiers = [
      { label: 'до 200 шт',  price: p.prices.upTo200, economy: '—',                        margin: p.margin.upTo200 },
      { label: 'от 200 шт',  price: p.prices.from200, economy: p.economy.from200 + '%',    margin: p.margin.from200 },
      { label: 'от 500 шт',  price: p.prices.from500, economy: p.economy.from500 + '%',    margin: p.margin.from500 },
      { label: 'Контейнер',  price: p.prices.container, economy: p.economy.container + '%', margin: p.margin.container },
    ];

    return tiers.map(t => {
      const isBest = t.price === p.bestPrice;
      const rowCls = isBest ? ' class="pdf-best-row"' : '';
      const priceCls = isBest ? 'pdf-price-val pdf-price-best' : 'pdf-price-val';
      const econVal = t.economy === '—' ? '—' : `-${t.economy}`;
      const marginVal = t.margin > 0 ? `${t.margin}%` : '—';

      return `<tr${rowCls}>
        <td>${t.label}</td>
        <td class="${priceCls}">${fmt(t.price)}${isBest ? ' ★' : ''}</td>
        <td class="pdf-econ">${econVal}</td>
        <td class="pdf-margin">${marginVal}</td>
      </tr>`;
    }).join('');
  }

  async function generatePDF() {
    if (typeof html2pdf === 'undefined') {
      alert('Библиотека html2pdf ещё загружается. Попробуйте через пару секунд.');
      return;
    }

    pdfProgress.style.display = 'flex';

    const container = document.createElement('div');
    container.className = 'pdf-catalog';

    const header = document.createElement('div');
    header.innerHTML = `
      <div class="pdf-title">Оптовый каталог</div>
      <div class="pdf-subtitle">Актуально на: ${new Date().toLocaleDateString('ru-RU')} · ${allProducts.length} товаров</div>
    `;
    container.appendChild(header);

    const grouped = groupByCategory(allProducts);

    for (const [cat, items] of grouped) {
      const catTitle = document.createElement('div');
      catTitle.className = 'pdf-category-title';
      catTitle.textContent = cat;
      container.appendChild(catTitle);

      for (const p of items) {
        const card = document.createElement('div');
        card.className = 'pdf-card';
        const hitBadge = p.hit ? '<span class="pdf-hit-badge">ХИТ ПРОДАЖ</span>' : '';
        card.innerHTML = `
          <div class="pdf-card-header">
            <img class="pdf-card-img" src="${p.image}" alt="${esc(p.name)}">
            <div class="pdf-card-info">
              <div class="pdf-card-name">${esc(p.name)}${hitBadge}</div>
              <div class="pdf-card-desc">${esc(p.description)}</div>
              <div class="pdf-card-pkg">📦 ${esc(p.package)}${p.rrp > 0 ? ` · РРЦ ${fmt(p.rrp)}` : ''}</div>
            </div>
          </div>
          <table class="pdf-price-table">
            <tr><th>Объём</th><th>Цена</th><th>Экономия</th><th>Маржа</th></tr>
            ${pdfPriceRows(p)}
          </table>
        `;
        container.appendChild(card);
      }
    }

    document.body.appendChild(container);

    try {
      await html2pdf().set({
        margin: [10, 10, 10, 10],
        filename: 'B2B_Wholesale_Catalog.pdf',
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }).from(container).save();
    } catch (err) {
      alert('Ошибка генерации PDF. Попробуйте ещё раз.');
    } finally {
      document.body.removeChild(container);
      pdfProgress.style.display = 'none';
    }
  }

  /* ── PWA Install ── */

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'inline-flex';
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      installBtn.style.display = 'none';
    }
    deferredPrompt = null;
  });

  /* ── Register Service Worker ── */

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  /* ── Init ── */

  loadProducts();
})();
