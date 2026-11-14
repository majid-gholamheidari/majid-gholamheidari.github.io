/* Majid Heidari — portfolio interactions (vanilla JS, no dependencies) */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  // ?print renders everything statically (used for the PDF export)
  const printMode = /[?&]print/.test(location.search);
  if (printMode) document.documentElement.classList.add('pdf');
  const reduced = printMode ||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // page-level translations: a page may define window.I18N before this script
  const T = Object.assign({
    words: ['web apps', 'mobile apps', 'servers & networks', 'AI systems', 'APIs & back-ends'],
    copied: 'Email copied to clipboard', soon: 'Link coming soon', empty: 'No matching commands',
    section: 'section', action: 'action', link: 'link',
    home: 'Home', craft: 'Craft — what I do', ai: 'AI engineering', work: 'Selected work',
    experience: 'Experience', process: 'Process', contact: 'Contact',
    copyEmail: 'Copy email address', sendEmail: 'Send an email', theme: 'Toggle light / dark theme',
  }, window.I18N || {});
  const rtl = document.documentElement.dir === 'rtl';

  $('#year').textContent = new Date().getFullYear();

  /* ---------- toast ---------- */
  const toastEl = $('#toast');
  let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  };

  /* ---------- theme ---------- */
  const toggleTheme = () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
  };
  $('#themeBtn').addEventListener('click', toggleTheme);

  /* ---------- reveal on scroll ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach((el) => {
    // "up" items start clipped by their overflow-hidden line, so the observer never sees them
    if (el.dataset.reveal === 'up') setTimeout(() => el.classList.add('in'), 80);
    else revealIO.observe(el);
  });

  /* ---------- scroll: progress bar, nav hide, active link ---------- */
  const nav = $('.nav');
  const progress = $('.progress');
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    nav.classList.toggle('hide', y > lastY && y > 300);
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navLinks = $$('.nav-links a');
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => sectionIO.observe(s));

  /* ---------- custom cursor, spotlight, magnetic ---------- */
  if (fine && !reduced) {
    const cursor = $('.cursor');
    let cx = 0, cy = 0, tx = 0, ty = 0;
    addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; cursor.classList.add('on'); });
    document.addEventListener('mouseleave', () => cursor.classList.remove('on'));
    (function loop() {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener('mouseover', (e) => {
      cursor.classList.toggle('big', !!e.target.closest('a, button, .chips li, .palette-list li'));
    });

    $$('.magnetic').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  $$('.spot').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', e.clientX - r.left + 'px');
      el.style.setProperty('--my', e.clientY - r.top + 'px');
    });
  });

  /* ---------- hero rotator (scramble) ---------- */
  const rot = $('#rotator');
  const words = T.words;
  const glyphs = '!<>-_\\/[]{}=+*^?#';
  let wi = 0;
  const scramble = (to) => {
    const from = rot.textContent;
    const len = Math.max(from.length, to.length);
    let frame = 0;
    const total = 22;
    (function tick() {
      let out = '';
      for (let i = 0; i < len; i++) {
        const reveal = (i / len) * total * 0.7;
        if (frame >= reveal + 6) out += to[i] || '';
        else if (frame >= reveal) out += glyphs[(Math.random() * glyphs.length) | 0];
        else out += from[i] || '';
      }
      rot.textContent = out;
      if (frame++ < total + 6) requestAnimationFrame(tick);
      else rot.textContent = to;
    })();
  };
  if (!reduced) setInterval(() => { wi = (wi + 1) % words.length; if (rtl) rot.textContent = words[wi]; else scramble(words[wi]); }, 2600);

  /* ---------- hero network canvas ---------- */
  const canvas = $('#net');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, pts = [], mouse = { x: -9999, y: -9999 }, running = true, rgb = '198,255,61';
  const readColor = () => { rgb = getComputedStyle(root).getPropertyValue('--net').trim() || rgb; };
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(90, Math.round((W * H) / 16000));
    pts = Array.from({ length: count }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
    }));
  };
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    const LINK = 130;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 140 && d > 0) { p.x += (dx / d) * 1.2; p.y += (dy / d) * 1.2; }
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.fillStyle = `rgba(${rgb},0.55)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, 6.283); ctx.fill();
      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j], dd = Math.hypot(p.x - q.x, p.y - q.y);
        if (dd < LINK) {
          ctx.strokeStyle = `rgba(${rgb},${(1 - dd / LINK) * 0.16})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    }
    if (running && !reduced) requestAnimationFrame(draw);
  };
  readColor(); resize(); draw();
  addEventListener('resize', () => { resize(); if (reduced) draw(); });
  $('.hero').addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  $('.hero').addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  new IntersectionObserver(([e]) => {
    const was = running; running = e.isIntersecting;
    if (running && !was && !reduced) draw();
  }).observe(canvas);
  new MutationObserver(() => { readColor(); if (reduced) draw(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- AI terminal typing ---------- */
  const term = $('#terminal');
  const lines = [
    '<span class="p">$</span> majid ai --describe',
    '<span class="c"># picking the right model for the job</span>',
    '<span class="k">models   </span> Claude · GPT · Gemini · Llama · Mistral',
    '<span class="k">patterns </span> RAG · agents · tool use · MCP · evals',
    '<span class="k">stack    </span> Python · TypeScript · vector DBs · queues',
    '<span class="k">ships    </span> assistants, copilots, automations',
    '',
    '<span class="p">$</span> majid ai --status',
    '<span class="p">✔</span> ready to build yours',
  ];
  const caret = '<span class="caret"></span>';
  const typeTerminal = () => {
    if (reduced) { term.innerHTML = lines.join('\n') + '\n' + caret; return; }
    let li = 0, done = '';
    const nextLine = () => {
      if (li >= lines.length) { term.innerHTML = done + '<span class="p">$</span> ' + caret; return; }
      const html = lines[li++];
      const isCmd = html.includes('>$<');
      if (!isCmd) {
        done += html + '\n'; term.innerHTML = done + caret;
        return setTimeout(nextLine, 170);
      }
      // type commands character by character (plain text after the prompt)
      const text = html.replace(/<[^>]+>/g, '').slice(2);
      let ci = 0;
      (function typeChar() {
        term.innerHTML = done + '<span class="p">$</span> ' + text.slice(0, ci) + caret;
        if (ci++ < text.length) setTimeout(typeChar, 38);
        else { done += html + '\n'; setTimeout(nextLine, 380); }
      })();
    };
    nextLine();
  };
  const fillTerminal = () => { term.innerHTML = lines.join(String.fromCharCode(10)) + String.fromCharCode(10) + '<span class="p">$</span> ' + caret; };
  if (printMode) fillTerminal();
  else new IntersectionObserver(([e], io) => {
    if (e.isIntersecting) { typeTerminal(); io.disconnect(); }
  }, { threshold: 0.4 }).observe(term);
  addEventListener('beforeprint', fillTerminal);

  /* ---------- email copy ---------- */
  const email = $('#mailText').textContent.trim();
  const copyEmail = async () => {
    try { await navigator.clipboard.writeText(email); toast(T.copied); }
    catch (e) { toast(email); }
  };
  $('#copyMail').addEventListener('click', copyEmail);

  /* ---------- command palette ---------- */
  const palette = $('#palette');
  const pInput = $('#paletteInput');
  const pList = $('#paletteList');
  const go = (id) => () => $(id).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  const open = (sel) => () => {
    const a = $(sel);
    if (a && a.getAttribute('href') !== '#') window.open(a.href, '_blank', 'noopener');
    else toast(T.soon);
  };
  const commands = [
    { icon: '↑', label: T.home, hint: T.section, run: go('#top') },
    { icon: '◆', label: T.craft, hint: T.section, run: go('#craft') },
    { icon: '✦', label: T.ai, hint: T.section, run: go('#ai') },
    { icon: '▣', label: T.work, hint: T.section, run: go('#work') },
    { icon: '◷', label: T.experience, hint: T.section, run: go('#experience') },
    { icon: '→', label: T.process, hint: T.section, run: go('#process') },
    { icon: '@', label: T.contact, hint: T.section, run: go('#contact') },
    { icon: '⧉', label: T.copyEmail, hint: T.action, run: copyEmail },
    { icon: '✉', label: T.sendEmail, hint: T.action, run: () => { location.href = 'mailto:' + email; } },
    { icon: '◐', label: T.theme, hint: T.action, run: toggleTheme },
    ...(T.langUrl ? [{ icon: '文', label: T.lang, hint: T.link, run: () => { location.href = T.langUrl; } }] : []),
    { icon: '↗', label: 'GitHub', hint: T.link, run: open('[data-social="github"]') },
    { icon: '↗', label: 'LinkedIn', hint: T.link, run: open('[data-social="linkedin"]') },
    { icon: '↗', label: 'Telegram', hint: T.link, run: open('[data-social="telegram"]') },
    { icon: '↗', label: 'WhatsApp', hint: T.link, run: open('[data-social="whatsapp"]') },
  ];
  let shown = commands, sel = 0, lastFocus = null;

  const renderPalette = () => {
    pList.innerHTML = '';
    if (!shown.length) {
      const li = document.createElement('li');
      li.className = 'empty'; li.textContent = T.empty;
      pList.append(li); return;
    }
    shown.forEach((c, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.className = i === sel ? 'sel' : '';
      const ic = document.createElement('span'); ic.textContent = c.icon;
      const lb = document.createElement('span'); lb.textContent = c.label;
      const hint = document.createElement('small'); hint.textContent = c.hint;
      li.append(ic, lb, hint);
      li.addEventListener('click', () => runCommand(i));
      li.addEventListener('mousemove', () => { if (sel !== i) { sel = i; renderPalette(); } });
      pList.append(li);
    });
    const cur = pList.children[sel];
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  };
  const openPalette = () => {
    lastFocus = document.activeElement;
    palette.hidden = false; pInput.value = ''; shown = commands; sel = 0;
    renderPalette(); pInput.focus();
    document.body.style.overflow = 'hidden';
  };
  const closePalette = () => {
    palette.hidden = true; document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };
  const runCommand = (i) => { const c = shown[i]; if (!c) return; closePalette(); c.run(); };

  $('#paletteBtn').addEventListener('click', openPalette);
  palette.addEventListener('click', (e) => { if (e.target === palette) closePalette(); });
  pInput.addEventListener('input', () => {
    const q = pInput.value.trim().toLowerCase();
    shown = commands.filter((c) => (c.label + ' ' + c.hint).toLowerCase().includes(q));
    sel = 0; renderPalette();
  });
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault(); palette.hidden ? openPalette() : closePalette(); return;
    }
    if (palette.hidden) return;
    if (e.key === 'Escape') closePalette();
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(shown.length, 1); renderPalette(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + shown.length) % Math.max(shown.length, 1); renderPalette(); }
    else if (e.key === 'Enter') { e.preventDefault(); runCommand(sel); }
    else if (e.key === 'Tab') { e.preventDefault(); pInput.focus(); }
  });

  // placeholder social links: don't jump to top
  $$('.socials a[href="#"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); toast(T.soon); }));
})();
