import { useEffect, useRef, useCallback, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────
interface Vec2 { x: number; y: number }
interface Tank {
  pos: Vec2; vel: Vec2; angle: number; turretAngle: number;
  hp: number; maxHp: number; speed: number; rotSpeed: number;
  accel: number; friction: number;
  cooldown: number; maxCooldown: number; color: string; trackColor: string;
  width: number; height: number;
}
interface Bullet { pos: Vec2; vel: Vec2; owner: "player" | "ai"; life: number }
interface Obstacle { pos: Vec2; w: number; h: number }
interface Particle { pos: Vec2; vel: Vec2; life: number; maxLife: number; color: string; size: number }
interface GameState {
  player: Tank; ai: Tank; bullets: Bullet[]; obstacles: Obstacle[];
  particles: Particle[]; score: number; gameOver: boolean; winner: string;
}

const CANVAS_W = 960;
const CANVAS_H = 640;
const BULLET_SPEED = 6;
const BULLET_DAMAGE = 12;
const AI_REACTION = 0.02;

// ── Helpers ────────────────────────────────────────────────────────────
const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
const angleTo = (a: Vec2, b: Vec2) => Math.atan2(b.y - a.y, b.x - a.x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rng = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

function rectCollide(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function spawnParticles(particles: Particle[], pos: Vec2, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = rng(0.5, 3);
    particles.push({
      pos: { ...pos }, vel: { x: Math.cos(a) * sp, y: Math.sin(a) * sp },
      life: rng(15, 35), maxLife: 35, color, size: rng(1.5, 4),
    });
  }
}

function generateObstacles(): Obstacle[] {
  const obs: Obstacle[] = [];
  const count = 12 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const w = rng(30, 80);
    const h = rng(30, 80);
    const x = rng(60, CANVAS_W - 60 - w);
    const y = rng(60, CANVAS_H - 60 - h);
    // avoid spawn zones
    if (dist({ x: x + w / 2, y: y + h / 2 }, { x: 80, y: CANVAS_H / 2 }) < 120) continue;
    if (dist({ x: x + w / 2, y: y + h / 2 }, { x: CANVAS_W - 80, y: CANVAS_H / 2 }) < 120) continue;
    obs.push({ pos: { x, y }, w, h });
  }
  return obs;
}

function makeTank(x: number, y: number, color: string, trackColor: string): Tank {
  return {
    pos: { x, y }, angle: 0, turretAngle: 0,
    hp: 100, maxHp: 100, speed: 2.2, rotSpeed: 0.04,
    cooldown: 0, maxCooldown: 25, color, trackColor,
    width: 36, height: 28,
  };
}

function initState(): GameState {
  return {
    player: makeTank(80, CANVAS_H / 2, "#3a7d44", "#2d5e33"),
    ai: makeTank(CANVAS_W - 80, CANVAS_H / 2, "#b84040", "#8c3030"),
    bullets: [], obstacles: generateObstacles(), particles: [],
    score: 0, gameOver: false, winner: "",
  };
}

// ── Component ──────────────────────────────────────────────────────────
export default function TankGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(initState());
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef<Vec2>({ x: CANVAS_W / 2, y: CANVAS_H / 2 });
  const mouseDownRef = useRef(false);
  const rafRef = useRef<number>(0);
  const [score, setScore] = useState(0);
  const [playerHp, setPlayerHp] = useState(100);
  const [aiHp, setAiHp] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState("");

  const restart = useCallback(() => {
    stateRef.current = initState();
    setScore(0); setPlayerHp(100); setAiHp(100);
    setGameOver(false); setWinner("");
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) {
        e.preventDefault();
        down ? keysRef.current.add(k) : keysRef.current.delete(k);
      }
    };
    const onMouse = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - r.left) * (CANVAS_W / r.width),
        y: (e.clientY - r.top) * (CANVAS_H / r.height),
      };
    };
    const onMouseDown = () => { mouseDownRef.current = true; };
    const onMouseUp = () => { mouseDownRef.current = false; };

    window.addEventListener("keydown", e => onKey(e, true));
    window.addEventListener("keyup", e => onKey(e, false));
    canvas.addEventListener("mousemove", onMouse);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);

    // ── Game loop ──────────────────────────────────────────────────
    const loop = () => {
      const S = stateRef.current;
      if (!S.gameOver) {
        updatePlayer(S);
        updateAI(S);
        updateBullets(S);
        updateParticles(S);
        // sync react state
        setScore(S.score);
        setPlayerHp(S.player.hp);
        setAiHp(S.ai.hp);
        if (S.gameOver) { setGameOver(true); setWinner(S.winner); }
      }
      draw(ctx, S);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", e => onKey(e, true));
      window.removeEventListener("keyup", e => onKey(e, false));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Player update ────────────────────────────────────────────────
  function updatePlayer(S: GameState) {
    const k = keysRef.current;
    const p = S.player;
    let move = 0, rot = 0;
    if (k.has("w") || k.has("arrowup")) move += 1;
    if (k.has("s") || k.has("arrowdown")) move -= 1;
    if (k.has("a") || k.has("arrowleft")) rot -= 1;
    if (k.has("d") || k.has("arrowright")) rot += 1;

    p.angle += rot * p.rotSpeed;
    const nx = p.pos.x + Math.cos(p.angle) * move * p.speed;
    const ny = p.pos.y + Math.sin(p.angle) * move * p.speed;
    if (!collidesObstacles(nx, ny, p.width, p.height, S.obstacles)) {
      p.pos.x = clamp(nx, p.width / 2, CANVAS_W - p.width / 2);
      p.pos.y = clamp(ny, p.height / 2, CANVAS_H - p.height / 2);
    }
    p.turretAngle = angleTo(p.pos, mouseRef.current);
    p.cooldown = Math.max(0, p.cooldown - 1);

    if ((mouseDownRef.current || k.has(" ")) && p.cooldown === 0) {
      fireBullet(S, p, "player");
      p.cooldown = p.maxCooldown;
    }
  }

  // ── AI update ────────────────────────────────────────────────────
  function updateAI(S: GameState) {
    const ai = S.ai;
    const p = S.player;
    const d = dist(ai.pos, p.pos);
    const targetAngle = angleTo(ai.pos, p.pos);

    // rotate body toward player
    let diff = targetAngle - ai.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    ai.angle += clamp(diff, -ai.rotSpeed, ai.rotSpeed);

    // turret tracks player with lag
    ai.turretAngle = lerp(ai.turretAngle, targetAngle, AI_REACTION + 0.03);

    // move toward player but keep distance
    const idealDist = 200 + Math.sin(Date.now() * 0.001) * 80;
    let move = 0;
    if (d > idealDist + 30) move = 1;
    else if (d < idealDist - 30) move = -1;

    // strafe
    const strafeAngle = ai.angle + Math.PI / 2;
    const strafe = Math.sin(Date.now() * 0.0015) * 0.8;

    const nx = ai.pos.x + Math.cos(ai.angle) * move * ai.speed * 0.8 + Math.cos(strafeAngle) * strafe;
    const ny = ai.pos.y + Math.sin(ai.angle) * move * ai.speed * 0.8 + Math.sin(strafeAngle) * strafe;
    if (!collidesObstacles(nx, ny, ai.width, ai.height, S.obstacles)) {
      ai.pos.x = clamp(nx, ai.width / 2, CANVAS_W - ai.width / 2);
      ai.pos.y = clamp(ny, ai.height / 2, CANVAS_H - ai.height / 2);
    }

    // dodge bullets
    for (const b of S.bullets) {
      if (b.owner === "ai") continue;
      if (dist(b.pos, ai.pos) < 100) {
        const dodge = angleTo(b.pos, ai.pos) + Math.PI / 2;
        const dx = Math.cos(dodge) * 2;
        const dy = Math.sin(dodge) * 2;
        if (!collidesObstacles(ai.pos.x + dx, ai.pos.y + dy, ai.width, ai.height, S.obstacles)) {
          ai.pos.x = clamp(ai.pos.x + dx, ai.width / 2, CANVAS_W - ai.width / 2);
          ai.pos.y = clamp(ai.pos.y + dy, ai.height / 2, CANVAS_H - ai.height / 2);
        }
      }
    }

    ai.cooldown = Math.max(0, ai.cooldown - 1);
    if (ai.cooldown === 0 && d < 500) {
      // check line of sight
      if (hasLineOfSight(ai.pos, p.pos, S.obstacles)) {
        fireBullet(S, ai, "ai");
        ai.cooldown = ai.maxCooldown + Math.floor(rng(5, 20));
      }
    }
  }

  function hasLineOfSight(from: Vec2, to: Vec2, obs: Obstacle[]): boolean {
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = lerp(from.x, to.x, t);
      const y = lerp(from.y, to.y, t);
      for (const o of obs) {
        if (x > o.pos.x && x < o.pos.x + o.w && y > o.pos.y && y < o.pos.y + o.h) return false;
      }
    }
    return true;
  }

  function collidesObstacles(x: number, y: number, w: number, h: number, obs: Obstacle[]): boolean {
    for (const o of obs) {
      if (rectCollide(x - w / 2, y - h / 2, w, h, o.pos.x, o.pos.y, o.w, o.h)) return true;
    }
    return false;
  }

  function fireBullet(S: GameState, tank: Tank, owner: "player" | "ai") {
    const barrel = 24;
    S.bullets.push({
      pos: {
        x: tank.pos.x + Math.cos(tank.turretAngle) * barrel,
        y: tank.pos.y + Math.sin(tank.turretAngle) * barrel,
      },
      vel: {
        x: Math.cos(tank.turretAngle) * BULLET_SPEED,
        y: Math.sin(tank.turretAngle) * BULLET_SPEED,
      },
      owner, life: 120,
    });
    spawnParticles(S.particles, {
      x: tank.pos.x + Math.cos(tank.turretAngle) * barrel,
      y: tank.pos.y + Math.sin(tank.turretAngle) * barrel,
    }, "#e8c44a", 5);
  }

  function updateBullets(S: GameState) {
    for (let i = S.bullets.length - 1; i >= 0; i--) {
      const b = S.bullets[i];
      b.pos.x += b.vel.x;
      b.pos.y += b.vel.y;
      b.life--;

      // out of bounds
      if (b.pos.x < 0 || b.pos.x > CANVAS_W || b.pos.y < 0 || b.pos.y > CANVAS_H || b.life <= 0) {
        S.bullets.splice(i, 1); continue;
      }

      // obstacle collision
      let hitObs = false;
      for (const o of S.obstacles) {
        if (b.pos.x > o.pos.x && b.pos.x < o.pos.x + o.w && b.pos.y > o.pos.y && b.pos.y < o.pos.y + o.h) {
          spawnParticles(S.particles, b.pos, "#888", 4);
          hitObs = true; break;
        }
      }
      if (hitObs) { S.bullets.splice(i, 1); continue; }

      // hit tanks
      const target = b.owner === "player" ? S.ai : S.player;
      if (dist(b.pos, target.pos) < 18) {
        target.hp -= BULLET_DAMAGE;
        spawnParticles(S.particles, b.pos, b.owner === "player" ? "#ff6644" : "#44cc66", 8);
        S.bullets.splice(i, 1);
        if (target.hp <= 0) {
          target.hp = 0;
          S.gameOver = true;
          S.winner = b.owner === "player" ? "You Win!" : "AI Wins!";
          if (b.owner === "player") S.score += 100;
          spawnParticles(S.particles, target.pos, target.color, 30);
        }
        if (b.owner === "player") S.score += 10;
      }
    }
  }

  function updateParticles(S: GameState) {
    for (let i = S.particles.length - 1; i >= 0; i--) {
      const p = S.particles[i];
      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;
      p.vel.x *= 0.96;
      p.vel.y *= 0.96;
      p.life--;
      if (p.life <= 0) S.particles.splice(i, 1);
    }
  }

  // ── Drawing ──────────────────────────────────────────────────────
  function draw(ctx: CanvasRenderingContext2D, S: GameState) {
    // ground
    ctx.fillStyle = "#1e2b1e";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ground texture (subtle grid)
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    }

    // obstacles
    for (const o of S.obstacles) {
      ctx.fillStyle = "#3a4a3a";
      ctx.fillRect(o.pos.x, o.pos.y, o.w, o.h);
      ctx.strokeStyle = "#4a5c4a";
      ctx.lineWidth = 1;
      ctx.strokeRect(o.pos.x + 0.5, o.pos.y + 0.5, o.w - 1, o.h - 1);
      // hatching
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      for (let d = -o.h; d < o.w; d += 8) {
        ctx.beginPath();
        ctx.moveTo(o.pos.x + Math.max(0, d), o.pos.y + Math.max(0, -d));
        ctx.lineTo(o.pos.x + Math.min(o.w, d + o.h), o.pos.y + Math.min(o.h, o.h - d));
        ctx.stroke();
      }
    }

    // particles
    for (const p of S.particles) {
      const a = p.life / p.maxLife;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // bullets
    for (const b of S.bullets) {
      ctx.fillStyle = "#e8c44a";
      ctx.shadowColor = "#e8c44a";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(b.pos.x, b.pos.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // tanks
    drawTank(ctx, S.player);
    drawTank(ctx, S.ai);
  }

  function drawTank(ctx: CanvasRenderingContext2D, t: Tank) {
    ctx.save();
    ctx.translate(t.pos.x, t.pos.y);

    // body
    ctx.rotate(t.angle);
    // tracks
    ctx.fillStyle = t.trackColor;
    ctx.fillRect(-t.width / 2, -t.height / 2, t.width, 5);
    ctx.fillRect(-t.width / 2, t.height / 2 - 5, t.width, 5);
    // hull
    ctx.fillStyle = t.color;
    ctx.fillRect(-t.width / 2 + 3, -t.height / 2 + 3, t.width - 6, t.height - 6);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-t.width / 2 + 3, -t.height / 2 + 3, t.width - 6, t.height - 6);
    ctx.rotate(-t.angle);

    // turret
    ctx.rotate(t.turretAngle);
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(0, -3, 24, 6);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(0, -3, 24, 6);
    ctx.restore();

    // hp bar
    const barW = 34;
    const barH = 4;
    const barY = t.pos.y - t.height / 2 - 12;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(t.pos.x - barW / 2, barY, barW, barH);
    const hpRatio = t.hp / t.maxHp;
    ctx.fillStyle = hpRatio > 0.5 ? "#4a8" : hpRatio > 0.25 ? "#ca4" : "#c44";
    ctx.fillRect(t.pos.x - barW / 2, barY, barW * hpRatio, barH);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4 p-4">
      {/* HUD */}
      <div className="flex items-center gap-8 text-foreground font-mono text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "#3a7d44" }} />
          <span>YOU</span>
          <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all duration-200" style={{ width: `${playerHp}%`, background: playerHp > 50 ? "#4a8" : playerHp > 25 ? "#ca4" : "#c44" }} />
          </div>
          <span className="w-8 text-right">{playerHp}</span>
        </div>
        <div className="px-4 py-1 rounded bg-secondary text-primary font-bold tracking-wider">
          SCORE: {score}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "#b84040" }} />
          <span>AI</span>
          <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all duration-200" style={{ width: `${aiHp}%`, background: aiHp > 50 ? "#4a8" : aiHp > 25 ? "#ca4" : "#c44" }} />
          </div>
          <span className="w-8 text-right">{aiHp}</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded border border-border overflow-hidden shadow-lg shadow-black/40">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block cursor-crosshair"
          style={{ maxWidth: "100%", height: "auto" }}
        />
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
            <h2 className="text-4xl font-bold text-foreground mb-2 tracking-wide" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
              {winner}
            </h2>
            <p className="text-muted-foreground mb-6 font-mono">Final Score: {score}</p>
            <button
              onClick={restart}
              className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded hover:opacity-90 active:scale-95 transition-all"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <p className="text-muted-foreground text-xs font-mono tracking-wide">
        WASD / Arrows to move · Mouse to aim · Click / Space to fire
      </p>
    </div>
  );
}
