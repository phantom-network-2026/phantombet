const ui = {
        get navScore() { return document.getElementById('nav-score'); },
        get navSpeed() { return document.getElementById('nav-speed'); },
        get multiplier() { return document.getElementById('multiplier'); },
        get potentialWin() { return document.getElementById('potential-win'); },
        get balance() { return document.getElementById('balance-val'); },
        get splash() { return document.getElementById('splash-screen'); },
        get loadingBar() { return document.getElementById('loading-bar-fill'); },
        get gameOverMsg() { return document.getElementById('game-over-msg'); },
        get resultText() { return document.getElementById('result-text'); },
        get missedText() { return document.getElementById('missed-text'); },
        get countdown() { return document.getElementById('auto-bet-countdown'); },
        get lobby() { return document.getElementById('lobby-overlay'); },
        get historyListFull() { return document.getElementById('full-history-list'); }
    };

    function safeUpdateText(el, text) { if (el) el.innerText = text; }

    let balance = 1000;
    let currentBet = 0;
    let multiplier = 1.00;
    let fuelLimitMultiplier = 0;
    let isCashedOut = false;
    let cashedOutAt = 0;
    let gameState = 'LOBBY'; 
    let isAutoBet = false;
    let isAutoCashOut = false;
    let autoCashOutValue = 1.5; 
    let autoBetTimer = null;
    let historyData = [];

    let isRunning = false;
    let isPreviewing = true; 
    let score = 0, gameSpeed = 0, lane = 1; 
    const LANE_POS = [-3.5, 0, 3.5];
    const SPEED_MAX = 1.5; 

    let scene, camera, renderer, clock;
    let playerCar, roadGroup, roadLines = [];

    window.onload = () => {
        simulateSplash();
        init3D();
        setupControls();
        updateBalanceUI();
        
        const autoBetToggle = document.getElementById('auto-bet-toggle');
        const autoCashoutToggle = document.getElementById('auto-cashout-toggle');
        const autoCashoutVal = document.getElementById('auto-cashout-val');

        if(autoBetToggle) autoBetToggle.addEventListener('change', (e) => {
            isAutoBet = e.target.checked;
            if(!isAutoBet && autoBetTimer) {
                clearTimeout(autoBetTimer);
                if(ui.countdown) ui.countdown.style.display = 'none';
            }
        });
        if(autoCashoutToggle) autoCashoutToggle.addEventListener('change', (e) => isAutoCashOut = e.target.checked);
        if(autoCashoutVal) autoCashoutVal.addEventListener('change', (e) => {
            let val = parseFloat(e.target.value);
            if(val < 1.5) { e.target.value = 1.5; val = 1.5; }
            autoCashOutValue = val;
        });
    };

    function simulateSplash() {
        let progress = 0;
        let interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(() => {
                    if(ui.splash) ui.splash.style.opacity = '0';
                    setTimeout(() => { if(ui.splash) ui.splash.style.display = 'none'; }, 500);
                }, 500);
            }
            if(ui.loadingBar) ui.loadingBar.style.width = progress + "%";
        }, 150);
    }

    function toggleHowTo(show) {
        const modal = document.getElementById('howto-modal');
        if(modal) modal.style.display = show ? 'block' : 'none';
    }

    function toggleHistory(show) {
        const modal = document.getElementById('history-modal');
        if(show) populateHistoryModal();
        if(modal) modal.style.display = show ? 'block' : 'none';
    }

    function updateBalanceUI() { safeUpdateText(ui.balance, balance.toFixed(2)); }

    function populateHistoryModal() {
        if(!ui.historyListFull) return;
        ui.historyListFull.innerHTML = '';
        if(historyData.length === 0) {
            ui.historyListFull.innerHTML = '<p style="text-align:center; color:#555;">No records yet.</p>';
            return;
        }
        historyData.forEach((h, idx) => {
            const div = document.createElement('div');
            div.className = 'history-row';
            div.innerHTML = `<span>#${historyData.length - idx}</span><span class="mult ${h.win ? 'win' : 'loss'}">${h.mult.toFixed(2)}x</span><span class="${h.win ? 'win' : 'loss'}">${h.win ? '+' : '-'}$${Math.abs(h.profit).toFixed(2)}</span>`;
            ui.historyListFull.appendChild(div);
        });
    }

    function prepareGame() {
        if(autoBetTimer) clearTimeout(autoBetTimer);
        if(ui.countdown) ui.countdown.style.display = 'none';

        let betInput = document.getElementById('bet-amount');
        let amt = betInput ? parseFloat(betInput.value) : 100;
        
        if (amt > balance || amt <= 0) {
            isAutoBet = false;
            const toggle = document.getElementById('auto-bet-toggle');
            if(toggle) toggle.checked = false;
            resetUI();
            return;
        }

        balance -= amt;
        currentBet = amt;
        updateBalanceUI();

        let winRoll = Math.random(); 
        if (winRoll < 0.50) {
            fuelLimitMultiplier = 1.01 + Math.random() * 0.48; 
        } else {
            let rareRoll = Math.random();
            if (rareRoll < 0.02) fuelLimitMultiplier = 50 + Math.random() * 50; 
            else if (rareRoll < 0.10) fuelLimitMultiplier = 20 + Math.random() * 30; 
            else if (rareRoll < 0.40) fuelLimitMultiplier = 2.0 + Math.random() * 18; 
            else fuelLimitMultiplier = 1.51 + Math.random() * 0.48; 
        }

        gameState = 'RACING';
        isPreviewing = false;
        multiplier = 1.00;
        isCashedOut = false;
        cashedOutAt = 0;

        const startBtn = document.getElementById('start-btn');
        if(startBtn) startBtn.disabled = true;
        if(betInput) betInput.disabled = true;
        const cashoutBtn = document.getElementById('cashout-btn');
        if(cashoutBtn) cashoutBtn.style.display = 'block';
        if(ui.multiplier) { ui.multiplier.style.display = 'block'; ui.multiplier.style.color = '#fff'; }
        if(ui.gameOverMsg) ui.gameOverMsg.style.display = 'none';
        if(ui.lobby) ui.lobby.style.display = 'none';

        restartGame();
    }

    function cashOut() {
        if (gameState !== 'RACING' || isCashedOut) return;
        isCashedOut = true;
        cashedOutAt = multiplier;
        let winAmount = currentBet * cashedOutAt;
        balance += winAmount;
        updateBalanceUI();
        const cashoutBtn = document.getElementById('cashout-btn');
        if(cashoutBtn) cashoutBtn.style.display = 'none';
        if(ui.multiplier) ui.multiplier.style.color = "var(--secondary)";
    }

    function resetUI() {
        if(autoBetTimer) clearTimeout(autoBetTimer);
        if(ui.countdown) ui.countdown.style.display = 'none';
        gameState = 'LOBBY';
        isRunning = true; 
        isPreviewing = true;
        const startBtn = document.getElementById('start-btn');
        if(startBtn) startBtn.disabled = false;
        const betInput = document.getElementById('bet-amount');
        if(betInput) betInput.disabled = false;
        const cashoutBtn = document.getElementById('cashout-btn');
        if(cashoutBtn) cashoutBtn.style.display = 'none';
        if(ui.multiplier) ui.multiplier.style.display = 'none';
        if(ui.gameOverMsg) ui.gameOverMsg.style.display = 'none';
        if(ui.lobby) ui.lobby.style.display = 'flex';
    }

    function init3D() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB); 
        scene.fog = new THREE.Fog(0x87CEEB, 100, 500);
        const container = document.getElementById('game-container');
        camera = new THREE.PerspectiveCamera(60, container.clientWidth/container.clientHeight, 0.1, 1000);
        camera.position.set(0, 5, 12);
        camera.lookAt(0, 0, -5);
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);
        clock = new THREE.Clock();
        scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbbb, 0.7));
        const sun = new THREE.DirectionalLight(0xffffff, 1.0);
        sun.position.set(50, 100, 50);
        sun.castShadow = true;
        scene.add(sun);
        createWorld();
        createPlayerCar();
        animate(); 
    }

    function createWorld() {
        roadGroup = new THREE.Group();
        scene.add(roadGroup);
        const roadGeo = new THREE.PlaneGeometry(14, 1000);
        const roadMat = new THREE.MeshStandardMaterial({color: 0x333333, roughness: 0.8});
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.z = -200;
        road.receiveShadow = true;
        roadGroup.add(road);
        const landGeo = new THREE.PlaneGeometry(1000, 1000);
        const landMat = new THREE.MeshStandardMaterial({color: 0x4d8a31});
        const land = new THREE.Mesh(landGeo, landMat);
        land.rotation.x = -Math.PI / 2;
        land.position.y = -0.1;
        land.position.z = -200;
        land.receiveShadow = true;
        scene.add(land);
        const postGeo = new THREE.BoxGeometry(0.3, 1.5, 0.3);
        const railGeo = new THREE.BoxGeometry(0.2, 0.4, 30);
        const railMat = new THREE.MeshStandardMaterial({color: 0xcccccc, metalness: 0.8});
        for(let i=0; i<60; i++){
            const z = -i * 15;
            const lG = new THREE.PlaneGeometry(0.3, 6);
            const m1 = new THREE.Mesh(lG, new THREE.MeshBasicMaterial({color: 0xffffff})); 
            m1.rotation.x = -Math.PI/2; m1.position.set(-1.75, 0.02, z); scene.add(m1); roadLines.push(m1);
            const m2 = new THREE.Mesh(lG, new THREE.MeshBasicMaterial({color: 0xffffff})); 
            m2.rotation.x = -Math.PI/2; m2.position.set(1.75, 0.02, z); scene.add(m2); roadLines.push(m2);
            const pL = new THREE.Mesh(postGeo, new THREE.MeshStandardMaterial({color: 0x999999})); pL.position.set(-7.5, 0.5, z); scene.add(pL); roadLines.push(pL);
            const rL = new THREE.Mesh(railGeo, railMat); rL.position.set(-7.5, 1.1, z); scene.add(rL); roadLines.push(rL);
            const pR = new THREE.Mesh(postGeo, new THREE.MeshStandardMaterial({color: 0x999999})); pR.position.set(7.5, 0.5, z); scene.add(pR); roadLines.push(pR);
            const rR = new THREE.Mesh(railGeo, railMat); rR.position.set(7.5, 1.1, z); scene.add(rR); roadLines.push(rR);
        }
    }

    function createPlayerCar() {
        if(playerCar) scene.remove(playerCar);
        playerCar = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 3.8), new THREE.MeshStandardMaterial({color: 0xff0055, metalness: 0.6, roughness: 0.1}));
        body.position.y = 0.6; body.castShadow = true; playerCar.add(body);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.8), new THREE.MeshStandardMaterial({color:0x000000}));
        cabin.position.set(0, 1.1, -0.2); playerCar.add(cabin);
        scene.add(playerCar);
    }

    function restartGame() {
        isRunning = true;
        score = 0; gameSpeed = 0; lane = 1;
        createPlayerCar();
    }

    function animate() {
        requestAnimationFrame(animate);
        let moveSpeed = isPreviewing ? 0.2 : gameSpeed;
        if (!isPreviewing && gameState === 'RACING') {
            gameSpeed = Math.min(gameSpeed + 0.003, SPEED_MAX);
            score += gameSpeed;
            multiplier += (multiplier > 10 ? 0.02 : 0.005) * (1 + multiplier * 0.04);
            safeUpdateText(ui.navScore, Math.floor(score).toString() + "m");
            safeUpdateText(ui.navSpeed, Math.floor(gameSpeed*200).toString() + ' km/h');
            safeUpdateText(ui.multiplier, multiplier.toFixed(2) + 'x');
            if (!isCashedOut) {
                safeUpdateText(ui.potentialWin, "Payout: $" + (currentBet * multiplier).toFixed(2));
                if (isAutoCashOut && multiplier >= autoCashOutValue) cashOut();
            }
            if (multiplier >= fuelLimitMultiplier) gameOver();
        }
        roadLines.forEach(l => { l.position.z += moveSpeed*2.5; if(l.position.z > 20) l.position.z = -600; });
        const targetX = LANE_POS[lane];
        playerCar.position.x += (targetX - playerCar.position.x) * 0.2;
        playerCar.rotation.z = (playerCar.position.x - targetX) * 0.05;
        renderer.render(scene, camera);
    }

    function gameOver() {
        isRunning = false;
        gameState = 'CRASHED';
        const finalMult = isCashedOut ? cashedOutAt : multiplier;
        const profit = isCashedOut ? (currentBet * cashedOutAt) - currentBet : -currentBet;
        historyData.unshift({ mult: multiplier, win: isCashedOut, profit: profit });
        if(historyData.length > 20) historyData.pop();
        if(ui.multiplier) { ui.multiplier.style.color = "var(--primary)"; ui.multiplier.innerText = multiplier.toFixed(2) + "x"; }
        if(ui.gameOverMsg) ui.gameOverMsg.style.display = 'block';
        const cashoutBtn = document.getElementById('cashout-btn');
        if(cashoutBtn) cashoutBtn.style.display = 'none';

        if (isCashedOut) {
            safeUpdateText(ui.resultText, "Won: $" + (currentBet * cashedOutAt).toFixed(2));
            if(ui.resultText) ui.resultText.style.color = "var(--secondary)";
            let missed = (currentBet * multiplier) - (currentBet * cashedOutAt);
            if (missed > 0.1) safeUpdateText(ui.missedText, `Oops! You could have won $${missed.toFixed(2)} more! (Went up to ${multiplier.toFixed(2)}x)`);
            else safeUpdateText(ui.missedText, "");
        } else {
            safeUpdateText(ui.resultText, "Lost: $" + currentBet.toFixed(2));
            if(ui.resultText) ui.resultText.style.color = "#ff4444";
            safeUpdateText(ui.missedText, "");
        }

        if (isAutoBet) {
            if(ui.countdown) ui.countdown.style.display = 'block';
            let cd = 10;
            const itv = setInterval(() => {
                cd--;
                if(ui.countdown) ui.countdown.innerText = `Next bet in ${cd}s...`;
                if(cd <= 0) { clearInterval(itv); if(isAutoBet) prepareGame(); }
            }, 1000);
            autoBetTimer = itv;
        }
    }

    function setupControls() {
        const tl = document.getElementById('touch-layer');
        if(tl) {
            let startX = 0;
            tl.addEventListener('touchstart', e => { startX = e.touches[0].clientX; });
            tl.addEventListener('touchend', e => {
                let diff = e.changedTouches[0].clientX - startX;
                if(Math.abs(diff) > 30) {
                    if(diff < 0 && lane > 0) lane--;
                    else if(diff > 0 && lane < 2) lane++;
                }
            });
        }
        window.addEventListener('keydown', e => {
            if(e.key === 'ArrowLeft' && lane > 0) lane--;
            if(e.key === 'ArrowRight' && lane < 2) lane++;
            if(e.key === ' ' || e.key === 'Enter') {
                if(gameState === 'LOBBY' && !isPreviewing) return;
                if(gameState === 'LOBBY') prepareGame();
                else if(gameState === 'RACING') cashOut();
            }
        });
    }

    window.addEventListener('resize', () => { 
        const container = document.getElementById('game-container');
        if (!camera || !renderer || !container) return;
        camera.aspect = container.clientWidth / container.clientHeight; 
        camera.updateProjectionMatrix(); 
        renderer.setSize(container.clientWidth, container.clientHeight); 
    });
// ========== PhantomBet Bridge Integration ==========
PhantomBridge.init('Jackpot Highway');
(function() {
  let _lastBal = balance;
  PhantomBridge.onReady(function(bal) {
    balance = bal;
    _lastBal = bal;
    updateBalanceUI();
  });
  PhantomBridge.onBalanceChange(function(bal) {
    balance = bal;
    _lastBal = bal;
    updateBalanceUI();
  });
  const origUpdateBal = updateBalanceUI;
  updateBalanceUI = function() {
    origUpdateBal();
    if (balance !== _lastBal) {
      const delta = balance - _lastBal;
      _lastBal = balance;
      if (delta < 0) PhantomBridge.deductBet(Math.abs(delta));
      else if (delta > 0) PhantomBridge.creditWin(delta, 'Jackpot Highway Win');
    }
  };
})();
