'use client';

// Ports the original marketing site's vanilla JS (navbar scroll, mobile menu,
// reveal-on-scroll, parallax, cursor glow/spotlight, template tabs, step
// highlight, counters, FAQ accordion, pricing toggle, smooth scroll, magnet
// buttons, cursor sparkles) + the demo/contact page micro-interactions.
// One effect, DOM-driven — pages stay declarative and just carry the classes
// and data-* hooks. Everything is cleaned up on unmount.

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function MarketingFX() {
  // This component is mounted once in the marketing layout, which persists
  // across client-side navigation between marketing routes. Keying the effect
  // on the pathname re-runs the DOM wiring (reveal/blur-in .in classes, tabs,
  // observers, listeners) every time the page content changes — otherwise a
  // fresh page's .blur-in elements (e.g. the hero) never get .in and stay blank.
  const pathname = usePathname();

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cleanups: Array<() => void> = [];
    const on = (el: EventTarget, ev: string, fn: EventListenerOrEventListenerObject, opts?: AddEventListenerOptions) => {
      el.addEventListener(ev, fn, opts);
      cleanups.push(() => el.removeEventListener(ev, fn, opts));
    };

    // ---------- NAVBAR SCROLL ----------
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      const onScroll = () => {
        if (window.scrollY > 20) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
      };
      on(window, 'scroll', onScroll, { passive: true });
      onScroll();
    }

    // ---------- MOBILE MENU ----------
    const toggle = document.querySelector('[data-menu-toggle]');
    const menu = document.querySelector('[data-mobile-menu]');
    const closeBtn = document.querySelector('[data-menu-close]');
    if (toggle && menu) {
      on(toggle, 'click', () => menu.classList.add('open'));
      if (closeBtn) on(closeBtn, 'click', () => menu.classList.remove('open'));
      menu.querySelectorAll('a').forEach((link) => on(link, 'click', () => menu.classList.remove('open')));
    }

    // ---------- REVEAL ON SCROLL ----------
    const revealEls = document.querySelectorAll('.reveal, .blur-in');
    let io: IntersectionObserver | null = null;
    if (revealEls.length) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in');
              io!.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
      );
      revealEls.forEach((el) => io!.observe(el));
      cleanups.push(() => io && io.disconnect());
      requestAnimationFrame(() => {
        document.querySelectorAll('.hero .blur-in, .hero .reveal').forEach((el) => el.classList.add('in'));
      });
    }

    // ---------- PARALLAX (hero preview) ----------
    if (!prefersReduced) {
      const preview = document.querySelector<HTMLElement>('.hero-preview');
      if (preview) {
        let raf: number | null = null;
        const onScroll = () => {
          if (raf) return;
          raf = requestAnimationFrame(() => {
            const y = window.scrollY;
            preview.style.transform = `translateY(${y * 0.12}px) scale(${Math.max(0.9, 1 - y * 0.0003)})`;
            preview.style.opacity = String(Math.max(0, 1 - y * 0.0015));
            raf = null;
          });
        };
        on(window, 'scroll', onScroll, { passive: true });
      }
    }

    // ---------- CURSOR-FOLLOW GLOW ----------
    if (!prefersReduced) {
      const selector = [
        '.cursor-glow', '.bento-card', '.pricing-teaser-card', '.use-case-card',
        '.testimonial-card', '.step-card', '.price-card', '.value-card', '.team-card',
        '.channel-card', '.office-card', '.demo-alt-card', '.type-card',
        '.ds-component-card', '.ds-font-card', '.ds-logo-card', '.ds-motion-card', '.ds-voice-card',
      ].join(',');
      document.querySelectorAll<HTMLElement>(selector).forEach((card) => {
        let raf: number | null = null;
        on(card, 'mousemove', (e) => {
          if (raf) return;
          raf = requestAnimationFrame(() => {
            const rect = card.getBoundingClientRect();
            const me = e as MouseEvent;
            card.style.setProperty('--mx', `${((me.clientX - rect.left) / rect.width) * 100}%`);
            card.style.setProperty('--my', `${((me.clientY - rect.top) / rect.height) * 100}%`);
            raf = null;
          });
        });
      });

      // ---------- CURSOR SPOTLIGHT ----------
      document.querySelectorAll<HTMLElement>('.cursor-spotlight').forEach((el) => {
        on(el, 'mousemove', (e) => {
          const rect = el.getBoundingClientRect();
          const me = e as MouseEvent;
          el.style.setProperty('--sx', `${((me.clientX - rect.left) / rect.width) * 100}%`);
          el.style.setProperty('--sy', `${((me.clientY - rect.top) / rect.height) * 100}%`);
        });
      });
    }

    // ---------- TEMPLATE TABS ----------
    const tabs = document.querySelectorAll<HTMLElement>('[data-template-tab]');
    tabs.forEach((tab) => {
      on(tab, 'click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const category = tab.dataset.templateTab;
        document.querySelectorAll<HTMLElement>('[data-template-item]').forEach((item) => {
          item.style.display = category === 'all' || item.dataset.category === category ? '' : 'none';
        });
      });
    });

    // ---------- STEP HIGHLIGHT ----------
    const steps = document.querySelectorAll<HTMLElement>('[data-step]');
    steps.forEach((step) => {
      on(step, 'mouseenter', () => {
        steps.forEach((s) => s.classList.remove('active'));
        step.classList.add('active');
      });
    });

    // ---------- COUNTER ANIMATION ----------
    const counters = document.querySelectorAll<HTMLElement>('[data-counter]');
    if (counters.length) {
      const animate = (el: HTMLElement) => {
        const target = parseInt(el.dataset.counter || '0', 10);
        const duration = 1800;
        const start = performance.now();
        const suffix = el.dataset.suffix || '';
        const tick = (now: number) => {
          const elapsed = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - elapsed, 3);
          el.textContent = Math.floor(target * eased).toLocaleString('fr-FR') + suffix;
          if (elapsed < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      };
      const cio = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animate(entry.target as HTMLElement);
              cio.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      counters.forEach((c) => cio.observe(c));
      cleanups.push(() => cio.disconnect());
    }

    // ---------- FAQ ACCORDION ----------
    document.querySelectorAll<HTMLElement>('[data-faq-item]').forEach((item) => {
      const q = item.querySelector('[data-faq-q]');
      if (q) on(q, 'click', () => { item.classList.toggle('open'); item.classList.toggle('is-open'); });
    });

    // ---------- PRICING TOGGLE (design-driven, if present) ----------
    const priceToggle = document.querySelector('[data-pricing-toggle]');
    if (priceToggle) {
      on(priceToggle, 'click', () => {
        const annual = priceToggle.classList.toggle('annual');
        document.querySelectorAll<HTMLElement>('[data-price-monthly]').forEach((el) => { el.style.display = annual ? 'none' : ''; });
        document.querySelectorAll<HTMLElement>('[data-price-annual]').forEach((el) => { el.style.display = annual ? '' : 'none'; });
      });
    }

    // ---------- SMOOTH SCROLL FOR ANCHORS ----------
    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
      on(anchor, 'click', (e) => {
        const href = anchor.getAttribute('href');
        if (!href || href === '#' || href === '#!') return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          const top = target.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });

    // ---------- MAGNET BUTTONS ----------
    document.querySelectorAll<HTMLElement>('[data-magnet]').forEach((btn) => {
      on(btn, 'mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const me = e as MouseEvent;
        btn.style.transform = `translate(${(me.clientX - rect.left - rect.width / 2) * 0.2}px, ${(me.clientY - rect.top - rect.height / 2) * 0.2}px)`;
      });
      on(btn, 'mouseleave', () => { btn.style.transform = ''; });
    });

    // ---------- DEMO topic / slot toggles ----------
    document.querySelectorAll<HTMLElement>('[data-demo-topic]').forEach((b) => {
      on(b, 'click', () => b.classList.toggle('is-selected'));
    });
    const slots = document.querySelectorAll<HTMLElement>('[data-demo-slot]');
    slots.forEach((b) => on(b, 'click', () => {
      slots.forEach((x) => x.classList.remove('is-selected'));
      b.classList.add('is-selected');
    }));

    // ---------- CONTACT dept switch ----------
    const depts = document.querySelectorAll<HTMLElement>('[data-dept]');
    depts.forEach((b) => on(b, 'click', () => {
      depts.forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
    }));

    // ---------- SPARKLES ----------
    if (!prefersReduced && !('ontouchstart' in window)) {
      const container = document.createElement('div');
      container.className = 'tb-sparkle-bg';
      container.setAttribute('aria-hidden', 'true');
      document.body.appendChild(container);
      cleanups.push(() => container.remove());

      let activeCount = 0;
      const MAX_ACTIVE = 25;
      const COLORS = ['', 'sparkle--blue', '', '', 'sparkle--lime', '', ''];
      let lastSpawn = 0;
      const create = (x: number, y: number) => {
        if (activeCount >= MAX_ACTIVE) return;
        const now = performance.now();
        if (now - lastSpawn < 60) return;
        lastSpawn = now;
        const s = document.createElement('span');
        const variant = COLORS[Math.floor(Math.random() * COLORS.length)];
        s.className = 'tb-sparkle' + (variant ? ' ' + variant : '');
        s.style.left = x + (Math.random() - 0.5) * 24 + 'px';
        s.style.top = y + (Math.random() - 0.5) * 12 + 'px';
        s.style.setProperty('--dx', (Math.random() - 0.5) * 30 + 'px');
        s.style.setProperty('--dy', -15 - Math.random() * 25 + 'px');
        const size = 2 + Math.random() * 2;
        s.style.width = size + 'px';
        s.style.height = size + 'px';
        container.appendChild(s);
        activeCount++;
        setTimeout(() => { s.remove(); activeCount--; }, 1500);
      };
      let raf: number | null = null;
      let px = 0, py = 0;
      on(document, 'mousemove', (e) => {
        const me = e as MouseEvent;
        px = me.clientX; py = me.clientY;
        if (raf) return;
        raf = requestAnimationFrame(() => { create(px, py); raf = null; });
      }, { passive: true });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [pathname]);

  return null;
}
