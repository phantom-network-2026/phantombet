  // --- CONSTANTS & ASSETS ---
        const EMOJI_SAFE = '<div class="text-green-500 drop-shadow-lg filter"><i class="fa-solid fa-door-open mb-2"></i><br><span class="text-sm font-bold">SAFE</span></div>';
        const EMOJI_LION = '<div class="text-orange-500 drop-shadow-lg"><i class="fa-solid fa-paw mb-2 text-6xl"></i><br><span class="text-sm font-bold">LION</span></div>';
        const EMOJI_GHOST = '<div class="text-purple-400 drop-shadow-lg"><i class="fa-solid fa-ghost mb-2 text-6xl"></i><br><span class="text-sm font-bold">GHOST</span></div>';

        window.handleImageError = function(imgElement, type) {
            let fallbackHTML = '';
            if (type === 'SAFE') fallbackHTML = EMOJI_SAFE;
            else if (type === 'LION') fallbackHTML = EMOJI_LION;
            else if (type === 'GHOST') fallbackHTML = EMOJI_GHOST;
            if (imgElement.parentElement) imgElement.parentElement.innerHTML = fallbackHTML;
        };

        const ASSETS = {
            SAFE: `<img src="assets/safe.png" >`,
            LION: `<img src="assets/lion.png" >`,
            GHOST: `<img src="assets/ghost.png" >`
        };

        const CONFIG = { MULTIPLIER: 2, AD_REWARD: 100, AD_DURATION: 10, STARTING_BALANCE: 1000 };

        // --- STATE ---
        let state = {
            balance: parseInt(localStorage.getItem('casinoWallet')) || CONFIG.STARTING_BALANCE,
            currentBet: 0,
            selectedDoorIndex: null,
            isBetPlaced: false,
            isRevealing: false,
            history: JSON.parse(localStorage.getItem('casinoHistory')) || []
        };

        // --- DOM ---
        const ui = {
            wallet: document.getElementById('wallet-display'),
            betInput: document.getElementById('bet-input'),
            btnPlace: document.getElementById('btn-place-bet'),
            btnOpen: document.getElementById('btn-open-door'),
            statusText: document.getElementById('game-status'),
            instruction: document.getElementById('instruction-text'),
            doors: [document.getElementById('door-0'), document.getElementById('door-1'), document.getElementById('door-2')],
            contents: [document.getElementById('content-0'), document.getElementById('content-1'), document.getElementById('content-2')],
            countdown: { overlay: document.getElementById('countdown-overlay'), number: document.getElementById('countdown-number') },
            ad: { modal: document.getElementById('ad-modal'), timer: document.getElementById('ad-timer'), btnClose: document.getElementById('btn-close-ad') },
            history: document.getElementById('history-log'),
            preloader: {
                container: document.getElementById('preloader'),
                bar: document.getElementById('loader-progress'),
                text: document.getElementById('loader-text')
            },
            htp: document.getElementById('htp-modal')
        };

        function init() {
            // Handle Preloader
            window.addEventListener('load', () => {
                setTimeout(() => { ui.preloader.bar.style.width = '30%'; ui.preloader.text.innerText = "Verifying Integrity..."; }, 300);
                setTimeout(() => { ui.preloader.bar.style.width = '70%'; ui.preloader.text.innerText = "Loading High-Res Assets..."; }, 1200);
                setTimeout(() => { ui.preloader.bar.style.width = '100%'; ui.preloader.text.innerText = "Ready to Play"; }, 2000);
                
                setTimeout(() => {
                    ui.preloader.container.style.opacity = '0';
                    setTimeout(() => {
                        ui.preloader.container.style.display = 'none';
                    }, 1000);
                }, 2500);
            });

            updateWalletUI();
            renderHistory();
            resetGame();
            
            ui.betInput.addEventListener('input', () => {
                let val = parseInt(ui.betInput.value);
                if (val > state.balance) ui.betInput.value = state.balance;
                if (val < 0) ui.betInput.value = 10;
            });
        }

        // --- CORE LOGIC ---
        function updateWalletUI() {
            ui.wallet.innerText = state.balance;
            localStorage.setItem('casinoWallet', state.balance);
        }

        function adjustBet(amount) {
            if (state.isBetPlaced) return;
            let current = parseInt(ui.betInput.value) || 0;
            let newVal = current + amount;
            if (newVal < 10) newVal = 10;
            if (newVal > state.balance) newVal = state.balance;
            ui.betInput.value = newVal;
            playSound('click');
        }

        function setMaxBet() {
            if (state.isBetPlaced) return;
            ui.betInput.value = state.balance;
            playSound('click');
        }

        function placeBet() {
            if (state.selectedDoorIndex === null) {
                setStatus("Select Door First!", "text-red-500");
                playSound('lose');
                return;
            }
            const betAmount = parseFloat(ui.betInput.value);
            if (isNaN(betAmount) || betAmount < 0.1) return setStatus("Minimum bet: $0.10", "text-red-500");
            if (betAmount > state.balance) return setStatus("Insufficient Funds", "text-red-500");

            state.currentBet = betAmount;
            state.balance -= betAmount;
            state.isBetPlaced = true;
            updateWalletUI();
            
            ui.betInput.disabled = true;
            ui.btnPlace.classList.add('hidden');
            ui.btnOpen.classList.remove('hidden');
            ui.btnOpen.disabled = false;
            
            ui.instruction.innerText = "Click to Reveal";
            setStatus("Ready to Reveal", "text-gradient-gold");
            playSound('click');
        }

        function selectDoor(index) {
            if (state.isBetPlaced || state.isRevealing) return;
            if (state.selectedDoorIndex === index) return;
            playSound('click');
            ui.doors.forEach(d => d.classList.remove('selected'));
            ui.doors[index].classList.add('selected');
            state.selectedDoorIndex = index;
            setStatus(`Door ${index+1} Selected`, "text-white");
        }

        function startRevealSequence() {
            if (!state.isBetPlaced || state.selectedDoorIndex === null) return;
            state.isRevealing = true;
            ui.btnOpen.disabled = true;
            ui.btnOpen.innerText = "OPENING...";
            
            ui.doors[state.selectedDoorIndex].classList.add('shaking');
            ui.countdown.overlay.classList.remove('hidden');
            let timeLeft = 3;
            ui.countdown.number.innerText = timeLeft;
            playSound('tick');

            const timer = setInterval(() => {
                timeLeft--;
                ui.countdown.number.innerText = timeLeft;
                if(timeLeft > 0) playSound('tick');

                if (timeLeft <= 0) {
                    clearInterval(timer);
                    resolveRound();
                }
            }, 800);
        }

        function resolveRound() {
            const outcomes = [ASSETS.LION, ASSETS.GHOST, ASSETS.SAFE];
            for (let i = outcomes.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [outcomes[i], outcomes[j]] = [outcomes[j], outcomes[i]];
            }

            ui.contents.forEach((el, i) => el.innerHTML = outcomes[i]);
            ui.countdown.overlay.classList.add('hidden');
            
            const selectedDoorEl = ui.doors[state.selectedDoorIndex];
            selectedDoorEl.classList.remove('shaking');
            selectedDoorEl.classList.add('open');

            const isSafe = outcomes[state.selectedDoorIndex] === ASSETS.SAFE;

            setTimeout(() => {
                if (isSafe) handleWin(); else handleLose();
                setTimeout(() => {
                    ui.doors.forEach((d, i) => { if (i !== state.selectedDoorIndex) d.classList.add('open'); });
                    ui.btnOpen.innerText = "PLAY AGAIN";
                    ui.btnOpen.disabled = false;
                    ui.btnOpen.onclick = resetGame;
                }, 1000);
            }, 500);
        }

        function handleWin() {
            const winnings = state.currentBet * CONFIG.MULTIPLIER;
            state.balance += winnings;
            updateWalletUI();
            playSound('win');
            setStatus(`YOU WON ${winnings}!`, "text-green-400 font-bold");
            addToHistory('WIN', winnings);
        }

        function handleLose() {
            playSound('lose');
            setStatus("YOU LOST", "text-red-500 font-bold");
            ui.doors[state.selectedDoorIndex].classList.add('glow-danger');
            addToHistory('LOSS', state.currentBet);
        }

        function setStatus(msg, classes) {
            ui.statusText.innerHTML = `<h2 class="font-display text-3xl md:text-5xl drop-shadow-lg tracking-wide ${classes}">${msg}</h2>`;
        }

        function resetDoors() {
            ui.doors.forEach(d => {
                d.classList.remove('open', 'selected', 'shaking', 'glow-danger', 'disabled');
            });
            ui.contents.forEach(c => c.innerHTML = '❓');
        }

        function resetGame() {
            state.currentBet = 0;
            state.selectedDoorIndex = null;
            state.isBetPlaced = false;
            state.isRevealing = false;
            resetDoors();
            ui.betInput.disabled = false;
            ui.btnPlace.classList.remove('hidden');
            ui.btnOpen.classList.add('hidden');
            ui.btnOpen.innerText = "OPEN DOOR";
            ui.btnOpen.onclick = startRevealSequence;
            setStatus("SELECT A DOOR", "text-white");
            ui.instruction.innerText = "Step 1: Select Door";
        }

        // --- HISTORY (Vertical) ---
        function addToHistory(result, amount) {
            const item = { result, amount, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
            state.history.unshift(item);
            if(state.history.length > 20) state.history.pop();
            localStorage.setItem('casinoHistory', JSON.stringify(state.history));
            renderHistory();
        }

        function renderHistory() {
            ui.history.innerHTML = '';
            if(state.history.length === 0) {
                ui.history.innerHTML = '<div class="text-center py-8 text-gray-600 text-xs italic">No history yet</div>';
                return;
            }

            state.history.forEach(h => {
                const div = document.createElement('div');
                const isWin = h.result === 'WIN';
                div.className = `flex justify-between items-center p-3 rounded border-l-4 ${isWin ? 'bg-green-900/10 border-green-500' : 'bg-red-900/10 border-red-500'} border-t border-r border-b border-white/5`;
                
                div.innerHTML = `
                    <div class="flex flex-col">
                        <span class="text-[10px] text-gray-500">${h.time}</span>
                        <span class="font-bold text-xs ${isWin ? 'text-green-400' : 'text-red-400'}">${h.result}</span>
                    </div>
                    <div class="font-mono text-sm font-bold text-white">
                        ${isWin ? '+' : '-'}${h.amount}
                    </div>
                `;
                ui.history.appendChild(div);
            });
        }
        
        function clearHistory() {
            state.history = [];
            localStorage.setItem('casinoHistory', JSON.stringify([]));
            renderHistory();
        }

        // --- HOW TO PLAY ---
        function openHTPModal() {
            ui.htp.classList.add('active');
            playSound('click');
        }

        function closeHTPModal() {
            ui.htp.classList.remove('active');
            playSound('click');
        }

        // --- ADS ---
        let adInterval;
        function openAdModal() {
            ui.ad.modal.classList.add('active');
            let timeLeft = CONFIG.AD_DURATION;
            const btn = document.getElementById('btn-close-ad');
            btn.disabled = true;
            btn.classList.remove('bg-green-500', 'text-white', 'hover:bg-green-600');
            btn.classList.add('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
            btn.innerHTML = `Wait <span id="ad-btn-timer">${timeLeft}</span>s`;
            
            adInterval = setInterval(() => {
                timeLeft--;
                document.getElementById('ad-btn-timer').innerText = timeLeft;
                if (timeLeft <= 0) {
                    clearInterval(adInterval);
                    btn.disabled = false;
                    btn.classList.remove('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
                    btn.classList.add('bg-green-500', 'text-white', 'hover:bg-green-600');
                    btn.innerHTML = `CLAIM +${CONFIG.AD_REWARD}`;
                }
            }, 1000);
        }

        function closeAdModal() {
            if (document.getElementById('btn-close-ad').disabled) return;
            ui.ad.modal.classList.remove('active');
            state.balance += CONFIG.AD_REWARD;
            updateWalletUI();
            playSound('win');
        }

        init();
// ========== PhantomBet Bridge Integration ==========
PhantomBridge.init('Safe Door');
(function() {
  let _lastBal = state.balance;
  PhantomBridge.onReady(function(bal) {
    state.balance = bal;
    _lastBal = bal;
    updateWalletUI();
  });
  PhantomBridge.onBalanceChange(function(bal) {
    state.balance = bal;
    _lastBal = bal;
    updateWalletUI();
  });
  const origUpdateWallet = updateWalletUI;
  updateWalletUI = function() {
    origUpdateWallet();
    if (state.balance !== _lastBal) {
      const delta = state.balance - _lastBal;
      _lastBal = state.balance;
      if (delta < 0) PhantomBridge.deductBet(Math.abs(delta));
      else if (delta > 0) PhantomBridge.creditWin(delta, 'Safe Door Win');
    }
  };
})();
