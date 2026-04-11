/* SPLASH SCREEN LOGIC */
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
        }, 500);
    }, 2500);
});

/** CONFIGURATION */
const CONFIG = {
    minMultiplier: 1.00, maxMultiplier: 10.00, speed: 0.15,
    updateInterval: 16, countdownTime: 10000
};

/* STATE & DATA */
const SKINS = [
    { id: 'default', name: 'Default', icon: '✈️', unlocked: true },
    { id: 'rocket', name: 'Rocket', icon: '🚀', unlocked: false },
    { id: 'ufo', name: 'UFO', icon: '🛸', unlocked: false },
    { id: 'jet', name: 'Fighter Jet', icon: '🛩️', unlocked: false },
    { id: 'dragon', name: 'Dragon', icon: '🐉', unlocked: false },
    { id: 'super', name: 'Hero', icon: '🦸', unlocked: false },
    { id: 'bird', name: 'Bird', icon: '🦅', unlocked: false },
    { id: 'meteor', name: 'Meteor', icon: '☄️', unlocked: false },
    { id: 'nyan', name: 'Nyan Cat', icon: '🐱', unlocked: false },
    { id: 'paper', name: 'Paper Plane', icon: '📄', unlocked: false },
];

const THEMES = [
    { id: 'default', name: 'Neon Red', unlocked: true },
    { id: 'night', name: 'Night Mode', unlocked: false },
    { id: 'day', name: 'Day Mode', unlocked: false },
    { id: 'yellow', name: 'Cyber Yellow', unlocked: false },
    { id: 'green', name: 'Matrix', unlocked: false },
    { id: 'hacker', name: 'Hacker', unlocked: false },
    { id: 'water', name: 'Ocean', unlocked: false },
    { id: 'desert', name: 'Desert', unlocked: false },
    { id: 'winter', name: 'Winter', unlocked: false },
    { id: 'red', name: 'Classic Red', unlocked: false },
];

const STATE = {
    balance: parseFloat(localStorage.getItem('crash_balance')) || 1000.00,
    phase: 'IDLE', currentMultiplier: 1.00, crashPoint: 0, startTime: 0,
    history: JSON.parse(localStorage.getItem('crash_history')) || [],
    bets: { 1: { active: false, amount: 0, cashedOut: false }, 2: { active: false, amount: 0, cashedOut: false } },
    bots: [],
    settings: {
        sound: true,
        skin: 'default',
        theme: 'default',
        unlockedSkins: ['default'],
        unlockedThemes: ['default']
    },
    stats: JSON.parse(localStorage.getItem('crash_stats')) || { bets: 0, wins: 0, high: 0, profit: 0 }
};

// Load Saved Settings
const savedSettings = JSON.parse(localStorage.getItem('crash_settings'));
if(savedSettings) {
    STATE.settings = { ...STATE.settings, ...savedSettings };
    // Merge unlocked lists just in case
    SKINS.forEach(s => { if(STATE.settings.unlockedSkins.includes(s.id)) s.unlocked = true; });
    THEMES.forEach(t => { if(STATE.settings.unlockedThemes.includes(t.id)) t.unlocked = true; });
}
applyTheme(STATE.settings.theme);

/* AUDIO SYSTEM */
const AudioSys = {
    ctx: new (window.AudioContext || window.webkitAudioContext)(),
    playTone(freq, type, duration) {
        if(!STATE.settings.sound) return;
        if(this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + duration);
    },
    playClick() { this.playTone(800, 'sine', 0.1); },
    playCrash() { this.playTone(150, 'sawtooth', 0.5); },
    playWin() { this.playTone(1200, 'triangle', 0.3); },
    playDeposit() { this.playTone(1500, 'sine', 0.1); setTimeout(()=>this.playTone(2000, 'sine', 0.2), 100); }
};

function toggleSound() {
    STATE.settings.sound = !STATE.settings.sound;
    document.getElementById('soundIcon').innerText = STATE.settings.sound ? '🔊' : '🔇';
    saveSettings();
}

function updateBalanceDisplay() {
    const el = document.getElementById('userBalance');
    if (el) el.innerText = STATE.balance.toFixed(2);
}

/* GAME ENGINE */
STATE.history.forEach(addHistoryPill);
updateBalanceDisplay();

