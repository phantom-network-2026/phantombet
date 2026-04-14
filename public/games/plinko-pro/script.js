// --- SPLASH LOGIC ---
window.onload = () => {
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 800);
    }, 2500);
};

// --- SKINS DATA ---
const SKINS = [
    { id: 'red', name: 'Classic Red', type: 'gradient', colors: ['#ff8888', '#dc2626'], unlock: 'free' },
    { id: 'blue', name: 'Deep Blue', type: 'gradient', colors: ['#60a5fa', '#2563eb'], unlock: 'free' },
    { id: 'gold', name: 'Golden', type: 'gradient', colors: ['#fde047', '#eab308'], unlock: 'ad' },
    { id: 'neon', name: 'Neon', type: 'glow', colors: ['#d8b4fe', '#a855f7'], unlock: 'ad' },
    { id: 'nature', name: 'Nature', type: 'gradient', colors: ['#86efac', '#16a34a'], unlock: 'ad' },
    { id: 'hacker', name: 'Hacker', type: 'text', content: '101', color: '#22c55e', bg: '#000', unlock: 'ad' },
    { id: '8ball', name: '8 Ball', type: '8ball', unlock: 'ad' },
    { id: 'rainbow', name: 'Rainbow', type: 'anim_hue', unlock: 'ad' },
    { id: 'emoji_love', name: 'Love', type: 'text', content: '😍', unlock: 'ad' },
    { id: 'emoji_money', name: 'Rich', type: 'text', content: '🤑', unlock: 'ad' },
    { id: 'emoji_soccer', name: 'Soccer', type: 'text', content: '⚽', unlock: 'ad' }
];

// Standard bet tiers
const STANDARD_BETS = [0.10, 0.20, 0.50, 1, 2, 5];

// --- 1. CONFIGURATION ---
const GAME_CONFIG = {
    gravity: 0.25,
    friction: 0.99,
    restitution: 0.6,
    pegRadius: 4,
    ballRadius: 7,
    slotHeight: 32,
    startBalance: 0,
    colors: {
        ball: '#ef4444'
    },
    multipliers: {
        8: {
            low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
            medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
            high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29]
        },
        12: {
            low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
            medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
            high: [170, 24, 8.1, 2, 0.7, 0.2, 0.1, 0.2, 0.7, 2, 8.1, 24, 170]
        },
        16: {
            low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
            medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
            high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.1, 0.2, 0.2, 2, 4, 9, 26, 130, 1000]
        }
    }
};

// --- 2. AUDIO SYSTEM ---
class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true;
    }

    playTone(freq, type, duration, vol = 0.1) {
        if (!this.enabled) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playPegHit() { this.playTone(800 + Math.random() * 200, 'sine', 0.1, 0.05); }
    playSplit() { this.playTone(1200, 'square', 0.1, 0.1); }
    playSlotHit(mul) {
        if (mul < 1) this.playTone(300, 'triangle', 0.3, 0.1);
        else if (mul < 10) { this.playTone(600, 'sine', 0.4, 0.1); setTimeout(() => this.playTone(900, 'sine', 0.4, 0.05), 100); }
        else [400, 600, 800, 1200].forEach((f, i) => setTimeout(() => this.playTone(f, 'square', 0.2, 0.1), i * 80));
    }
    playJackpot() {
        [500, 1000, 1500, 2000, 2500, 3000].forEach((f, i) => setTimeout(() => this.playTone(f, 'sawtooth', 0.3, 0.2), i * 100));
    }
}

// --- 3. PHYSICS ENTITIES ---
class Vector {
    constructor(x, y) { this.x = x; this.y = y; }
    add(v) { return new Vector(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vector(this.x - v.x, this.y - v.y); }
    mult(s) { return new Vector(this.x * s, this.y * s); }
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
}

class Ball {
    constructor(x, y, betValue) {
        this.pos = new Vector(x, y);
        const randomVals = new Uint32Array(1);
        crypto.getRandomValues(randomVals);
        const rand = (randomVals[0] / 4294967295) - 0.5;
        this.vel = new Vector(rand * 2, 0);
        this.radius = GAME_CONFIG.ballRadius;
        this.active = true;
        this.betValue = betValue;
        this.history = [];
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.2;
    }

