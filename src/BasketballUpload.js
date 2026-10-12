/**
 * BasketballUpload - Standalone, zero-dependency interactive basketball upload component.
 * Works with any website (Vanilla HTML, Vue, Svelte, Angular, etc.)
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BasketballUpload = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULT_OPTIONS = {
    target: null, // CSS selector or HTMLElement
    onFile: null, // Callback: (file) => {}
    allowGlobalDrop: true, // Whether dragging anywhere triggers the shot
    title: 'Drop your file anywhere',
    subtitle: 'Drag across screen to view trajectory',
    buttonText: 'Browse File',
    successText: 'Swish! Slam Dunk',
    enableConfetti: true,
  };

  const STYLES = `
    .bball-uploader-wrap {
      position: relative;
      width: 100%;
      max-width: 380px;
      margin: 0 auto;
      border-radius: 24px;
      border: 1px solid #1e293b;
      background: #0f172a;
      padding: 32px 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #ffffff;
      box-sizing: border-box;
      user-select: none;
    }
    .bball-uploader-wrap * { box-sizing: border-box; }
    .bball-stage {
      position: relative;
      height: 240px;
      width: 100%;
      overflow: hidden;
      border-radius: 16px;
      border: 1px solid rgba(30, 41, 59, 0.8);
      background: #090e1a radial-gradient(ellipse at 50% 55%, rgba(249, 115, 22, 0.12), transparent 60%);
    }
    .bball-court-floor {
      position: absolute;
      inset: auto 0 0 0;
      height: 12px;
      background: linear-gradient(to top, rgba(146, 64, 14, 0.5), rgba(120, 53, 15, 0.05));
      border-top: 1px solid rgba(180, 83, 9, 0.3);
    }
    .bball-hoop-container {
      position: absolute;
      bottom: 20px;
      left: calc(50% - 80px);
      width: 160px;
      height: 150px;
    }
    .bball-msg-layer {
      pointer-events: none;
      position: absolute;
      inset: 12px 0 auto 0;
      z-index: 50;
      display: flex;
      justify-content: center;
    }
    .bball-success-pill {
      opacity: 0;
      transform: translateY(8px) scale(0.7);
      transition: opacity 0.45s ease, transform 0.45s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      border-radius: 9999px;
      border: 1px solid rgba(52, 211, 153, 0.4);
      background: rgba(16, 185, 129, 0.15);
      padding: 6px 16px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6ee7b7;
      backdrop-filter: blur(8px);
    }
    .bball-success-pill.show {
      opacity: 1;
      transform: translateY(0) scale(1);
      transition: opacity 0.2s ease, transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .bball-success-badge {
      display: flex;
      height: 16px;
      width: 16px;
      align-items: center;
      justify-content: center;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.3);
      font-size: 10px;
    }
    .bball-upload-info {
      margin-top: 24px;
      width: 100%;
      text-align: center;
    }
    .bball-title {
      font-size: 14px;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0;
    }
    .bball-subtitle {
      font-size: 12px;
      color: #94a3b8;
      margin: 4px 0 0 0;
    }
    .bball-browse-btn {
      margin-top: 16px;
      display: inline-block;
      width: 100%;
      cursor: pointer;
      border-radius: 12px;
      background: #ea580c;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #ffffff;
      text-align: center;
      border: none;
      box-shadow: 0 10px 15px -3px rgba(234, 88, 12, 0.3);
      transition: background 0.2s, transform 0.1s;
    }
    .bball-browse-btn:hover { background: #f97316; }
    .bball-browse-btn:active { transform: scale(0.97); }

    /* Floating full-screen elements */
    .bball-drag-banner {
      position: fixed;
      top: 32px;
      left: 50%;
      transform: translateX(-50%) translateY(-16px);
      z-index: 9999;
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s ease;
      background: rgba(249, 115, 22, 0.15);
      border: 1px solid rgba(249, 115, 22, 0.3);
      padding: 8px 24px;
      border-radius: 9999px;
      backdrop-filter: blur(8px);
      color: #fb923c;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      font-family: inherit;
    }
    .bball-drag-banner.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .bball-trajectory-svg {
      pointer-events: none;
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9990;
    }
    @keyframes bballDash { to { stroke-dashoffset: -20; } }
    .bball-trajectory-line {
      stroke-dasharray: 6 6;
      animation: bballDash 0.5s linear infinite;
      filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.85));
    }
    .bball-ball-elem {
      position: fixed;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 9995;
      display: none;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      will-change: transform;
    }
    .bball-ball-name {
      position: absolute;
      left: 50%;
      top: 100%;
      margin-top: 4px;
      max-width: 140px;
      transform: translateX(-50%);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      border-radius: 9999px;
      background: rgba(0, 0, 0, 0.7);
      padding: 2px 8px;
      font-size: 10px;
      font-weight: 600;
      color: #fed7aa;
    }
    .bball-confetti-canvas {
      pointer-events: none;
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9998;
    }
  `;

  class BasketballUpload {
    constructor(elementOrSelector, options = {}) {
      this.opts = Object.assign({}, DEFAULT_OPTIONS, options);
      this.container = typeof elementOrSelector === 'string'
        ? document.querySelector(elementOrSelector)
        : elementOrSelector;

      if (!this.container) {
        throw new Error('[BasketballUpload] Target container element not found.');
      }

      this._ensureGlobalStyles();
      this._buildDOM();
      this._initNetPhysics();
      this._initConfetti();
      this._bindEvents();
    }

    _ensureGlobalStyles() {
      if (!document.getElementById('bball-upload-styles')) {
        const style = document.createElement('style');
        style.id = 'bball-upload-styles';
        style.textContent = STYLES;
        document.head.appendChild(style);
      }
    }

    _buildDOM() {
      // 1. Container internal structure
      this.container.innerHTML = `
        <div class="bball-uploader-wrap">
          <div class="bball-stage">
            <div class="bball-court-floor"></div>
            <div class="bball-msg-layer">
              <div class="bball-success-pill">
                <span class="bball-success-badge">✓</span>
                <span>${this.opts.successText}</span>
              </div>
            </div>
            <div class="bball-hoop-container">
              <!-- Back layer: glass board, back rim, back net -->
              <svg class="bball-hoop-back" style="position:absolute;inset:0;z-index:10;overflow:visible;" width="160" height="150" viewBox="0 0 160 150" fill="none">
                <defs>
                  <linearGradient id="bballGlass" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#e2e8f0" stop-opacity="0.3" />
                    <stop offset="0.5" stop-color="#94a3b8" stop-opacity="0.12" />
                    <stop offset="1" stop-color="#e2e8f0" stop-opacity="0.22" />
                  </linearGradient>
                  <clipPath id="bballBoardClip"><rect x="26" y="2" width="108" height="68" rx="6" /></clipPath>
                </defs>
                <g class="bball-board-group">
                  <rect x="26" y="2" width="108" height="68" rx="6" fill="url(#bballGlass)" stroke="#cbd5e1" stroke-width="2.5" />
                  <g clip-path="url(#bballBoardClip)">
                    <path d="M40 0 L62 0 L34 72 L12 72Z" fill="#fff" opacity="0.07" />
                    <path d="M70 0 L78 0 L50 72 L42 72Z" fill="#fff" opacity="0.05" />
                  </g>
                  <rect x="31" y="7" width="98" height="58" rx="3" stroke="#fff" stroke-opacity="0.16" />
                  <rect x="61" y="36" width="38" height="26" rx="1.5" stroke="#ef4444" stroke-width="2.5" />
                </g>
                <rect x="71" y="68" width="18" height="7" rx="1.5" fill="#64748b" />
                <g class="bball-rim-back">
                  <path d="M48 80 A32 7 0 0 1 112 80" stroke="#b45309" stroke-width="4" stroke-linecap="round" />
                </g>
                <path class="bball-net-back" stroke="#e2e8f0" stroke-width="1.1" stroke-opacity="0.55" stroke-linecap="round" />
              </svg>
              <!-- Front layer: front net, front rim -->
              <svg class="bball-hoop-front" style="pointer-events:none;position:absolute;inset:0;z-index:40;overflow:visible;" width="160" height="150" viewBox="0 0 160 150" fill="none">
                <path class="bball-net-front" stroke="#f8fafc" stroke-width="1.3" stroke-opacity="0.95" stroke-linecap="round" />
                <g class="bball-rim-front">
                  <path d="M48 80 A32 7 0 0 0 112 80" stroke="#ea580c" stroke-width="5" stroke-linecap="round" />
                  <path d="M50 79.2 A30 5.6 0 0 0 110 79.2" stroke="#fdba74" stroke-width="1.2" stroke-opacity="0.85" stroke-linecap="round" />
                  <circle cx="48" cy="80" r="2.6" fill="#c2410c" />
                  <circle cx="112" cy="80" r="2.6" fill="#c2410c" />
                </g>
              </svg>
            </div>
          </div>
          <div class="bball-upload-info">
            <h3 class="bball-title">${this.opts.title}</h3>
            <p class="bball-subtitle">${this.opts.subtitle}</p>
            <label class="bball-browse-btn">
              ${this.opts.buttonText}
              <input type="file" class="bball-file-input" style="display:none;" />
            </label>
          </div>
        </div>
      `;

      // 2. Global overlay elements (if not already attached to body)
      if (!document.getElementById('bball-global-overlays')) {
        const overlayWrap = document.createElement('div');
        overlayWrap.id = 'bball-global-overlays';
        overlayWrap.innerHTML = `
          <canvas class="bball-confetti-canvas"></canvas>
          <svg class="bball-trajectory-svg" style="display:none;">
            <path class="bball-trajectory-line" fill="none" stroke="#f97316" stroke-width="3" stroke-linecap="round" />
            <circle class="bball-cursor-point" r="7" fill="#fb923c" />
            <circle class="bball-rim-point" r="6" fill="#f97316" />
          </svg>
          <div class="bball-ball-elem">
            <div class="bball-ball-body" style="position:relative;width:44px;height:44px;">
              <svg viewBox="0 0 44 44" style="width:44px;height:44px;filter:drop-shadow(0 6px 10px rgba(0,0,0,0.5));">
                <defs>
                  <radialGradient id="bballShadeDef" cx="35%" cy="30%" r="75%">
                    <stop offset="0%" stop-color="#fb923c" />
                    <stop offset="60%" stop-color="#ea580c" />
                    <stop offset="100%" stop-color="#9a3412" />
                  </radialGradient>
                </defs>
                <circle cx="22" cy="22" r="20" fill="url(#bballShadeDef)" stroke="#431407" stroke-width="1.6" />
                <path d="M2 22 H42 M22 2 V42 M7 8 C16 16 16 28 7 36 M37 8 C28 16 28 28 37 36" stroke="#431407" stroke-width="1.5" fill="none" />
              </svg>
              <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:16px;">📄</span>
            </div>
            <span class="bball-ball-name">file</span>
          </div>
          <div class="bball-drag-banner">🏀 Release to shoot file into the hoop!</div>
        `;
        document.body.appendChild(overlayWrap);
      }

      // References
      this.stage = this.container.querySelector('.bball-stage');
      this.hoop = this.container.querySelector('.bball-hoop-container');
      this.pill = this.container.querySelector('.bball-success-pill');
      this.fileInput = this.container.querySelector('.bball-file-input');
      this.browseBtn = this.container.querySelector('.bball-browse-btn');
      this.netBack = this.container.querySelector('.bball-net-back');
      this.netFront = this.container.querySelector('.bball-net-front');
      this.rimBack = this.container.querySelector('.bball-rim-back');
      this.rimFront = this.container.querySelector('.bball-rim-front');
      this.boardGroup = this.container.querySelector('.bball-board-group');

      const overlays = document.getElementById('bball-global-overlays');
      this.confettiCanvas = overlays.querySelector('.bball-confetti-canvas');
      this.trajectorySvg = overlays.querySelector('.bball-trajectory-svg');
      this.trajectoryPath = overlays.querySelector('.bball-trajectory-line');
      this.cursorPoint = overlays.querySelector('.bball-cursor-point');
      this.rimPoint = overlays.querySelector('.bball-rim-point');
      this.fileBall = overlays.querySelector('.bball-ball-elem');
      this.ballBody = overlays.querySelector('.bball-ball-body');
      this.fileBallName = overlays.querySelector('.bball-ball-name');
      this.dragBanner = overlays.querySelector('.bball-drag-banner');

      this.isDragging = false;
      this.dragCounter = 0;
      this.isFlying = false;
      this.pillTimer = 0;
    }

    _initNetPhysics() {
      this.N = 12;
      this.M = 6;
      this.NET_H = 46;
      this.RIM_RX = 32;
      this.RIM_RY = 7;
      this.BALL_R = 16.5;

      this.applyHoop(999, null, null);
    }

    drawNet(ballY, since, rimDy) {
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const pass = clamp((ballY - 72) / (this.NET_H + 40), 0, 1);
      const sway = since == null ? 0 : 6 * Math.exp(-since / 420) * Math.sin(since / 65);
      const lift = since == null ? 0 : Math.exp(-since / 300) * Math.cos(since / 55);
      const nodes = [];

      for (let j = 0; j <= this.M; j++) {
        const u = j / this.M;
        const r = this.RIM_RX - 14 * Math.pow(u, 0.85);
        const ry = this.RIM_RY - 3 * u;
        const baseY = 80 + this.NET_H * u;
        const g = Math.exp(-Math.pow((baseY - ballY) / 15, 2));
        const bulge = (Math.max(0, this.BALL_R + 1.5 - r) + 3.2) * g;
        const stretch = 7 * u * Math.sin(Math.PI * pass);
        const row = [];
        for (let i = 0; i < this.N; i++) {
          const ph = (2 * Math.PI * i) / this.N;
          row.push([
            80 + (r + bulge) * Math.cos(ph) + sway * Math.pow(u, 1.3),
            baseY + rimDy * (1 - u * 0.6) + (ry + bulge * 0.25) * Math.sin(ph) + stretch - 3 * u * lift * (since == null ? 0 : 1),
          ]);
        }
        nodes.push(row);
      }

      let back = '', front = '';
      const p = (n) => n[0].toFixed(1) + ' ' + n[1].toFixed(1);
      for (let i = 0; i < this.N; i++) {
        const i2 = (i + 1) % this.N;
        const isFront = Math.sin((2 * Math.PI * (i + 0.5)) / this.N) > 0;
        let s = '';
        for (let j = 0; j < this.M; j++) {
          s += `M${p(nodes[j][i])}L${p(nodes[j + 1][i2])}M${p(nodes[j][i2])}L${p(nodes[j + 1][i])}`;
        }
        if (isFront) front += s; else back += s;
      }
      this.netBack.setAttribute('d', back);
      this.netFront.setAttribute('d', front);
    }

    applyHoop(ballY, since, te) {
      const rimDy = te == null ? 0 : 2.4 * Math.exp(-te / 240) * Math.sin(te / 36);
      const shake = te == null ? 0 : 1.1 * Math.exp(-te / 320) * Math.sin(te / 48);
      const glow = te == null ? 0 : Math.exp(-te / 500);
      const tr = `translate(0 ${rimDy.toFixed(2)})`;

      this.rimBack.setAttribute('transform', tr);
      this.rimFront.setAttribute('transform', tr);
      this.boardGroup.setAttribute('transform', `translate(${shake.toFixed(2)} 0)`);

      const f = glow > 0.03 ? `drop-shadow(0 0 ${(7 * glow).toFixed(1)}px rgba(251,146,60,${glow.toFixed(2)}))` : 'none';
      this.rimBack.style.filter = f;
      this.rimFront.style.filter = f;
      this.drawNet(ballY, since, rimDy);
    }

    getAim() {
      const f = this.hoop.getBoundingClientRect();
      return { x: f.left + 80, y: f.top + 56, rimY: f.top + 80, top: f.top };
    }

    getArc(x1, y1, x2, y2) {
      const dist = Math.hypot(x1 - x2, y1 - y2);
      return { x: x2 + (x1 - x2) * 0.18, y: Math.min(y1, y2) - Math.max(170, dist * 0.55) };
    }

    updateTrajectory(x, y) {
      const a = this.getAim();
      const cp = this.getArc(x, y, a.x, a.y);
      this.trajectoryPath.setAttribute('d', `M ${x} ${y} Q ${cp.x} ${cp.y} ${a.x} ${a.y}`);
      this.cursorPoint.setAttribute('cx', x);
      this.cursorPoint.setAttribute('cy', y);
      this.rimPoint.setAttribute('cx', a.x);
      this.rimPoint.setAttribute('cy', a.y);
    }

    _bindEvents() {
      const dropTarget = this.opts.allowGlobalDrop ? window : this.container;

      dropTarget.addEventListener('dragenter', (e) => {
        e.preventDefault();
        if (this.isFlying) return;
        if (++this.dragCounter === 1) {
          this.isDragging = true;
          this.trajectoryPath.style.opacity = '1';
          this.trajectorySvg.style.display = 'block';
          this.dragBanner.classList.add('visible');
          this.updateTrajectory(e.clientX, e.clientY);
        }
      });

      dropTarget.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (--this.dragCounter <= 0) {
          this.dragCounter = 0;
          this.isDragging = false;
          this.trajectorySvg.style.display = 'none';
          this.dragBanner.classList.remove('visible');
        }
      });

      dropTarget.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (this.isDragging) this.updateTrajectory(e.clientX, e.clientY);
      });

      dropTarget.addEventListener('drop', (e) => {
        e.preventDefault();
        this.dragCounter = 0;
        this.isDragging = false;
        this.dragBanner.classList.remove('visible');

        const file = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files[0] : null;
        if (file && !this.isFlying) {
          this.shoot(file, e.clientX, e.clientY, true);
        } else {
          this.trajectorySvg.style.display = 'none';
        }
      });

      this.fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        this.fileInput.value = '';
        if (!file || this.isFlying) return;
        const r = this.browseBtn.getBoundingClientRect();
        this.shoot(file, r.left + r.width / 2, r.top, false);
      });
    }

    shoot(file, sx, sy, trail) {
      this.isFlying = true;
      const fileName = file.name || 'file';
      this.fileBallName.textContent = fileName;
      this.fileBallName.style.opacity = '1';

      const a = this.getAim();
      const cp = this.getArc(sx, sy, a.x, a.y);
      const FLIGHT = 900;
      const G = 0.0028;
      const vx0 = (2 * (a.x - cp.x)) / FLIGHT;
      let vy = (2 * (a.y - cp.y)) / FLIGHT;
      const floor = this.stage.getBoundingClientRect().bottom - 12;
      const spin = (sx > a.x ? -1 : 1) * 540;

      let phase = 'fly', x = sx, y = sy, s = 1, rot = 0, fallT = 0, bounces = 0, squash = 0;
      let scoreAt = null, exitAt = null, fadeAt = null, gone = false;
      const t0 = performance.now();
      let last = t0;

      this.fileBall.style.opacity = '1';
      this.fileBall.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`;
      this.fileBall.style.display = 'flex';

      if (trail) {
        this.trajectorySvg.style.display = 'block';
        this.updateTrajectory(sx, sy);
      } else {
        this.trajectorySvg.style.display = 'none';
      }

      const bez = (t, a, c, b) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;
      const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

      const frame = (now) => {
        const dt = Math.min(now - last, 32);
        last = now;

        if (!gone) {
          if (phase === 'fly') {
            const t = Math.min((now - t0) / FLIGHT, 1);
            x = bez(t, sx, cp.x, a.x);
            y = bez(t, sy, cp.y, a.y);
            s = 1 - t * 0.25;
            rot = t * spin;
            this.trajectoryPath.style.opacity = `${1 - t}`;
            this.fileBallName.style.opacity = `${1 - clamp((t - 0.5) / 0.3, 0, 1)}`;
            if (t >= 1) {
              phase = 'fall';
              this.trajectorySvg.style.display = 'none';
              this.trajectoryPath.style.opacity = '1';
            }
          } else {
            fallT += dt;
            vy += G * dt;
            y += vy * dt;
            x = a.x + vx0 * fallT * Math.exp(-fallT / 60);
            rot = spin + fallT * 0.18;
            if (y > floor && vy > 0) {
              y = floor;
              vy = -vy * 0.42;
              bounces++;
              squash = 1;
            }
            if (scoreAt == null && y >= a.rimY) {
              scoreAt = now;
              this.onScore(a.x, a.rimY, file);
            }
            if (exitAt == null && y > a.rimY + this.NET_H + 4) exitAt = now;
            if (fadeAt == null && (bounces >= 2 || fallT > 1400)) fadeAt = now;
          }

          squash = Math.max(0, squash - dt / 120);
          const sxs = s * (1 + 0.25 * squash);
          const sys = s * (1 - 0.2 * squash);
          let alpha = 1;
          if (fadeAt != null) {
            alpha = 1 - (now - fadeAt) / 250;
            if (alpha <= 0) { gone = true; alpha = 0; }
          }
          this.fileBall.style.opacity = `${alpha}`;
          this.fileBall.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${sxs}, ${sys})`;
          this.ballBody.style.transform = `rotate(${rot}deg)`;
          if (gone) {
            this.fileBall.style.display = 'none';
          }
        }

        const since = exitAt == null ? null : now - exitAt;
        const te = scoreAt == null ? null : now - scoreAt;
        this.applyHoop(gone ? 999 : y - a.top, since, te);

        if (gone && (since == null || since > 1300)) {
          this.applyHoop(999, null, null);
          this.isFlying = false;
          return;
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }

    onScore(x, y, file) {
      this.pill.classList.add('show');
      clearTimeout(this.pillTimer);
      this.pillTimer = setTimeout(() => this.pill.classList.remove('show'), 2300);

      if (this.opts.enableConfetti) {
        this.celebrate(x, y);
      }

      if (typeof this.opts.onFile === 'function') {
        this.opts.onFile(file);
      }
    }

    _initConfetti() {
      const cv = this.confettiCanvas;
      this.ctx = cv.getContext('2d');
      this.parts = [];
      this.confettiRunning = false;
      this.lastConfettiT = 0;

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.W = window.innerWidth;
        this.H = window.innerHeight;
        cv.width = this.W * dpr;
        cv.height = this.H * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      window.addEventListener('resize', resize);
    }

    celebrate(ox, oy) {
      const rnd = (a, b) => a + Math.random() * (b - a);
      const COLORS = ['#f43f5e', '#f97316', '#facc15', '#22c55e', '#38bdf8', '#a78bfa', '#ec4899', '#ffffff'];
      const pick = () => COLORS[(Math.random() * COLORS.length) | 0];

      const makePiece = (x, y, vx, vy) => {
        const r = Math.random();
        const shape = r < 0.5 ? 'rect' : r < 0.7 ? 'circle' : r < 0.85 ? 'ribbon' : 'star';
        return {
          x, y, vx, vy, shape, color: pick(), life: 0, ttl: rnd(140, 260), drag: rnd(0.955, 0.972),
          rot: rnd(0, 6.28), vr: rnd(-0.25, 0.25), tilt: rnd(0, 6.28), vt: rnd(0.12, 0.3), ph: rnd(0, 6.28),
          w: rnd(6, 10), h: rnd(10, 16), len: rnd(24, 40), r: rnd(3, 5),
        };
      };

      const burst = (x, y, n, angle, spread, vmin, vmax) => {
        for (let i = 0; i < n; i++) {
          const ang = angle + rnd(-spread / 2, spread / 2), v = rnd(vmin, vmax);
          this.parts.push(makePiece(x, y, Math.cos(ang) * v, Math.sin(ang) * v));
        }
      };

      const balloon = () => {
        this.parts.push({
          shape: 'balloon', x: rnd(40, this.W - 40), y: this.H + 60, vy: -rnd(2.2, 3.6), color: pick(),
          w: rnd(26, 34), h: rnd(32, 42), life: 0, ph: rnd(0, 6.28)
        });
      };

      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const m = reduce ? 0.3 : 1;

      burst(ox, oy, Math.round(90 * m), -Math.PI / 2, 2.0, 7, 17);
      setTimeout(() => {
        burst(this.W * 0.02, this.H + 10, Math.round(55 * m), -1.1, 0.6, 14, 26);
        burst(this.W * 0.98, this.H + 10, Math.round(55 * m), -Math.PI + 1.1, 0.6, 14, 26);
      }, 120);
      setTimeout(() => burst(ox, oy, Math.round(60 * m), -Math.PI / 2, 2.4, 6, 14), 350);

      if (!reduce) {
        let k = 0;
        const rain = setInterval(() => {
          for (let i = 0; i < 4; i++) this.parts.push(makePiece(rnd(0, this.W), -20, rnd(-1, 1), rnd(1, 3)));
          if (++k > 16) clearInterval(rain);
          this._startConfetti();
        }, 70);
        for (let i = 0; i < 6; i++) setTimeout(() => { balloon(); this._startConfetti(); }, rnd(0, 800));
      }
      this._startConfetti();
    }

    _startConfetti() {
      if (this.confettiRunning) return;
      this.confettiRunning = true;
      this.lastConfettiT = performance.now();
      requestAnimationFrame((t) => this._confettiTick(t));
    }

    _confettiTick(now) {
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const k = clamp((now - this.lastConfettiT) / 16.67, 0.2, 2.5);
      this.lastConfettiT = now;
      this.ctx.clearRect(0, 0, this.W, this.H);

      const drawStar = (r) => {
        this.ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const rad = i % 2 ? r * 0.45 : r, ang = (Math.PI / 5) * i - Math.PI / 2;
          this.ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
        }
        this.ctx.closePath();
        this.ctx.fill();
      };

      const drawBalloon = (p) => {
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(Math.sin(p.life * 0.04 + p.ph) * 0.12);
        this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, p.h * 0.5 + 4);
        for (let i = 1; i <= 6; i++) this.ctx.lineTo(Math.sin(p.life * 0.08 + i) * 3 * (i / 6), p.h * 0.5 + 4 + i * 7);
        this.ctx.stroke();
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(0, p.h / 2 + 5);
        this.ctx.lineTo(-3.5, p.h / 2 + 1);
        this.ctx.lineTo(3.5, p.h / 2 + 1);
        this.ctx.fill();
        this.ctx.fillStyle = 'rgba(255,255,255,0.35)';
        this.ctx.beginPath();
        this.ctx.ellipse(-p.w * 0.18, -p.h * 0.2, p.w * 0.1, p.h * 0.18, -0.4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      };

      this.parts = this.parts.filter((p) => {
        p.life += k;
        if (p.shape === 'balloon') {
          p.y += p.vy * k;
          p.x += Math.sin(p.life * 0.03 + p.ph) * 0.5 * k;
          drawBalloon(p);
          return p.y > -120;
        }
        const d = Math.pow(p.drag, k);
        p.vx *= d;
        p.vy = p.vy * d + 0.22 * k;
        p.x += p.vx * k + Math.sin(p.life * 0.1 + p.ph) * 0.5 * k;
        p.y += p.vy * k;
        p.rot += p.vr * k;
        p.tilt += p.vt * k;
        this.ctx.save();
        this.ctx.globalAlpha = clamp((p.ttl - p.life) / 30, 0, 1);
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rot);
        this.ctx.fillStyle = p.color;
        this.ctx.strokeStyle = p.color;
        if (p.shape === 'rect') {
          this.ctx.scale(1, Math.cos(p.tilt));
          this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        } else if (p.shape === 'circle') {
          this.ctx.scale(1, Math.abs(Math.cos(p.tilt)) * 0.6 + 0.4);
          this.ctx.beginPath();
          this.ctx.arc(0, 0, p.r, 0, 6.283);
          this.ctx.fill();
        } else if (p.shape === 'star') {
          this.ctx.scale(Math.cos(p.tilt), 1);
          drawStar(p.r + 2);
        } else {
          this.ctx.lineWidth = 3;
          this.ctx.lineCap = 'round';
          this.ctx.beginPath();
          for (let s = 0; s <= p.len; s += 4) this.ctx.lineTo(s - p.len / 2, Math.sin(s * 0.35 + p.tilt) * 5);
          this.ctx.stroke();
        }
        this.ctx.restore();
        return p.y < this.H + 60 && p.life < p.ttl;
      });

      if (this.parts.length) {
        requestAnimationFrame((t) => this._confettiTick(t));
      } else {
        this.confettiRunning = false;
        this.ctx.clearRect(0, 0, this.W, this.H);
      }
    }
  }

  // Register Web Component custom element for 1-tag usage
  if (typeof customElements !== 'undefined' && !customElements.get('basketball-upload')) {
    class BasketballUploadElement extends HTMLElement {
      connectedCallback() {
        if (!this._mounted) {
          this._mounted = true;
          this.instance = new BasketballUpload(this, {
            title: this.getAttribute('title') || 'Drop your file anywhere',
            subtitle: this.getAttribute('subtitle') || 'Drag across screen to view trajectory',
            buttonText: this.getAttribute('button-text') || 'Browse File',
            successText: this.getAttribute('success-text') || 'Swish! Slam Dunk',
            onFile: (file) => {
              this.dispatchEvent(new CustomEvent('file-upload', { detail: { file }, bubbles: true }));
            }
          });
        }
      }
    }
    customElements.define('basketball-upload', BasketballUploadElement);
  }

  return BasketballUpload;
});
