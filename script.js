/* ==========================================================================
   YESKA TOURS · script.js  (sin librerías externas: todo es JavaScript nativo)
   Módulos: configuración · utilidades · cargador · WhatsApp · menú/encabezado ·
   horario · hero (globo 3D, partículas, boarding pass) · revelado · scroll
   scrubbing (manifiesto, imagen que se abre, boletos, pasos, galería) ·
   tilt 3D · contadores · carrusel de opiniones · galería/visor · FAQ · formulario
   Si algo falla, la página sigue mostrándose completa (ver "red de seguridad").
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');

  // Red de seguridad: si el script no termina de arrancar, se muestra todo el contenido sin animaciones.
  setTimeout(() => { if (!window.__yeskaReady) root.classList.remove('js'); }, 4000);

  /* ---------- CONFIGURACIÓN ---------- */
  // Número de WhatsApp en formato internacional (52 + 10 dígitos). Es el ÚNICO lugar donde vive.
  // Si se deja vacío (''), el botón flotante y el envío del formulario se ocultan con elegancia.
  const WHATSAPP_NUMBER = '527721336096';
  const NEGOCIO = 'Yeska Tours';
  const HORARIO = { dias: [1, 2, 3, 4, 5, 6], abre: 9, cierra: 20 }; // lunes a sábado, 9:00–20:00
  const ZONA_HORARIA = 'America/Mexico_City';
  const DESTINOS_PASE = ['Huasteca Potosina', 'Caribe Mexicano', 'Mazatlán y Nayarit', 'Colombia', 'Perú', 'Europa clásica'];

  /* ---------- UTILIDADES ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const safe = (fn) => { try { fn(); } catch (err) { console.warn('[yeska] módulo omitido:', fn.name, err); } };
  const waUrl = (msg) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  const hexA = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };

  let vw = window.innerWidth;
  let vh = window.innerHeight;
  const ticks = [];      // funciones que corren en cada frame de scroll
  const resizers = [];   // funciones que corren al cambiar el tamaño
  const pointer = { x: -999, y: -999 };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = window.scrollY;
      for (const t of ticks) { try { t(y); } catch (e) { /* un módulo no debe romper a los demás */ } }
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      for (const r of resizers) { try { r(); } catch (e) { /* ignorar */ } }
      onScroll();
    }, 120);
  });

  /* ---------- CARGADOR ---------- */
  function initLoader() {
    const el = $('#loader');
    const pct = $('#loaderPct');
    const bar = $('#loaderBar');
    const inicio = performance.now();
    const DURACION = reduceMotion ? 500 : 1500;
    let terminado = false;

    const terminar = () => {
      if (terminado) return;
      terminado = true;
      root.classList.add('is-ready');
      if (el) {
        el.classList.add('is-done');
        setTimeout(() => el.remove(), 800);
      }
    };
    const paso = (ahora) => {
      const t = clamp((ahora - inicio) / DURACION);
      const e = 1 - Math.pow(1 - t, 3);
      if (pct) pct.textContent = String(Math.round(e * 100));
      if (bar) bar.style.transform = `scaleX(${e})`;
      if (t < 1) requestAnimationFrame(paso); else terminar();
    };
    requestAnimationFrame(paso);
    setTimeout(terminar, 1900); // tope: el cargador nunca pasa de ~2.4 s
  }

  /* ---------- WHATSAPP ---------- */
  function initWhatsApp() {
    const enlaces = $$('[data-wa]');
    const formNota = $('#formNota');
    if (!WHATSAPP_NUMBER) {
      // Sin número: se oculta el flotante y los CTA llevan al bloque de contacto/teléfono.
      enlaces.forEach((a) => {
        if (a.classList.contains('wa-float')) { a.hidden = true; return; }
        a.setAttribute('href', '#contacto');
        a.removeAttribute('target');
      });
      const enviar = $('#btnEnviar');
      if (enviar) enviar.hidden = true;
      if (formNota) formNota.textContent = 'Llámanos al 772 133 6096 o al 771 435 9019 y con gusto te ayudamos.';
      return;
    }
    enlaces.forEach((a) => {
      const msg = a.dataset.waMsg || `Hola ${NEGOCIO} 👋 Quisiera más información.`;
      a.setAttribute('href', waUrl(msg));
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    });
    // El globito "¿Hablamos?" aparece una vez, a los pocos segundos
    const flot = $('#waFloat');
    if (flot && finePointer && !reduceMotion) {
      setTimeout(() => flot.classList.add('is-tip'), 6500);
      setTimeout(() => flot.classList.remove('is-tip'), 11000);
    }
  }

  /* ---------- MENÚ Y ENCABEZADO ---------- */
  function initHeader() {
    const header = $('.site-header');
    const barra = $('#progress');
    const enlaces = $$('.nav a[href^="#"]').filter((a) => !a.classList.contains('btn'));
    const secciones = enlaces.map((a) => $(a.getAttribute('href'))).filter(Boolean);
    const burger = $('#burger');
    const nav = $('#nav');

    const abrir = (si) => {
      nav.classList.toggle('is-open', si);
      burger.setAttribute('aria-expanded', String(si));
      burger.setAttribute('aria-label', si ? 'Cerrar menú' : 'Abrir menú');
      document.body.classList.toggle('is-locked', si);
    };
    if (burger && nav) {
      burger.addEventListener('click', () => abrir(!nav.classList.contains('is-open')));
      nav.addEventListener('click', (e) => { if (e.target.closest('a')) abrir(false); });
      window.addEventListener('keydown', (e) => { if (e.key === 'Escape') abrir(false); });
      resizers.push(() => { if (vw >= 1000) abrir(false); });
    }

    ticks.push((y) => {
      if (header) header.classList.toggle('is-solid', y > 24);
      if (barra) {
        const total = document.documentElement.scrollHeight - vh;
        barra.style.transform = `scaleX(${total > 0 ? clamp(y / total) : 0})`;
      }
      let actual = null;
      for (const s of secciones) {
        const r = s.getBoundingClientRect();
        if (r.top < vh * 0.4 && r.bottom > vh * 0.4) actual = s.id;
      }
      enlaces.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${actual}`));
    });
  }

  /* ---------- HORARIO (abierto / cerrado) ---------- */
  function initHorario() {
    const pillTxt = $('#estadoHorario');
    const estado2 = $('#estadoHorario2');
    const pill = pillTxt ? pillTxt.closest('.pill') : null;

    const ahoraEnMexico = () => {
      try {
        const partes = new Intl.DateTimeFormat('en-US', { timeZone: ZONA_HORARIA, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
        const get = (t) => (partes.find((p) => p.type === t) || {}).value;
        return {
          dia: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
          hora: parseInt(get('hour'), 10) % 24,
        };
      } catch (e) {
        const d = new Date();
        return { dia: d.getDay(), hora: d.getHours() };
      }
    };
    const pintar = () => {
      const { dia, hora } = ahoraEnMexico();
      const abierto = HORARIO.dias.includes(dia) && hora >= HORARIO.abre && hora < HORARIO.cierra;
      if (pillTxt) pillTxt.textContent = abierto ? 'Abierto ahora · Agencia de viajes en Progreso, Hgo.' : 'Agencia de viajes · Progreso, Hidalgo';
      if (pill) pill.classList.toggle('is-closed', !abierto);
      if (estado2) {
        estado2.textContent = abierto ? 'Abierto ahora: atendemos hasta las 8:00 pm.' : 'Ahora estamos fuera de horario: escríbenos y te leemos en cuanto abramos.';
        estado2.classList.toggle('is-open', abierto);
      }
    };
    pintar();
    setInterval(pintar, 60000);
  }

  /* ---------- HERO: GLOBO 3D (canvas) ---------- */
  function initGlobe() {
    const cv = $('#globe');
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const rad = (d) => (d * Math.PI) / 180;
    const vec = (lat, lon) => {
      const f = rad(lat), l = rad(lon);
      return [Math.cos(f) * Math.sin(l), Math.sin(f), Math.cos(f) * Math.cos(l)];
    };
    const HOME = { n: 'Progreso', ll: [20.25, -99.19], c: '#E5252A' };
    const CIUDADES = [
      { n: 'Cancún', ll: [21.16, -86.85], c: '#1D6FD8' },
      { n: 'Mazatlán', ll: [23.22, -106.42], c: '#4BB543' },
      { n: 'Colombia', ll: [6.25, -75.57], c: '#F7C600' },
      { n: 'Perú', ll: [-13.53, -71.97], c: '#E5252A' },
      { n: 'Europa', ll: [41.9, 12.5], c: '#1D6FD8' },
    ];
    const fuente = getComputedStyle(document.body).fontFamily;
    const TILT = 0.45;
    const cT = Math.cos(TILT), sT = Math.sin(TILT);
    const BASE = rad(-HOME.ll[1]) + 0.1; // Progreso mirando al frente al empezar

    // Puntos del globo (espiral de Fibonacci)
    const N = window.innerWidth < 700 ? 520 : 880;
    const puntos = [];
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      puntos.push([Math.cos(ga * i) * r, y, Math.sin(ga * i) * r]);
    }

    // Retícula (meridianos y paralelos)
    const reticula = [];
    for (let lon = -180; lon < 180; lon += 30) {
      const l = [];
      for (let lat = -90; lat <= 90; lat += 6) l.push(vec(lat, lon));
      reticula.push(l);
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const l = [];
      for (let lon = -180; lon <= 180; lon += 6) l.push(vec(lat, lon));
      reticula.push(l);
    }

    // Rutas (círculo máximo elevado)
    const K = 72;
    const a = vec(HOME.ll[0], HOME.ll[1]);
    const rutas = CIUDADES.map((c) => {
      const b = vec(c.ll[0], c.ll[1]);
      const dot = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1);
      const ang = Math.acos(dot);
      const pts = [];
      for (let i = 0; i <= K; i++) {
        const t = i / K;
        const s1 = Math.sin((1 - t) * ang) / Math.sin(ang);
        const s2 = Math.sin(t * ang) / Math.sin(ang);
        const lift = 1 + Math.sin(Math.PI * t) * (0.08 + ang * 0.1);
        pts.push([(a[0] * s1 + b[0] * s2) * lift, (a[1] * s1 + b[1] * s2) * lift, (a[2] * s1 + b[2] * s2) * lift]);
      }
      return { ...c, v: b, pts };
    });
    const vHome = vec(HOME.ll[0], HOME.ll[1]);

    let w = 0, h = 0, R = 0, cx = 0, cy = 0;
    const resize = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(w, h) * 0.38;
      cx = w / 2; cy = h / 2;
    };

    const rot = (v, cr, sr) => {
      const x = v[0] * cr + v[2] * sr;
      const z = -v[0] * sr + v[2] * cr;
      return [x, v[1] * cT - z * sT, v[1] * sT + z * cT];
    };

    const nodo = (v, color, etiqueta, casa, cr, sr, t) => {
      const [x, y, z] = rot(v, cr, sr);
      if (z <= 0.03) return;
      const X = cx + x * R, Y = cy - y * R, op = clamp(z * 1.8);
      const fase = ((((t * 0.0008) + v[0] * 3) % 1) + 1) % 1; // siempre entre 0 y 1 (un radio negativo lanzaría error)
      ctx.globalAlpha = op * (1 - fase) * 0.8;
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X, Y, 4 + fase * (casa ? 22 : 15), 0, 6.2832); ctx.stroke();
      ctx.globalAlpha = op;
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(X, Y, casa ? 6.5 : 4.6, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X, Y, casa ? 2.6 : 1.8, 0, 6.2832); ctx.fill();
      ctx.font = `${casa ? 800 : 700} ${Math.max(10, R * (casa ? 0.062 : 0.052))}px ${fuente}`;
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.strokeText(etiqueta, X + 10, Y - 9);
      ctx.fillStyle = '#0E1630'; ctx.fillText(etiqueta, X + 10, Y - 9);
      ctx.globalAlpha = 1;
    };

    const dibujar = (t) => {
      ctx.clearRect(0, 0, w, h);
      const ang = BASE + t * 0.00016;
      const cr = Math.cos(ang), sr = Math.sin(ang);

      // Atmósfera y esfera
      let g = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.4);
      g.addColorStop(0, 'rgba(29,111,216,.24)'); g.addColorStop(1, 'rgba(29,111,216,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.4, 0, 6.2832); ctx.fill();
      g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.08, cx, cy, R);
      g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#E3ECFA');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(14,22,48,.14)'; ctx.stroke();

      // Retícula
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(29,111,216,.16)';
      for (const linea of reticula) {
        ctx.beginPath();
        let pluma = false;
        for (const p of linea) {
          const [x, y, z] = rot(p, cr, sr);
          if (z < 0) { pluma = false; continue; }
          if (!pluma) { ctx.moveTo(cx + x * R, cy - y * R); pluma = true; } else ctx.lineTo(cx + x * R, cy - y * R);
        }
        ctx.stroke();
      }

      // Puntos
      ctx.fillStyle = '#14468F';
      for (const p of puntos) {
        const [x, y, z] = rot(p, cr, sr);
        if (z < -0.02) continue;
        ctx.globalAlpha = 0.1 + 0.62 * Math.pow(Math.max(z, 0), 0.8);
        const s = 0.9 + 1.5 * Math.max(z, 0);
        ctx.fillRect(cx + x * R - s / 2, cy - y * R - s / 2, s, s);
      }
      ctx.globalAlpha = 1;

      // Rutas y "cometas"
      rutas.forEach((rt, i) => {
        const proy = rt.pts.map((p) => {
          const [x, y, z] = rot(p, cr, sr);
          return { X: cx + x * R, Y: cy - y * R, vis: z > 0 || x * x + y * y > 1 };
        });
        ctx.lineWidth = 1.5; ctx.strokeStyle = hexA(rt.c, 0.34); ctx.lineCap = 'round';
        ctx.beginPath();
        let pluma = false;
        proy.forEach((p) => {
          if (!p.vis) { pluma = false; return; }
          if (!pluma) { ctx.moveTo(p.X, p.Y); pluma = true; } else ctx.lineTo(p.X, p.Y);
        });
        ctx.stroke();

        const cabeza = ((t * 0.00021) + i * 0.2) % 1;
        const i1 = Math.floor(cabeza * K), i0 = Math.max(0, i1 - 14);
        ctx.lineWidth = 3.2; ctx.strokeStyle = rt.c;
        ctx.beginPath();
        pluma = false;
        for (let k = i0; k <= i1; k++) {
          const p = proy[k];
          if (!p.vis) { pluma = false; continue; }
          if (!pluma) { ctx.moveTo(p.X, p.Y); pluma = true; } else ctx.lineTo(p.X, p.Y);
        }
        ctx.stroke();
        const ph = proy[i1];
        if (ph && ph.vis) {
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ph.X, ph.Y, 4.6, 0, 6.2832); ctx.fill();
          ctx.fillStyle = rt.c; ctx.beginPath(); ctx.arc(ph.X, ph.Y, 2.8, 0, 6.2832); ctx.fill();
        }
      });

      // Ciudades
      rutas.forEach((rt) => nodo(rt.v, rt.c, rt.n, false, cr, sr, t));
      nodo(vHome, HOME.c, HOME.n, true, cr, sr, t);
    };

    let visible = true, raf = 0, activo = false;
    const bucle = (t) => {
      if (!activo) return;
      dibujar(t);
      raf = requestAnimationFrame(bucle);
    };
    const encender = () => { if (!activo && visible && !document.hidden && !reduceMotion) { activo = true; raf = requestAnimationFrame(bucle); } };
    const apagar = () => { activo = false; cancelAnimationFrame(raf); };

    resize();
    resizers.push(() => { resize(); if (!activo) dibujar(0); });
    dibujar(0);
    if (reduceMotion) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; visible ? encender() : apagar(); }, { threshold: 0 }).observe(cv);
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? apagar() : encender()));
    encender();
  }

  /* ---------- HERO: PARTÍCULAS (confeti de los colores del logo) ---------- */
  function initParticles() {
    const cv = $('#heroFx');
    if (!cv || reduceMotion || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    const colores = ['#E5252A', '#F7C600', '#4BB543', '#1D6FD8', '#0E1630'];
    let w = 0, h = 0, parts = [], activo = false, raf = 0, visible = true;

    const crear = () => ({
      x: Math.random() * w, y: Math.random() * h, s: 2 + Math.random() * 5, vy: 0.14 + Math.random() * 0.42,
      f: Math.random() * 6.28, vf: 0.008 + Math.random() * 0.018, amp: 8 + Math.random() * 24,
      c: colores[(Math.random() * colores.length) | 0], tipo: (Math.random() * 3) | 0,
      r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.04, a: 0.3 + Math.random() * 0.45, ox: 0, oy: 0,
    });
    const resize = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts = Array.from({ length: Math.round(clamp(w / 28, 14, 44)) }, crear);
    };
    const estrella = (x, y, s) => {
      ctx.beginPath();
      ctx.moveTo(x, y - s * 1.6); ctx.quadraticCurveTo(x, y, x + s * 1.6, y);
      ctx.quadraticCurveTo(x, y, x, y + s * 1.6); ctx.quadraticCurveTo(x, y, x - s * 1.6, y);
      ctx.quadraticCurveTo(x, y, x, y - s * 1.6); ctx.fill();
    };
    const dibujar = () => {
      ctx.clearRect(0, 0, w, h);
      const rect = cv.getBoundingClientRect();
      const px = pointer.x - rect.left, py = pointer.y - rect.top;
      for (const p of parts) {
        p.y -= p.vy; p.f += p.vf; p.r += p.vr;
        if (p.y < -24) { p.y = h + 24; p.x = Math.random() * w; }
        let x = p.x + Math.sin(p.f) * p.amp, y = p.y;
        const dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;
        if (d2 < 9000) { const f = (1 - d2 / 9000) * 26; const d = Math.sqrt(d2) || 1; p.ox += (dx / d) * f * 0.1; p.oy += (dy / d) * f * 0.1; }
        p.ox *= 0.92; p.oy *= 0.92;
        x += p.ox; y += p.oy;
        ctx.globalAlpha = p.a; ctx.fillStyle = p.c;
        if (p.tipo === 0) { ctx.beginPath(); ctx.arc(x, y, p.s * 0.8, 0, 6.2832); ctx.fill(); }
        else if (p.tipo === 1) estrella(x, y, p.s);
        else { ctx.save(); ctx.translate(x, y); ctx.rotate(p.r); ctx.fillRect(-p.s * 1.6, -1.3, p.s * 3.2, 2.6); ctx.restore(); }
      }
      ctx.globalAlpha = 1;
    };
    const bucle = () => { if (!activo) return; dibujar(); raf = requestAnimationFrame(bucle); };
    const encender = () => { if (!activo && visible && !document.hidden) { activo = true; raf = requestAnimationFrame(bucle); } };
    const apagar = () => { activo = false; cancelAnimationFrame(raf); };

    resize();
    resizers.push(resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; visible ? encender() : apagar(); }).observe(cv);
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? apagar() : encender()));
    encender();
  }

  /* ---------- HERO: puntero (parallax) y destino del pase de abordar ---------- */
  function initPointer() {
    const escenario = $('.hero__stage');
    const foco = $('#spotlight');
    if (!finePointer) return;
    let raf = 0;
    window.addEventListener('pointermove', (e) => {
      pointer.x = e.clientX; pointer.y = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (foco) { foco.style.setProperty('--sx', `${pointer.x}px`); foco.style.setProperty('--sy', `${pointer.y}px`); }
        if (escenario && !reduceMotion) {
          const r = escenario.getBoundingClientRect();
          if (r.bottom > 0 && r.top < vh) {
            escenario.style.setProperty('--mx', clamp((pointer.x / vw - 0.5) * 2, -1, 1).toFixed(3));
            escenario.style.setProperty('--my', clamp((pointer.y / vh - 0.5) * 2, -1, 1).toFixed(3));
          }
        }
      });
    }, { passive: true });
  }

  function initPase() {
    const el = $('#passDestino');
    if (!el || reduceMotion) return;
    let i = 0;
    setInterval(() => {
      if (document.hidden) return;
      el.classList.add('is-swap');
      setTimeout(() => { i = (i + 1) % DESTINOS_PASE.length; el.textContent = DESTINOS_PASE[i]; el.classList.remove('is-swap'); }, 360);
    }, 2800);
  }

  /* ---------- REVELADO AL HACER SCROLL ---------- */
  function initReveal() {
    // Listas con escalonado automático
    $$('[data-stagger]').forEach((lista) => {
      Array.from(lista.children).forEach((hijo, i) => {
        if (!hijo.hasAttribute('data-reveal')) hijo.setAttribute('data-reveal', '');
        hijo.style.setProperty('--d', String(i));
      });
    });
    const els = $$('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    els.forEach((e) => io.observe(e));
  }

  /* ---------- MANIFIESTO: las palabras se encienden con el scroll ---------- */
  function initManifiesto() {
    const h = $('[data-words]');
    if (!h) return;
    const palabras = [];
    const envolver = (nodo) => {
      Array.from(nodo.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((trozo) => {
            if (!trozo) return;
            if (/^\s+$/.test(trozo)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            s.className = 'word';
            s.textContent = trozo;
            frag.appendChild(s);
            palabras.push(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) envolver(n);
      });
    };
    envolver(h);
    if (reduceMotion) { palabras.forEach((p) => p.classList.add('is-lit')); return; }
    ticks.push(() => {
      const r = h.getBoundingClientRect();
      const p = clamp((vh * 0.84 - r.top) / (vh * 0.84 - vh * 0.34 + r.height));
      const n = Math.round(p * palabras.length);
      palabras.forEach((w, i) => w.classList.toggle('is-lit', i < n));
    });
  }

  /* ---------- IMAGEN QUE SE ABRE A PANTALLA COMPLETA ---------- */
  function initExpand() {
    const sec = $('.expand');
    const marco = $('#expandFrame');
    const pegajoso = $('.expand__sticky');
    if (!sec || !marco) return;
    if (reduceMotion) { marco.style.setProperty('--p', '1'); return; }
    ticks.push(() => {
      const r = sec.getBoundingClientRect();
      const total = r.height - vh;
      const p = total > 0 ? smooth(clamp(-r.top / (total * 0.82))) : 1;
      marco.style.setProperty('--p', p.toFixed(4));
      if (pegajoso) pegajoso.style.setProperty('--pe', clamp(-r.top / (total * 0.82)).toFixed(4));
    });
  }

  /* ---------- BOLETOS: scroll horizontal fijado (escritorio) ---------- */
  function initBoletos() {
    const sec = $('.tickets');
    const pista = $('#ticketsTrack');
    const visor = $('.tickets__viewport');
    const medidor = $('#ticketsBar');
    if (!sec || !pista || !visor) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    let activo = false, max = 0;

    const medir = () => {
      activo = mq.matches && !reduceMotion;
      if (!activo) {
        sec.classList.remove('is-pinned');
        sec.style.height = '';
        pista.style.transform = '';
        return;
      }
      sec.classList.add('is-pinned');
      const pad = parseFloat(getComputedStyle(visor).paddingLeft) || 0;
      max = Math.max(0, pista.scrollWidth - visor.clientWidth + pad * 2);
      sec.style.height = `${Math.round(max + vh * 1.2)}px`;
    };
    const mover = () => {
      if (!activo) return;
      const r = sec.getBoundingClientRect();
      const total = r.height - vh;
      const p = total > 0 ? clamp(-r.top / total) : 0;
      pista.style.transform = `translate3d(${(-max * p).toFixed(1)}px,0,0)`;
      if (medidor) medidor.style.transform = `scaleX(${p.toFixed(4)})`;
    };
    resizers.push(() => { medir(); mover(); });
    ticks.push(mover);
    if (mq.addEventListener) mq.addEventListener('change', () => { medir(); mover(); });
    medir();
    mover();
    window.addEventListener('load', () => { medir(); mover(); });
  }

  /* ---------- LÍNEA DE TIEMPO (pasos) ---------- */
  function initPasos() {
    const tl = $('#timeline');
    if (!tl) return;
    const pasos = $$('[data-step]', tl);
    ticks.push(() => {
      const r = tl.getBoundingClientRect();
      const p = clamp((vh * 0.62 - r.top) / r.height);
      tl.style.setProperty('--p', p.toFixed(4));
      pasos.forEach((s) => s.classList.toggle('is-active', s.getBoundingClientRect().top < vh * 0.68));
    });
    if (reduceMotion) pasos.forEach((s) => s.classList.add('is-active'));
  }

  /* ---------- GALERÍA: columnas con parallax + visor ---------- */
  function initGaleria() {
    const caja = $('.gallery__cols');
    const cols = $$('.gallery__col');
    if (caja && cols.length && !reduceMotion) {
      let activa = false;
      const medir = () => { activa = getComputedStyle(cols[0]).display !== 'contents'; if (!activa) cols.forEach((c) => { c.style.transform = ''; }); };
      resizers.push(medir);
      medir();
      ticks.push(() => {
        if (!activa) return;
        const r = caja.getBoundingClientRect();
        const d = clamp(r.top + r.height / 2 - vh / 2, -1300, 1300);
        cols.forEach((c) => {
          const v = parseFloat(c.dataset.speed) || 0;
          c.style.transform = `translate3d(0, ${(d * v / 230).toFixed(1)}px, 0)`;
        });
      });
    }

    // Visor de fotos
    const lb = $('#lightbox');
    const img = $('#lbImg');
    const cap = $('#lbCap');
    const fotos = $$('.shot');
    if (!lb || !img || !fotos.length) return;
    let idx = 0, previo = null;
    const mostrar = (i) => {
      idx = (i + fotos.length) % fotos.length;
      const im = $('img', fotos[idx]);
      img.src = im.currentSrc || im.src;
      img.alt = im.alt;
      cap.textContent = im.alt;
    };
    const abrir = (i) => {
      previo = document.activeElement;
      mostrar(i);
      lb.hidden = false;
      requestAnimationFrame(() => lb.classList.add('is-open'));
      document.body.classList.add('is-locked');
      $('#lbClose').focus();
    };
    const cerrar = () => {
      lb.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      setTimeout(() => { lb.hidden = true; }, 360);
      if (previo && previo.focus) previo.focus();
    };
    fotos.forEach((f, i) => f.addEventListener('click', () => abrir(i)));
    $('#lbClose').addEventListener('click', cerrar);
    $('#lbPrev').addEventListener('click', () => mostrar(idx - 1));
    $('#lbNext').addEventListener('click', () => mostrar(idx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) cerrar(); });
    window.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') cerrar();
      else if (e.key === 'ArrowLeft') mostrar(idx - 1);
      else if (e.key === 'ArrowRight') mostrar(idx + 1);
      else if (e.key === 'Tab') {
        const foco = [$('#lbClose'), $('#lbPrev'), $('#lbNext')];
        const i = foco.indexOf(document.activeElement);
        e.preventDefault();
        foco[(i + (e.shiftKey ? foco.length - 1 : 1)) % foco.length].focus();
      }
    });
    let x0 = 0;
    lb.addEventListener('touchstart', (e) => { x0 = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) mostrar(idx + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  /* ---------- TILT 3D y botones magnéticos ---------- */
  function initTilt() {
    if (!finePointer || reduceMotion) return;
    $$('.tilt').forEach((el) => {
      let raf = 0;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.setProperty('--ry', `${(x * 9).toFixed(2)}deg`);
          el.style.setProperty('--rx', `${(-y * 9).toFixed(2)}deg`);
        });
      });
      el.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.translate = `${((e.clientX - (r.left + r.width / 2)) * 0.22).toFixed(1)}px ${((e.clientY - (r.top + r.height / 2)) * 0.3).toFixed(1)}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = ''; });
    });
  }

  /* ---------- CONTADORES ---------- */
  function initContadores() {
    const els = $$('[data-count]');
    if (!els.length || reduceMotion || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const el = en.target;
        const meta = parseInt(el.dataset.count, 10) || 0;
        // Si el cargador sigue visible, el conteo espera a que termine para que se vea la animación
        const espera = root.classList.contains('is-ready') ? 0 : 1800;
        setTimeout(() => {
          el.textContent = '0';
          const t0 = performance.now();
          const paso = (t) => {
            const k = clamp((t - t0) / 1700);
            el.textContent = String(Math.round(meta * (1 - Math.pow(1 - k, 3))));
            if (k < 1) requestAnimationFrame(paso); else el.textContent = String(meta);
          };
          requestAnimationFrame(paso);
        }, espera);
      });
    }, { threshold: 0.5 });
    els.forEach((e) => io.observe(e));
  }

  /* ---------- OPINIONES: carrusel infinito ---------- */
  function initOpiniones() {
    const pistas = $$('.reviews__track');
    if (!pistas.length || reduceMotion) return;
    const armar = () => {
      pistas.forEach((pista) => {
        $$('[data-clon]', pista).forEach((c) => c.remove());
        const originales = Array.from(pista.children);
        const gap = parseFloat(getComputedStyle(pista).columnGap) || 16;
        const ancho = pista.scrollWidth + gap;
        const copias = Math.max(1, Math.ceil(vw / ancho));
        for (let i = 0; i < copias; i++) {
          originales.forEach((o) => {
            const c = o.cloneNode(true);
            c.setAttribute('aria-hidden', 'true');
            c.setAttribute('data-clon', '');
            pista.appendChild(c);
          });
        }
        pista.style.setProperty('--shift', `-${ancho}px`);
        pista.style.setProperty('--dur', `${Math.round(ancho / 42)}s`);
      });
    };
    armar();
    resizers.push(armar);
  }

  /* ---------- FAQ ---------- */
  function initFaq() {
    const items = $$('.qa');
    items.forEach((qa) => {
      const b = $('.qa__q', qa);
      b.addEventListener('click', () => {
        const abrir = !qa.classList.contains('is-open');
        items.forEach((o) => {
          if (o !== qa) { o.classList.remove('is-open'); $('.qa__q', o).setAttribute('aria-expanded', 'false'); }
        });
        qa.classList.toggle('is-open', abrir);
        b.setAttribute('aria-expanded', String(abrir));
      });
    });
    if (items[0]) { items[0].classList.add('is-open'); $('.qa__q', items[0]).setAttribute('aria-expanded', 'true'); }
  }

  /* ---------- FORMULARIO → WHATSAPP ---------- */
  function initFormulario() {
    const form = $('#formContacto');
    if (!form) return;
    const seg = $('.seg', form);
    const paneles = $$('.panel', form);
    const nota = $('#formNota');
    const campoNombre = $('#fNombre');
    const err = $('#errNombre');

    const pestana = (tipo) => {
      seg.dataset.tab = tipo;
      paneles.forEach((p) => { p.hidden = p.dataset.panel !== tipo; });
      const radio = $(`input[name="tipo"][value="${tipo}"]`, form);
      if (radio) radio.checked = true;
    };
    form.addEventListener('change', (e) => { if (e.target.name === 'tipo') pestana(e.target.value); });
    $$('[data-prefill]').forEach((a) => a.addEventListener('click', () => {
      pestana(a.dataset.prefill);
      if (a.dataset.unit) { const s = $('#fUnidad'); if (s) s.value = a.dataset.unit; }
    }));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = campoNombre.value.trim();
      const campo = campoNombre.closest('.field');
      if (nombre.length < 2) {
        campo.classList.add('has-error');
        err.textContent = 'Cuéntanos tu nombre para saber cómo llamarte 🙂';
        campoNombre.focus();
        return;
      }
      campo.classList.remove('has-error');
      err.textContent = '';
      if (!WHATSAPP_NUMBER) return;

      const v = (n) => ((form.elements[n] && form.elements[n].value) || '').trim();
      const tipo = form.elements.tipo.value;
      const L = [`Hola ${NEGOCIO} 👋`, `Soy ${nombre}.`];
      if (tipo === 'transporte') {
        L.push('Quiero cotizar la renta de transporte.');
        L.push(`Unidad: ${v('unidad')}.`);
        if (v('origen')) L.push(`Origen: ${v('origen')}.`);
        if (v('destinoT')) L.push(`Destino: ${v('destinoT')}.`);
        if (v('fechaT')) L.push(`Fecha del servicio: ${v('fechaT')}.`);
        if (v('pasajeros')) L.push(`Pasajeros: ${v('pasajeros')}.`);
      } else {
        L.push(`Quiero cotizar un viaje: ${v('destino')}.`);
        if (v('personas')) L.push(`Personas: ${v('personas')}.`);
        if (v('fecha')) L.push(`Fecha aproximada: ${v('fecha')}.`);
      }
      if (v('mensaje')) L.push(`Comentarios: ${v('mensaje')}`);
      L.push('¡Gracias!');

      const url = waUrl(L.join('\n'));
      const ventana = window.open(url, '_blank', 'noopener');
      if (!ventana) window.location.href = url;
      if (nota) nota.textContent = '¡Listo! Abrimos WhatsApp con tu mensaje. Solo falta que le des enviar.';
    });
    campoNombre.addEventListener('input', () => {
      if (campoNombre.value.trim().length >= 2) { campoNombre.closest('.field').classList.remove('has-error'); err.textContent = ''; }
    });
  }

  /* ---------- ARRANQUE ---------- */
  [initLoader, initWhatsApp, initHeader, initHorario, initPointer, initPase, initReveal, initManifiesto,
    initExpand, initBoletos, initPasos, initGaleria, initTilt, initContadores, initOpiniones, initFaq,
    initFormulario, initGlobe, initParticles].forEach(safe);

  onScroll();
  window.addEventListener('load', onScroll);
  window.__yeskaReady = true;
})();
