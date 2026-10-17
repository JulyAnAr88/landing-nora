/* ==========================================================================
   UP Estudio Creativo — Landing de planes
   Interacciones: nav, menú, secciones solapadas, strip, reveals
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     Configuración
     ------------------------------------------------------------------------ */
  // Número de WhatsApp Business, con código de país y sin '+', espacios ni guiones.
  // Ejemplo Argentina: 5491122334455
  var WSP_PHONE = '5493424383439';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------------
     Links de WhatsApp
     ------------------------------------------------------------------------ */
  function wspLink(msg) {
    return 'https://wa.me/' + WSP_PHONE + '?text=' + encodeURIComponent(msg);
  }
  if (WSP_PHONE !== 'PEGAR_NUMERO_ACA') {
    $$('[data-wsp-msg]').forEach(function (el) {
      el.href = wspLink(el.getAttribute('data-wsp-msg'));
    });
  }

  /* ------------------------------------------------------------------------
     Nav: se oculta al bajar, vuelve al subir.
     La hamburguesa flotante mantiene el menú siempre accesible.
     ------------------------------------------------------------------------ */
  var header = $('#siteHeader');
  var burger = $('#burger');
  var navFab = $('#navFab');
  var menu = $('#menu');
  var progress = $('#progress');

  var navHidden = false;
  var menuOpen = false;
  var menuOpener = null;
  var lastY = window.scrollY || 0;

  function setNav(hidden) {
    if (hidden === navHidden) return;
    navHidden = hidden;
    header.classList.toggle('is-hidden', hidden);
    document.body.classList.toggle('nav-hidden', hidden);
  }

  function setMenu(open, opener, restoreFocus) {
    if (open === menuOpen) return;
    menuOpen = open;

    if (open) {
      menuOpener = opener || burger;
      setNav(false);
    }

    document.body.classList.toggle('menu-open', open);
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    $$('[aria-controls="menu"]').forEach(function (b) {
      b.setAttribute('aria-expanded', String(open));
    });
    document.documentElement.style.overflow = open ? 'hidden' : '';

    if (open) {
      var first = $('a', menu);
      if (first) first.focus({ preventScroll: true });
    } else if (restoreFocus !== false && menuOpener) {
      menuOpener.focus({ preventScroll: true });
      menuOpener = null;
    }
  }

  if (burger) burger.addEventListener('click', function () { setMenu(!menuOpen, burger); });
  if (navFab) navFab.addEventListener('click', function () { setMenu(!menuOpen, navFab); });

  $$('#menu a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false, null, false); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuOpen) setMenu(false, null, true);
  });

  // Al navegar por anclas, la nav vuelve a mostrarse
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (a && navHidden) setNav(false);
  });

  /* ------------------------------------------------------------------------
     Progreso de lectura
     ------------------------------------------------------------------------ */
  function updateProgress() {
    if (!progress) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, (window.scrollY || 0) / max)) : 0;
    progress.style.transform = 'scaleX(' + p.toFixed(4) + ')';
  }

  /* ------------------------------------------------------------------------
     Secciones solapadas: la sección saliente queda "congelada" mientras la
     siguiente se desliza por encima (efecto cortina, no scroll estático).
     ------------------------------------------------------------------------ */
  var panels = $$('.panel');
  var panelTops = [];

  // Curtina con suavizado temporal: la sección saliente "persigue" su
  // posición objetivo con una relajación exponencial (~1.2s en asentarse),
  // así el bloque de arriba tarda visiblemente más en subir aunque el
  // scroll sea rápido.
  var CURTAIN_TAU = 300; // constante de tiempo en ms (~4·τ ≈ 1.2s de asentado)
  var panelTargets = [];
  var panelCur = [];
  var curtainRunning = false;
  var curtainLast = 0;

  function measurePanels() {
    if (!panels.length) return;
    // Medimos sin transforms para obtener la posición natural de cada panel
    panels.forEach(function (p, i) {
      p.style.transform = '';
      panelCur[i] = 0;
    });
    var y = window.scrollY || 0;
    panelTops = panels.map(function (p) {
      return p.getBoundingClientRect().top + y;
    });
    updatePanels();
  }

  function curtainFrame(now) {
    var dt = curtainLast ? Math.min(100, now - curtainLast) : 16.7;
    curtainLast = now;

    // Factor de relajación normalizado por fps (frame-rate independiente)
    var f = 1 - Math.exp(-dt / CURTAIN_TAU);

    var active = false;
    for (var i = 0; i < panels.length - 1; i++) {
      var target = panelTargets[i] || 0;
      var cur = panelCur[i] || 0;

      if (Math.abs(target - cur) < 0.3) {
        cur = target; // asentado; el transform queda fijo hasta que cambie
      } else {
        cur += (target - cur) * f;
        active = true;
      }
      panelCur[i] = cur;
      panels[i].style.transform = cur > 0.4 ? 'translate3d(0,' + cur.toFixed(1) + 'px,0)' : '';
    }

    if (active) {
      requestAnimationFrame(curtainFrame);
    } else {
      // Todo asentado: cortamos el loop; updatePanels() lo reencoleta al próximo scroll
      curtainRunning = false;
      curtainLast = 0;
    }
  }

  function updatePanels() {
    if (!panels.length) return;
    if (reduceMotion.matches) {
      panels.forEach(function (p) { p.style.transform = ''; });
      panelTargets = [];
      panelCur = [];
      return;
    }
    var vh = window.innerHeight;
    var nav = header ? header.offsetHeight : 64;
    var y = window.scrollY || 0;

    for (var i = 0; i < panels.length - 1; i++) {
      var nextTop = panelTops[i + 1] - y;
      // Ventana: mientras la siguiente entra por abajo y aún no llegó a la nav
      panelTargets[i] = (nextTop > nav && nextTop < vh) ? vh - nextTop : 0;
    }

    if (!curtainRunning) {
      curtainRunning = true;
      curtainLast = 0;
      requestAnimationFrame(curtainFrame);
    }
  }

  /* ------------------------------------------------------------------------
     Strip: duplica el contenido hasta cubrir el ancho de la ventana
     (evita espacios en blanco en resoluciones grandes)
     ------------------------------------------------------------------------ */
  var stripTrack = $('.strip .track');
  var stripBase = '';

  function fitStrip() {
    if (!stripTrack) return;
    var groups = $$('.group', stripTrack);
    if (groups.length < 2) return;

    if (!stripBase) stripBase = groups[0].innerHTML;

    groups.forEach(function (g) { g.innerHTML = stripBase; });

    var need = window.innerWidth;
    var guard = 0;
    while (groups[0].offsetWidth < need && guard < 60) {
      groups[0].innerHTML += stripBase;
      guard++;
    }
    groups[1].innerHTML = groups[0].innerHTML;

    // Velocidad constante sin importar el ancho del track
    var w = groups[0].offsetWidth;
    stripTrack.style.animationDuration = Math.max(16, Math.round(w / 70)) + 's';
  }

  /* ------------------------------------------------------------------------
     Reveals al hacer scroll (con stagger por grupo)
     ------------------------------------------------------------------------ */
  function show(el) {
    el.style.transitionDelay = el.getAttribute('data-delay') || '0ms';
    el.classList.add('is-visible');
    el.addEventListener('transitionend', function handler(e) {
      if (e.target !== el) return;
      el.style.transitionDelay = '';
      el.removeEventListener('transitionend', handler);
    });
  }

  function initReveals() {
    var items = $$('.reveal');
    if (!items.length) return;

    var counters = new Map();
    items.forEach(function (el) {
      var parent = el.parentElement;
      var n = counters.get(parent) || 0;
      el.setAttribute('data-delay', (n * 80) + 'ms');
      counters.set(parent, n + 1);
    });

    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      items.forEach(show);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          show(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------------
     Scroll / resize
     ------------------------------------------------------------------------ */
  var framePending = false;

  function onFrame() {
    framePending = false;
    var y = window.scrollY || 0;

    if (!menuOpen) {
      if (y <= 40) setNav(false);
      else if (y > lastY + 6) setNav(true);
      else if (y < lastY - 6) setNav(false);
    }
    lastY = y;

    updateProgress();
    updatePanels();
  }

  function schedule() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(onFrame);
  }

  window.addEventListener('scroll', schedule, { passive: true });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      measurePanels();
      fitStrip();
      schedule();
    }, 150);
    // El viewport puede cambiar (barra de direcciones) sin resize real
    schedule();
  });

  /* ------------------------------------------------------------------------
     Init
     ------------------------------------------------------------------------ */
  function init() {
    measurePanels();
    fitStrip();
    initReveals();
    schedule();
  }

  init();
  window.addEventListener('load', function () {
    measurePanels();
    fitStrip();
    schedule();
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      measurePanels();
      fitStrip();
      schedule();
    });
  }

})();