function gameLoop() {
    if (STATE.phase === 'FLYING') {
        const now = Date.now();
        const timeElapsed = (now - STATE.startTime) / 1000;
        STATE.currentMultiplier = Math.pow(Math.E, CONFIG.speed * timeElapsed);
        if (STATE.currentMultiplier >= STATE.crashPoint) crash();
        else { 
            checkAutoCashout(1); 
            checkAutoCashout(2); 
            updateBots(); // Live Bot updates
        }
    }
    draw();
    requestAnimationFrame(gameLoop);
}

function startRound() {
    STATE.phase = 'BETTING';
    STATE.currentMultiplier = 1.00;
    updateUIControls();
    document.getElementById('crashOverlay').style.display = 'none';
    
    let cd = 10;
    const cdInterval = setInterval(() => {
        const msg = document.getElementById('statusMsg');
        if(msg) { msg.style.display = 'block'; msg.innerText = `Next round in ${cd.toFixed(1)}s...`; }
        if (cd <= 0) { clearInterval(cdInterval); launch(); }
        cd -= 0.1;
    }, 100);

    processAutoBet(1); processAutoBet(2); generateBots();
}

function launch() {
    STATE.phase = 'FLYING';
    STATE.startTime = Date.now();
    STATE.crashPoint = generateCrashPoint();
    document.getElementById('statusMsg').style.display = 'none';
    updateUIControls();
}

function crash() {
    STATE.phase = 'CRASHED';
    STATE.currentMultiplier = STATE.crashPoint;
    AudioSys.playCrash();
    
    const overlay = document.getElementById('crashOverlay');
    document.getElementById('crashValueDisplay').innerText = `@ ${STATE.crashPoint.toFixed(2)}x`;
    overlay.style.display = 'block';
    document.getElementById('gameArea').classList.add('shake');
    setTimeout(() => document.getElementById('gameArea').classList.remove('shake'), 500);

    addToHistory(STATE.crashPoint);
    resolveLosses();
    updateUIControls();
    
    // Mark all active bots as LOST
    STATE.bots.forEach(bot => {
        if(!bot.cashed) {
            const row = document.getElementById(`bot-row-${bot.id}`);
            if(row) {
                row.querySelector('.bet-mult').innerHTML = '<span style="color:var(--primary)">CRASH</span>';
                row.style.opacity = '0.5';
            }
        }
    });

    setTimeout(startRound, 3000);
}

function generateCrashPoint() {
    const r = Math.random() * 100;
    if (r < 1) return 1.00;
    const e = Math.pow(2, 32);
    const h = crypto.getRandomValues(new Uint32Array(1))[0];
    if (h % 33 === 0) return 1.00; 
    const crash = Math.floor((100 * e - h) / (e - h)) / 100;
    return Math.min(Math.max(1.00, crash), 10.00);
}

/* BETTING LOGIC */
function placeBet(panelId) {
    if (STATE.phase !== 'BETTING' && STATE.phase !== 'IDLE') return;
    if (STATE.bets[panelId].active) return;
    
    const amt = parseFloat(document.getElementById(`betInput${panelId}`).value);
    if (isNaN(amt) || amt <= 0 || amt > STATE.balance) return;

    updateBalance(-amt);
    STATE.bets[panelId] = { active: true, amount: amt, cashedOut: false };
    STATE.stats.bets++;
    STATE.stats.profit -= amt;
    saveStats();
    
    AudioSys.playClick();
    updateUIControls();
    addSidebarRow('You', amt, '-', 'pending');
}

function doCashout(panelId) {
    if (STATE.phase !== 'FLYING') return;
    const bet = STATE.bets[panelId];
    if (!bet.active || bet.cashedOut) return;

    const win = bet.amount * STATE.currentMultiplier;
    bet.cashedOut = true;
    updateBalance(win);
    
    STATE.stats.wins++;
    STATE.stats.profit += win;
    if(win > STATE.stats.high) STATE.stats.high = win;
    saveStats();

    AudioSys.playWin();
    const btn = document.getElementById(`btnAction${panelId}`);
    btn.innerText = `+ $${win.toFixed(2)}`;
    setTimeout(() => { if(btn.innerText.includes('+')) updateUIControls(); }, 2000);
}