    update() {
        this.vel.y += GAME_CONFIG.gravity;
        this.vel = this.vel.mult(GAME_CONFIG.friction);
        this.pos = this.pos.add(this.vel);
        this.rotation += this.rotSpeed;

        if(frameCount % 5 === 0) {
            this.history.push({x: this.pos.x, y: this.pos.y});
            if(this.history.length > 10) this.history.shift();
        }
    }

    fastUpdate() {
        this.vel.y += GAME_CONFIG.gravity;
        this.vel = this.vel.mult(GAME_CONFIG.friction);
        this.pos = this.pos.add(this.vel);
    }

    draw(ctx) {
        const r = GAME_CONFIG.ballRadius;

        if(!ui.ghostMode) {
            for(let i=0; i<this.history.length; i++) {
                const p = this.history[i];
                ctx.beginPath();
                ctx.arc(p.x, p.y, r * (i/10), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${i/30})`;
                ctx.fill();
            }
        }

        const {x, y} = this.pos;
        const skinId = ui.currentSkin;
        const skin = SKINS.find(s => s.id === skinId) || SKINS[0];

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.rotation);

        if (skin.type === 'gradient') {
            let grad = ctx.createRadialGradient(-r/3, -r/3, r/5, 0, 0, r);
            grad.addColorStop(0, skin.colors[0]);
            grad.addColorStop(1, skin.colors[1]);
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(-r/3, -r/3, r/4, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.3)";
            ctx.fill();
        } else if (skin.type === 'glow') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = skin.colors[1];
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = skin.colors[0];
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (skin.type === 'text') {
            if(skin.bg) {
                ctx.fillStyle = skin.bg;
                ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
            }
            ctx.font = `${r*1.8}px serif`;
            ctx.fillStyle = skin.color || '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(skin.content, 0, 1);
        } else if (skin.type === '8ball') {
            ctx.fillStyle = 'black';
            ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(0, 0, r/2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'black';
            ctx.font = 'bold 8px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('8', 0, 0.5);
        } else if (skin.type === 'anim_hue') {
            const hue = (frameCount * 2) % 360;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 5; ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x; this.y = y; this.text = text; this.color = color;
        this.alpha = 1; this.velocity = -1;
    }
    update() { this.y += this.velocity; this.alpha -= 0.015; }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.shadowColor = "black"; ctx.shadowBlur = 3;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

class Confetti {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.size = (Math.random() * 0.5 + 0.5) * 5;
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        this.velocity = new Vector((Math.random() - 0.5) * 5, (Math.random() - 1) * 5);
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.2;
        this.alpha = 1;
    }
    update() {
        this.x += this.velocity.x; this.y += this.velocity.y;
        this.velocity.y += 0.1; this.rotation += this.rotSpeed; this.alpha -= 0.01;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.pos = new Vector(x, y);
        this.vel = new Vector((Math.random()-0.5)*4, (Math.random()-0.5)*4);
        this.alpha = 1; this.color = color;
    }
    update() { this.pos = this.pos.add(this.vel); this.alpha -= 0.03; }
    draw(ctx) {
        ctx.save(); ctx.globalAlpha = this.alpha; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, 2, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }
}

// --- 4. GAME LOGIC ---
class PlinkoGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.balls = [];
        this.particles = [];
        this.floatingTexts = [];
        this.confettiParticles = [];
        this.pegs = [];
        this.slots = [];
        this.rowCount = 12;
        this.risk = 'medium';
        this.width = 0;
        this.height = 0;
        this.windX = 0;
        this.timeScale = 1.0;

        this.sound = new SoundManager();
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(document.getElementById('canvasWrapper'));
        this.init();
    }

    init() { this.resize(); this.createBoard(); this.loop(); }

    resize() {
        const wrapper = this.canvas.parentElement;
        this.width = wrapper.clientWidth;
        const gap = this.width / (this.rowCount + 3);
        this.height = (gap * (this.rowCount + 2)) + 40;
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.createBoard();
    }

    createBoard() {
        this.pegs = [];
        this.slots = [];
        const gap = this.width / (this.rowCount + 2);
        const startY = 30;

        for (let row = 0; row < this.rowCount; row++) {
            for (let col = 0; col <= row + 2; col++) {
                const x = (this.width / 2) - ((row + 2) * gap / 2) + (col * gap);
                const y = startY + (row * gap);
                const isSplitter = Math.random() < 0.05;
                if (x > 0 && x < this.width) {
                   this.pegs.push({ x, y, r: GAME_CONFIG.pegRadius, hitTimer: 0, isSplitter });
                }
            }
        }

        const slotY = startY + ((this.rowCount - 1) * gap) + gap;
        const multipliers = GAME_CONFIG.multipliers[this.rowCount][this.risk];
        for(let i=0; i<multipliers.length; i++) {
             const x = (this.width / 2) - ((multipliers.length) * gap / 2) + (i * gap) + (gap/2);
             this.slots.push({ x, y: slotY, w: gap - 4, h: GAME_CONFIG.slotHeight, val: multipliers[i], active: 0 });
        }
    }

    dropBall(amount, isGhost = false) {
        const ball = new Ball(this.width / 2, 0, amount);
        if (isGhost) {
            this.simulateGhost(ball);
        } else {
            this.balls.push(ball);
        }
    }

    splitBall(originalBall) {
        const newBall = new Ball(originalBall.pos.x, originalBall.pos.y, originalBall.betValue);
        originalBall.vel.x -= 2;
        newBall.vel.x += 2;
        newBall.vel.y = originalBall.vel.y;
        this.balls.push(newBall);
        this.sound.playSplit();
        for(let k=0; k<5; k++) this.particles.push(new Particle(originalBall.pos.x, originalBall.pos.y, '#06b6d4'));
    }

    simulateGhost(ball) {
        let loops = 0;
        while(ball.active && loops < 2000) {
            ball.fastUpdate();
            if (ball.pos.x < 0 || ball.pos.x > this.width) ball.vel.x *= -1;
            for (let p of this.pegs) {
                let dx = ball.pos.x - p.x;
                let dy = ball.pos.y - p.y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < ball.radius + p.r) {
                    let nx = dx / dist; let ny = dy / dist;
                    let dot = ball.vel.x * nx + ball.vel.y * ny;
                    ball.vel.x -= 2 * dot * nx;
                    ball.vel.y -= 2 * dot * ny;
                    ball.vel = ball.vel.mult(GAME_CONFIG.restitution);
                    ball.vel.x += (Math.random() - 0.5) * 0.5;
                    ball.pos.x += nx * (ball.radius + p.r - dist);
                    ball.pos.y += ny * (ball.radius + p.r - dist);
                }
            }
            if (ball.pos.y > this.height - 40) {
                this.checkWin(ball);
                ball.active = false;
            }
            loops++;
        }
    }

    checkWin(b) {
        let bestSlot = null;
        let minDS = 9999;
        this.slots.forEach(s => {
            let d = Math.abs(b.pos.x - s.x);
            if(d < minDS) { minDS = d; bestSlot = s; }
        });
        if (bestSlot && minDS < bestSlot.w) {
            this.handleWin(b, bestSlot);
            return true;
        }
        return false;
    }

    update() {
        for (let i = this.balls.length - 1; i >= 0; i--) {
            let b = this.balls[i];
            b.update();

            if (b.pos.x < 0) { b.pos.x = 0; b.vel.x *= -1; }
            if (b.pos.x > this.width) { b.pos.x = this.width; b.vel.x *= -1; }

            let hit = false;
            for (let p of this.pegs) {
                let dx = b.pos.x - p.x;
                let dy = b.pos.y - p.y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < GAME_CONFIG.ballRadius + p.r) {
                    let nx = dx / dist; let ny = dy / dist;
                    let dot = b.vel.x * nx + b.vel.y * ny;
                    b.vel.x -= 2 * dot * nx;
                    b.vel.y -= 2 * dot * ny;
                    b.vel = b.vel.mult(GAME_CONFIG.restitution);
                    b.vel.x += (Math.random() - 0.5) * 0.5;
                    let overlap = GAME_CONFIG.ballRadius + p.r - dist;
                    b.pos.x += nx * overlap; b.pos.y += ny * overlap;
                    p.hitTimer = 10;
                    if(!hit) { this.sound.playPegHit(); hit = true; }

                    if(p.isSplitter) {
                        p.isSplitter = false;
                        p.hitTimer = 30;
                        this.splitBall(b);
                        setTimeout(() => { p.isSplitter = true; }, 1000);
                    }
                }
            }

            if (b.pos.y > this.height - 40) {
                if(this.checkWin(b) || b.pos.y > this.height + 100) this.balls.splice(i, 1);
            }
        }

        for(let i=this.particles.length-1; i>=0; i--) {
            this.particles[i].update();
            if(this.particles[i].alpha <= 0) this.particles.splice(i, 1);
        }
        for(let i=this.floatingTexts.length-1; i>=0; i--) {
            this.floatingTexts[i].update();
            if(this.floatingTexts[i].alpha <= 0) this.floatingTexts.splice(i, 1);
        }
        for(let i=this.confettiParticles.length-1; i>=0; i--) {
            this.confettiParticles[i].update();
            if(this.confettiParticles[i].alpha <= 0) this.confettiParticles.splice(i, 1);
        }
        this.pegs.forEach(p => { if(p.hitTimer > 0) p.hitTimer--; });
        this.slots.forEach(s => { if(s.active > 0) s.active--; });
    }

    handleWin(ball, slot) {
        const payout = ball.betValue * slot.val;
        ui.onWin(payout, slot.val);
        slot.active = 20;
        if(!ui.ghostMode) {
            this.sound.playSlotHit(slot.val);
            const textColor = slot.val >= 1 ? '#22c55e' : '#94a3b8';
            this.floatingTexts.push(new FloatingText(slot.x, slot.y - 20, `+$${payout.toFixed(2)}`, textColor));
            const color = slot.val >= 1 ? '#22c55e' : '#94a3b8';
            for(let k=0; k<10; k++) this.particles.push(new Particle(slot.x, slot.y, color));
            if (slot.val >= 10) {
                for (let k = 0; k < 50; k++) this.confettiParticles.push(new Confetti(slot.x, slot.y));
            }
        }
        if(navigator.vibrate && slot.val > 2 && !ui.ghostMode) navigator.vibrate(50);
    }

    draw() {
        let bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
        const style = getComputedStyle(document.body);
        bgGrad.addColorStop(0, style.getPropertyValue('--bg-card'));
        bgGrad.addColorStop(1, style.getPropertyValue('--bg-dark'));
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.slots.forEach(s => {
            this.ctx.fillStyle = s.active > 0 ? style.getPropertyValue('--peg-active').trim() : 'rgba(51, 65, 85, 0.5)';
            let strokeColor = '#334155';
            if (s.active === 0) {
                if(s.val >= 10) strokeColor = '#ef4444';
                else if(s.val >= 3) strokeColor = '#f59e0b';
                else if(s.val >= 1) strokeColor = '#22c55e';
            }
            this.ctx.beginPath();
            this.ctx.roundRect(s.x - s.w/2, s.y, s.w, s.h, 4);
            this.ctx.fill();
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 10px -apple-system, monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${s.val}x`, s.x, s.y + s.h/2 + 3);
            if (s.active > 0) {
                this.ctx.shadowBlur = 15; this.ctx.shadowColor = 'white';
                this.ctx.stroke(); this.ctx.shadowBlur = 0;
            }
        });

