/* ==========================================================================
   DOLLY DISTRICT — Theme JavaScript (vanilla, no dependencies)
   ========================================================================== */
(function () {
  'use strict';

  var routes = {
    cartAdd: '/cart/add.js',
    cartChange: '/cart/change.js',
    cartUpdate: '/cart/update.js',
    cart: '/cart.js',
    predictiveSearch: '/search/suggest.json'
  };

  document.addEventListener('DOMContentLoaded', function () {
    initHeaderScroll();
    initMobileDrawer();
    initSearchDrawer();
    initCartDrawer();
    initProductForms();
    initQuantitySelectors();
    initQuickAdd();
    initSizeGuide();
    initWishlist();
    initRecentlyViewed();
    initTestimonialsCarousel();
    initAnnouncementSlider();
    initAccordions();
    initRevealAnimations();
    initProductGallery();
    initProductRecommendations();
    initCollectionFilters();
    refreshCartUI();
  });

  /* ---------------------------------------------------------------------- */
  /* Utilities                                                              */
  /* ---------------------------------------------------------------------- */
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function on(el, evt, sel, handler) {
    if (!el) return;
    el.addEventListener(evt, function (e) {
      var target = e.target.closest(sel);
      if (target && el.contains(target)) handler(e, target);
    });
  }
  function fireEscapable(closeFn) {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeFn();
    });
  }
  function trapNothing() {} // reserved for future focus-trap enhancement

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------- */
  /* Header scroll behavior                                                 */
  /* ---------------------------------------------------------------------- */
  function initHeaderScroll() {
    var header = qs('[data-header]');
    if (!header) return;
    var threshold = 60;

    function update() {
      if (window.scrollY > threshold) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ---------------------------------------------------------------------- */
  /* Mobile drawer                                                          */
  /* ---------------------------------------------------------------------- */
  function initMobileDrawer() {
    var drawer = qs('#MobileDrawer');
    var toggle = qs('[data-drawer-open]');
    if (!drawer || !toggle) return;

    function open() {
      drawer.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      drawer.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      qsa('[data-mobile-submenu]').forEach(function (s) { s.classList.remove('is-open'); });
    }

    toggle.addEventListener('click', open);
    on(drawer, 'click', '[data-drawer-close]', close);
    on(drawer, 'click', '[data-mobile-submenu-toggle]', function (e, target) {
      var submenu = target.nextElementSibling;
      if (submenu) submenu.classList.add('is-open');
    });
    on(drawer, 'click', '[data-mobile-submenu-back]', function (e, target) {
      target.closest('[data-mobile-submenu]').classList.remove('is-open');
    });

    fireEscapable(function () { if (!drawer.hidden) close(); });
  }

  /* ---------------------------------------------------------------------- */
  /* Search drawer + predictive search                                     */
  /* ---------------------------------------------------------------------- */
  function initSearchDrawer() {
    var drawer = qs('#SearchDrawer');
    var openBtn = qs('[data-search-open]');
    if (!drawer || !openBtn) return;
    var input = qs('[data-predictive-search-input]', drawer);
    var resultsWrap = qs('[data-predictive-search-results]', drawer);
    var productsWrap = qs('[data-predictive-search-products]', drawer);
    var emptyWrap = qs('[data-predictive-search-empty]', drawer);
    var recentList = qs('[data-recent-searches-list]', drawer);
    var recentWrap = qs('[data-recent-searches]', drawer);
    var debounceTimer;

    function open() {
      drawer.hidden = false;
      document.body.style.overflow = 'hidden';
      renderRecent();
      setTimeout(function () { input && input.focus(); }, 50);
    }
    function close() {
      drawer.hidden = true;
      document.body.style.overflow = '';
    }

    openBtn.addEventListener('click', open);
    on(drawer, 'click', '[data-search-close]', close);
    fireEscapable(function () { if (!drawer.hidden) close(); });

    function getRecent() {
      try { return JSON.parse(localStorage.getItem('dolly_recent_searches') || '[]'); }
      catch (e) { return []; }
    }
    function saveRecent(term) {
      var list = getRecent().filter(function (t) { return t.toLowerCase() !== term.toLowerCase(); });
      list.unshift(term);
      localStorage.setItem('dolly_recent_searches', JSON.stringify(list.slice(0, 6)));
    }
    function renderRecent() {
      if (!recentList) return;
      var list = getRecent();
      recentList.innerHTML = '';
      if (list.length === 0) { if (recentWrap) recentWrap.hidden = true; return; }
      if (recentWrap) recentWrap.hidden = false;
      list.forEach(function (term) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '/search?q=' + encodeURIComponent(term) + '&type=product,collection';
        a.textContent = term;
        li.appendChild(a);
        recentList.appendChild(li);
      });
    }
    on(drawer, 'click', '[data-clear-recent]', function () {
      localStorage.removeItem('dolly_recent_searches');
      renderRecent();
    });

    if (input) {
      input.addEventListener('input', function () {
        var term = input.value.trim();
        clearTimeout(debounceTimer);
        if (term.length < 2) {
          if (resultsWrap) resultsWrap.hidden = true;
          if (emptyWrap) emptyWrap.hidden = true;
          if (recentWrap) recentWrap.hidden = false;
          return;
        }
        if (recentWrap) recentWrap.hidden = true;
        debounceTimer = setTimeout(function () { runPredictiveSearch(term); }, 250);
      });
      qs('[data-predictive-search-form]', drawer).addEventListener('submit', function () {
        var term = input.value.trim();
        if (term) saveRecent(term);
      });
    }

    function runPredictiveSearch(term) {
      var url = routes.predictiveSearch + '?q=' + encodeURIComponent(term) + '&resources[type]=product,collection&resources[limit]=6';
      fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var products = (data.resources && data.resources.results && data.resources.results.products) || [];
          if (!productsWrap) return;
          productsWrap.innerHTML = '';
          if (products.length === 0) {
            if (resultsWrap) resultsWrap.hidden = true;
            if (emptyWrap) emptyWrap.hidden = false;
            return;
          }
          if (emptyWrap) emptyWrap.hidden = true;
          if (resultsWrap) resultsWrap.hidden = false;
          products.forEach(function (product) {
            var card = document.createElement('a');
            card.href = product.url;
            card.className = 'search-result-card';
            var img = document.createElement('img');
            img.loading = 'lazy';
            img.src = product.featured_image ? product.featured_image.url : '';
            img.alt = product.title;
            var h3 = document.createElement('h3');
            h3.textContent = product.title;
            var price = document.createElement('p');
            price.className = 'price';
            price.textContent = product.price;
            card.appendChild(img);
            card.appendChild(h3);
            card.appendChild(price);
            productsWrap.appendChild(card);
          });
        })
        .catch(function () {});
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Cart drawer + cart operations                                         */
  /* ---------------------------------------------------------------------- */
  function initCartDrawer() {
    var drawer = qs('#CartDrawer');
    var openBtn = qs('[data-cart-open]');
    if (!drawer) return;

    function open() {
      if (drawer.getAttribute('data-cart-type') !== 'drawer') {
        window.location.href = '/cart';
        return;
      }
      drawer.hidden = false;
      document.body.style.overflow = 'hidden';
    }
    function close() {
      drawer.hidden = true;
      document.body.style.overflow = '';
    }
    window.DollyDistrict = window.DollyDistrict || {};
    window.DollyDistrict.openCart = open;
    window.DollyDistrict.closeCart = close;

    if (openBtn) openBtn.addEventListener('click', open);
    on(drawer, 'click', '[data-cart-drawer-close]', close);
    fireEscapable(function () { if (!drawer.hidden) close(); });

    on(document, 'click', '[data-cart-quantity-increase]', function (e, target) {
      var input = target.parentElement.querySelector('[data-cart-quantity-input]');
      input.value = parseInt(input.value, 10) + 1;
      updateCartLine(target.closest('[data-cart-item]'), input.value);
    });
    on(document, 'click', '[data-cart-quantity-decrease]', function (e, target) {
      var input = target.parentElement.querySelector('[data-cart-quantity-input]');
      input.value = Math.max(0, parseInt(input.value, 10) - 1);
      updateCartLine(target.closest('[data-cart-item]'), input.value);
    });
    on(document, 'change', '[data-cart-quantity-input]', function (e, target) {
      updateCartLine(target.closest('[data-cart-item]'), Math.max(0, parseInt(target.value, 10) || 0));
    });
    on(document, 'click', '[data-cart-remove]', function (e, target) {
      updateCartLine(target.closest('[data-cart-item]'), 0);
    });
  }

  function updateCartLine(itemEl, quantity) {
    if (!itemEl) return;
    var variantId = itemEl.getAttribute('data-variant-id');
    fetch(routes.cartChange, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: quantity })
    })
      .then(function (r) { return r.json(); })
      .then(function (cart) { renderCart(cart); })
      .catch(function () {});
  }

  function refreshCartUI() {
    fetch(routes.cart).then(function (r) { return r.json(); }).then(renderCart).catch(function () {});
  }

  function renderCart(cart) {
    qsa('[data-cart-count]').forEach(function (el) { el.textContent = cart.item_count; });
    qsa('[data-cart-subtotal]').forEach(function (el) { el.textContent = formatMoney(cart.total_price); });

    var body = qs('[data-cart-drawer-body]');
    var footer = qs('[data-cart-drawer-footer]');
    if (body) {
      fetch(routes.cart).then(function () {
        // Re-render via fetching the cart section fragment is ideal; as a light-weight
        // fallback we rebuild line items directly from the cart JSON payload.
        body.innerHTML = buildCartItemsHTML(cart, 'drawer');
        if (footer) footer.style.display = cart.item_count > 0 ? '' : 'none';
      });
    }

    var pageItems = qs('[data-cart-items]');
    if (pageItems) {
      pageItems.parentElement.innerHTML = buildCartItemsHTML(cart, 'page');
    }
  }

  function buildCartItemsHTML(cart, context) {
    if (cart.item_count === 0) {
      return '<div class="cart-empty"><p>' + (window.DollyDistrict.strings.cartEmpty || 'Your bag is empty') + '</p>' +
        '<a href="/collections/all" class="button button--primary">' + (window.DollyDistrict.strings.continueShopping || 'Continue shopping') + '</a></div>';
    }
    var html = '<ul class="cart-items" data-cart-items>';
    cart.items.forEach(function (item) {
      html += '<li class="cart-item" data-cart-item data-line="' + item.key + '" data-variant-id="' + item.variant_id + '">' +
        '<a href="' + item.url + '" class="cart-item__image-link">' +
        (item.image ? '<img src="' + item.image + '" alt="" width="80" height="106" class="cart-item__image">' : '') +
        '</a>' +
        '<div class="cart-item__details">' +
        '<a href="' + item.url + '" class="cart-item__title">' + item.product_title + '</a>' +
        (item.variant_title ? '<p class="cart-item__variant">' + item.variant_title + '</p>' : '') +
        '<div class="price"><span class="price__regular">' + formatMoney(item.final_price) + '</span></div>' +
        '<div class="cart-item__controls">' +
        '<div class="quantity-selector quantity-selector--small">' +
        '<button type="button" class="quantity-selector__button" data-cart-quantity-decrease>−</button>' +
        '<input type="number" class="quantity-selector__input" value="' + item.quantity + '" min="0" data-cart-quantity-input>' +
        '<button type="button" class="quantity-selector__button" data-cart-quantity-increase>+</button>' +
        '</div>' +
        '<button type="button" class="cart-item__remove" data-cart-remove>Remove</button>' +
        '</div></div>' +
        '<div class="cart-item__line-price">' + formatMoney(item.final_line_price) + '</div>' +
        '</li>';
    });
    html += '</ul>';
    return html;
  }

  function formatMoney(cents) {
    var amount = (cents / 100).toFixed(2);
    return (window.Shopify && window.Shopify.currency && window.Shopify.currency.active ? '' : '$') + amount;
  }

  window.DollyDistrict = window.DollyDistrict || {};
  window.DollyDistrict.strings = { cartEmpty: 'Your bag is empty', continueShopping: 'Continue shopping' };

  function addToCart(formData, onSuccess, onError) {
    fetch(routes.cartAdd, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(formData)
    })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (res) {
        if (!res.ok) { onError && onError(res.data); return; }
        refreshCartUI();
        onSuccess && onSuccess(res.data);
      })
      .catch(function (err) { onError && onError(err); });
  }

  /* ---------------------------------------------------------------------- */
  /* Product forms (PDP + quick add)                                        */
  /* ---------------------------------------------------------------------- */
  function initProductForms() {
    qsa('[data-product-form]').forEach(setupProductForm);
  }

  function setupProductForm(root) {
    var productJsonEl = qs('[data-product-json]', root);
    if (!productJsonEl) return;
    var product;
    try { product = JSON.parse(productJsonEl.textContent); } catch (e) { return; }

    var form = qs('form[data-type="add-to-cart-form"]', root);
    var variantInput = qs('[data-variant-id-input]', root);
    var submitBtn = qs('[data-add-to-cart]', root);
    var buyNowBtn = qs('[data-buy-now]', root);
    var messageEl = qs('[data-form-message]', root);

    var selectedOptions = {};
    qsa('[data-option-value].product-pill--selected', root).forEach(function (btn) {
      selectedOptions[btn.getAttribute('data-option-index')] = btn.getAttribute('data-value');
    });
    // fallback: derive from currently selected variant if nothing pre-marked
    if (Object.keys(selectedOptions).length === 0) {
      var current = product.variants.find(function (v) { return v.available; }) || product.variants[0];
      (current.options || []).forEach(function (val, idx) { selectedOptions[idx] = val; });
    }

    function findVariant() {
      return product.variants.find(function (v) {
        return Object.keys(selectedOptions).every(function (idx) {
          return v.options[idx] === selectedOptions[idx];
        });
      });
    }

    function updateAvailability() {
      qsa('[data-option-value]', root).forEach(function (btn) {
        var idx = btn.getAttribute('data-option-index');
        var value = btn.getAttribute('data-value');
        var testOptions = Object.assign({}, selectedOptions);
        testOptions[idx] = value;
        var match = product.variants.find(function (v) {
          return Object.keys(testOptions).every(function (i) { return v.options[i] === testOptions[i]; });
        });
        btn.classList.toggle('product-pill--unavailable', !!match && !match.available);
      });
    }

    function render() {
      var variant = findVariant();
      updateAvailability();
      qsa('[data-option-value]', root).forEach(function (btn) {
        var idx = btn.getAttribute('data-option-index');
        var isSelected = selectedOptions[idx] === btn.getAttribute('data-value');
        btn.classList.toggle('product-pill--selected', isSelected);
        btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      });
      qsa('[data-selected-value]', root).forEach(function (el, i) {
        var fieldset = el.closest('[data-option-index]');
        if (fieldset) el.textContent = selectedOptions[fieldset.getAttribute('data-option-index')] || '';
      });

      if (variant) {
        if (variantInput) variantInput.value = variant.id;
        var available = variant.available;
        if (submitBtn) {
          submitBtn.disabled = !available;
          var textEl = qs('[data-add-to-cart-text]', submitBtn);
          if (textEl) textEl.textContent = available ? (window.DollyDistrict.strings.addToCart || 'Add to Bag') : (window.DollyDistrict.strings.soldOut || 'Sold Out');
        }
        if (buyNowBtn) buyNowBtn.disabled = !available;

        var url = new URL(window.location.href);
        if (root.getAttribute('data-product-handle')) {
          history.replaceState({}, '', '/products/' + root.getAttribute('data-product-handle') + '?variant=' + variant.id);
        }
        var priceWrap = root.closest('.product-section, .quick-add');
        if (priceWrap) {
          var priceEl = qs('.price', priceWrap);
          if (priceEl && variant.price != null) {
            priceEl.innerHTML = variant.compare_at_price > variant.price
              ? '<span class="price__sale">' + formatMoney(variant.price) + '</span><span class="price__compare">' + formatMoney(variant.compare_at_price) + '</span>'
              : '<span class="price__regular">' + formatMoney(variant.price) + '</span>';
          }
        }
      } else if (submitBtn) {
        submitBtn.disabled = true;
      }
    }

    on(root, 'click', '[data-option-value]', function (e, btn) {
      var idx = btn.getAttribute('data-option-index');
      selectedOptions[idx] = btn.getAttribute('data-value');
      render();
    });

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(form);
        var payload = { id: fd.get('id'), quantity: fd.get('quantity') || 1 };
        if (submitBtn) submitBtn.disabled = true;
        addToCart(payload, function () {
          if (submitBtn) submitBtn.disabled = false;
          if (messageEl) { messageEl.hidden = false; messageEl.textContent = window.DollyDistrict.strings.itemAdded || 'Added to your bag'; }
          if (qs('#CartDrawer')) window.DollyDistrict.openCart();
        }, function (err) {
          if (submitBtn) submitBtn.disabled = false;
          if (messageEl) { messageEl.hidden = false; messageEl.textContent = (err && err.description) || 'There was an error adding this item.'; }
        });
      });
    }

    if (buyNowBtn) {
      buyNowBtn.addEventListener('click', function () {
        var variant = findVariant();
        if (!variant) return;
        var qtyInput = qs('[data-quantity-input]', root);
        addToCart({ id: variant.id, quantity: (qtyInput && qtyInput.value) || 1 }, function () {
          window.location.href = '/checkout';
        });
      });
    }

    render();
  }

  window.DollyDistrict.strings.addToCart = 'Add to Bag';
  window.DollyDistrict.strings.soldOut = 'Sold Out';
  window.DollyDistrict.strings.itemAdded = 'Added to your bag';

  function initQuantitySelectors() {
    on(document, 'click', '[data-quantity-increase]', function (e, btn) {
      var input = btn.parentElement.querySelector('[data-quantity-input]');
      if (input) input.value = parseInt(input.value, 10) + 1;
    });
    on(document, 'click', '[data-quantity-decrease]', function (e, btn) {
      var input = btn.parentElement.querySelector('[data-quantity-input]');
      if (input) input.value = Math.max(1, parseInt(input.value, 10) - 1);
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Quick add                                                              */
  /* ---------------------------------------------------------------------- */
  function initQuickAdd() {
    var modal = qs('#quick-add-modal');
    if (!modal) return;
    var content = qs('[data-quick-add-content]', modal);

    function open(template) {
      content.innerHTML = '';
      content.appendChild(template.content.cloneNode(true));
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      var formRoot = qs('[data-product-form]', content);
      if (formRoot) setupProductForm(formRoot);
    }
    function close() {
      modal.hidden = true;
      document.body.style.overflow = '';
      content.innerHTML = '';
    }

    on(document, 'click', '[data-quick-add-trigger]', function (e, btn) {
      var card = btn.closest('[data-product-card]');
      var template = card && qs('[data-quick-add-template]', card);
      if (template) open(template);
    });
    on(modal, 'click', '[data-quick-add-close]', close);
    fireEscapable(function () { if (!modal.hidden) close(); });
  }

  /* ---------------------------------------------------------------------- */
  /* Size guide                                                             */
  /* ---------------------------------------------------------------------- */
  function initSizeGuide() {
    var modal = qs('#size-guide-modal');
    if (!modal) return;
    function open() { modal.hidden = false; document.body.style.overflow = 'hidden'; }
    function close() { modal.hidden = true; document.body.style.overflow = ''; }
    on(document, 'click', '[data-open-size-guide]', open);
    on(modal, 'click', '[data-close-size-guide]', close);
    fireEscapable(function () { if (!modal.hidden) close(); });
  }

  /* ---------------------------------------------------------------------- */
  /* Wishlist (localStorage; ready for authenticated persistence later)     */
  /* ---------------------------------------------------------------------- */
  function initWishlist() {
    var STORAGE_KEY = 'dolly_wishlist';

    function getWishlist() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; }
    }
    function saveWishlist(list) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      updateCountBadges(list.length);
    }
    function updateCountBadges(count) {
      qsa('[data-wishlist-count]').forEach(function (el) {
        el.textContent = count;
        el.hidden = count === 0;
      });
    }
    function refreshButtons() {
      var list = getWishlist();
      qsa('[data-wishlist-toggle]').forEach(function (btn) {
        var id = btn.getAttribute('data-product-id');
        var active = list.indexOf(id) > -1;
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      updateCountBadges(list.length);
    }

    on(document, 'click', '[data-wishlist-toggle]', function (e, btn) {
      e.preventDefault();
      var id = btn.getAttribute('data-product-id');
      var list = getWishlist();
      var idx = list.indexOf(id);
      if (idx > -1) list.splice(idx, 1); else list.push(id);
      saveWishlist(list);
      refreshButtons();
    });

    refreshButtons();
  }

  /* ---------------------------------------------------------------------- */
  /* Recently viewed                                                        */
  /* ---------------------------------------------------------------------- */
  function initRecentlyViewed() {
    var STORAGE_KEY = 'dolly_recently_viewed';
    var current = window.DollyDistrict.currentProduct;

    function getList() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; }
    }
    function saveList(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

    if (current && current.id) {
      var list = getList().filter(function (p) { return p.id !== current.id; });
      list.unshift({
        id: current.id,
        title: current.title,
        url: current.url,
        image: current.featured_image,
        price: current.price,
        compare_at_price: current.compare_at_price
      });
      saveList(list.slice(0, 8));
    }

    var grid = qs('[data-recently-viewed-grid]');
    var section = qs('[data-recently-viewed]');
    if (!grid || !section) return;
    var items = getList().filter(function (p) { return !current || p.id !== current.id; }).slice(0, 4);
    if (items.length === 0) return;

    section.hidden = false;
    items.forEach(function (item) {
      var card = document.createElement('a');
      card.href = item.url;
      card.className = 'product-card';
      var onSale = item.compare_at_price > item.price;
      card.innerHTML =
        '<div class="product-card__media-wrap">' +
        '<div class="product-card__media ratio-portrait">' +
        (item.image ? '<img class="product-card__image product-card__image--primary" src="' + item.image + '" alt="' + (item.title || '') + '" loading="lazy">' : '') +
        '</div></div>' +
        '<div class="product-card__info"><h3 class="product-card__title">' + item.title + '</h3>' +
        '<div class="price">' +
        (onSale
          ? '<span class="price__sale">' + formatMoney(item.price) + '</span><span class="price__compare">' + formatMoney(item.compare_at_price) + '</span>'
          : '<span class="price__regular">' + formatMoney(item.price) + '</span>') +
        '</div></div>';
      grid.appendChild(card);
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Testimonials carousel                                                  */
  /* ---------------------------------------------------------------------- */
  function initTestimonialsCarousel() {
    qsa('[data-carousel]').forEach(function (carousel) {
      var track = qs('[data-carousel-track]', carousel);
      var slides = qsa('[data-carousel-slide]', track);
      if (slides.length <= 1) return;
      var dotsWrap = qs('[data-carousel-dots]', carousel);
      var index = 0;

      slides.forEach(function (_, i) {
        var dot = document.createElement('button');
        dot.type = 'button';
        if (i === 0) dot.classList.add('is-active');
        dot.addEventListener('click', function () { goTo(i); });
        if (dotsWrap) dotsWrap.appendChild(dot);
      });

      function goTo(i) {
        index = (i + slides.length) % slides.length;
        track.style.transform = 'translateX(-' + (index * 100) + '%)';
        track.style.transition = prefersReducedMotion ? 'none' : 'transform .5s ease';
        if (dotsWrap) {
          qsa('button', dotsWrap).forEach(function (d, di) { d.classList.toggle('is-active', di === index); });
        }
      }

      var prev = qs('[data-carousel-prev]', carousel);
      var next = qs('[data-carousel-next]', carousel);
      if (prev) prev.addEventListener('click', function () { goTo(index - 1); });
      if (next) next.addEventListener('click', function () { goTo(index + 1); });

      if (!prefersReducedMotion) {
        setInterval(function () { goTo(index + 1); }, 6000);
      }
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Announcement bar rotator                                               */
  /* ---------------------------------------------------------------------- */
  function initAnnouncementSlider() {
    var slider = qs('[data-announcement-slider]');
    if (!slider) return;
    var slides = qsa('.announcement-bar__slide', slider);
    if (slides.length <= 1) return;
    var index = 0;
    slides.forEach(function (s, i) { if (i !== 0) s.style.display = 'none'; });
    if (prefersReducedMotion) return;
    setInterval(function () {
      slides[index].style.display = 'none';
      index = (index + 1) % slides.length;
      slides[index].style.display = '';
    }, 4000);
  }

  /* ---------------------------------------------------------------------- */
  /* Accordions                                                             */
  /* ---------------------------------------------------------------------- */
  function initAccordions() {
    on(document, 'click', '[data-accordion-trigger]', function (e, trigger) {
      var item = trigger.closest('[data-accordion-item]');
      var panel = qs('[data-accordion-panel]', item);
      var isOpen = item.classList.contains('is-open');
      item.classList.toggle('is-open', !isOpen);
      trigger.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      if (panel) panel.hidden = isOpen;
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Scroll reveal                                                          */
  /* ---------------------------------------------------------------------- */
  function initRevealAnimations() {
    var els = qsa('.reveal-up, .reveal-image');
    if (els.length === 0) return;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    els.forEach(function (el) { observer.observe(el); });
  }

  /* ---------------------------------------------------------------------- */
  /* Product gallery                                                        */
  /* ---------------------------------------------------------------------- */
  function initProductGallery() {
    qsa('[data-product-gallery]').forEach(function (gallery) {
      var slides = qsa('[data-gallery-slide]', gallery);
      var thumbs = qsa('[data-gallery-thumb]', gallery);
      var index = 0;

      function show(i) {
        index = (i + slides.length) % slides.length;
        slides.forEach(function (s, si) { s.hidden = si !== index; });
        thumbs.forEach(function (t, ti) {
          t.classList.toggle('is-active', ti === index);
          t.setAttribute('aria-selected', ti === index ? 'true' : 'false');
        });
      }

      thumbs.forEach(function (thumb) {
        thumb.addEventListener('click', function () { show(parseInt(thumb.getAttribute('data-index'), 10)); });
      });
      var prev = qs('[data-gallery-prev]', gallery);
      var next = qs('[data-gallery-next]', gallery);
      if (prev) prev.addEventListener('click', function () { show(index - 1); });
      if (next) next.addEventListener('click', function () { show(index + 1); });

      // Touch swipe
      var startX = null;
      var main = qs('[data-gallery-main]', gallery);
      if (main) {
        main.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
        main.addEventListener('touchend', function (e) {
          if (startX === null) return;
          var diff = e.changedTouches[0].clientX - startX;
          if (Math.abs(diff) > 40) show(diff > 0 ? index - 1 : index + 1);
          startX = null;
        }, { passive: true });
      }

      // Keyboard nav when gallery has focus
      gallery.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') show(index - 1);
        if (e.key === 'ArrowRight') show(index + 1);
      });
    });

    // Lightbox / zoom
    var lightbox = qs('[data-gallery-lightbox]');
    if (lightbox) {
      var images = qsa('[data-lightbox-image]', lightbox);
      function openAt(i) {
        images.forEach(function (img, ii) { img.hidden = ii !== i; });
        lightbox.hidden = false;
        document.body.style.overflow = 'hidden';
      }
      function close() {
        lightbox.hidden = true;
        document.body.style.overflow = '';
      }
      on(document, 'click', '[data-open-zoom]', function (e, trigger) {
        openAt(parseInt(trigger.getAttribute('data-index'), 10) || 0);
      });
      on(lightbox, 'click', '[data-close-zoom]', close);
      fireEscapable(function () { if (!lightbox.hidden) close(); });
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Product recommendations (Section Rendering API)                        */
  /* ---------------------------------------------------------------------- */
  function initProductRecommendations() {
    qsa('[data-recommendations]').forEach(function (el) {
      var url = el.getAttribute('data-url');
      if (!url) return;
      fetch(url)
        .then(function (r) { return r.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var grid = doc.querySelector('.product-grid');
          if (grid) {
            el.innerHTML = '';
            el.appendChild(grid);
          } else {
            el.innerHTML = '';
          }
        })
        .catch(function () {});
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Collection filters / sort / view toggle                                */
  /* ---------------------------------------------------------------------- */
  function initCollectionFilters() {
    var panel = qs('[data-filters-panel]');
    var toggle = qs('[data-filter-toggle]');
    if (panel && toggle) {
      toggle.addEventListener('click', function () {
        var isOpen = panel.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
      on(panel, 'click', '[data-filter-close]', function () {
        panel.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    }

    var sortSelect = qs('[data-sort-select]');
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        var url = new URL(window.location.href);
        url.searchParams.set('sort_by', sortSelect.value);
        window.location.href = url.toString();
      });
    }

    var grid = qs('[data-collection-grid]');
    var gridBtn = qs('[data-grid-view]');
    var listBtn = qs('[data-list-view]');
    if (grid && gridBtn && listBtn) {
      gridBtn.addEventListener('click', function () {
        grid.classList.remove('product-grid--list');
        gridBtn.classList.add('is-active');
        listBtn.classList.remove('is-active');
      });
      listBtn.addEventListener('click', function () {
        grid.classList.add('product-grid--list');
        listBtn.classList.add('is-active');
        gridBtn.classList.remove('is-active');
      });
    }
  }
})();