function updateBalance(change) {
    STATE.balance += change;
    localStorage.setItem('crash_balance', STATE.balance);
    updateBalanceDisplay();
}

/* CANVAS & SKINS */
const canvas = document.getElementById('crashCanvas');
const ctx = canvas.getContext('2d');
window.addEventListener('resize', () => { canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight; });
canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight;

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width, h = canvas.height;
    
    if (STATE.phase === 'IDLE' || STATE.phase === 'BETTING') {
        ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 1; ctx.beginPath();
        for(let i=0; i<h; i+=50) { ctx.moveTo(0, i); ctx.lineTo(w, i); }
        for(let i=0; i<w; i+=50) { ctx.moveTo(i, 0); ctx.lineTo(i, h); }
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(w, h); ctx.strokeStyle = '#fff'; ctx.stroke();
        return;
    }

    const now = Date.now();
    const t = (STATE.phase === 'CRASHED' ? (STATE.crashPoint - 1) * 10 : (now - STATE.startTime) / 1000);
    const tipX = t * 50; 
    const tipMult = Math.pow(Math.E, CONFIG.speed * t);
    const tipY = h - ((tipMult - 1) * 100);

    let camX = 0, camY = 0;
    if (tipX > w * 0.5) camX = tipX - w * 0.5;
    if (tipY < h * 0.5) camY = (h * 0.5) - tipY;

    ctx.save();
    ctx.translate(-camX, camY);

    // Grid
    ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 1; ctx.beginPath();
    const sY = Math.floor(-camY/50)*50, eY = h-camY;
    for(let i=sY; i<eY+50; i+=50) { ctx.moveTo(camX, i); ctx.lineTo(camX+w, i); }
    const sX = Math.floor(camX/50)*50, eX = camX+w;
    for(let i=sX; i<eX+50; i+=50) { ctx.moveTo(i, -camY); ctx.lineTo(i, h-camY); }
    ctx.stroke();

    // Curve
    ctx.beginPath(); ctx.moveTo(0, h);
    for(let i=0; i<=t*10; i++) {
        const sT = i/10; const sM = Math.pow(Math.E, CONFIG.speed*sT);
        ctx.lineTo(sT*50, h-((sM-1)*100));
    }
    ctx.strokeStyle = STATE.phase === 'CRASHED' ? '#ff0055' : '#fff'; ctx.lineWidth = 4; ctx.stroke();

    if(STATE.phase !== 'CRASHED') {
        ctx.save(); ctx.translate(tipX, tipY);
        // Skin Drawing
        const skin = SKINS.find(s => s.id === STATE.settings.skin);
        if(skin.id === 'default') {
            ctx.rotate(-20 * Math.PI / 180);
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-20,10); ctx.lineTo(-20,-10); ctx.fill();
        } else {
            ctx.font = '30px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText(skin.icon, 0, 0);
        }
        ctx.restore();
        
        ctx.fillStyle = "#fff"; ctx.font = "bold 16px Arial";
        ctx.fillText(STATE.currentMultiplier.toFixed(2) + "x", tipX + 20, tipY);
    } else {
        ctx.save(); ctx.translate(tipX, tipY);
        ctx.fillStyle = "orange"; ctx.beginPath(); ctx.arc(0,0,20,0,Math.PI*2); ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

/* REALISTIC CHAT SYSTEM */
const REAL_NAMES = ["Alex", "Sarah", "Mike", "CryptoGod", "MoonBoi", "HODL_King", "TeslaFan", "DogeLover", "Satoshi", "Whale_007", "Noob_123", "ProGamer", "RichieRich", "PoorGuy", "LuckyStrike", "CrashMaster", "TraderJoe", "Alice", "Bob", "Charlie", "Xenon", "Vortex", "Pixel", "Glitch", "Turbo", "Sonic", "Blaze", "Shadow", "Ghost", "Viper", "Cobra", "Titan", "Nova", "Luna", "Sol", "Mars", "Jupiter", "Saturn", "Pluto", "Comet", "Star", "Nebula", "Galaxy", "Astro", "Cosmo"];

const CHAT_VARIETY = [
    { type: 'excitement', msgs: ["MOON! 🚀", "LFG!!!", "Easy 10x today", "Green dildos everywhere!", "FLY BABY FLY", "MONEY PRINTER GO BRRR"] },
    { type: 'rude', msgs: ["You guys are idiots not cashing out", "Rigged!", "Scam site reported", "My grandma trades better", "Bot lobby", "Scripted"] },
    { type: 'funny', msgs: ["Sold my kidney for this", "Wife left me, time to gamble", "Wen Lambo?", "I need rent money pls", "RIP", "F in chat"] },
    { type: 'rich', msgs: ["Just put 50k on 2x", "Pocket change lol", "Cashing out at 100x or nothing", "Yawn, boring profit", "Betting my yacht"] },
    { type: 'poor', msgs: ["Last $10, wish me luck", "Can anyone spare 1$?", "Lost my lunch money :(", "Pls sir 1 dollar", "I am ruined"] },
    { type: 'expert', msgs: ["Chart analysis says 3x next", "Pattern indicates crash at 1.5", "Martingale strategy works trust me", "Trend looks bullish", "Resistance at 2.0x"] }
];

function chatLoop() {
    // Random delay between 1000ms and 3000ms for fast chat
    const delay = Math.floor(Math.random() * 2000) + 1000;
    setTimeout(() => {
        const category = CHAT_VARIETY[Math.floor(Math.random() * CHAT_VARIETY.length)];
        const msg = category.msgs[Math.floor(Math.random() * category.msgs.length)];
        const user = REAL_NAMES[Math.floor(Math.random() * REAL_NAMES.length)];
        
        const div = document.createElement('div');
        div.className = `chat-msg ${category.type}`; // Add class for coloring
        div.innerHTML = `<span class="chat-user">${user}:</span><span class="chat-text">${msg}</span>`;
        
        const box = document.getElementById('chatMessages');
        if(box) {
            box.appendChild(div);
            box.scrollTop = box.scrollHeight;
            if(box.children.length > 50) box.removeChild(box.firstChild);
        }
        chatLoop(); // Recursive call
    }, delay);
}
// Start Chat Loop
chatLoop();

// User Chat Logic
document.getElementById('userChatInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        const msg = this.value.trim();
        if (msg) {
            const div = document.createElement('div');
            div.className = 'chat-msg';
            div.innerHTML = `<span class="chat-user" style="color:#fff">You:</span><span class="chat-text">${msg}</span>`;
            const box = document.getElementById('chatMessages');
            if(box) {
                box.appendChild(div);
                box.scrollTop = box.scrollHeight;
            }
            this.value = '';
        }
    }
});


