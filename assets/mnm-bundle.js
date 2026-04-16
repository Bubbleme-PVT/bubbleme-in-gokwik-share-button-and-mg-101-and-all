(function () {
  'use strict';

  var cfg               = window.MNM_CONFIG || {};
  var MONEY_FORMAT      = cfg.moneyFormat || '{{amount}}';
  var BUNDLE_NAMES      = cfg.bundleNames || { 1: 'Bundle 1', 2: 'Bundle 2' };
  var BUNDLE_PRICE_CENTS = cfg.bundlePriceCents || { 1: 0, 2: 0 };
  var SECTION_ID        = cfg.sectionId || '';

  var wrap = document.querySelector('[data-section-id="' + SECTION_ID + '"]');
  if (!wrap) return;

  var state = {
    activeBundle: 1,
    limits: {
      1: parseInt(wrap.getAttribute('data-b1-limit'), 10),
      2: parseInt(wrap.getAttribute('data-b2-limit'), 10)
    },
    selections: {}
  };

  var grid1        = document.getElementById('mnm-grid-1');
  var grid2        = document.getElementById('mnm-grid-2');
  var typeBtns     = wrap.querySelectorAll('.mnm-type-btn');
  var slotsEl      = document.getElementById('mnm-slots');
  var countEl      = document.getElementById('mnm-count');
  var progressEl   = document.getElementById('mnm-progress');
  var progressFill = document.getElementById('mnm-progress-fill');
  var totalItemsEl = document.getElementById('mnm-total-items');
  var totalPriceEl = document.getElementById('mnm-total-price');
  var priceWasEl   = document.getElementById('mnm-price-was');
  var saveTagEl    = document.getElementById('mnm-save-tag');
  var ctaBtn       = document.getElementById('mnm-cta');
  var ctaText      = document.getElementById('mnm-cta-text');
  var msgEl        = document.getElementById('mnm-msg');

  /* ── Sticky bar elements ────────────────────────── */
  var stickyBar      = document.getElementById('mnm-sticky-bar');
  var barPanel       = document.getElementById('mnm-bar-panel');
  var barSlotsEl     = document.getElementById('mnm-bar-slots');
  var barCountEl     = document.getElementById('mnm-bar-count');
  var barProgressEl  = document.getElementById('mnm-bar-progress');
  var barFillEl      = document.getElementById('mnm-bar-progress-fill');
  var barCtaBtn      = document.getElementById('mnm-bar-cta');
  var barCtaText     = document.getElementById('mnm-bar-cta-text');
  var barToggleBtn   = document.getElementById('mnm-bar-toggle');
  var sectionEl      = document.getElementById('mnm-section-' + SECTION_ID);

  /* ── Money helper ───────────────────────────────── */
  function formatMoney(cents) {
    var amount = (cents / 100).toFixed(2);
    return MONEY_FORMAT
      .replace('{{amount}}', amount)
      .replace('{{amount_no_decimals}}', Math.round(cents / 100))
      .replace('{{amount_with_comma_separator}}', amount.replace('.', ','))
      .replace('{{amount_no_decimals_with_comma_separator}}', Math.round(cents / 100));
  }

  /* ── State helpers ──────────────────────────────── */
  function currentLimit() {
    var limit = state.limits[state.activeBundle];
    return (typeof limit === 'number' && !isNaN(limit) && limit > 0) ? limit : 1;
  }

  function totalQty() {
    var t = 0;
    Object.values(state.selections).forEach(function (v) { t += v.qty; });
    return t;
  }

  function actualCostCents() {
    var t = 0;
    Object.values(state.selections).forEach(function (v) { t += v.qty * v.price; });
    return t;
  }

  function bundleUnitCents() {
    return parseInt(BUNDLE_PRICE_CENTS[state.activeBundle], 10) || 0;
  }

  function bundleCount() {
    return Math.floor(totalQty() / currentLimit());
  }

  function isReady() {
    var qty = totalQty();
    return qty > 0 && qty % currentLimit() === 0;
  }

  function setMsg(text, type) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = 'mnm-msg text-sm' + (type ? ' mnm-msg--' + type : '');
  }

  /* ── Toast ──────────────────────────────────────── */
  var toastTimer = null;
  function showToast(msg) {
    var existing = document.getElementById('mnm-toast');
    if (existing) existing.remove();
    clearTimeout(toastTimer);

    var toast = document.createElement('div');
    toast.id = 'mnm-toast';
    toast.textContent = msg;
    toast.style.cssText = [
      'position:fixed',
      'bottom:100px',
      'left:50%',
      'transform:translateX(-50%) translateY(20px)',
      'background:#1a1a1a',
      'color:#fff',
      'padding:12px 22px',
      'border-radius:8px',
      'font-size:14px',
      'font-weight:500',
      'z-index:99999',
      'box-shadow:0 4px 16px rgba(0,0,0,0.3)',
      'opacity:0',
      'transition:opacity 0.25s ease, transform 0.25s ease',
      'pointer-events:none',
      'white-space:nowrap',
      'max-width:90vw',
      'text-align:center'
    ].join(';');

    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });
    });

    toastTimer = setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(function () { if (toast.parentNode) toast.remove(); }, 300);
    }, 2500);
  }

  function hideToast() {
    var existing = document.getElementById('mnm-toast');
    if (existing) {
      existing.style.opacity = '0';
      existing.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(function () { if (existing.parentNode) existing.remove(); }, 300);
    }
    clearTimeout(toastTimer);
  }

  /* ── Render ─────────────────────────────────────── */
  function render() {
    var limit   = currentLimit();
    var qty     = totalQty();
    var pct     = isReady() ? 100 : limit > 0 ? Math.min(((qty % limit) / limit) * 100, 100) : 0;
    var unitC   = bundleUnitCents();
    var bundles = bundleCount();
    var actual  = actualCostCents();

    var displayQty = Math.min(qty, limit);

    if (countEl) countEl.textContent = '(' + displayQty + '/' + limit + ')';

    if (progressFill) progressFill.style.width = pct + '%';
    if (progressEl)   progressEl.setAttribute('aria-valuenow', Math.round(pct));
    if (barFillEl)    barFillEl.style.width = pct + '%';
    if (barProgressEl) barProgressEl.setAttribute('aria-valuenow', Math.round(pct));
    if (totalItemsEl) totalItemsEl.textContent = qty;
    if (barCountEl) barCountEl.textContent = displayQty + '/' + limit + ' Products';

    /* ── Pricing ── */
    if (isReady() && unitC > 0) {
      var bundleTotal = unitC * bundles;
      var priceStr    = formatMoney(bundleTotal);
      if (totalPriceEl) totalPriceEl.textContent = priceStr;
      if (actual > bundleTotal) {
        var savePct = Math.round(((actual - bundleTotal) / actual) * 100);
        if (priceWasEl) { priceWasEl.textContent = formatMoney(actual); priceWasEl.hidden = false; }
        if (saveTagEl)  { saveTagEl.textContent  = 'SAVE ' + savePct + '%'; saveTagEl.hidden = false; }
      } else {
        if (priceWasEl) priceWasEl.hidden = true;
        if (saveTagEl)  saveTagEl.hidden  = true;
      }
    } else {
      var runningStr = qty > 0 ? formatMoney(actual) : formatMoney(0);
      if (totalPriceEl) totalPriceEl.textContent = runningStr;
      if (priceWasEl)   priceWasEl.hidden = true;
      if (saveTagEl)    saveTagEl.hidden  = true;
    }

    /* ── CTA label ── */
    function ctaLabel() {
      if (isReady()) return 'CHECKOUT NOW';
      var remainder = qty % limit;
      var remaining = remainder === 0 ? limit : (limit - remainder);
      return 'ADD ' + remaining + ' MORE TO COMPLETE';
    }

    /* ── Sidebar CTA ── */
    if (ctaBtn) {
      ctaBtn.disabled = !isReady();
      ctaBtn.setAttribute('aria-disabled', isReady() ? 'false' : 'true');
      ctaBtn.dataset.state = isReady() ? 'ready' : 'idle';
      if (ctaText) ctaText.textContent = ctaLabel();
    }

    /* ── Bar CTA ── */
    if (barCtaBtn) {
      barCtaBtn.disabled = !isReady();
      barCtaBtn.setAttribute('aria-disabled', isReady() ? 'false' : 'true');
      barCtaBtn.dataset.state = isReady() ? 'ready' : 'idle';
      if (barCtaText) barCtaText.textContent = ctaLabel();
    }

    renderSlots();
    syncCards();
  }

  /* ── Slots ──────────────────────────────────────── */
  function buildSlots(target) {
    if (!target) return;
    target.innerHTML = '';
    var filled = Object.keys(state.selections).filter(function (id) {
      return state.selections[id].qty > 0;
    });

    if (filled.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'mnm-slot mnm-slot--empty';
      var icon = document.createElement('span');
      icon.className = 'mnm-slot__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '+';
      empty.appendChild(icon);
      target.appendChild(empty);
      return;
    }

    filled.forEach(function (variantId) {
      var item  = state.selections[variantId];
      var slot  = document.createElement('div');
      slot.className = 'mnm-slot mnm-slot--filled';

      var badge = document.createElement('span');
      badge.className = 'mnm-slot__badge';
      badge.textContent = item.qty;
      badge.setAttribute('aria-label', item.qty + ' selected');
      slot.appendChild(badge);

      if (item.image) {
        var img     = document.createElement('img');
        img.className = 'mnm-slot__img';
        img.src       = item.image;
        img.alt       = item.title;
        img.loading   = 'lazy';
        img.width     = 40;
        img.height    = 44;
        slot.appendChild(img);
      }

      var name = document.createElement('span');
      name.className = 'mnm-slot__name';
      name.textContent = item.title;
      slot.appendChild(name);

      if (target === slotsEl) {
        var rmBtn = document.createElement('button');
        rmBtn.type = 'button';
        rmBtn.className = 'mnm-slot__remove';
        rmBtn.setAttribute('aria-label', 'Remove ' + item.title + ' from bundle');
        rmBtn.textContent = '\u00d7';
        rmBtn.addEventListener('click', function () { removeVariant(variantId); });
        slot.appendChild(rmBtn);
      }

      target.appendChild(slot);
    });
  }

  function renderSlots() {
    buildSlots(slotsEl);
    buildSlots(barSlotsEl);
  }

  /* ── Card sync ──────────────────────────────────── */
  function syncCards() {
    wrap.querySelectorAll('.mnm-card[data-grid="' + state.activeBundle + '"]').forEach(function (card) {
      var id      = card.dataset.variantId;
      var qty     = (state.selections[id] && state.selections[id].qty) || 0;
      var addBtn  = card.querySelector('.mnm-add-btn');
      var qtyWrap = card.querySelector('.mnm-card__actions');
      var qtyEl   = card.querySelector('.quantity-selector__input');
      var minus   = card.querySelector('[data-action="decrease"]');

      if (qty > 0) {
        if (addBtn)  addBtn.hidden  = true;
        if (qtyWrap) qtyWrap.hidden = false;
      } else {
        if (addBtn)  addBtn.hidden  = false;
        if (qtyWrap) qtyWrap.hidden = true;
      }

      if (qtyEl)  qtyEl.textContent = qty;
      if (minus)  minus.disabled = qty <= 1;
      card.dataset.selected = qty > 0 ? 'true' : 'false';
    });
  }

  /* ── Qty change ─────────────────────────────────── */
  function changeQty(variantId, delta, card) {
    var current = (state.selections[variantId] && state.selections[variantId].qty) || 0;
    var newQty  = Math.max(0, current + delta);
    var limit   = currentLimit();

    if (delta > 0 && totalQty() >= limit) {
      showToast('Maximum ' + limit + ' items allowed!');
      return;
    }

    if (delta < 0) {
      hideToast();
    }

    if (newQty === 0) {
      delete state.selections[variantId];
    } else {
      state.selections[variantId] = {
        title:     card.dataset.productTitle,
        price:     parseInt(card.dataset.price, 10) || 0,
        image:     card.dataset.image || '',
        qty:       newQty,
        variantId: variantId
      };
    }
    render();
  }

  function removeVariant(variantId) {
    delete state.selections[variantId];
    hideToast(); 
    var card = wrap.querySelector('[data-variant-id="' + variantId + '"][data-grid="' + state.activeBundle + '"]');
    if (card) {
      var addBtn  = card.querySelector('.mnm-add-btn');
      var qtyWrap = card.querySelector('.mnm-card__actions');
      var qtyEl   = card.querySelector('.quantity-selector__input');
      var minus   = card.querySelector('[data-action="decrease"]');
      if (addBtn)  addBtn.hidden  = false;
      if (qtyWrap) qtyWrap.hidden = true;
      if (qtyEl)   qtyEl.textContent = '0';
      if (minus)   minus.disabled = true;
      card.dataset.selected = 'false';
    }
    render();
  }

  /* ── Reset all cards ────────────────────────────── */
  function resetCards() {
    wrap.querySelectorAll('.mnm-card').forEach(function (card) {
      var addBtn  = card.querySelector('.mnm-add-btn');
      var qtyWrap = card.querySelector('.mnm-card__actions');
      var qtyEl   = card.querySelector('.quantity-selector__input');
      var minus   = card.querySelector('[data-action="decrease"]');
      if (addBtn)  addBtn.hidden  = false;
      if (qtyWrap) qtyWrap.hidden = true;
      if (qtyEl)   qtyEl.textContent = '0';
      if (minus)   minus.disabled = true;
      card.dataset.selected = 'false';
    });
  }

  /* ── Switch bundle ──────────────────────────────── */
  function switchBundle(bundleNum) {
    state.activeBundle = bundleNum;
    state.selections = {};
    resetCards();

    if (bundleNum === 1) {
      grid1.removeAttribute('hidden');
      grid2.setAttribute('hidden', '');
    } else {
      grid1.setAttribute('hidden', '');
      grid2.removeAttribute('hidden');
    }

    typeBtns.forEach(function (btn) {
      var isActive = parseInt(btn.dataset.bundle, 10) === bundleNum;
      btn.classList.toggle('mnm-type-btn--active', isActive);
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });

    setMsg('');
    render();
  }

  /* ── Add to cart ────────────────────────────────── */
  function addToCart() {
    if (!isReady()) return;

    /* Loading state */
    if (ctaBtn)    { ctaBtn.dataset.state    = 'loading'; ctaBtn.disabled    = true; }
    if (barCtaBtn) { barCtaBtn.dataset.state  = 'loading'; barCtaBtn.disabled  = true; }
    if (ctaText)    ctaText.textContent   = 'PLEASE WAIT\u2026';
    if (barCtaText) barCtaText.textContent = 'PLEASE WAIT\u2026';
    setMsg('');

    var bundleName = BUNDLE_NAMES[state.activeBundle] || ('Bundle ' + state.activeBundle);
    var limit      = currentLimit();
    var bundles    = bundleCount();

    var items = Object.values(state.selections).map(function (item) {
      return {
        id:         parseInt(item.variantId, 10),
        quantity:   item.qty,
        properties: {
          '_bundle_type':  bundleName,
          '_bundle_count': bundles,
          '_bundle_limit': limit
        }
      };
    });

    /* Step 1: Clear old cart */
    fetch('/cart/clear.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    .then(function () {
      /* Step 2: Add bundle items to cart */
      return fetch('/cart/add.js', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify({ items: items })
      });
    })
    .then(function (res) {
      if (!res.ok) return res.json().then(function (d) { throw new Error(d.description || 'Error'); });
      return res.json();
    })
    .then(function () {
      /* Step 3: Redirect to standard Shopify cart page */
      window.location.href = '/cart';
    })
    .catch(function (err) {
      setMsg(err.message || 'Something went wrong. Please try again.', 'error');
      if (ctaBtn)    { ctaBtn.dataset.state    = 'ready'; ctaBtn.disabled    = false; }
      if (barCtaBtn) { barCtaBtn.dataset.state  = 'ready'; barCtaBtn.disabled  = false; }
    });
  }

  /* ── Sticky bar: IntersectionObserver ───────────── */
  if (stickyBar && sectionEl && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        stickyBar.dataset.visible = entry.isIntersecting ? 'true' : 'false';
        stickyBar.setAttribute('aria-hidden', entry.isIntersecting ? 'false' : 'true');
      });
    }, { threshold: 0.01, rootMargin: '0px 0px -100px 0px' });
    observer.observe(sectionEl);
  }

  /* ── Sticky bar toggle ──────────────────────────── */
  if (barToggleBtn && barPanel) {
    var toggleExpanded = function () {
      var expanded = barToggleBtn.getAttribute('aria-expanded') === 'true';
      barToggleBtn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      barPanel.hidden = expanded;
    };
    barToggleBtn.addEventListener('click', toggleExpanded);
  }

  /* ── Event listeners ────────────────────────────── */
  typeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { switchBundle(parseInt(btn.dataset.bundle, 10)); });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        switchBundle(parseInt(btn.dataset.bundle, 10));
      }
    });
  });

  [grid1, grid2].forEach(function (grid) {
    if (!grid) return;
    grid.addEventListener('click', function (e) {
      var qtyBtn = e.target.closest('.quantity-selector__button');
      if (qtyBtn) {
        var card = qtyBtn.closest('.mnm-card');
        var id   = card && card.dataset.variantId;
        if (!id) return;
        changeQty(id, qtyBtn.dataset.action === 'increase' ? 1 : -1, card);
        return;
      }

      var removeBtn = e.target.closest('.mnm-remove-btn');
      if (removeBtn) {
        var card = removeBtn.closest('.mnm-card');
        var id   = card && card.dataset.variantId;
        if (!id) return;
        removeVariant(id);
        return;
      }

      var addBtn = e.target.closest('.mnm-add-btn');
      if (addBtn) {
        var card = addBtn.closest('.mnm-card');
        var id   = card && card.dataset.variantId;
        if (!id) return;
        changeQty(id, 1, card);
      }
    });
  });

  if (ctaBtn)    ctaBtn.addEventListener('click', addToCart);
  if (barCtaBtn) barCtaBtn.addEventListener('click', addToCart);

  /* ── Init ───────────────────────────────────────── */
  switchBundle(1);
  render();
})();