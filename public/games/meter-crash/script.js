 // --- INITIALIZATION ---
        window.addEventListener('load', () => {
            // Show Splash for 2.5 seconds, then show Menu
            setTimeout(() => {
                const splash = document.getElementById('splash-screen');
                splash.style.opacity = '0';
                setTimeout(() => {
                    splash.style.display = 'none';
                    document.getElementById('menu-screen').style.display = 'flex';
                }, 500);
            }, 2500);
        });

        function enterGame() {
            const menu = document.getElementById('menu-screen');
            menu.style.opacity = '0';
            setTimeout(() => {
                menu.style.display = 'none';
                document.getElementById('ui-layer').style.display = 'block';
            }, 500);
        }

        function openTutorial() { document.getElementById('tutorial-modal').style.display = 'flex'; }
        function closeTutorial() { document.getElementById('tutorial-modal').style.display = 'none'; }

        // --- GAME STATE ---
        const Game = {
            balance: 1000,
            prediction: 'heat',
            activeMeter: null, 
            currentMult: 1.0,
            targetMult: 1.0,
            isAnimating: false,
            winProb: 0.4,
            history: []
        };

        // --- THREE.JS SETUP ---
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x050505, 0.04);
        
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 2, 22);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.getElementById('canvas-container').appendChild(renderer.domElement);

        // Lights
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const pLight = new THREE.PointLight(0xffffff, 1, 40);
        pLight.position.set(0, 10, 10);
        scene.add(pLight);

        // --- METER FACTORY ---
        function createMeter(color, x) {
            const grp = new THREE.Group();
            grp.position.set(x, -5, 0); 
            grp.scale.set(0.4, 0.4, 0.4); 
            scene.add(grp);

            // Bulb
            const bulb = new THREE.Mesh(
                new THREE.SphereGeometry(3, 32, 32),
                new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.3 })
            );
            grp.add(bulb);

            // Tube
            const tube = new THREE.Mesh(
                new THREE.CylinderGeometry(2, 2, 22, 32),
                new THREE.MeshPhysicalMaterial({ 
                    color: 0xffffff, transmission: 0.8, opacity: 0.3, transparent: true, roughness: 0 
                })
            );
            tube.position.y = 11;
            grp.add(tube);

            // Liquid
            const liq = new THREE.Mesh(
                new THREE.CylinderGeometry(1.5, 1.5, 1, 32),
                new THREE.MeshLambertMaterial({ color: color, emissive: color, emissiveIntensity: 0.8 })
            );
            liq.geometry.translate(0, 0.5, 0);
            liq.scale.y = 0.1;
            grp.add(liq);

            // Marks
            for(let i=1; i<=10; i++) {
                const mark = new THREE.Mesh(
                    new THREE.BoxGeometry(0.8, 0.1, 0.1),
                    new THREE.MeshBasicMaterial({color:0x888888})
                );
                mark.position.set(2.2, i*2, 0);
                grp.add(mark);
            }

            return { grp, liq, bulb, color: new THREE.Color(color) };
        }

        // --- POSITIONS UPDATE: METERS MOVED TO LEFT ---
        // New Left: -6 (Cool), -3 (Heat)
        const coolMeter = createMeter(0x00f3ff, -6); 
        const heatMeter = createMeter(0xff0055, -3);

        // Particles
        const partGeo = new THREE.BufferGeometry();
        const partCount = 100;
        const posArr = new Float32Array(partCount * 3);
        const spdArr = new Float32Array(partCount);
        for(let i=0; i<partCount; i++) {
            // Shift particles to left area
            posArr[i*3] = (Math.random()-0.5)*15 - 4.5; 
            posArr[i*3+1] = (Math.random()-0.5)*20 + 5;
            posArr[i*3+2] = (Math.random()-0.5)*10;
            spdArr[i] = 0.05 + Math.random()*0.1;
        }
        partGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
        const partSys = new THREE.Points(partGeo, new THREE.PointsMaterial({color:0xffffff, size:0.2}));
        scene.add(partSys);
        partSys.visible = false;

        // --- RESPONSIVE CHECK ---
        function checkLayout() {
            if(window.innerWidth < 900) {
                // Mobile: Center meters
                coolMeter.grp.position.x = -1.5;
                heatMeter.grp.position.x = 1.5;
                // Move camera back a bit
                camera.position.z = 25;
            } else {
                // Desktop: Keep left
                coolMeter.grp.position.x = -6;
                heatMeter.grp.position.x = -3;
                camera.position.z = 22;
            }
        }

        // --- ANIMATION ---
        function animate() {
            requestAnimationFrame(animate);

            if(Game.isAnimating) {
                const diff = Game.targetMult - Game.currentMult;
                
                if(Math.abs(diff) > 0.01) {
                    Game.currentMult += diff * 0.03;
                } else {
                    Game.currentMult = Game.targetMult;
                    if(Game.roundActive) endRound();
                }

                updateVisuals();
            }

            // Particles
            if(partSys.visible) {
                const pos = partSys.geometry.attributes.position.array;
                const isHeat = Game.activeMeter === 'heat';
                for(let i=0; i<partCount; i++) {
                    if(isHeat) {
                        pos[i*3+1] += spdArr[i];
                        if(pos[i*3+1] > 15) pos[i*3+1] = -5;
                    } else {
                        pos[i*3+1] -= spdArr[i];
                        if(pos[i*3+1] < -5) pos[i*3+1] = 15;
                    }
                }
                partSys.geometry.attributes.position.needsUpdate = true;
            }

            renderer.render(scene, camera);
        }
        animate();

        function updateVisuals() {
            const height = ((Game.currentMult - 1) / 9) * 18 + 0.1;

            if(Game.activeMeter === 'heat') {
                heatMeter.liq.scale.y = height;
                coolMeter.liq.scale.y = 0.1;
            } else if (Game.activeMeter === 'cool') {
                coolMeter.liq.scale.y = height;
                heatMeter.liq.scale.y = 0.1;
            } else {
                heatMeter.liq.scale.y = 0.1;
                coolMeter.liq.scale.y = 0.1;
            }

            // Update Text
            const txt = document.getElementById('multiplier-text');
            txt.innerText = Game.currentMult.toFixed(2) + "x";
            
            if(Game.activeMeter === 'heat') {
                txt.style.color = '#ff0055';
                partSys.material.color.setHex(0xffaa00);
            } else if (Game.activeMeter === 'cool') {
                txt.style.color = '#00f3ff';
                partSys.material.color.setHex(0xaaddff);
            } else {
                txt.style.color = '#fff';
            }
        }

        // --- LOGIC ---
        function selectPrediction(type) {
            if(Game.isAnimating) return;
            Game.prediction = type;
            document.getElementById('btn-heat').classList.remove('active');
            document.getElementById('btn-cool').classList.remove('active');
            document.getElementById('btn-' + type).classList.add('active');
        }

        function startGame() {
            if(Game.isAnimating) return;
            const betInput = document.getElementById('bet-amt');
            const betVal = parseInt(betInput.value);

            if(isNaN(betVal) || betVal <= 0) return alert("Invalid Bet");
            if(betVal > Game.balance) return alert("Low Balance!");

            // Start Round
            Game.balance -= betVal;
            Game.betSnapshot = betVal;
            updateBalance();

            document.getElementById('start-btn').disabled = true;
            document.getElementById('status-text').innerText = "RISING...";
            
            // Ensure visual reset just in case
            Game.currentMult = 1.0;
            updateVisuals();

            // Logic
            const isWin = Math.random() < Game.winProb;
            Game.isWin = isWin;

            if (isWin) {
                Game.activeMeter = Game.prediction;
            } else {
                Game.activeMeter = (Game.prediction === 'heat') ? 'cool' : 'heat';
            }

            Game.targetMult = 1.2 + Math.random() * 5.0; 
            Game.currentMult = 1.0;

            // FX
            partSys.visible = true;
            document.getElementById(Game.activeMeter === 'heat' ? 'fire-fx' : 'ice-fx').style.opacity = 1;

            Game.isAnimating = true;
            Game.roundActive = true;
        }

        function endRound() {
            Game.roundActive = false;

            const modal = document.getElementById('res-modal');
            const box = document.getElementById('res-box');
            const title = document.getElementById('res-title');
            const amt = document.getElementById('res-amt');

            let winAmt = 0;
            if(Game.isWin) {
                winAmt = Math.floor(Game.betSnapshot * Game.targetMult);
                Game.balance += winAmt;
                title.innerText = "WON";
                title.style.color = "#0f0";
                amt.innerText = "+$" + winAmt;
            } else {
                title.innerText = "LOST";
                title.style.color = "#f00";
                amt.innerText = "Wrong Meter";
            }
            updateBalance();
            addToHistory(Game.isWin, Game.betSnapshot, winAmt, Game.targetMult);
            saveData();

            modal.style.display = 'flex';
            setTimeout(() => box.style.transform = 'scale(1)', 10);

            // Auto Close & RESET
            setTimeout(() => {
                box.style.transform = 'scale(0)';
                setTimeout(() => {
                    modal.style.display = 'none';
                    resetGame(); // Trigger Reset
                }, 300);
            }, 2500);
        }

        function resetGame() {
            Game.activeMeter = null;
            Game.targetMult = 1.0;
            Game.isAnimating = true; 
            
            // Immediately force UI update for multiplier text to ensure 1.00x is shown
            document.getElementById('multiplier-text').innerText = "1.00x";
            document.getElementById('multiplier-text').style.color = "#fff";

            setTimeout(() => {
                Game.isAnimating = false;
                document.getElementById('start-btn').disabled = false;
                document.getElementById('status-text').innerText = "PLACE BET";
                partSys.visible = false;
                document.getElementById('ice-fx').style.opacity = 0;
                document.getElementById('fire-fx').style.opacity = 0;
                
                // One final visual update to clear meters
                updateVisuals();
            }, 1000);
        }

        // --- HISTORY SYSTEM ---
        function addToHistory(win, bet, profit, mult) {
            Game.history.unshift({ win, bet, profit, mult: mult.toFixed(2) });
            if(Game.history.length > 20) Game.history.pop();
            renderHistory();
        }

        function renderHistory() {
            const list = document.getElementById('history-list');
            list.innerHTML = '';
            
            if(Game.history.length === 0) {
                list.innerHTML = '<p style="color:#666; padding:20px;">No games yet.</p>';
                return;
            }

            Game.history.forEach(h => {
                const row = document.createElement('div');
                row.className = 'hist-row';
                row.innerHTML = `
                    <span class="${h.win ? 'hist-win' : 'hist-lose'}">${h.win ? 'WIN' : 'LOSS'} (${h.mult}x)</span>
                    <span>Bet: $${h.bet}</span>
                    <span style="color:#fff">${h.win ? '+$'+h.profit : '-$'+h.bet}</span>
                `;
                list.appendChild(row);
            });
        }

        function openHistory() { document.getElementById('history-modal').style.display = 'flex'; }
        function closeHistory() { document.getElementById('history-modal').style.display = 'none'; }

        // --- EARN MONEY SYSTEM ---
        let adInterval;

        function openEarnModal() {
            const modal = document.getElementById('earn-modal');
            const timerEl = document.getElementById('ad-timer');
            const btn = document.getElementById('claim-btn');

            modal.style.display = 'flex';
            btn.disabled = true;
            btn.innerText = "WAIT...";
            btn.style.background = "#444";
            btn.style.color = "#888";
            
            let timeLeft = 10;
            timerEl.innerText = timeLeft + "s";
            
            if(adInterval) clearInterval(adInterval);
            
            adInterval = setInterval(() => {
                timeLeft--;
                timerEl.innerText = timeLeft + "s";
                
                if(timeLeft <= 0) {
                    clearInterval(adInterval);
                    timerEl.innerText = "REWARD UNLOCKED!";
                    btn.disabled = false;
                    btn.innerText = "CLAIM $500";
                    btn.style.background = "#fff";
                    btn.style.color = "#000";
                }
            }, 1000);
        }

        function claimReward() {
            const btn = document.getElementById('claim-btn');
            
            // Stop double clicks
            if(btn.disabled) return;
            btn.disabled = true;
            btn.innerText = "CLAIMED!";
            
            Game.balance += 500;
            updateBalance();
            saveData();
            
            setTimeout(() => {
                closeEarnModal();
            }, 200);
        }

        function closeEarnModal() {
            document.getElementById('earn-modal').style.display = 'none';
            if(adInterval) clearInterval(adInterval);
        }

        function updateBalance() { document.getElementById('balance').innerText = Game.balance; }
        // Removed old direct addMoney
        
        function saveData() {
            localStorage.setItem('heat_left_v1', Game.balance);
        }

        // Init
        const saved = localStorage.getItem('heat_left_v1');
        if(saved) Game.balance = parseInt(saved);
        updateBalance();
        selectPrediction('heat');
        checkLayout();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth/window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            checkLayout();
        });