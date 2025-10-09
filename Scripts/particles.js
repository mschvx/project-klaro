  // Particle Simulator 
(() => {
  const canvas = document.getElementById('particles');

  const ctx = canvas.getContext('2d', { alpha: true });
  let width = 0;
  let height = 0;
  let DPR = Math.max(1, window.devicePixelRatio || 1);
  let particles = [];

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Random float between a and b 
  function random(a, b) {
    return a + Math.random() * (b - a);
  }

  // Adjust particle count based on screen size 
  function getParticleCount() {
    const area = Math.max(800 * 400, window.innerWidth * window.innerHeight);
    return Math.max(20, Math.min(100, Math.round((area / (1280 * 720)) * 48)));
  }

  // Handle canvas resize 
  function resizeCanvas() {
    DPR = Math.max(1, window.devicePixelRatio || 1);
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;

    canvas.width = Math.round(width * DPR);
    canvas.height = Math.round(height * DPR);

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    initParticles();
  }

  // Create new particles 
  function initParticles() {
    const count = getParticleCount();
    particles = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: random(0, width),
        y: random(0, height),
        vx: random(-0.35, 0.35),
        vy: random(-0.12, 0.12),
        r: random(15, 30),             
        hue: 150 + Math.random() * 60, 
        alpha: random(0.05, 0.26),     
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  // Track mouse/touch position 
  const pointer = { x: -9999, y: -9999, active: false };

  function handlePointerMove(e) {
    const p = e.touches ? e.touches[0] : e;
    pointer.x = p.clientX;
    pointer.y = p.clientY;
    pointer.active = true;
  }

  function handlePointerLeave() {
    pointer.active = false;
    pointer.x = -9999;
    pointer.y = -9999;
  }

  // Update particle positions 
  function updateParticles(dt) {
    if (prefersReducedMotion) return;

    for (const p of particles) {
      // gentle drifting
      p.phase += dt * 0.0012 * (0.5 + Math.abs(p.vx));
      p.x += p.vx + Math.sin(p.phase) * 0.24;
      p.y += p.vy + Math.cos(p.phase) * 0.22;

      // wrap around edges
      if (p.x < -24) p.x = width + 24;
      if (p.x > width + 24) p.x = -24;
      if (p.y < -24) p.y = height + 24;
      if (p.y > height + 24) p.y = -24;

      // repel from pointer
      if (pointer.active) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist2 = dx * dx + dy * dy;
        const radius = 120;

        if (dist2 < radius * radius) {
          const dist = Math.sqrt(dist2) || 1;
          const force = (1 - dist / radius) * 1.05;
          const scale = (dt / 16) * 9 * force;
          p.x += (dx / dist) * scale;
          p.y += (dy / dist) * scale;
        }
      }
    }
  }

  // Draw all particles 
  function drawParticles() {
    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      ctx.beginPath();

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 1.6);
      gradient.addColorStop(0, `hsla(${p.hue}, 85%, 70%, ${p.alpha})`);
      gradient.addColorStop(1, `hsla(${p.hue}, 80%, 45%, 0)`);

      ctx.fillStyle = gradient;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Animation loop 
  let lastTime = performance.now();
  function frameLoop(now) {
    const dt = now - lastTime;
    lastTime = now;

    updateParticles(dt);
    drawParticles();

    requestAnimationFrame(frameLoop);
  }

  // Event listeners
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('mousemove', handlePointerMove, { passive: true });
  window.addEventListener('touchmove', handlePointerMove, { passive: true });
  window.addEventListener('mouseleave', handlePointerLeave);
  window.addEventListener('touchend', handlePointerLeave);

  // Start
  resizeCanvas();
  requestAnimationFrame(frameLoop);
})();
