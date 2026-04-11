/**
 * CONFIGURATION
 */
const CONFIG = {
    bettingTime: 10000, // 10s Waiting
    roundTime: 10000,   // 10s Running
    get cycleTime() { return this.bettingTime + this.roundTime }, // 20s Total Cycle
    startPrice: 48000.00,
    volatility: 0.8,    // LOWERED: Smoother, less jerky movement
    historyPoints: 300, // INCREASED: Chart spans more time (scrolls slower)
    updateRate: 100     // NEW: Update every 100ms instead of 50ms (Tick-like feel)
};

/**
 * CONFETTI ENGINE (Simple)
 */
const Confetti = {
    canvas: document.getElementById('confetti-canvas'),
    ctx: null,
    particles: [],
    active: false,
    
    init() {
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },
    
    start() {
        this.active = true;
        this.particles = [];
        for(let i=0; i<150; i++) {
            this.particles.push({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                color: `hsl(${Math.random()*360}, 100%, 50%)`,
                size: Math.random() * 8 + 4,
                life: 1.0,
                decay: 0.01 + Math.random() * 0.02
            });
        }
        this.loop();
    },
    
    stop() {
        this.active = false;
        if(this.ctx) this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
    },
    
    loop() {
        if(!this.active) return;
        const ctx = this.ctx;
        ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
        
        let alive = false;
        this.particles.forEach(p => {
            if(p.life > 0) {
                alive = true;
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.5; // Gravity
                p.life -= p.decay;
                
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            }
        });
        
        if(alive) requestAnimationFrame(() => this.loop());
        else this.stop();
    }
};

/**
 * GAME ENGINE
 */
