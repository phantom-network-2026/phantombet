 // --- Configuration ---
        const WIN_PROBABILITY = 0.90; // 20% Win Chance
        const MULTIPLIERS = [2.0, 5.0, 12.0, 30.0, 80.0, 200.0, 500.0];
        
        let state = {
            balance: parseInt(localStorage.getItem('fh_balance')) || 1000,
            history: JSON.parse(localStorage.getItem('fh_history')) || [],
            bet: 10,
            openedVaults: [],
            isMuted: false,
            trapTriggered: false
        };

        let adTimerInterval = null;

        // --- Core Logic ---

        function showScreen(id) {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            updateUI();
        }

        function updateUI() {
            document.getElementById('menu-balance').innerText = state.balance.toLocaleString();
            document.getElementById('game-balance').innerText = state.balance.toLocaleString();
            document.getElementById('curr-bet').innerText = state.bet;
            
            const mult = state.openedVaults.length > 0 ? MULTIPLIERS[state.openedVaults.length - 1] : 1.0;
            document.getElementById('curr-mult').innerText = 'x' + mult.toFixed(1);
            document.getElementById('curr-win').innerText = Math.floor(state.bet * mult).toLocaleString();


            // Update Multiplier Bar
            const segments = document.querySelectorAll('.m-segment');
            segments.forEach((s, i) => {
                if(i < state.openedVaults.length) s.classList.add('active');
                else s.classList.remove('active');
            });
        }

        function selectBet(amt, el) {
            state.bet = amt;
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
            el.classList.add('selected');
            playSound('click');
        }

        function startGame() {
            if(state.balance < state.bet) {
                alert("Insufficient Balance!");
                return;
            }
            closeModal();
            state.balance -= state.bet;
            state.openedVaults = [];
            state.trapTriggered = false;
            generateVaults();
            showScreen('game-screen');
            playSound('click');
            save();
        }

        function generateVaults() {
            const container = document.getElementById('vault-container');
            container.innerHTML = '';
            for(let i=0; i<7; i++) {
                const vault = document.createElement('div');
                vault.className = 'vault-item' + (i === 6 ? ' big' : '');
                vault.innerHTML = `
                    <div class="vault-inner" id="vault-${i}">
                        <div class="vault-face vault-front" onclick="handleVaultClick(${i})">
                            <div class="dial">
                                <div class="dial-spokes">
                                    <div class="spoke"></div><div class="spoke"></div>
                                    <div class="spoke"></div><div class="spoke"></div>
                                </div>
                                <div class="dial-knob"></div>
                            </div>
                        </div>
                        <div class="vault-face vault-back" id="back-${i}">
                            <i data-lucide="coins" class="text-green-500" style="width: 40px; height: 40px;"></i>
                            <span style="font-size: 8px; font-weight: 900; margin-top: 10px; color: #22c55e;">SECURE</span>
                        </div>
                    </div>
                `;
                container.appendChild(vault);
            }
            lucide.createIcons();
        }

        function handleVaultClick(index) {
            if(state.trapTriggered || state.openedVaults.includes(index)) return;

            
                
                setTimeout(() => {
                    showResult(false);
                }, 2000);
            } else {
                state.openedVaults.push(index);
                vaultInner.parentElement.classList.add('open');
                playSound('vault');
                if(state.openedVaults.length === 7) {
                    setTimeout(() => cashOut(), 1000);
                }
            }
            lucide.createIcons();
            updateUI();
        }

        function cashOut() {
            const mult = MULTIPLIERS[state.openedVaults.length - 1];
            const win = Math.floor(state.bet * mult);
            state.balance += win;
            playSound('win');
            showResult(true, win);
            save();
        }

        function showResult(isWin, amount = 0) {
            const modal = document.getElementById('result-modal');
            const iconBox = document.getElementById('result-icon-box');
            const title = document.getElementById('result-title');
            const sub = document.getElementById('result-sub');
            const amtText = document.getElementById('result-amount');
            const line = document.getElementById('modal-line');

            modal.style.display = 'flex';
            if(isWin) {
                iconBox.className = 'result-icon win-theme';
                iconBox.innerHTML = '<i data-lucide="trending-up"></i>';
                title.innerText = "MISSION SUCCESS";
                sub.innerText = "VAULT SECURED";
                amtText.innerText = "+" + amount.toLocaleString();
                amtText.style.color = "var(--gold)";
                line.style.background = "var(--gold)";
                saveHistory(amount, 'WIN');
            } else {
                iconBox.className = 'result-icon loss-theme';
                iconBox.innerHTML = '<i data-lucide="alert-triangle"></i>';
                title.innerText = "HEIST BUSTED";
                sub.innerText = "SECURITY ALERT";
                amtText.innerText = "-" + state.bet.toLocaleString();
                amtText.style.color = "#ef4444";
                line.style.background = "#ef4444";
                saveHistory(0, 'LOSS');
            }
            lucide.createIcons();
        }

        function closeModal() {
            document.getElementById('result-modal').style.display = 'none';
            showScreen('menu-screen');
        }

        function saveHistory(win, status) {
            const entry = {
                timestamp: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                bet: state.bet,
                mult: state.openedVaults.length > 0 ? MULTIPLIERS[state.openedVaults.length - 1] : 1.0,
                win: win,
                status: status
            };
            state.history.unshift(entry);
            state.history = state.history.slice(0, 15);
            renderHistory();
            save();
        }

        function renderHistory() {
            const list = document.getElementById('history-list');
            list.innerHTML = '';
            state.history.forEach(h => {
                const item = document.createElement('div');
                item.className = 'history-item';
                item.innerHTML = `
                    <div>
                        <p style="font-size: 8px; color: #52525b; font-weight: 900;">${h.timestamp}</p>
                        <p style="font-size: 12px; font-weight: bold;">Bet: ${h.bet} <span class="${h.status === 'WIN' ? 'status-win' : 'status-loss'}">(${h.status})</span></p>
                    </div>
                    <div style="text-align: right">
                        <p style="font-size: 9px; color: var(--gold)">x${h.mult}</p>
                        <p style="font-weight: 900; color: ${h.status === 'WIN' ? '#22c55e' : '#52525b'}">${h.status === 'WIN' ? '+' + h.win : '-' + h.bet}</p>
                    </div>
                `;
                list.appendChild(item);
            });
        }

        function clearHistory() {
            state.history = [];
            renderHistory();
            save();
            playSound('click');
        }

        function getDailyBonus() {
            state.balance += 250;
            alert("250 Coins Added as Bonus!");
            playSound('win');
            save();
            updateUI();
        }

        // Advertisement Functions
        function startAd() {
            const adModal = document.getElementById('ad-modal');
            const timerEl = document.getElementById('ad-timer');
            const claimBtn = document.getElementById('claim-ad-btn');
            const ring = document.getElementById('ad-ring');
            
            adModal.style.display = 'flex';
            claimBtn.disabled = true;
            claimBtn.style.background = '#27272a';
            claimBtn.style.color = '#52525b';
            ring.style.animation = 'spin 1s linear infinite';
            
            let timeLeft = 10;
            timerEl.innerText = timeLeft;

            if(adTimerInterval) clearInterval(adTimerInterval);
            
            adTimerInterval = setInterval(() => {
                timeLeft--;
                timerEl.innerText = timeLeft;
                if(timeLeft <= 0) {
                    clearInterval(adTimerInterval);
                    claimBtn.disabled = false;
                    claimBtn.style.background = 'white';
                    claimBtn.style.color = 'black';
                    claimBtn.style.boxShadow = '0 0 15px rgba(255,255,255,0.2)';
                    ring.style.animation = 'none';
                    ring.style.borderColor = 'var(--gold)';
                    playSound('win');
                }
            }, 1000);
        }

        function claimAdReward() {
            state.balance += 100;
            document.getElementById('ad-modal').style.display = 'none';
            playSound('win');
            save();
            updateUI();
        }

        function save() {
            localStorage.setItem('fh_balance', state.balance);
            localStorage.setItem('fh_history', JSON.stringify(state.history));
        }

        function quitGame() {
            if(confirm("Exit Mission? Current progress will be lost!")) {
                showScreen('menu-screen');
            }
        }

        // --- Audio Context ---
        function playSound(type) {
            if(state.isMuted) return;
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            const now = ctx.currentTime;

            if(type === 'click') {
                osc.frequency.setValueAtTime(400, now);
                gain.gain.setValueAtTime(0.1, now);
                osc.start(); osc.stop(now + 0.1);
            } else if(type === 'win') {
                osc.frequency.setValueAtTime(500, now);
                osc.frequency.exponentialRampToValueAtTime(1000, now + 0.3);
                gain.gain.setValueAtTime(0.1, now);
                osc.start(); osc.stop(now + 0.3);
            } else if(type === 'fail') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                gain.gain.setValueAtTime(0.2, now);
                osc.start(); osc.stop(now + 0.5);
            } else if(type === 'vault') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(200, now);
                gain.gain.setValueAtTime(0.05, now);
                osc.start(); osc.stop(now + 0.1);
            }
        }

        // --- Init ---
        window.onload = () => {
            lucide.createIcons();
            renderHistory();
            setTimeout(() => {
                showScreen('menu-screen');
            }, 3000);
        };

        document.getElementById('mute-btn').onclick = function() {
            state.isMuted = !state.isMuted;
            this.innerHTML = state.isMuted ? '<i data-lucide="volume-x"></i>' : '<i data-lucide="volume-2"></i>';
            lucide.createIcons();
        };