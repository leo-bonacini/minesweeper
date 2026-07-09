function getParticleLayer() {
  return document.getElementById('particle-layer');
}

function spawnParticle(className, x, y, styleOverrides = {}) {
  const layer = getParticleLayer();
  if (!layer) return;
  const el = document.createElement('span');
  el.className = className;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  Object.assign(el.style, styleOverrides);
  layer.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
  setTimeout(() => el.remove(), 2000);
}

export function explosionAt(cellEl, reducedMotion) {
  if (!cellEl) return;
  const rect = cellEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  if (reducedMotion) return;

  const particleCount = 14;
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3;
    const distance = 40 + Math.random() * 60;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    spawnParticle('particle particle-spark', cx, cy, {
      '--dx': `${dx}px`,
      '--dy': `${dy}px`,
      background: i % 2 === 0 ? 'var(--particle-fire, #ff7a45)' : 'var(--particle-smoke, #888)',
    });
  }
}

export function confettiBurst(reducedMotion) {
  if (reducedMotion) return;
  const colors = ['#ff5e5e', '#ffd15e', '#5ef2a4', '#5eb4ff', '#c05eff'];
  const width = window.innerWidth;
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * width;
    const y = -20;
    const fall = 300 + Math.random() * 300;
    const drift = (Math.random() - 0.5) * 200;
    spawnParticle('particle particle-confetti', x, y, {
      '--fall': `${fall}px`,
      '--drift': `${drift}px`,
      background: colors[i % colors.length],
      animationDelay: `${Math.random() * 0.4}s`,
    });
  }
}

export function sparkleAt(cellEl, reducedMotion) {
  if (!cellEl || reducedMotion) return;
  const rect = cellEl.getBoundingClientRect();
  spawnParticle('particle particle-sparkle', rect.left + rect.width / 2, rect.top + rect.height / 2);
}

export function shakeBoard(boardEl, reducedMotion) {
  if (!boardEl || reducedMotion) return;
  boardEl.classList.remove('shake');
  void boardEl.offsetWidth;
  boardEl.classList.add('shake');
  boardEl.addEventListener('animationend', () => boardEl.classList.remove('shake'), { once: true });
}

export function screenFlash(reducedMotion) {
  const flashEl = document.getElementById('screen-flash');
  if (!flashEl || reducedMotion) return;
  flashEl.classList.remove('flash-active');
  void flashEl.offsetWidth;
  flashEl.classList.add('flash-active');
}