/* AD SYSTEM */
let pendingAdAction = null;
let pendingAdItem = null;
let adTimer = null;

function startAdSequence(action, itemId=null) {
    pendingAdAction = action;
    pendingAdItem = itemId;
    document.getElementById('adModal').style.display = 'flex';
    document.getElementById('adTitle').innerText = action === 'deposit' ? "Deposit $100" : "Unlock Content";
    
    let t = 10;
    const el = document.getElementById('adTimer');
    el.innerText = t;
    
    clearInterval(adTimer);
    adTimer = setInterval(() => {
        t--; el.innerText = t;
        if(t<=0) { clearInterval(adTimer); finishAd(); }
    }, 1000);
}

function finishAd() {
    document.getElementById('adModal').style.display = 'none';
    const success = document.getElementById('successModal');
    const msg = document.getElementById('successMsg');
    success.style.display = 'flex';

    if(pendingAdAction === 'deposit') {
        updateBalance(100);
        msg.innerHTML = 'Your wallet has been topped up with <strong style="color:var(--accent);">$100.00</strong>';
        AudioSys.playDeposit();
    } else if(pendingAdAction === 'unlockSkin') {
        const s = SKINS.find(x => x.id === pendingAdItem);
        s.unlocked = true;
        STATE.settings.unlockedSkins.push(s.id);
        STATE.settings.skin = s.id;
        msg.innerText = `Skin ${s.name} Unlocked!`;
        saveSettings();
        renderSkins();
    } else if(pendingAdAction === 'unlockTheme') {
        const t = THEMES.find(x => x.id === pendingAdItem);
        t.unlocked = true;
        STATE.settings.unlockedThemes.push(t.id);
        applyTheme(t.id);
        msg.innerText = `Theme ${t.name} Unlocked!`;
        saveSettings();
        renderThemes();
    }
}

