  // --- 1. Class Definition ---
    class Sprite {
        constructor(animation, x, y, id, tintColor) {
            this.x = x;
            this.y = y;
            this.id = id;
            this.animation = animation;
            this.w = this.animation[0]?.width || 192; 
            this.len = this.animation.length;
            this.speed = 0;
            this.index = 0;
            this.finished = false;
            this.rank = 0;
            this.tintColor = tintColor;
            this.acceleration = 0;
            this.scale = 1;
        }

        updateScale(laneHeight) {
            // Target height is 80% of lane height
            let targetH = laneHeight * 0.8;
            this.scale = targetH / 144;
            if (this.scale > 1.2) this.scale = 1.2;
            if (this.scale < 0.1) this.scale = 0.1; // Safety minimum
        }

        reset() {
            this.x = 0;
            this.speed = 0;
            this.finished = false;
            this.index = 0;
            this.rank = 0;
            this.acceleration = 0;
        }

        show() {
            let laneHeight = height / 5;
            this.y = (this.id - 1) * laneHeight + (laneHeight / 2) - (72 * this.scale); 

            // Draw Lane Line
            stroke(255, 15);
            strokeWeight(1);
            line(0, (this.id) * laneHeight, width, (this.id) * laneHeight);

            // Draw Horse
            push();
            translate(this.x, this.y);
            scale(this.scale);
            
            // Draw Sprite or Fallback Box
            if (this.animation && this.animation.length > 0) {
                let index = floor(this.index) % this.len;
                if(index < 0) index = 0; 
                
                let img = this.animation[index];
                if (img) {
                    tint(this.tintColor); 
                    image(img, 0, 0);
                    noTint();
                } else {
                    // Fallback if specific frame invalid
                    fill(this.tintColor);
                    rect(0, 0, 192, 144);
                }
            } else {
                // Fallback if animation array invalid
                fill(this.tintColor);
                rect(0, 0, 192, 144);
            }
            pop();

            // Draw Number
            this.drawBadge();

            // Winner Label
            if (this.finished && this.rank === 1) {
                this.drawWinnerLabel();
            }
        }
        
        drawBadge() {
            let badgeSize = 28 * this.scale;
            let fontSize = 16 * this.scale;
            let xOffset = 85 * this.scale;
            let yOffset = 35 * this.scale;

            fill(20, 20, 20, 220); 
            noStroke();
            rect(this.x + xOffset, this.y + yOffset, badgeSize, badgeSize, 6);
            noFill();
            stroke(this.tintColor);
            strokeWeight(2);
            rect(this.x + xOffset, this.y + yOffset, badgeSize, badgeSize, 6);
            fill(255);
            noStroke();
            textSize(fontSize);
            textStyle(BOLD);
            textAlign(CENTER, CENTER);
            text(this.id, this.x + xOffset + (badgeSize/2), this.y + yOffset + (badgeSize/2));
        }

        drawWinnerLabel() {
            push();
            translate(this.x + (100 * this.scale), this.y + (20 * this.scale));
            drawingContext.shadowBlur = 15;
            drawingContext.shadowColor = 'gold';
            fill(255, 215, 0); 
            noStroke();
            textSize(18 * this.scale);
            textAlign(CENTER);
            textStyle(BOLD);
            text("👑 WINNER", 0, 0);
            pop();
        }

        animate() {
            if (!isRacing) {
                this.index = 0;
                return;
            }

            if (isRacing && !this.finished) {
                let baseSpeed = width * 0.0035; 

                // --- 80% Win Logic Boost ---
                if (this.id === riggedWinnerId) {
                    baseSpeed *= 1.35; 
                }

                let luck = random(0, 100);
                if (luck > 96) this.acceleration = baseSpeed * 0.9; 
                else if (luck < 3) this.acceleration = -baseSpeed * 0.6;
                else this.acceleration *= 0.95; 

                if(this.id === riggedWinnerId && this.acceleration < 0) this.acceleration = 0;

                this.speed = baseSpeed + this.acceleration + random(-0.5, 1.8);
                if (this.speed < 1) this.speed = 1;

                this.index += 0.25; 
                this.x += this.speed;

                let finishLine = width * 0.88;
                if (this.x + (100 * this.scale) >= finishLine) {
                    this.finished = true;
                    if(!finishOrder.includes(this.id)){
                         finishOrder.push(this.id);
                         this.rank = finishOrder.length;
                    }
                }
            }
        }
    }

    // --- 2. Global Variables ---
    let spritesheet;
    let spriteData;
    let animation = [];
    let horses = [];
    let isRacing = false;
    let gatesOpen = false;
    let gateOpening = false;
    let gateYOffset = 0;
    let riggedWinnerId = null;

    let finishOrder = [];
    let wallet = 1000;
    let selectedHorseId = null;
    let currentBet = 100;
    let raceHistory = [];

    let dataPas = {
        "frames": [
            {"name":"s0","position":{"x":0,"y":0,"w":192,"h":144}},
            {"name":"s1","position":{"x":192,"y":0,"w":192,"h":144}},
            {"name":"s2","position":{"x":384,"y":0,"w":192,"h":144}},
            {"name":"s3","position":{"x":0,"y":144,"w":192,"h":144}},
            {"name":"s4","position":{"x":192,"y":144,"w":192,"h":144}},
            {"name":"s5","position":{"x":384,"y":144,"w":192,"h":144}},
            {"name":"s6","position":{"x":0,"y":288,"w":192,"h":144}}
        ]
    };

    // --- 3. p5.js Functions ---
    function preload() {
        spriteData = dataPas;
        // Using existing Imgur link as it's reliable for p5.js
        spritesheet = loadImage("https://i.imgur.com/rvirzbo.png");
    }

    function setup() {
        // Safe Canvas Initialization
        let container = document.getElementById('canvas-target');
        let w = container.clientWidth || windowWidth;
        let h = container.clientHeight || (windowHeight * 0.5); 
        
        let cnv = createCanvas(w, h);
        cnv.parent('canvas-target');
        
        let frames = spriteData.frames;
        for (let i = 0; i < frames.length; i++) {
            let pos = frames[i].position;
            // Ensure get() doesn't fail
            if (spritesheet.width > 0) {
                let img = spritesheet.get(pos.x, pos.y, pos.w, pos.h);
                animation.push(img);
            }
        }

        initializeHorses();
        updateWallet();
        
        setTimeout(() => {
            let splash = document.getElementById('splash-screen');
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
            }, 800);
            windowResized(); // Ensure proper sizing
        }, 2200); 
    }
    
    function initializeHorses() {
        let laneHeight = height / 5;
        let colors = [
            color(255, 100, 100), 
            color(100, 150, 255), 
            color(100, 255, 100), 
            color(255, 230, 50), 
            color(200, 100, 255)  
        ];

        for (let i = 0; i < 5; i++) {
            horses[i] = new Sprite(animation, 0, 0, i + 1, colors[i]);
            horses[i].updateScale(laneHeight);
        }
    }

    function windowResized() {
        let container = document.getElementById('canvas-target');
        let w = container.clientWidth || windowWidth;
        let h = container.clientHeight || (windowHeight * 0.5);
        resizeCanvas(w, h);
        
        let laneHeight = height / 5;
        for (let horse of horses) {
            horse.updateScale(laneHeight);
        }
    }

    function draw() {
        drawTurf();
        let laneHeight = height / 5;
        
        drawFinishLine();

        if (gateOpening) {
            gateYOffset = lerp(gateYOffset, -100, 0.1);
        } else if (!isRacing) {
            gateYOffset = lerp(gateYOffset, 0, 0.1);
        }

        drawGates(laneHeight);

        let allFinished = true;
        for (let horse of horses) {
            horse.show(); 
            horse.animate();
            if (!horse.finished) allFinished = false;
        }

        if (isRacing && allFinished) {
            endRace();
        }
    }

    function drawTurf() {
        noFill();
        for (let y = 0; y < height; y++) {
            let inter = map(y, 0, height, 0, 1);
            let c = lerpColor(color(20, 50, 25), color(10, 35, 15), inter);
            stroke(c);
            line(0, y, width, y);
        }
    }
    
    function drawFinishLine() {
        let finishX = width * 0.88;
        noStroke();
        fill(0, 0, 0, 150);
        rect(finishX + 5, 0, 15, height);
        let checkSize = 25;
        noStroke();
        for(let j=0; j<height; j+=checkSize) {
            if((j/checkSize)%2==0) fill(240); else fill(20);
            rect(finishX, j, 15, checkSize);
            if((j/checkSize)%2==0) fill(20); else fill(240);
            rect(finishX + 15, j, 15, checkSize);
        }
        stroke('#d4af37'); 
        strokeWeight(4);
        line(finishX, 0, finishX, height);
    }

    function drawGates(laneHeight) {
        let gateScale = horses[0] ? horses[0].scale : 1;
        let gateX = 155 * gateScale; 
        
        for (let i = 0; i < 5; i++) {
            let yBase = (i * laneHeight) + (laneHeight / 2) + (20 * gateScale); 
            
            push();
            translate(gateX, yBase + gateYOffset);
            scale(gateScale); 
            
            stroke(200);
            strokeWeight(4);
            line(0, 0, 0, -80);
            
            stroke(255);
            strokeWeight(3);
            line(0, -20, 0, -70); 
            
            line(-5, -20, 20, -20);
            line(-5, -45, 20, -45);
            line(-5, -70, 20, -70);
            
            stroke(255, 150);
            strokeWeight(1);
            line(0, -20, 15, -70);
            line(15, -20, 0, -70);
            
            pop();
        }
    }

    // --- 4. Game UI Logic ---

    function selectHorse(id) {
        if (isRacing || document.getElementById('play-again-btn').style.display === 'block') return;
        selectedHorseId = id;
        document.querySelectorAll('.horse-btn').forEach(btn => btn.classList.remove('selected'));
        document.querySelectorAll('.horse-btn')[id-1].classList.add('selected');
        updateStatus(`Horse #${id} Selected`);
    }

    function setBet(amount) {
        if (isRacing || document.getElementById('play-again-btn').style.display === 'block') return;
        document.getElementById('bet-amount').value = amount;
    }

    async function startRace() {
        if (isRacing || gateOpening) return;
        
        let betInput = document.getElementById('bet-amount');
        currentBet = parseFloat(betInput.value);

        if (!selectedHorseId) { updateStatus("⚠️ Select a horse first!"); return; }
        if (isNaN(currentBet) || currentBet <= 0 || currentBet > 5) { updateStatus("⚠️ Invalid bet."); return; }
        if (currentBet > wallet) { updateStatus("⚠️ Insufficient funds."); return; }

        // Deduct via bridge
        const result = await PhantomBridge.deductBet(currentBet);
        if (!result.success) { updateStatus("⚠️ " + (result.error || "Bet failed")); return; }
        wallet = result.balance;
        updateWallet();
        
        document.getElementById('start-btn').disabled = true;
        document.getElementById('bet-amount').disabled = true;
        document.getElementById('horse-selector').style.pointerEvents = 'none';
        
        let chance = random(100);
        if (chance < 80) {
             riggedWinnerId = selectedHorseId;
        } else {
             let options = [1,2,3,4,5].filter(id => id !== selectedHorseId);
             riggedWinnerId = random(options);
        }
        
        gateOpening = true;
        updateStatus("Gates opening...");
        
        setTimeout(() => {
            isRacing = true;
            finishOrder = [];
            updateStatus("They're off! 🐎");
        }, 1000);
    }

    async function endRace() {
        isRacing = false;
        let winnerId = finishOrder[0];
        let won = (winnerId === selectedHorseId);
        let winAmount = 0;
        let msg = "";

        if (won) {
            winAmount = Math.floor(currentBet * 5 * 100) / 100;
            // Credit win via bridge
            const result = await PhantomBridge.creditWin(winAmount, 'Royal Derby Win');
            if (result.success) {
                wallet = result.balance;
            }
            msg = `🎉 WIN! Horse #${winnerId} Won! +$${winAmount}`;
        } else {
            msg = `❌ Lost. Winner: Horse #${winnerId}`;
        }

        addToHistory(winnerId, won, won ? winAmount : currentBet);
        updateWallet();
        updateStatus(msg);

        document.getElementById('start-btn').style.display = 'none';
        document.getElementById('play-again-btn').style.display = 'block';
    }

    function prepareNextRace() {
        for (let horse of horses) horse.reset();
        
        gateOpening = false;
        gateYOffset = 0;
        riggedWinnerId = null;

        document.getElementById('start-btn').style.display = 'block';
        document.getElementById('start-btn').disabled = false;
        document.getElementById('play-again-btn').style.display = 'none';
        document.getElementById('bet-amount').disabled = false;
        document.getElementById('horse-selector').style.pointerEvents = 'auto';
        updateStatus("Place your bet for the next race.");
    }

    function updateWallet() {
        document.getElementById('wallet-display').innerText = wallet;
    }

    function updateStatus(msg) {
        let el = document.getElementById('status-msg');
        el.innerText = msg;
        el.style.borderColor = "#d4af37";
        setTimeout(() => el.style.borderColor = "var(--border-color)", 500);
    }

    // --- History Logic ---
    function addToHistory(winnerId, won, amount) {
        let historyContainer = document.getElementById('history-list');
        if(raceHistory.length === 0) historyContainer.innerHTML = '';
        
        raceHistory.unshift({ winner: winnerId, won: won, amount: amount });
        
        let div = document.createElement('div');
        div.className = `history-item ${won ? 'win' : 'loss'}`;
        
        let label = (winnerId === 'AD') ? "Reward Claimed" : `Horse #${winnerId} Won`;
        
        div.innerHTML = `
            <span>${label}</span>
            <span class="badge ${won ? 'badge-win' : 'badge-loss'}">
                ${won ? '+' + amount : '-' + amount}
            </span>
        `;
        historyContainer.prepend(div);
    }

    // --- Modal Functions ---
    function openRules() {
        document.getElementById('rules-modal').style.display = 'flex';
    }

    function closeRules() {
        document.getElementById('rules-modal').style.display = 'none';
    }

    // --- Ad & Reward Logic ---
    let adTimerInterval;
    function showAd() {
        let modal = document.getElementById('ad-modal');
        let timerSpan = document.getElementById('ad-timer');
        let timeLeft = 10;
        
        modal.style.display = 'flex';
        timerSpan.innerText = timeLeft;
        
        adTimerInterval = setInterval(() => {
            timeLeft--;
            timerSpan.innerText = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(adTimerInterval);
                finishAd();
            }
        }, 1000);
    }

    function finishAd() {
        document.getElementById('ad-modal').style.display = 'none';
        wallet += 100;
        updateWallet();
        document.getElementById('reward-popup').style.display = 'flex';
        addToHistory('AD', true, 100);
    }

    function closeRewardPopup() {
        document.getElementById('reward-popup').style.display = 'none';
    }

    // --- Theme Logic ---
    const themes = [
        {
            name: 'Dark',
            vars: {
                '--bg-color': '#050505',
                '--text-color': '#e0e0e0',
                '--panel-bg': 'rgba(20, 20, 20, 0.95)',
                '--navbar-bg': 'rgba(10, 10, 10, 0.95)',
                '--accent-color': '#d4af37',
                '--secondary-color': '#b0b0b0',
                '--input-bg': '#0f0f0f',
                '--btn-bg': '#1a1a1a'
            }
        },
        {
            name: 'Light',
            vars: {
                '--bg-color': '#e0e0e0',
                '--text-color': '#2c3e50',
                '--panel-bg': 'rgba(245, 245, 245, 0.95)',
                '--navbar-bg': 'rgba(255, 255, 255, 0.95)',
                '--accent-color': '#2980b9',
                '--secondary-color': '#34495e',
                '--input-bg': '#ffffff',
                '--btn-bg': '#ecf0f1'
            }
        },
        {
            name: 'Midnight',
            vars: {
                '--bg-color': '#0f172a',
                '--text-color': '#f8fafc',
                '--panel-bg': 'rgba(30, 41, 59, 0.95)',
                '--navbar-bg': 'rgba(15, 23, 42, 0.95)',
                '--accent-color': '#8b5cf6',
                '--secondary-color': '#cbd5e1',
                '--input-bg': '#1e293b',
                '--btn-bg': '#334155'
            }
        },
        {
            name: 'Cyber',
            vars: {
                '--bg-color': '#000000',
                '--text-color': '#00ff00',
                '--panel-bg': 'rgba(10, 10, 10, 0.95)',
                '--navbar-bg': 'rgba(0, 0, 0, 0.95)',
                '--accent-color': '#ff00ff',
                '--secondary-color': '#00cc00',
                '--input-bg': '#050505',
                '--btn-bg': '#111'
            }
        }
    ];

    function randomTheme() {
        let t = themes[Math.floor(Math.random() * themes.length)];
        let root = document.documentElement;
        
        for (const [key, value] of Object.entries(t.vars)) {
            root.style.setProperty(key, value);
        }
    }
// ========== PhantomBet Bridge Integration ==========
PhantomBridge.init('Royal Derby');
PhantomBridge.onReady(function(bal) {
    wallet = bal;
    updateWallet();
});
PhantomBridge.onBalanceChange(function(bal) {
    wallet = bal;
    updateWallet();
});
