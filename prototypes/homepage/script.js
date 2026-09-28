/*
 * DevStash marketing homepage prototype: chaos icons, navbar, scroll reveal,
 * pricing toggle and footer year. No dependencies.
 */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Chaos icons ---------- */

  const REPEL_RADIUS = 110;
  const REPEL_FORCE = 0.9;
  const MAX_SPEED = 5;
  const FRAME_MS = 1000 / 60;

  function initChaos() {
    const field = document.getElementById("chaos-field");
    if (!field || reduceMotion.matches) return;

    let width = field.clientWidth;
    let height = field.clientHeight;
    let pointer = null;
    let frame = 0;
    let last = 0;

    // Start from the CSS scatter layout, read before JS takes over positioning.
    const icons = Array.from(field.querySelectorAll(".chaos__icon"), (el) => {
      const size = el.offsetWidth;
      const angle = Math.random() * Math.PI * 2;
      const base = 0.35 + Math.random() * 0.35;
      return {
        el,
        size,
        x: Math.min(el.offsetLeft, width - size),
        y: Math.min(el.offsetTop, height - size),
        vx: Math.cos(angle) * base,
        vy: Math.sin(angle) * base,
        base,
        phase: Math.random() * Math.PI * 2,
      };
    });

    field.classList.add("is-animated");

    function step(icon, dt, time) {
      const cx = icon.x + icon.size / 2;
      const cy = icon.y + icon.size / 2;

      if (pointer) {
        const dx = cx - pointer.x;
        const dy = cy - pointer.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < REPEL_RADIUS) {
          const push = (1 - dist / REPEL_RADIUS) * REPEL_FORCE * dt;
          icon.vx += (dx / dist) * push;
          icon.vy += (dy / dist) * push;
        }
      }

      // Ease back toward each icon's cruising speed after a push.
      const speed = Math.hypot(icon.vx, icon.vy);
      if (speed > 0) {
        const eased =
          speed > icon.base
            ? Math.max(icon.base, speed * (1 - 0.04 * dt))
            : Math.min(icon.base, speed * (1 + 0.02 * dt));
        const target = Math.min(eased, MAX_SPEED);
        icon.vx *= target / speed;
        icon.vy *= target / speed;
      }

      icon.x += icon.vx * dt;
      icon.y += icon.vy * dt;

      const maxX = width - icon.size;
      const maxY = height - icon.size;
      if (icon.x < 0) {
        icon.x = 0;
        icon.vx = Math.abs(icon.vx);
      } else if (icon.x > maxX) {
        icon.x = maxX;
        icon.vx = -Math.abs(icon.vx);
      }
      if (icon.y < 0) {
        icon.y = 0;
        icon.vy = Math.abs(icon.vy);
      } else if (icon.y > maxY) {
        icon.y = maxY;
        icon.vy = -Math.abs(icon.vy);
      }

      const rotate = Math.sin(time * 0.0008 + icon.phase) * 12;
      const scale = 1 + Math.sin(time * 0.0016 + icon.phase) * 0.06;
      icon.el.style.transform =
        "translate(" + icon.x.toFixed(1) + "px, " + icon.y.toFixed(1) + "px) " +
        "rotate(" + rotate.toFixed(2) + "deg) scale(" + scale.toFixed(3) + ")";
    }

    function tick(time) {
      // Cap the step so a long pause (tab switch, scroll away) can't teleport icons.
      const dt = last ? Math.min((time - last) / FRAME_MS, 3) : 1;
      last = time;
      icons.forEach((icon) => step(icon, dt, time));
      frame = requestAnimationFrame(tick);
    }

    function start() {
      if (frame) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    }

    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
    }

    field.addEventListener("pointermove", (event) => {
      const rect = field.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    });
    field.addEventListener("pointerleave", () => {
      pointer = null;
    });

    if ("ResizeObserver" in window) {
      new ResizeObserver(() => {
        width = field.clientWidth;
        height = field.clientHeight;
      }).observe(field);
    }

    // Only animate while the hero is on screen.
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) start();
        else stop();
      }).observe(field);
    } else {
      start();
    }
  }

  /* ---------- Navbar ---------- */

  function initNav() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const update = () => nav.classList.toggle("is-scrolled", window.scrollY > 16);
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------- Scroll reveal ---------- */

  function initReveal() {
    const targets = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    targets.forEach((el) => observer.observe(el));
  }

  /* ---------- Pricing toggle ---------- */

  const PRO_PRICES = {
    monthly: { amount: "$8", period: "/month", note: "Billed monthly" },
    yearly: { amount: "$72", period: "/year", note: "Billed yearly — $6/month" },
  };

  function initPricing() {
    const options = document.querySelectorAll(".billing-toggle__option");
    const amount = document.getElementById("pro-amount");
    const period = document.getElementById("pro-period");
    const note = document.getElementById("pro-note");
    if (!amount || !period || !note) return;

    options.forEach((option) => {
      option.addEventListener("click", () => {
        const price = PRO_PRICES[option.dataset.period];
        if (!price) return;
        options.forEach((other) => {
          const active = other === option;
          other.classList.toggle("is-active", active);
          other.setAttribute("aria-pressed", String(active));
        });
        amount.textContent = price.amount;
        period.textContent = price.period;
        note.textContent = price.note;
      });
    });
  }

  /* ---------- Footer year ---------- */

  function initYear() {
    const year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  initChaos();
  initNav();
  initReveal();
  initPricing();
  initYear();
})();
