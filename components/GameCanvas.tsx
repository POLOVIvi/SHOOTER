'use client';

import { useRef, useEffect, useState } from 'react';

interface Arrow {
  x: number; y: number;
  vx: number; vy: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; size: number; color: string;
}

type GameCanvasProps = {
  onExit: () => void;
};

export default function GameCanvas({ onExit }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [isPortrait, setIsPortrait] = useState(false);

  /* ──────────────────────────────────────────────
     Game engine — runs entirely inside useEffect
     ────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasEl = canvas;
    const ctx = canvasEl.getContext('2d')!;

    let W = 0, H = 0, ground = 0;
    let animId = 0;
    let lastTime = 0;

    const GRAVITY = 600;
    const MAX_PULL = 140;
    const ARROW_SPEED_FACTOR = 6;

    const archer = { x: 0, y: 0, bowRadius: 30 };
    const target = { x: 0, y: 0, radius: 32 };

    const arrows: Arrow[] = [];
    const particles: Particle[] = [];
    let dragging = false;
    const dragStart = { x: 0, y: 0 };
    const dragCurrent = { x: 0, y: 0 };
    let scoreVal = 0;

    // ─── Helpers ───

    function resize() {
      W = canvasEl.width = window.innerWidth;
      H = canvasEl.height = window.innerHeight;
      ground = H * 0.78;
      const p = window.innerHeight > window.innerWidth;
      setIsPortrait(p);
      if (p) dragging = false;
    }

    function placeArcher() {
      archer.x = W * 0.12;
      archer.y = ground - 2;
    }

    function placeTarget() {
      target.x = W * 0.82 + Math.random() * W * 0.1;
      const minY = H * 0.15;
      const maxY = ground - target.radius - 10;
      target.y = minY + Math.random() * (maxY - minY);
    }

    function bowHandPos() {
      return { x: archer.x + 18, y: archer.y - 58 };
    }

    function inputBlocked() {
      return window.innerHeight > window.innerWidth;
    }

    // ─── Input ───

    function getPos(e: MouseEvent | TouchEvent) {
      if ('touches' in e && e.touches.length)
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const me = e as MouseEvent;
      return { x: me.clientX, y: me.clientY };
    }

    function onDown(e: Event) {
      e.preventDefault();
      if (inputBlocked()) return;
      const p = getPos(e as MouseEvent | TouchEvent);
      const hand = bowHandPos();
      const dx = p.x - hand.x;
      const dy = p.y - hand.y;
      if (Math.sqrt(dx * dx + dy * dy) < 120) {
        dragging = true;
        dragStart.x = hand.x;
        dragStart.y = hand.y;
        dragCurrent.x = p.x;
        dragCurrent.y = p.y;
      }
    }

    function onMove(e: Event) {
      e.preventDefault();
      if (inputBlocked() || !dragging) return;
      const p = getPos(e as MouseEvent | TouchEvent);
      dragCurrent.x = p.x;
      dragCurrent.y = p.y;
    }

    function onUp(e: Event) {
      e.preventDefault();
      if (inputBlocked() || !dragging) return;
      dragging = false;

      let dx = dragStart.x - dragCurrent.x;
      let dy = dragStart.y - dragCurrent.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 10) return;

      if (dist > MAX_PULL) {
        dx = dx / dist * MAX_PULL;
        dy = dy / dist * MAX_PULL;
        dist = MAX_PULL;
      }

      const power = dist / MAX_PULL;
      const speed = power * ARROW_SPEED_FACTOR * 200;
      const angle = Math.atan2(dy, dx);
      const hand = bowHandPos();

      arrows.push({
        x: hand.x, y: hand.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      });
    }

    // ─── Drawing ───

    function drawSky() {
      const grad = ctx.createLinearGradient(0, 0, 0, ground);
      grad.addColorStop(0, '#4a90d9');
      grad.addColorStop(0.7, '#87ceeb');
      grad.addColorStop(1, '#b8e6b8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, ground);
    }

    function drawGround() {
      const grad = ctx.createLinearGradient(0, ground, 0, H);
      grad.addColorStop(0, '#5a8f3c');
      grad.addColorStop(0.3, '#4a7a30');
      grad.addColorStop(1, '#3a6025');
      ctx.fillStyle = grad;
      ctx.fillRect(0, ground, W, H - ground);
    }

    function drawCloud(cx: number, cy: number, scale: number) {
      const puffs = [
        { dx: 0, dy: 0, r: 25 },
        { dx: 24, dy: -10, r: 22 },
        { dx: -22, dy: -3, r: 19 },
        { dx: 46, dy: 2, r: 15 },
        { dx: -40, dy: 4, r: 14 },
        { dx: 10, dy: -16, r: 18 },
      ];
      ctx.save();
      ctx.shadowColor = 'rgba(100,120,150,0.18)';
      ctx.shadowBlur = 10 * scale;
      ctx.shadowOffsetY = 5 * scale;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      for (const p of puffs)
        ctx.arc(cx + p.dx * scale, cy + p.dy * scale, p.r * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      for (const p of puffs)
        ctx.arc(cx + p.dx * scale, cy + (p.dy - 5) * scale, p.r * scale * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawClouds(time: number) {
      for (let i = 0; i < 4; i++) {
        const cx = ((time * 0.015 * (i + 1) * 0.4 + i * 350) % (W + 200)) - 100;
        const cy = 40 + i * 50;
        drawCloud(cx, cy, 1.0 + i * 0.15);
      }
    }

    function drawArrowhead(x: number, y: number, angle: number) {
      const size = 7;
      ctx.fillStyle = '#555';
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
      ctx.lineTo(x + Math.cos(angle + 2.5) * size, y + Math.sin(angle + 2.5) * size);
      ctx.lineTo(x + Math.cos(angle - 2.5) * size, y + Math.sin(angle - 2.5) * size);
      ctx.closePath();
      ctx.fill();
    }

    function drawStickman(x: number, y: number, pullVec: { x: number; y: number } | null, time: number) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const headR = 12;
      const headY = y - 80;

      ctx.beginPath();
      ctx.arc(x, headY, headR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, headY + headR);
      ctx.lineTo(x, y - 30);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, y - 30);
      ctx.lineTo(x - 14, y);
      ctx.moveTo(x, y - 30);
      ctx.lineTo(x + 14, y);
      ctx.stroke();

      const hand = bowHandPos();
      ctx.beginPath();
      ctx.moveTo(x, headY + headR + 10);
      ctx.lineTo(hand.x, hand.y);
      ctx.stroke();

      const bR = archer.bowRadius;
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hand.x + bR * 0.3, hand.y, bR, Math.PI * 0.6, Math.PI * 1.4, true);
      ctx.stroke();

      const bowTop = {
        x: hand.x + bR * 0.3 + Math.cos(Math.PI * 0.6) * bR,
        y: hand.y + Math.sin(Math.PI * 0.6) * bR,
      };
      const bowBot = {
        x: hand.x + bR * 0.3 + Math.cos(Math.PI * 1.4) * bR,
        y: hand.y + Math.sin(Math.PI * 1.4) * bR,
      };

      const shoulder = { x, y: headY + headR + 10 };
      const drawArmAnchor = { x: x - 12, y: y - 44 };

      const adx = drawArmAnchor.x - shoulder.x;
      const ady = drawArmAnchor.y - shoulder.y;
      const armLen = Math.sqrt(adx * adx + ady * ady);
      const vx = adx / armLen;
      const vy = ady / armLen;
      const perpX = -vy;
      const perpY = vx;

      const pullStrength = pullVec
        ? Math.min(1, Math.sqrt(pullVec.x * pullVec.x + pullVec.y * pullVec.y) / MAX_PULL)
        : 0;
      const bend = 8 + Math.sin(time * 0.002) * 1.5 + pullStrength * 3;

      const elbow = {
        x: shoulder.x + vx * armLen * 0.5 + perpX * bend,
        y: shoulder.y + vy * armLen * 0.5 + perpY * bend,
      };

      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(shoulder.x, shoulder.y);
      ctx.lineTo(elbow.x, elbow.y);
      ctx.lineTo(drawArmAnchor.x, drawArmAnchor.y);
      ctx.stroke();

      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 1.5;

      if (pullVec) {
        const px = hand.x + pullVec.x;
        const py = hand.y + pullVec.y;

        ctx.beginPath();
        ctx.moveTo(bowTop.x, bowTop.y);
        ctx.lineTo(px, py);
        ctx.lineTo(bowBot.x, bowBot.y);
        ctx.stroke();

        ctx.strokeStyle = '#8B5E3C';
        ctx.lineWidth = 2;
        const arrLen = 50;
        const angle = Math.atan2(-pullVec.y, -pullVec.x);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(angle) * arrLen, py + Math.sin(angle) * arrLen);
        ctx.stroke();
        drawArrowhead(px + Math.cos(angle) * arrLen, py + Math.sin(angle) * arrLen, angle);
      } else {
        ctx.beginPath();
        ctx.moveTo(bowTop.x, bowTop.y);
        ctx.lineTo(bowBot.x, bowBot.y);
        ctx.stroke();
      }
    }

    function drawFlyingArrow(a: Arrow) {
      const angle = Math.atan2(a.vy, a.vx);
      const len = 45;
      const tx = a.x - Math.cos(angle) * len;
      const ty = a.y - Math.sin(angle) * len;

      ctx.strokeStyle = '#8B5E3C';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(a.x, a.y);
      ctx.stroke();

      drawArrowhead(a.x, a.y, angle);

      const fAngle1 = angle + 0.4;
      const fAngle2 = angle - 0.4;
      ctx.strokeStyle = '#c55';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + Math.cos(fAngle1) * 8, ty + Math.sin(fAngle1) * 8);
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + Math.cos(fAngle2) * 8, ty + Math.sin(fAngle2) * 8);
      ctx.stroke();
    }

    function drawTarget(tx: number, ty: number, r: number) {
      const colors = ['#e74c3c', '#ecf0f1', '#e74c3c'];
      for (let i = colors.length - 1; i >= 0; i--) {
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.arc(tx, ty, r * (i + 1) / colors.length, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.arc(tx, ty, r * 0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(tx, ty + r);
      ctx.lineTo(tx, ground);
      ctx.moveTo(tx - 15, ground);
      ctx.lineTo(tx + 15, ground);
      ctx.stroke();
    }

    // ─── Particles ───

    function spawnHitParticles(px: number, py: number) {
      const palette = ['#e74c3c', '#f39c12', '#ecf0f1', '#e67e22'];
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 80 + Math.random() * 160;
        particles.push({
          x: px, y: py,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 0.6 + Math.random() * 0.4,
          size: 2 + Math.random() * 3,
          color: palette[Math.floor(Math.random() * 4)],
        });
      }
    }

    function updateParticles(dt: number) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 300 * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }
    }

    function drawParticles() {
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ─── Loop ───

    function update(dt: number) {
      for (let i = arrows.length - 1; i >= 0; i--) {
        const a = arrows[i];
        a.vy += GRAVITY * dt;
        a.x += a.vx * dt;
        a.y += a.vy * dt;

        const dx = a.x - target.x;
        const dy = a.y - target.y;
        if (Math.sqrt(dx * dx + dy * dy) < target.radius + 4) {
          scoreVal++;
          setDisplayScore(scoreVal);
          spawnHitParticles(target.x, target.y);
          arrows.splice(i, 1);
          placeTarget();
          continue;
        }

        if (a.x > W + 100 || a.y > H + 100 || a.x < -100 || a.y < -200) {
          arrows.splice(i, 1);
        }
      }

      updateParticles(dt);
    }

    function draw(time: number) {
      ctx.clearRect(0, 0, W, H);
      drawSky();
      drawClouds(time);
      drawGround();

      placeArcher();

      let pullVec: { x: number; y: number } | null = null;
      if (dragging) {
        let dx = dragCurrent.x - dragStart.x;
        let dy = dragCurrent.y - dragStart.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > MAX_PULL) {
          dx = dx / dist * MAX_PULL;
          dy = dy / dist * MAX_PULL;
        }
        pullVec = { x: dx, y: dy };
      }

      drawStickman(archer.x, archer.y, pullVec, time);

      drawTarget(target.x, target.y, target.radius);
      for (const a of arrows) drawFlyingArrow(a);
      drawParticles();
    }

    function loop(timestamp: number) {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;
      update(dt);
      draw(timestamp);
      animId = requestAnimationFrame(loop);
    }

    // ─── Bootstrap ───
    resize();
    placeTarget();

    window.addEventListener('resize', resize);
    canvasEl.addEventListener('mousedown', onDown);
    canvasEl.addEventListener('mousemove', onMove);
    canvasEl.addEventListener('mouseup', onUp);
    canvasEl.addEventListener('touchstart', onDown, { passive: false });
    canvasEl.addEventListener('touchmove', onMove, { passive: false });
    canvasEl.addEventListener('touchend', onUp, { passive: false });
    canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());

    animId = requestAnimationFrame((t) => {
      lastTime = t;
      loop(t);
    });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      canvasEl.removeEventListener('mousedown', onDown);
      canvasEl.removeEventListener('mousemove', onMove);
      canvasEl.removeEventListener('mouseup', onUp);
      canvasEl.removeEventListener('touchstart', onDown);
      canvasEl.removeEventListener('touchmove', onMove);
      canvasEl.removeEventListener('touchend', onUp);
    };
  }, []);

  // ─── Render ───

  return (
    <>
      {isPortrait && (
        <div className="rotate-overlay">
          <div className="rotate-icon">📱</div>
          <p>Rotate your device to landscape</p>
        </div>
      )}

      <div className="hud">
        <button className="btn-exit" onClick={onExit}>NEW GAME</button>
        <div className="hud-pill">Score: {displayScore}</div>
      </div>

      <canvas ref={canvasRef} />
    </>
  );
}