        const pegColor = style.getPropertyValue('--peg-color').trim();
        this.pegs.forEach(p => {
            const {x, y, r} = p;
            let grd = this.ctx.createRadialGradient(x-1, y-1, 1, x, y, r);
            if (p.hitTimer > 0) {
                grd.addColorStop(0, '#fff');
                grd.addColorStop(1, '#e2e8f0');
            } else if (p.isSplitter) {
                grd.addColorStop(0, '#22d3ee');
                grd.addColorStop(1, '#0891b2');
            } else {
                grd.addColorStop(0, pegColor);
                grd.addColorStop(1, '#000000');
            }
            this.ctx.beginPath(); this.ctx.arc(x, y, r, 0, Math.PI * 2);
            this.ctx.fillStyle = grd;
            if(p.isSplitter) {
                 this.ctx.shadowBlur = 5; this.ctx.shadowColor = '#06b6d4';
            } else {
                 this.ctx.shadowBlur = 2; this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
            }
            this.ctx.fill(); this.ctx.shadowBlur = 0;
        });

        this.balls.forEach(b => b.draw(this.ctx));
        this.particles.forEach(p => p.draw(this.ctx));
        this.floatingTexts.forEach(t => t.draw(this.ctx));
        this.confettiParticles.forEach(c => c.draw(this.ctx));
    }