const Game = {
    balance: 1000,
    currentBet: 10,
    userBet: null, // { dir: 'UP'|'DOWN', amount: 100, entryPrice: 0 }
    state: 'SPLASH', // SPLASH, MENU, WAITING, RUNNING
    
    // Data
    priceHistory: [],
    currentPrice: CONFIG.startPrice,
    startPriceOfRound: 0,
    lastPointTime: 0,
    myBetHistory: [], // Stores past bets
    
    // Ad System
    adTimer: null,
    adTimeLeft: 10,
    
    // Pseudo-Multiplayer
    fakeUsers: ["CryptoKing", "MoonBoy99", "Satoshi_Fan", "Whale_Alert", "TraderJo", "HODLer_X", "ElonMusk_Fake", "DogeFather"],

    init() {
        this.loadStorage();
        Chart.init();
        Confetti.init();
        this.setupInputs();
        this.renderLeaders();
        
        // Start Splash Animation
        setTimeout(() => {
            document.getElementById('loading-progress').style.width = '100%';
        }, 100);
        
        setTimeout(() => {
            this.showMenu();
        }, 2200);
    },
    
    showMenu() {
        document.getElementById('splash-screen').classList.add('hidden');
        document.getElementById('menu-screen').classList.remove('hidden');
        this.state = 'MENU';
    },

    launchGame() {
        document.getElementById('menu-screen').classList.add('hidden');
        this.state = 'WAITING'; // Set state explicitly to allow loop to run
        this.startFakeMultiplayer();
        
        // Pre-fill history so chart isn't empty on start
        const now = Date.now();
        for(let i=0; i<CONFIG.historyPoints; i++) {
            this.updatePriceLogic();
            // Add historical points backwards in time
            this.priceHistory.push({
                time: now - ((CONFIG.historyPoints - i) * CONFIG.updateRate),
                price: this.currentPrice
            });
        }
        
        this.startLoop();
    },

    loadStorage() {
        const saved = localStorage.getItem('crypto_call_pro_bal');
        if(saved) this.balance = parseFloat(saved);
        
        const hist = localStorage.getItem('crypto_call_pro_hist');
        if(hist) this.myBetHistory = JSON.parse(hist);
        
        this.updateUI();
    },

    saveStorage() {
        localStorage.setItem('crypto_call_pro_bal', this.balance);
        localStorage.setItem('crypto_call_pro_hist', JSON.stringify(this.myBetHistory));
    },

    startLoop() {
        requestAnimationFrame((t) => this.loop(t));
    },

    // Main Game Loop running at 60fps
    loop(timestamp) {
        if (this.state === 'SPLASH' || this.state === 'MENU') return;

        const now = Date.now();
        const cycleTime = now % CONFIG.cycleTime; // 0 to 20000
        
        // State Logic
        let newState = 'WAITING';
        let timeLeft = 0;

        if (cycleTime < CONFIG.bettingTime) {
            // 0 - 10s: Betting
            newState = 'WAITING';
            timeLeft = (CONFIG.bettingTime - cycleTime) / 1000;
        } else {
            // 10s - 20s: Running
            newState = 'RUNNING';
            timeLeft = (CONFIG.cycleTime - cycleTime) / 1000;
        }

        // State Transition Handling
        if (this.state !== newState) {
            this.onStateChange(newState);
        }
        this.state = newState;

        // Price Update
        this.updatePriceLogic();
        this.recordHistory(now);

        // Render
        this.updateUI(timeLeft);
        Chart.draw(this.priceHistory, this.state, this.startPriceOfRound, this.userBet);

        requestAnimationFrame((t) => this.loop(t));
    },
    
    // Core Price Logic: Random Walk (Brownian Motion)
    updatePriceLogic() {
        // 50% chance up or down every frame
        // Independent increments = 50% probability of being higher/lower after T seconds
        const change = (Math.random() - 0.5) * CONFIG.volatility;
        this.currentPrice += change;
    },

    recordHistory(now) {
        // Only record history points periodically (Configurable update rate for tick speed)
        // Slower update rate = Slower chart scrolling
        if (!this.lastPointTime || now - this.lastPointTime > CONFIG.updateRate) {
            this.priceHistory.push({ time: now, price: this.currentPrice });
            if (this.priceHistory.length > CONFIG.historyPoints) {
                this.priceHistory.shift();
            }
            this.lastPointTime = now;
        }
    },

    onStateChange(newState) {
        const badge = document.getElementById('phase-badge');
        
        if (newState === 'RUNNING') {
            // Round Start
            this.startPriceOfRound = this.currentPrice;
            badge.innerText = "LIVE ROUND";
            badge.className = "phase-badge phase-live";
            this.disableButtons(true);
            this.addSystemMessage("Round Started! Good Luck.");
        } else {
            // Round End (Back to Waiting)
            this.settleRound();
            this.userBet = null;
            badge.innerText = "PLACE BETS";
            badge.className = "phase-badge phase-wait";
            this.disableButtons(false);
            this.addSystemMessage("Round Ended. Taking new bets.");
        }
    },

    settleRound() {
        if (!this.userBet) return;

        const endPrice = this.currentPrice;
        const startPrice = this.startPriceOfRound;
        let won = false;
        
        if (this.userBet.dir === 'UP' && endPrice > startPrice) won = true;
        if (this.userBet.dir === 'DOWN' && endPrice < startPrice) won = true;

        let payout = 0;
        if (won) {
            payout = this.userBet.amount * 1.87;
            this.balance += payout;
        }

        // Update History Record
        if(this.myBetHistory.length > 0) {
            this.myBetHistory[0].result = won ? 'WIN' : 'LOSE';
            this.myBetHistory[0].payout = won ? payout : 0;
            this.myBetHistory[0].endPrice = endPrice;
        }
        
        // Show Modal instead of small Toast
        this.showResultModal(won, won ? payout : this.userBet.amount);
        
        this.saveStorage();
        if(document.querySelector('.tab.active').innerText === "My History") {
            this.renderHistory();
        }
    },

    showResultModal(won, amount) {
        const modal = document.getElementById('result-modal');
        const card = document.getElementById('result-card');
        const title = document.getElementById('result-title');
        const icon = document.getElementById('result-icon');
        const msg = document.getElementById('result-msg');
        const amtDiv = document.getElementById('result-amount');

        modal.classList.remove('hidden');
        card.className = "popup-card " + (won ? "win-style" : "lose-style");
        
        title.innerText = won ? "YOU WON!" : "YOU LOST";
        icon.innerText = won ? "🏆" : "📉";
        msg.innerText = won ? "Great prediction!" : "Better luck next round.";
        amtDiv.innerText = won ? `+$${amount.toFixed(2)}` : `-$${amount.toFixed(2)}`;

        if(won) {
            Confetti.start();
        }
    },
    
    closeResultModal() {
        document.getElementById('result-modal').classList.add('hidden');
        Confetti.stop();
    },

    placeBet(dir) {
        if (this.state !== 'WAITING') {
            this.showToast("Wait for next round!", false);
            return;
        }
        if (this.balance < this.currentBet) {
            this.showToast("Insufficient Balance", false);
            return;
        }

        this.balance -= this.currentBet;
        
        // Record Bet
        this.userBet = {
            dir: dir,
            amount: this.currentBet,
            entryPrice: this.currentPrice 
        };
        
        // Add to history array immediately (pending result)
        this.myBetHistory.unshift({
            time: new Date().toLocaleTimeString(),
            dir: dir,
            amount: this.currentBet,
            result: 'PENDING',
            entryPrice: this.currentPrice,
            endPrice: 0,
            payout: 0
        });
        
        this.saveStorage();
        this.updateUI();
        this.showToast(`${dir} Bet Placed!`, true);
        
        // If history tab is open, update it
        if(document.querySelector('.tab.active').innerText === "My History") {
            this.renderHistory();
        }
    },
    
    // --- TABS & LISTS ---
    switchTab(tabName) {
        // Update Tab Classes
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        // Find which one was clicked - handled by onclick passing name, 
        // but need to highlight correct div based on child index or text.
        // Simplified:
        const tabs = document.querySelectorAll('.tab');
        if(tabName === 'live') tabs[0].classList.add('active');
        if(tabName === 'history') tabs[1].classList.add('active');
        if(tabName === 'leaders') tabs[2].classList.add('active');

        // Hide all contents
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Show specific
        document.getElementById('tab-' + tabName).classList.add('active');
        
        if(tabName === 'history') this.renderHistory();
        if(tabName === 'leaders') this.renderLeaders(); // Static for now
    },
    
    renderHistory() {
        const container = document.getElementById('my-history-list');
        container.innerHTML = '';
        
        if(this.myBetHistory.length === 0) {
            container.innerHTML = '<div style="padding:20px; text-align:center; color:#555;">No bets yet.</div>';
            return;
        }
        
        this.myBetHistory.forEach(bet => {
            const row = document.createElement('div');
            row.className = 'bet-row';
            let statusColor = '#888';
            if(bet.result === 'WIN') statusColor = 'var(--bull-green)';
            if(bet.result === 'LOSE') statusColor = 'var(--bear-red)';
            
            row.innerHTML = `
                <div class="col-user" style="font-size:0.75rem">${bet.time}</div>
                <div class="col-bet" style="width:80px;">$${bet.amount}</div>
                <div class="col-dir" style="color:${statusColor}">${bet.result}</div>
            `;
            container.appendChild(row);
        });
    },
    
    renderLeaders() {
        const container = document.getElementById('leaders-list');
        if(container.children.length > 0) return; // Don't re-render if exists
        
        const leaders = [
            {name: "CryptoKing", profit: "+$54,200"},
            {name: "ElonMusk_Fake", profit: "+$32,100"},
            {name: "Satoshi_Fan", profit: "+$28,400"},
            {name: "DogeFather", profit: "+$19,000"},
            {name: "Whale_Alert", profit: "+$12,500"},
            {name: "MoonBoy99", profit: "+$8,200"},
        ];
        
        leaders.forEach((l, i) => {
            const row = document.createElement('div');
            row.className = 'leader-row';
            row.innerHTML = `
                <div style="display:flex; gap:10px;">
                    <span class="rank-idx">#${i+1}</span>
                    <span style="color:var(--text-main)">${l.name}</span>
                </div>
                <span style="color:var(--bull-green)">${l.profit}</span>
            `;
            container.appendChild(row);
        });
    },

    setupInputs() {
        // Chips
        document.querySelectorAll('.chip').forEach(c => {
            c.addEventListener('click', (e) => {
                document.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
                e.target.classList.add('active');
                
                const val = e.target.dataset.val;
                if (val === 'MAX') this.currentBet = this.balance;
                else this.currentBet = parseInt(val);
                
                document.getElementById('bet-input').innerText = this.currentBet;
            });
        });

        // Buttons
        document.getElementById('btn-up').addEventListener('click', () => this.placeBet('UP'));
        document.getElementById('btn-down').addEventListener('click', () => this.placeBet('DOWN'));
    },

    disableButtons(disabled) {
        document.getElementById('btn-up').disabled = disabled;
        document.getElementById('btn-down').disabled = disabled;
        document.getElementById('chips').style.opacity = disabled ? 0.5 : 1;
        document.getElementById('chips').style.pointerEvents = disabled ? 'none' : 'all';
    },

    // --- AD SYSTEM LOGIC ---
    openAdModal() {
        document.getElementById('ad-modal').classList.remove('hidden');
        this.adTimeLeft = 10;
        document.getElementById('btn-claim-reward').disabled = true;
        document.getElementById('btn-claim-reward').innerText = "Wait...";
        document.getElementById('btn-claim-reward').style.opacity = "0.5";
        
        this.updateAdTimer();
        
        if (this.adTimer) clearInterval(this.adTimer);
        this.adTimer = setInterval(() => {
            this.adTimeLeft--;
            this.updateAdTimer();
            if (this.adTimeLeft <= 0) {
                clearInterval(this.adTimer);
                const btn = document.getElementById('btn-claim-reward');
                btn.disabled = false;
                btn.innerText = "Claim $100";
                btn.style.opacity = "1";
            }
        }, 1000);
    },
    
    updateAdTimer() {
        document.getElementById('ad-timer-display').innerText = `Reward in: ${this.adTimeLeft}s`;
    },
    
    closeAdModal() {
        document.getElementById('ad-modal').classList.add('hidden');
        if (this.adTimer) clearInterval(this.adTimer);
    },
    
    claimAdReward() {
        this.balance += 100;
        this.saveStorage();
        this.updateUI();
        this.closeAdModal();
        this.showToast("Earned $100 Reward!", true);
    },

    updateUI(timeLeft) {
        document.getElementById('balance').innerText = this.balance.toFixed(2);
        
        const priceEl = document.getElementById('price-display');
        priceEl.innerText = this.currentPrice.toFixed(2);
        
        // Color update based on previous price (Tick color)
        if (this.prevPrice) {
            priceEl.style.color = this.currentPrice >= this.prevPrice ? 'var(--bull-green)' : 'var(--bear-red)';
        }
        this.prevPrice = this.currentPrice;

        if (timeLeft !== undefined) {
            document.getElementById('timer').innerText = `00:${Math.floor(timeLeft).toString().padStart(2, '0')}`;
            if (timeLeft <= 3 && this.state === 'WAITING') {
                document.getElementById('timer').style.color = 'var(--bear-red)';
            } else {
                document.getElementById('timer').style.color = 'var(--text-main)';
            }
        }
    },

    showToast(msg, success) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.style.borderLeft = success ? "5px solid var(--bull-green)" : "5px solid var(--bear-red)";
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    },

    // --- FAKE MULTIPLAYER ---
    startFakeMultiplayer() {
        // Random online count update
        setInterval(() => {
            const count = 1200 + Math.floor(Math.random() * 300);
            document.getElementById('online-count').innerText = `${count.toLocaleString()} Online`;
        }, 5000);

        // Add fake bets randomly
        setInterval(() => {
            if (this.state === 'WAITING' && Math.random() > 0.3) {
                const user = this.fakeUsers[Math.floor(Math.random() * this.fakeUsers.length)];
                const amt = [10, 50, 100, 500, 1000][Math.floor(Math.random() * 5)];
                const dir = Math.random() > 0.5 ? 'UP' : 'DOWN';
                this.addFakeBet(user, amt, dir);
            }
        }, 800);
    },

    addFakeBet(user, amount, dir) {
        const list = document.getElementById('live-bets-list');
        const row = document.createElement('div');
        row.className = 'bet-row';
        row.innerHTML = `
            <div class="col-user">${user}</div>
            <div class="col-bet">$${amount}</div>
            <div class="col-dir ${dir === 'UP' ? 'dir-up' : 'dir-down'}">${dir === 'UP' ? '▲' : '▼'}</div>
        `;
        list.prepend(row);
        if (list.children.length > 20) list.lastElementChild.remove();
    },

    addSystemMessage(msg) {
        const list = document.getElementById('live-bets-list');
        const row = document.createElement('div');
        row.style.padding = "5px 12px";
        row.style.fontSize = "0.7rem";
        row.style.color = "var(--gold)";
        row.style.borderBottom = "1px solid var(--border-color)";
        row.style.textAlign = "center";
        row.innerText = `--- ${msg} ---`;
        list.prepend(row);
    }
};