/* SETTINGS & MODALS */
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
    if(id === 'skinsModal') renderSkins();
    if(id === 'themeModal') renderThemes();
}
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function renderSkins() {
    const grid = document.getElementById('skinsGrid');
    grid.innerHTML = '';
    SKINS.forEach(s => {
        const div = document.createElement('div');
        div.className = `grid-item ${STATE.settings.skin === s.id ? 'active' : ''} ${!s.unlocked ? 'locked' : ''}`;
        div.innerHTML = `<span class="item-icon">${s.icon}</span><span class="item-name">${s.name}</span>`;
        div.onclick = () => {
            if(s.unlocked) { STATE.settings.skin = s.id; saveSettings(); renderSkins(); }
            else { closeModal('skinsModal'); startAdSequence('unlockSkin', s.id); }
        };
        grid.appendChild(div);
    });
}

function renderThemes() {
    const grid = document.getElementById('themeGrid');
    grid.innerHTML = '';
    THEMES.forEach(t => {
        const div = document.createElement('div');
        div.className = `grid-item ${STATE.settings.theme === t.id ? 'active' : ''} ${!t.unlocked ? 'locked' : ''}`;
        div.innerHTML = `<span class="item-icon">🎨</span><span class="item-name">${t.name}</span>`;
        div.onclick = () => {
            if(t.unlocked) { applyTheme(t.id); saveSettings(); renderThemes(); }
            else { closeModal('themeModal'); startAdSequence('unlockTheme', t.id); }
        };
        grid.appendChild(div);
    });
}

function applyTheme(id) {
    STATE.settings.theme = id;
    document.body.className = `theme-${id}`;
}

function openStats() {
    document.getElementById('statBets').innerText = STATE.stats.bets;
    document.getElementById('statWins').innerText = STATE.stats.wins;
    document.getElementById('statHigh').innerText = `$${STATE.stats.high.toFixed(2)}`;
    document.getElementById('statProfit').innerText = `$${STATE.stats.profit.toFixed(2)}`;
    openModal('statsModal');
}

function saveSettings() { localStorage.setItem('crash_settings', JSON.stringify(STATE.settings)); }
function saveStats() { localStorage.setItem('crash_stats', JSON.stringify(STATE.stats)); }

/* HELPERS */
function switchTab(t) {
    document.querySelectorAll('.tab').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(e => { e.classList.remove('active'); e.style.display='none'; });
    event.target.classList.add('active');
    const content = document.getElementById(`tab-${t}`);
    content.classList.add('active');
    content.style.display = 'block';
}
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }
function addToHistory(mult) {
    STATE.history.unshift(mult);
    if (STATE.history.length > 20) STATE.history.pop();
    localStorage.setItem('crash_history', JSON.stringify(STATE.history));
    addHistoryPill(mult, true);
}
function addHistoryPill(mult, p=false) {
    const d = document.createElement('div'); d.className='history-pill '+(m=mult<2?'pill-low':mult<10?'pill-med':'pill-high'); d.innerText=mult.toFixed(2)+'x';
    const b = document.getElementById('historyBar'); p ? b.insertBefore(d, b.firstChild) : b.appendChild(d);
}
function addSidebarRow(u, a, m, s, id) {
    const d = document.createElement('div'); 
    d.className='bet-row';
    if(id) d.id = `bot-row-${id}`;
    d.innerHTML = `<span class="bet-user">${u}</span><span class="bet-mult">${m}</span><span class="bet-amt">$${a}</span>`;
    const l = document.getElementById('betsList'); l.insertBefore(d, l.firstChild);
}
// Utils
function checkAutoCashout(id) {
    if(!STATE.bets[id].active || STATE.bets[id].cashedOut) return;
    const e = document.getElementById(`autoCashoutEnable${id}`).checked;
    const v = parseFloat(document.getElementById(`cashoutInput${id}`).value);
    if(e && STATE.currentMultiplier >= v) doCashout(id);
}
function processAutoBet(id) {
    if(document.getElementById(`autoBet${id}`).checked && !STATE.bets[id].active) setTimeout(()=>placeBet(id),200);
}
function updateUIControls() {
    for(let i=1; i<=2; i++) {
        const b = document.getElementById(`btnAction${i}`);
        const inp = document.getElementById(`betInput${i}`);
        if(STATE.phase === 'FLYING') {
            inp.disabled = true;
            if(STATE.bets[i].active && !STATE.bets[i].cashedOut) {
                b.innerHTML = `CASHOUT<br><span style="font-size:0.8rem">$${(STATE.bets[i].amount*STATE.currentMultiplier).toFixed(2)}</span>`;
                b.className = "action-btn btn-cashout"; b.onclick = () => doCashout(i);
            } else { b.innerText = "WAITING"; b.className = "action-btn btn-disabled"; b.onclick = null; }
        } else if(STATE.phase === 'CRASHED') {
            b.innerText = "CRASHED"; b.className = "action-btn btn-disabled"; inp.disabled = false;
        } else {
            if(STATE.bets[i].active) { b.innerText = "WAITING..."; b.className = "action-btn btn-cancel"; inp.disabled = true; }
            else { b.innerText = "BET"; b.className = "action-btn btn-bet"; b.disabled = false; b.onclick = () => placeBet(i); inp.disabled = false; }
        }
    }
}

