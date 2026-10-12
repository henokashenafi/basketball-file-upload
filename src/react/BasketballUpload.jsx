import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * BasketballUpload - Interactive React basketball file upload component.
 * 
 * @param {Object} props
 * @param {Function} [props.onUpload] - Callback receiving the dropped/selected File object
 * @param {string} [props.title="Drop your file anywhere"] - Main card title
 * @param {string} [props.subtitle="Drag across screen to view trajectory"] - Subtitle description
 * @param {string} [props.buttonText="Browse File"] - Label for the file input button
 * @param {string} [props.successText="Swish! Slam Dunk"] - Text shown when ball goes in
 * @param {boolean} [props.allowGlobalDrop=true] - If true, dragging files anywhere shoots the ball
 * @param {boolean} [props.enableConfetti=true] - Trigger celebratory confetti on score
 * @param {string} [props.className=""] - Additional class names for container
 */
export default function BasketballUpload({
  onUpload,
  title = 'Drop your file anywhere',
  subtitle = 'Drag across screen to view trajectory',
  buttonText = 'Browse File',
  successText = 'Swish! Slam Dunk',
  allowGlobalDrop = true,
  enableConfetti = true,
  className = '',
}) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const hoopRef = useRef(null);
  const netBackRef = useRef(null);
  const netFrontRef = useRef(null);
  const rimBackRef = useRef(null);
  const rimFrontRef = useRef(null);
  const boardGroupRef = useRef(null);
  const pillRef = useRef(null);
  const fileInputRef = useRef(null);
  const browseLabelRef = useRef(null);

  // Global overlay refs
  const confettiCanvasRef = useRef(null);
  const trajectorySvgRef = useRef(null);
  const trajectoryPathRef = useRef(null);
  const cursorPointRef = useRef(null);
  const rimPointRef = useRef(null);
  const fileBallRef = useRef(null);
  const ballBodyRef = useRef(null);
  const fileBallNameRef = useRef(null);
  const dragBannerRef = useRef(null);

  const stateRef = useRef({
    isDragging: false,
    dragCounter: 0,
    isFlying: false,
    pillTimer: null,
    parts: [],
    confettiRunning: false,
    lastConfettiT: 0,
    confettiW: 0,
    confettiH: 0,
  });

  // Net geometry constants
  const N = 12, M = 6, NET_H = 46, RIM_RX = 32, RIM_RY = 7, BALL_R = 16.5;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const bez = (t, a, c, b) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;

  const drawNet = useCallback((ballY, since, rimDy) => {
    if (!netBackRef.current || !netFrontRef.current) return;
    const pass = clamp((ballY - 72) / (NET_H + 40), 0, 1);
    const sway = since == null ? 0 : 6 * Math.exp(-since / 420) * Math.sin(since / 65);
    const lift = since == null ? 0 : Math.exp(-since / 300) * Math.cos(since / 55);
    const nodes = [];

    for (let j = 0; j <= M; j++) {
      const u = j / M;
      const r = RIM_RX - 14 * Math.pow(u, 0.85);
      const ry = RIM_RY - 3 * u;
      const baseY = 80 + NET_H * u;
      const g = Math.exp(-Math.pow((baseY - ballY) / 15, 2));
      const bulge = (Math.max(0, BALL_R + 1.5 - r) + 3.2) * g;
      const stretch = 7 * u * Math.sin(Math.PI * pass);
      const row = [];
      for (let i = 0; i < N; i++) {
        const ph = (2 * Math.PI * i) / N;
        row.push([
          80 + (r + bulge) * Math.cos(ph) + sway * Math.pow(u, 1.3),
          baseY + rimDy * (1 - u * 0.6) + (ry + bulge * 0.25) * Math.sin(ph) + stretch - 3 * u * lift * (since == null ? 0 : 1),
        ]);
      }
      nodes.push(row);
    }

    let back = '', front = '';
    const p = (n) => n[0].toFixed(1) + ' ' + n[1].toFixed(1);
    for (let i = 0; i < N; i++) {
      const i2 = (i + 1) % N;
      const isFront = Math.sin((2 * Math.PI * (i + 0.5)) / N) > 0;
      let s = '';
      for (let j = 0; j < M; j++) {
        s += `M${p(nodes[j][i])}L${p(nodes[j + 1][i2])}M${p(nodes[j][i2])}L${p(nodes[j + 1][i])}`;
      }
      if (isFront) front += s; else back += s;
    }
    netBackRef.current.setAttribute('d', back);
    netFrontRef.current.setAttribute('d', front);
  }, []);

  const applyHoop = useCallback((ballY, since, te) => {
    if (!rimBackRef.current || !rimFrontRef.current || !boardGroupRef.current) return;
    const rimDy = te == null ? 0 : 2.4 * Math.exp(-te / 240) * Math.sin(te / 36);
    const shake = te == null ? 0 : 1.1 * Math.exp(-te / 320) * Math.sin(te / 48);
    const glow = te == null ? 0 : Math.exp(-te / 500);
    const tr = `translate(0 ${rimDy.toFixed(2)})`;

    rimBackRef.current.setAttribute('transform', tr);
    rimFrontRef.current.setAttribute('transform', tr);
    boardGroupRef.current.setAttribute('transform', `translate(${shake.toFixed(2)} 0)`);

    const f = glow > 0.03 ? `drop-shadow(0 0 ${(7 * glow).toFixed(1)}px rgba(251,146,60,${glow.toFixed(2)}))` : 'none';
    rimBackRef.current.style.filter = f;
    rimFrontRef.current.style.filter = f;
    drawNet(ballY, since, rimDy);
  }, [drawNet]);

  const getAim = useCallback(() => {
    if (!hoopRef.current) return { x: 0, y: 0, rimY: 0, top: 0 };
    const f = hoopRef.current.getBoundingClientRect();
    return { x: f.left + 80, y: f.top + 56, rimY: f.top + 80, top: f.top };
  }, []);

  const getArc = (x1, y1, x2, y2) => {
    const dist = Math.hypot(x1 - x2, y1 - y2);
    return { x: x2 + (x1 - x2) * 0.18, y: Math.min(y1, y2) - Math.max(170, dist * 0.55) };
  };

  const updateTrajectory = useCallback((x, y) => {
    if (!trajectoryPathRef.current || !cursorPointRef.current || !rimPointRef.current) return;
    const a = getAim();
    const cp = getArc(x, y, a.x, a.y);
    trajectoryPathRef.current.setAttribute('d', `M ${x} ${y} Q ${cp.x} ${cp.y} ${a.x} ${a.y}`);
    cursorPointRef.current.setAttribute('cx', x);
    cursorPointRef.current.setAttribute('cy', y);
    rimPointRef.current.setAttribute('cx', a.x);
    rimPointRef.current.setAttribute('cy', a.y);
  }, [getAim]);

  /* ---------------- Confetti celebration ---------------- */
  const startConfetti = useCallback(() => {
    const s = stateRef.current;
    if (s.confettiRunning) return;
    s.confettiRunning = true;
    s.lastConfettiT = performance.now();

    const cv = confettiCanvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');

    const drawStar = (r) => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 ? r * 0.45 : r, ang = (Math.PI / 5) * i - Math.PI / 2;
        ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
      }
      ctx.closePath();
      ctx.fill();
    };

    const drawBalloon = (p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(p.life * 0.04 + p.ph) * 0.12);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, p.h * 0.5 + 4);
      for (let k = 1; k <= 6; k++) ctx.lineTo(Math.sin(p.life * 0.08 + k) * 3 * (k / 6), p.h * 0.5 + 4 + k * 7);
      ctx.stroke();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, p.h / 2 + 5);
      ctx.lineTo(-3.5, p.h / 2 + 1);
      ctx.lineTo(3.5, p.h / 2 + 1);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(-p.w * 0.18, -p.h * 0.2, p.w * 0.1, p.h * 0.18, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const tick = (now) => {
      const k = clamp((now - s.lastConfettiT) / 16.67, 0.2, 2.5);
      s.lastConfettiT = now;
      ctx.clearRect(0, 0, s.confettiW, s.confettiH);

      s.parts = s.parts.filter((p) => {
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
        ctx.save();
        ctx.globalAlpha = clamp((p.ttl - p.life) / 30, 0, 1);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;
        if (p.shape === 'rect') {
          ctx.scale(1, Math.cos(p.tilt));
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        } else if (p.shape === 'circle') {
          ctx.scale(1, Math.abs(Math.cos(p.tilt)) * 0.6 + 0.4);
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, 6.283);
          ctx.fill();
        } else if (p.shape === 'star') {
          ctx.scale(Math.cos(p.tilt), 1);
          drawStar(p.r + 2);
        } else {
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          for (let st = 0; st <= p.len; st += 4) ctx.lineTo(st - p.len / 2, Math.sin(st * 0.35 + p.tilt) * 5);
          ctx.stroke();
        }
        ctx.restore();
        return p.y < s.confettiH + 60 && p.life < p.ttl;
      });

      if (s.parts.length) {
        requestAnimationFrame(tick);
      } else {
        s.confettiRunning = false;
        ctx.clearRect(0, 0, s.confettiW, s.confettiH);
      }
    };
    requestAnimationFrame(tick);
  }, []);

  const celebrate = useCallback((ox, oy) => {
    if (!enableConfetti) return;
    const s = stateRef.current;
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
        s.parts.push(makePiece(x, y, Math.cos(ang) * v, Math.sin(ang) * v));
      }
    };

    const balloon = () => {
      s.parts.push({
        shape: 'balloon', x: rnd(40, s.confettiW - 40), y: s.confettiH + 60, vy: -rnd(2.2, 3.6), color: pick(),
        w: rnd(26, 34), h: rnd(32, 42), life: 0, ph: rnd(0, 6.28)
      });
    };

    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const m = reduce ? 0.3 : 1;

    burst(ox, oy, Math.round(90 * m), -Math.PI / 2, 2.0, 7, 17);
    setTimeout(() => {
      burst(s.confettiW * 0.02, s.confettiH + 10, Math.round(55 * m), -1.1, 0.6, 14, 26);
      burst(s.confettiW * 0.98, s.confettiH + 10, Math.round(55 * m), -Math.PI + 1.1, 0.6, 14, 26);
    }, 120);
    setTimeout(() => burst(ox, oy, Math.round(60 * m), -Math.PI / 2, 2.4, 6, 14), 350);

    if (!reduce) {
      let k = 0;
      const rain = setInterval(() => {
        for (let i = 0; i < 4; i++) s.parts.push(makePiece(rnd(0, s.confettiW), -20, rnd(-1, 1), rnd(1, 3)));
        if (++k > 16) clearInterval(rain);
        startConfetti();
      }, 70);
      for (let i = 0; i < 6; i++) setTimeout(() => { balloon(); startConfetti(); }, rnd(0, 800));
    }
    startConfetti();
  }, [enableConfetti, startConfetti]);

  const onScore = useCallback((x, y, file) => {
    if (pillRef.current) {
      pillRef.current.classList.add('opacity-100', 'translate-y-0', 'scale-100');
      pillRef.current.classList.remove('opacity-0', 'translate-y-2', 'scale-75');
      clearTimeout(stateRef.current.pillTimer);
      stateRef.current.pillTimer = setTimeout(() => {
        if (pillRef.current) {
          pillRef.current.classList.add('opacity-0', 'translate-y-2', 'scale-75');
          pillRef.current.classList.remove('opacity-100', 'translate-y-0', 'scale-100');
        }
      }, 2300);
    }

    celebrate(x, y);
    if (onUpload) onUpload(file);
  }, [celebrate, onUpload]);

  /* ---------------- The shot animation ---------------- */
  const shoot = useCallback((file, sx, sy, trail) => {
    const s = stateRef.current;
    s.isFlying = true;

    if (fileBallNameRef.current) {
      fileBallNameRef.current.textContent = file?.name || 'file';
      fileBallNameRef.current.style.opacity = '1';
    }

    const a = getAim();
    const cp = getArc(sx, sy, a.x, a.y);
    const FLIGHT = 900, G = 0.0028;
    const vx0 = (2 * (a.x - cp.x)) / FLIGHT;
    let vy = (2 * (a.y - cp.y)) / FLIGHT;
    const floor = stageRef.current ? stageRef.current.getBoundingClientRect().bottom - 12 : 300;
    const spin = (sx > a.x ? -1 : 1) * 540;

    let phase = 'fly', x = sx, y = sy, scale = 1, rot = 0, fallT = 0, bounces = 0, squash = 0;
    let scoreAt = null, exitAt = null, fadeAt = null, gone = false;
    const t0 = performance.now();
    let last = t0;

    const ballEl = fileBallRef.current;
    if (ballEl) {
      ballEl.style.opacity = '1';
      ballEl.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`;
      ballEl.style.display = 'flex';
    }

    if (trajectorySvgRef.current) {
      if (trail) {
        trajectorySvgRef.current.style.display = 'block';
        updateTrajectory(sx, sy);
      } else {
        trajectorySvgRef.current.style.display = 'none';
      }
    }

    const frame = (now) => {
      const dt = Math.min(now - last, 32);
      last = now;

      if (!gone) {
        if (phase === 'fly') {
          const t = Math.min((now - t0) / FLIGHT, 1);
          x = bez(t, sx, cp.x, a.x);
          y = bez(t, sy, cp.y, a.y);
          scale = 1 - t * 0.25;
          rot = t * spin;
          if (trajectoryPathRef.current) trajectoryPathRef.current.style.opacity = `${1 - t}`;
          if (fileBallNameRef.current) fileBallNameRef.current.style.opacity = `${1 - clamp((t - 0.5) / 0.3, 0, 1)}`;
          if (t >= 1) {
            phase = 'fall';
            if (trajectorySvgRef.current) trajectorySvgRef.current.style.display = 'none';
            if (trajectoryPathRef.current) trajectoryPathRef.current.style.opacity = '1';
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
            onScore(a.x, a.rimY, file);
          }
          if (exitAt == null && y > a.rimY + NET_H + 4) exitAt = now;
          if (fadeAt == null && (bounces >= 2 || fallT > 1400)) fadeAt = now;
        }

        squash = Math.max(0, squash - dt / 120);
        const sxs = scale * (1 + 0.25 * squash);
        const sys = scale * (1 - 0.2 * squash);
        let alpha = 1;
        if (fadeAt != null) {
          alpha = 1 - (now - fadeAt) / 250;
          if (alpha <= 0) { gone = true; alpha = 0; }
        }
        if (ballEl) {
          ballEl.style.opacity = `${alpha}`;
          ballEl.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${sxs}, ${sys})`;
        }
        if (ballBodyRef.current) {
          ballBodyRef.current.style.transform = `rotate(${rot}deg)`;
        }
        if (gone && ballEl) {
          ballEl.style.display = 'none';
        }
      }

      const since = exitAt == null ? null : now - exitAt;
      const te = scoreAt == null ? null : now - scoreAt;
      applyHoop(gone ? 999 : y - a.top, since, te);

      if (gone && (since == null || since > 1300)) {
        applyHoop(999, null, null);
        s.isFlying = false;
        return;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [applyHoop, getAim, onScore, updateTrajectory]);

  // Setup DOM resize and listeners
  useEffect(() => {
    applyHoop(999, null, null);

    const cv = confettiCanvasRef.current;
    if (cv) {
      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        stateRef.current.confettiW = window.innerWidth;
        stateRef.current.confettiH = window.innerHeight;
        cv.width = window.innerWidth * dpr;
        cv.height = window.innerHeight * dpr;
        const ctx = cv.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    }
  }, [applyHoop]);

  useEffect(() => {
    const s = stateRef.current;
    const target = allowGlobalDrop ? window : containerRef.current;
    if (!target) return;

    const onDragEnter = (e) => {
      e.preventDefault();
      if (s.isFlying) return;
      if (++s.dragCounter === 1) {
        s.isDragging = true;
        if (trajectoryPathRef.current) trajectoryPathRef.current.style.opacity = '1';
        if (trajectorySvgRef.current) trajectorySvgRef.current.style.display = 'block';
        if (dragBannerRef.current) {
          dragBannerRef.current.classList.remove('opacity-0', '-translate-y-4');
          dragBannerRef.current.classList.add('opacity-100', 'translate-y-0');
        }
        updateTrajectory(e.clientX, e.clientY);
      }
    };

    const onDragLeave = (e) => {
      e.preventDefault();
      if (--s.dragCounter <= 0) {
        s.dragCounter = 0;
        s.isDragging = false;
        if (trajectorySvgRef.current) trajectorySvgRef.current.style.display = 'none';
        if (dragBannerRef.current) {
          dragBannerRef.current.classList.add('opacity-0', '-translate-y-4');
          dragBannerRef.current.classList.remove('opacity-100', 'translate-y-0');
        }
      }
    };

    const onDragOver = (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      if (s.isDragging) updateTrajectory(e.clientX, e.clientY);
    };

    const onDrop = (e) => {
      e.preventDefault();
      s.dragCounter = 0;
      s.isDragging = false;
      if (dragBannerRef.current) {
        dragBannerRef.current.classList.add('opacity-0', '-translate-y-4');
        dragBannerRef.current.classList.remove('opacity-100', 'translate-y-0');
      }
      const file = e.dataTransfer?.files?.[0];
      if (file && !s.isFlying) {
        shoot(file, e.clientX, e.clientY, true);
      } else if (trajectorySvgRef.current) {
        trajectorySvgRef.current.style.display = 'none';
      }
    };

    target.addEventListener('dragenter', onDragEnter);
    target.addEventListener('dragleave', onDragLeave);
    target.addEventListener('dragover', onDragOver);
    target.addEventListener('drop', onDrop);

    return () => {
      target.removeEventListener('dragenter', onDragEnter);
      target.removeEventListener('dragleave', onDragLeave);
      target.removeEventListener('dragover', onDragOver);
      target.removeEventListener('drop', onDrop);
      clearTimeout(s.pillTimer);
    };
  }, [allowGlobalDrop, shoot, updateTrajectory]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file || stateRef.current.isFlying) return;
    if (browseLabelRef.current) {
      const r = browseLabelRef.current.getBoundingClientRect();
      shoot(file, r.left + r.width / 2, r.top, false);
    }
  };

  return (
    <>
      {/* Celebration Confetti Layer */}
      <canvas ref={confettiCanvasRef} className="pointer-events-none fixed inset-0 z-[60]" />

      {/* Trajectory Guide SVG */}
      <svg ref={trajectorySvgRef} className="pointer-events-none fixed inset-0 h-full w-full z-30" style={{ display: 'none' }}>
        <path
          ref={trajectoryPathRef}
          fill="none"
          stroke="#f97316"
          strokeWidth="3"
          strokeLinecap="round"
          className="stroke-[6_6] [stroke-dasharray:6_6] animate-[dashMove_0.5s_linear_infinite] drop-shadow-[0_0_10px_rgba(249,115,22,0.85)]"
        />
        <circle ref={cursorPointRef} r="7" fill="#fb923c" />
        <circle ref={rimPointRef} r="6" fill="#f97316" className="animate-ping" />
      </svg>

      {/* Flying Basketball Element */}
      <div
        ref={fileBallRef}
        className="fixed top-0 left-0 pointer-events-none z-[38] will-change-transform items-center justify-center"
        style={{ display: 'none', width: '44px', height: '44px' }}
      >
        <div ref={ballBodyRef} className="relative h-11 w-11">
          <svg viewBox="0 0 44 44" className="h-11 w-11 drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)]">
            <defs>
              <radialGradient id="reactBallShade" cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="60%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#9a3412" />
              </radialGradient>
            </defs>
            <circle cx="22" cy="22" r="20" fill="url(#reactBallShade)" stroke="#431407" strokeWidth="1.6" />
            <path d="M2 22 H42 M22 2 V42 M7 8 C16 16 16 28 7 36 M37 8 C28 16 28 28 37 36" stroke="#431407" strokeWidth="1.5" fill="none" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-base">📄</span>
        </div>
        <span
          ref={fileBallNameRef}
          className="absolute left-1/2 top-full mt-1 max-w-[140px] -translate-x-1/2 truncate whitespace-nowrap rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-orange-200"
        >
          file
        </span>
      </div>

      {/* Floating Drag Hint */}
      <div
        ref={dragBannerRef}
        className="fixed top-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 opacity-0 -translate-y-4 pointer-events-none bg-orange-500/15 border border-orange-500/30 px-6 py-2 rounded-full backdrop-blur-md text-orange-400 text-xs font-semibold tracking-wide shadow-lg"
      >
        🏀 Release to shoot file into the hoop!
      </div>

      {/* Main Basketball Uploader Card */}
      <div
        ref={containerRef}
        className={`relative w-full max-w-sm rounded-3xl border border-slate-800 bg-[#0f172a] p-8 shadow-2xl flex flex-col items-center select-none font-sans text-white ${className}`}
      >
        {/* Court Stage */}
        <div
          ref={stageRef}
          className="relative h-60 w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/90"
          style={{ backgroundImage: 'radial-gradient(ellipse at 50% 55%, rgba(249,115,22,0.10), transparent 60%)' }}
        >
          {/* Court floor */}
          <div className="absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-amber-800/50 to-amber-900/10 border-t border-amber-700/30" />

          {/* Swish Pill */}
          <div className="pointer-events-none absolute inset-x-0 top-3 z-50 flex justify-center">
            <div
              ref={pillRef}
              className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur opacity-0 translate-y-2 scale-75 transition-all duration-300"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/30 text-[10px]">✓</span>
              {successText}
            </div>
          </div>

          {/* Hoop and Net Layers */}
          <div ref={hoopRef} className="absolute bottom-5" style={{ left: 'calc(50% - 80px)', width: '160px', height: '150px' }}>
            {/* Back layer */}
            <svg className="absolute inset-0 z-10" width="160" height="150" viewBox="0 0 160 150" fill="none" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="reactGlass" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#e2e8f0" stopOpacity="0.3" />
                  <stop offset="0.5" stopColor="#94a3b8" stopOpacity="0.12" />
                  <stop offset="1" stopColor="#e2e8f0" stopOpacity="0.22" />
                </linearGradient>
                <clipPath id="reactBoardClip">
                  <rect x="26" y="2" width="108" height="68" rx="6" />
                </clipPath>
              </defs>
              <g ref={boardGroupRef}>
                <rect x="26" y="2" width="108" height="68" rx="6" fill="url(#reactGlass)" stroke="#cbd5e1" strokeWidth="2.5" />
                <g clipPath="url(#reactBoardClip)">
                  <path d="M40 0 L62 0 L34 72 L12 72Z" fill="#fff" opacity="0.07" />
                  <path d="M70 0 L78 0 L50 72 L42 72Z" fill="#fff" opacity="0.05" />
                </g>
                <rect x="31" y="7" width="98" height="58" rx="3" stroke="#fff" strokeOpacity="0.16" />
                <rect x="61" y="36" width="38" height="26" rx="1.5" stroke="#ef4444" strokeWidth="2.5" />
              </g>
              <rect x="71" y="68" width="18" height="7" rx="1.5" fill="#64748b" />
              <g ref={rimBackRef}>
                <path d="M48 80 A32 7 0 0 1 112 80" stroke="#b45309" strokeWidth="4" strokeLinecap="round" />
              </g>
              <path ref={netBackRef} stroke="#e2e8f0" strokeWidth="1.1" strokeOpacity="0.55" strokeLinecap="round" />
            </svg>

            {/* Front layer */}
            <svg className="pointer-events-none absolute inset-0 z-40" width="160" height="150" viewBox="0 0 160 150" fill="none" style={{ overflow: 'visible' }}>
              <path ref={netFrontRef} stroke="#f8fafc" strokeWidth="1.3" strokeOpacity="0.95" strokeLinecap="round" />
              <g ref={rimFrontRef}>
                <path d="M48 80 A32 7 0 0 0 112 80" stroke="#ea580c" strokeWidth="5" strokeLinecap="round" />
                <path d="M50 79.2 A30 5.6 0 0 0 110 79.2" stroke="#fdba74" strokeWidth="1.2" strokeOpacity="0.85" strokeLinecap="round" />
                <circle cx="48" cy="80" r="2.6" fill="#c2410c" />
                <circle cx="112" cy="80" r="2.6" fill="#c2410c" />
              </g>
            </svg>
          </div>
        </div>

        {/* Upload Controls */}
        <div className="mt-6 w-full text-center">
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          <label
            ref={browseLabelRef}
            className="mt-4 inline-block w-full cursor-pointer rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-orange-600/30 transition hover:bg-orange-500 active:scale-95"
          >
            {buttonText}
            <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      </div>
    </>
  );
}