/**
 * CHART RENDERER (CANVAS)
 */
const Chart = {
    canvas: document.getElementById('chart-canvas'),
    ctx: null,
    width: 0,
    height: 0,
    paddingRight: 60, // Space for Y axis

    init() {
        this.ctx = this.canvas.getContext('2d');
        window.addEventListener('resize', () => this.resize());
        this.resize();
    },

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = this.width * window.devicePixelRatio;
        this.canvas.height = this.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
    },

    draw(history, state, startPriceOfRound, userBet) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);
        
        if (history.length < 2) return;

        // 1. Calculate Scales
        let minP = Infinity, maxP = -Infinity;
        history.forEach(h => {
            if(h.price < minP) minP = h.price;
            if(h.price > maxP) maxP = h.price;
        });
        
        // Add padding to range
        const range = maxP - minP || 1;
        minP -= range * 0.2;
        maxP += range * 0.2;

        const getX = (i) => (i / (history.length - 1)) * (this.width - this.paddingRight);
        const getY = (price) => this.height - ((price - minP) / (maxP - minP)) * this.height;

        // 2. Draw Grid
        ctx.strokeStyle = '#2b3139';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Horizontal lines
        for(let i=1; i<5; i++) {
            let y = (this.height / 5) * i;
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
        }
        // Vertical lines
        for(let i=1; i<5; i++) {
            let x = ((this.width - this.paddingRight) / 5) * i;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
        }
        ctx.stroke();

        // 3. Draw Area/Line
        const currentPrice = history[history.length-1].price;
        // Determine color: Green if current > start (in round), else neutral/grey
        let chartColor = '#848e9c'; // Neutral
        if (state === 'RUNNING') {
            chartColor = currentPrice >= startPriceOfRound ? '#0ecb81' : '#f6465d';
        }

        // Gradient Area
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, chartColor + '40'); // 25% opacity
        grad.addColorStop(1, chartColor + '00'); // 0% opacity

        ctx.beginPath();
        ctx.moveTo(0, this.height);
        history.forEach((h, i) => {
            ctx.lineTo(getX(i), getY(h.price));
        });
        ctx.lineTo(getX(history.length-1), this.height);
        ctx.fillStyle = grad;
        ctx.fill();

        // Stroke Line (Sharp Linear style, NO CURVES/HEARTBEAT)
        ctx.beginPath();
        ctx.moveTo(getX(0), getY(history[0].price));
        for (let i = 1; i < history.length; i++) {
             // Linear interpolation for sharp "crypto" look
            ctx.lineTo(getX(i), getY(history[i].price));
        }
        ctx.strokeStyle = chartColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 4. Draw Start Line (if running)
        if (state === 'RUNNING') {
            const startY = getY(startPriceOfRound);
            ctx.beginPath();
            ctx.moveTo(0, startY);
            ctx.lineTo(this.width - this.paddingRight, startY);
            ctx.strokeStyle = '#f0b90b'; // Gold
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Draw "Start" Badge
            ctx.fillStyle = '#f0b90b';
            ctx.fillText("START", 5, startY - 5);
        }

        // 5. Draw Current Price Line & Badge
        const lastY = getY(currentPrice);
        const lastX = this.width - this.paddingRight;
        
        ctx.beginPath();
        ctx.moveTo(0, lastY);
        ctx.lineTo(this.width, lastY);
        ctx.strokeStyle = chartColor; // '#ffffff';
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);

        // Pulsing Dot
        ctx.beginPath();
        ctx.arc(lastX, lastY, 4, 0, Math.PI*2);
        ctx.fillStyle = chartColor;
        ctx.fill();
        
        // Glow
        ctx.beginPath();
        ctx.arc(lastX, lastY, 10, 0, Math.PI*2);
        ctx.fillStyle = chartColor + '33'; // transparent
        ctx.fill();

        // Y-Axis Label
        ctx.fillStyle = chartColor;
        ctx.fillRect(lastX, lastY - 10, 60, 20);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentPrice.toFixed(1), lastX + 30, lastY);

        // 6. Draw User Bet Marker (if any)
        if (userBet) {
             // Just show an arrow near the latest price or start line to indicate position
             // Simple overlay text in middle of chart
             ctx.fillStyle = 'rgba(255,255,255,0.1)';
             ctx.font = 'bold 40px sans-serif';
             ctx.textAlign = 'center';
             ctx.fillText(userBet.dir, (this.width-this.paddingRight)/2, this.height/2);
        }
    }
};

// Start
window.onload = () => Game.init();

// ========== PhantomBet Bridge Integration ==========
PhantomBridge.init('Crypto Call');
(function() {
  let _lastBal = Game.balance;
  PhantomBridge.onReady(function(bal) {
    Game.balance = bal;
    _lastBal = bal;
    Game.saveStorage();
    Game.updateUI();
  });
  PhantomBridge.onBalanceChange(function(bal) {
    Game.balance = bal;
    _lastBal = bal;
    Game.updateUI();
  });
  const origUpdateUI = Game.updateUI;
  Game.updateUI = function(timeLeft) {
    origUpdateUI.call(Game, timeLeft);
    if (Game.balance !== _lastBal) {
      const delta = Game.balance - _lastBal;
      _lastBal = Game.balance;
      if (delta < 0) PhantomBridge.deductBet(Math.abs(delta));
      else if (delta > 0) PhantomBridge.creditWin(delta, 'Crypto Call Win');
    }
  };
})();