/* ---- REAL BOT LOGIC ---- */
const BOT_NAMES_LIST = ["Alpha", "Beta", "Gamma", "Delta", "Neon", "Cyber", "Tron", "Xenon", "Vortex", "Pixel", "Glitch", "Turbo", "Sonic", "Blaze", "Shadow", "Ghost", "Viper", "Cobra", "Titan", "Nova", "Luna", "Sol", "Mars", "Jupiter", "Saturn", "Pluto", "Comet", "Star", "Nebula", "Galaxy", "Astro", "Cosmo", "Orbit", "Gravity", "Force", "Energy", "Power", "Spark", "Volt", "Amp", "Watt", "Ohm", "Hertz", "Byte", "Bit", "Mega", "Giga", "Tera", "Peta"];

function generateBots() {
    STATE.bots = [];
    document.getElementById('betsList').innerHTML = '';
    
    const botCount = 50; 
    document.getElementById('activePlayersCount').innerText = botCount + 1;

    for(let i=0; i<botCount; i++) {
        const name = BOT_NAMES_LIST[Math.floor(Math.random() * BOT_NAMES_LIST.length)] + Math.floor(Math.random()*100);
        const bet = (Math.random() * 100 + 10).toFixed(0);
        
        // Logic: 10% crash early, 40% low cashout, 40% med, 10% high
        let target;
        const r = Math.random();
        if(r < 0.1) target = 1.0; // Will crash immediately/lose
        else if(r < 0.5) target = 1.01 + Math.random() * 0.99; // 1.01x - 2.00x
        else if(r < 0.9) target = 2.0 + Math.random() * 3.0;   // 2.00x - 5.00x
        else target = 5.0 + Math.random() * 10.0;              // 5.00x+

        const bot = { id: i, name, bet, target, cashed: false };
        STATE.bots.push(bot);
        
        addSidebarRow(name, bet, '-', 'pending', i);
    }
}

function updateBots() {
    // Run in game loop
    STATE.bots.forEach(bot => {
        if(!bot.cashed && STATE.currentMultiplier >= bot.target) {
            bot.cashed = true;
            const row = document.getElementById(`bot-row-${bot.id}`);
            if(row) {
                const winAmt = (bot.bet * bot.target).toFixed(2);
                row.querySelector('.bet-mult').innerHTML = `<span style="color:var(--accent)">${bot.target.toFixed(2)}x</span>`;
                row.querySelector('.bet-amt').innerHTML = `<span style="color:var(--accent)">$${winAmt}</span>`;
                row.style.background = 'rgba(0,255,136,0.1)';
            }
        }
    });
}

function resolveLosses() {
    for(let i=1; i<=2; i++) {
        if(STATE.bets[i].active && !STATE.bets[i].cashedOut) STATE.bets[i].active = false;
        if(STATE.bets[i].cashedOut) STATE.bets[i].active = false;
    }
}

// Kickoff
requestAnimationFrame(gameLoop);
startRound();