    loop() {
        globalThis.frameCount = (globalThis.frameCount || 0) + 1;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

// --- 5. UI & STATE CONTROLLER ---
class UIController {
    constructor() {
        this.balance = 0;
        this.bet = 1;
        this.jackpot = 0;
        this.xp = 0;
        this.level = 1;
        this.unlockedSkins = JSON.parse(localStorage.getItem('plinko_unlocked_skins')) || ['red', 'blue'];
        this.currentSkin = localStorage.getItem('plinko_current_skin') || 'red';
        this.stats = JSON.parse(localStorage.getItem('plinko_stats')) || { drops: 0, wins: 0, wagered: 0, bestWin: 0 };
        this.game = new PlinkoGame('gameCanvas');
        this.autoRunning = false;
        this.ghostMode = false;
        this.dropping = false;
        this.initUI();
    }

    initUI() {
        this.updateBalanceUI();
        this.updateXPUI();
        this.updateJackpotUI();
        this.bindEvents();
        const savedTheme = localStorage.getItem('plinko_theme') || 'default';
        document.body.className = `theme-${savedTheme}`;
    }

    bindEvents() {
        document.getElementById('soundToggle').addEventListener('change', (e) => {
            this.game.sound.enabled = e.target.checked;
        });
        document.getElementById('ghostToggle').addEventListener('change', (e) => {
            this.ghostMode = e.target.checked;
            this.game.balls = [];
        });

        // Standard bet buttons
        document.querySelectorAll('.std-bet-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.std-bet-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.bet = parseFloat(btn.dataset.bet);
            };
        });

        document.querySelectorAll('.risk-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.risk-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.game.risk = btn.dataset.risk;
                this.game.createBoard();
            };
        });
        document.querySelectorAll('.row-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.row-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.game.rowCount = parseInt(btn.dataset.rows);
                this.game.createBoard();
                this.game.resize();
            };
        });

        document.getElementById('dropBtn').onclick = () => this.drop(1);
        document.querySelectorAll('.multi-btn').forEach(btn => {
            btn.onclick = () => this.drop(parseInt(btn.dataset.count));
        });

        const autoBtn = document.getElementById('autoBtn');
        autoBtn.onclick = () => {
            this.autoRunning = !this.autoRunning;
            if(this.autoRunning) {
                autoBtn.innerText = "STOP AUTO";
                autoBtn.classList.add('btn-danger');
                this.runAuto();
            } else {
                autoBtn.innerText = "AUTO: OFF";
                autoBtn.classList.remove('btn-danger');
                clearTimeout(this.autoTimer);
            }
        };

        document.addEventListener('keydown', (e) => {
            if(e.code === 'Space' && !e.repeat && !document.querySelector('.modal-overlay.open')) {
                e.preventDefault();
                this.drop(1);
            }
        });
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '⚠️';
        toast.innerHTML = `<span>${icon}</span> ${message}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async drop(count) {
        if (this.dropping) return;
        if(this.balance < this.bet) {
            if(this.autoRunning) document.getElementById('autoBtn').click();
            this.showToast("Insufficient funds!", "error");
            return;
        }

        this.dropping = true;
        const dropDelay = this.ghostMode ? 5 : 100;
        let dropped = 0;

        const dropOne = async () => {
            if(dropped >= count || this.balance < this.bet) {
                this.dropping = false;
                return;
            }

            // Deduct via bridge FIRST
            const result = await PhantomBridge.deductBet(this.bet);
            if (!result.success) {
                this.showToast(result.error || "Bet failed", "error");
                this.dropping = false;
                if(this.autoRunning) document.getElementById('autoBtn').click();
                return;
            }
            this.balance = result.balance;
            this.updateBalanceUI();

            this.stats.drops++;
            this.stats.wagered += this.bet;
            this.game.dropBall(this.bet, this.ghostMode);
            dropped++;

            if (dropped < count && this.balance >= this.bet) {
                setTimeout(() => dropOne(), dropDelay);
            } else {
                this.dropping = false;
            }
        };

        await dropOne();
    }

    runAuto() {
        if(!this.autoRunning) return;
        this.drop(1).then(() => {
            this.autoTimer = setTimeout(() => this.runAuto(), this.ghostMode ? 50 : 300);
        });
    }

    updateBalanceUI() {
        document.getElementById('balanceDisplay').innerText = this.balance.toFixed(2);
    }

    updateXPUI() {
        document.getElementById('levelDisplay').innerText = this.level;
        const xpNeeded = this.level * 1000;
        document.getElementById('xpText').innerText = `${this.xp} / ${xpNeeded} XP`;
        const pct = (this.xp / xpNeeded) * 100;
        document.getElementById('xpFill').style.width = `${pct}%`;
    }

    updateJackpotUI() {
        document.getElementById('jackpotDisplay').innerText = this.jackpot.toFixed(2);
    }

    async onWin(amount, multiplier) {
        if (amount > 0) {
            const result = await PhantomBridge.creditWin(amount, 'Plinko Pro Win');
            if (result.success) {
                this.balance = result.balance;
                this.updateBalanceUI();
            }
        }
        if(multiplier >= 1) this.stats.wins++;
        if(amount > this.stats.bestWin) this.stats.bestWin = amount;
        this.addHistory(multiplier);
        this.saveStats();
    }

    saveStats() { localStorage.setItem('plinko_stats', JSON.stringify(this.stats)); }

    addHistory(multiplier) {
        const feed = document.getElementById('historyFeed');
        const item = document.createElement('div');
        item.className = `history-item ${multiplier >= 1 ? 'win-high' : 'win-loss'}`;
        if(multiplier === 9999) { item.className += ' win-jackpot'; item.innerText = 'JP'; }
        else {
            if(multiplier >= 10) item.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
            else if(multiplier >= 2) item.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
            item.innerText = `${multiplier}x`;
        }
        feed.prepend(item);
        if(feed.children.length > 20) feed.removeChild(feed.lastChild);
    }

    unlockSkin(id) {
        if(!this.unlockedSkins.includes(id)) {
            this.unlockedSkins.push(id);
            localStorage.setItem('plinko_unlocked_skins', JSON.stringify(this.unlockedSkins));
            this.setSkin(id);
            this.showModal('skins');
        }
    }

    setSkin(id) {
        if(this.unlockedSkins.includes(id)) {
            this.currentSkin = id;
            localStorage.setItem('plinko_current_skin', id);
            this.showModal('skins');
        }
    }

    watchAdForSkin(id) {
        const modal = document.querySelector('.modal');
        const overlay = document.createElement('div');
        overlay.className = 'ad-overlay';
        overlay.innerHTML = `
            <div class="ad-content-box">
                <div style="font-size: 0.8rem; color: #888; position: absolute; top: 5px; right: 5px;">Ad</div>
                <h3 style="margin-bottom:0.5rem">Google AdSense Demo</h3>
                <p style="font-size:0.8rem; color:#666;">This is where your 300x250 ad unit would render.</p>
                <div style="background:#ddd; width:100%; height:2px; margin: 10px 0;"></div>
                <div style="font-size:0.7rem; color:#999; margin-top: auto;">
                    &lt;!-- Insert Adsense Code Here --&gt;
                </div>
            </div>
            <div class="spinner"></div>
            <div style="font-weight:bold; font-size:1.2rem; color:white;">Watching Ad...</div>
            <div style="color:#94a3b8; font-size:0.9rem;">Please wait 7 seconds</div>
        `;
        modal.appendChild(overlay);
        setTimeout(() => {
            overlay.remove();
            this.unlockSkin(id);
            this.showToast("Thanks for watching! Skin Unlocked.", "success");
        }, 7000);
    }

    showModal(type) {
        const modal = document.getElementById('infoModal');
        const title = document.getElementById('modalTitle');
        const content = document.getElementById('modalContent');
        modal.classList.add('open');

        if(type === 'stats') {
            title.innerText = "Statistics";
            content.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-box"><div class="stat-val">${this.stats.drops}</div><div class="stat-lbl">Total Drops</div></div>
                    <div class="stat-box"><div class="stat-val">${this.stats.wins}</div><div class="stat-lbl">Winning Drops</div></div>
                    <div class="stat-box"><div class="stat-val">$${this.stats.wagered.toFixed(0)}</div><div class="stat-lbl">Total Wagered</div></div>
                    <div class="stat-box"><div class="stat-val">$${this.stats.bestWin.toFixed(2)}</div><div class="stat-lbl">Best Win</div></div>
                </div>
            `;
        } else if (type === 'settings') {
            title.innerText = "Settings";
            content.innerHTML = `
                <div class="panel-section">
                    <span class="label">Theme</span>
                    <div class="btn-group" style="flex-wrap: wrap;">
                        <button onclick="ui.setTheme('default')">Default</button>
                        <button onclick="ui.setTheme('red')">Red</button>
                        <button onclick="ui.setTheme('yellow')">Yellow</button>
                        <button onclick="ui.setTheme('white')">White</button>
                        <button onclick="ui.setTheme('gradient')">Gradient</button>
                        <button onclick="ui.setTheme('color-changing')">Color Changing</button>
                        <button onclick="ui.setTheme('glowing')">Glowing</button>
                        <button onclick="ui.setTheme('maroon')">Maroon</button>
                        <button onclick="ui.setTheme('hell')">Hell</button>
                        <button onclick="ui.setTheme('casino')">Casino</button>
                        <button onclick="ui.setTheme('fire')">Fire</button>
                        <button onclick="ui.setTheme('winter')">Winter</button>
                        <button onclick="ui.setTheme('desert')">Desert</button>
                        <button onclick="ui.setTheme('gold')">Gold</button>
                        <button onclick="ui.setTheme('neon')">Neon</button>
                        <button onclick="ui.setTheme('matrix')">Matrix</button>
                        <button onclick="ui.setTheme('ocean')">Ocean</button>
                        <button onclick="ui.setTheme('sunset')">Sunset</button>
                    </div>
                </div>
            `;
        } else if (type === 'skins') {
            title.innerText = "Ball Skins Shop";
            let html = '<div class="skins-grid">';
            SKINS.forEach(skin => {
                const isUnlocked = this.unlockedSkins.includes(skin.id);
                const isActive = this.currentSkin === skin.id;
                let previewHtml = '';
                if(skin.type === 'text') previewHtml = `<div>${skin.content}</div>`;
                else if(skin.type === 'gradient' || skin.type === 'glow') previewHtml = `<div style="width:20px; height:20px; border-radius:50%; background: linear-gradient(135deg, ${skin.colors[0]}, ${skin.colors[1]})"></div>`;
                else if(skin.type === '8ball') previewHtml = `<div style="width:20px; height:20px; border-radius:50%; background:black; border:2px solid white; display:flex; align-items:center; justify-content:center; color:white; font-size:10px;">8</div>`;
                else if(skin.type === 'anim_hue') previewHtml = `<div style="width:20px; height:20px; border-radius:50%; background: linear-gradient(90deg, red, blue, green);"></div>`;

                html += `
                    <div class="skin-card ${isActive ? 'active' : ''} ${!isUnlocked ? 'locked' : 'unlocked'}" 
                         onclick="${isUnlocked ? `ui.setSkin('${skin.id}')` : `ui.watchAdForSkin('${skin.id}')`}">
                        <div class="skin-preview">${previewHtml}</div>
                        <div class="skin-name">${skin.name}</div>
                        <div class="skin-status">
                            ${isActive ? 'Selected' : (isUnlocked ? 'Owned' : '📺 Watch Ad')}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            content.innerHTML = html;
        } else if (type === 'rules') {
            title.innerText = "How to Play";
            content.innerHTML = `
                <p>1. <strong>Bet:</strong> Choose amount and Risk.</p>
                <p>2. <strong>Drop:</strong> Ball bounces through pins.</p>
                <p>3. <strong>Skins:</strong> Watch ads to unlock cool balls!</p>
            `;
        } else {
            title.innerText = "Fairness";
            content.innerHTML = "<p>Physics calculated deterministically client-side.</p>";
        }
    }

    setTheme(name) {
        document.body.className = `theme-${name}`;
        localStorage.setItem('plinko_theme', name);
    }

    closeModal() { document.getElementById('infoModal').classList.remove('open'); }
}

const ui = new UIController();

// ========== PhantomBet Bridge Integration ==========
PhantomBridge.init('Plinko Pro');
PhantomBridge.onReady(function(bal) {
    ui.balance = bal;
    ui.updateBalanceUI();
});
PhantomBridge.onBalanceChange(function(bal) {
    ui.balance = bal;
    ui.updateBalanceUI();
});
