// --- Splash Logic ---
window.onload = () => {
    const progress = document.getElementById('loader-progress');
    let width = 0;
    const interval = setInterval(() => {
        width += Math.random() * 15;
        if(width >= 100) {
            width = 100;
            clearInterval(interval);
            setTimeout(() => {
                document.getElementById('splash-screen').style.opacity = '0';
                setTimeout(() => {
                    document.getElementById('splash-screen').style.visibility = 'hidden';
                }, 800);
            }, 500);
        }
        progress.style.width = width + '%';
    }, 100);
};

// --- UI Logic ---
function toggleHowToPlay(show) {
    const modal = document.getElementById('how-to-play-modal');
    if (show) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// --- Game Logic ---
const WIN_CHANCE = 0.50;
const TIMER_SECONDS = 5;
const PAYOUT_MULT = 2.0;

let wallet = 0;
let historyData = [];
let activeSelection = null;
let lockedBet = 0;
let isProcessing = false;
let isBetActive = false;

const elWallet = document.getElementById('wallet-balance');
const elBetInput = document.getElementById('bet-amount');
const elStatus = document.getElementById('game-status');
const elTimer = document.getElementById('timer-display');
const elBomb = document.getElementById('bomb-unit');
const elStage = document.getElementById('game-stage');
const elBtnBet = document.getElementById('btn-place-bet');
const elBtnCut = document.getElementById('btn-cut-wire');
const elHistoryList = document.getElementById('history-list');

const sndBeep = document.getElementById('sfx-beep');
const sndBlast = document.getElementById('sfx-blast');
const sndWin = document.getElementById('sfx-win');
const sndClick = document.getElementById('sfx-click');

updateUI();
renderHistory();

function updateUI() {
    elWallet.textContent = wallet.toFixed(2);
}

function playSfx(sfx) {
    sfx.currentTime = 0;
    sfx.play().catch(() => {});
}

function adjustBet(n) {
    if(isProcessing) return;
    let val = parseFloat(elBetInput.value) + n;
    if(val < 0.1) val = 0.1;
    if(val > 5) val = 5;
    elBetInput.value = val.toFixed(2);
    playSfx(sndClick);
}

function quickBet(n) {
    if(isProcessing) return;
    elBetInput.value = n;
    playSfx(sndClick);
}

function selectWire(color) {
    if(isProcessing || isBetActive) return;

    activeSelection = color;
    playSfx(sndClick);

    document.querySelectorAll('.wire-path').forEach(p => {
        p.classList.remove('wire-selected');
        p.style.opacity = "0.2";
    });

    const target = document.getElementById(`wire-${color}`);
    target.classList.add('wire-selected');
    target.style.opacity = "1";

    elStatus.innerHTML = `<span class="text-indigo-400 font-black"><i class="fas fa-shield-alt mr-2"></i>Locked: ${color.toUpperCase()}</span>`;
}

async function confirmBet() {
    if(!activeSelection) {
        showToast("Select a wire first!", "red");
        return;
    }

    const amt = parseFloat(elBetInput.value);
    if(isNaN(amt) || amt <= 0 || amt > 5) {
        showToast("Invalid bet amount!", "red");
        return;
    }
    if(amt > wallet) {
        showToast("Insufficient balance!", "red");
        return;
    }

    // Deduct via bridge
    const result = await PhantomBridge.deductBet(amt);
    if (!result.success) {
        showToast("Bet failed: " + (result.error || "Unknown error"), "red");
        return;
    }

    lockedBet = amt;
    wallet = result.balance;
    updateUI();

    isBetActive = true;
    elBtnBet.disabled = true;
    elBtnCut.disabled = false;
    elBtnCut.classList.add('animate-pulse');
    
    elStatus.innerHTML = `<span class="text-white font-black"><i class="fas fa-lock mr-2"></i>Bet Placed. CUT!</span>`;
    playSfx(sndClick);
}

function executeCut() {
    if(isProcessing) return;
    isProcessing = true;
    elBtnCut.disabled = true;
    elBtnCut.classList.remove('animate-pulse');

    const wire = document.getElementById(`wire-${activeSelection}`);
    wire.classList.add('wire-cut-anim');

    elBomb.classList.add('shaking');
    let remaining = TIMER_SECONDS;
    
    const timerInt = setInterval(() => {
        remaining -= 0.01;
        if(remaining <= 0) {
            remaining = 0;
            clearInterval(timerInt);
            decideResult();
        }
        elTimer.textContent = remaining.toFixed(2).padStart(5, '0');
        if(Math.floor(remaining) !== Math.floor(remaining + 0.01)) playSfx(sndBeep);
    }, 10);
}

async function decideResult() {
    elBomb.classList.remove('shaking');
    const win = Math.random() < WIN_CHANCE;

    if(win) {
        const winAmt = Math.floor(lockedBet * PAYOUT_MULT * 100) / 100;
        
        // Credit win via bridge
        const result = await PhantomBridge.creditWin(winAmt, 'Cut Wire Pro Win');
        if (result.success) {
            wallet = result.balance;
        }
        
        addHistory('WIN', winAmt);
        updateUI();

        elStatus.innerHTML = `<span class="text-green-500 font-black"><i class="fas fa-check-circle mr-2"></i>Success +$${winAmt.toFixed(2)}</span>`;
        elStage.style.background = "radial-gradient(circle at center, #1b4d2e 0%, #050507 100%)";
        elTimer.style.color = "#00ff66";
        elTimer.style.textShadow = "0 0 30px #00ff66";
        playSfx(sndWin);
    } else {
        addHistory('LOSS', -lockedBet);
        elStatus.innerHTML = `<span class="text-red-600 font-black"><i class="fas fa-skull mr-2"></i>Fatal Failure</span>`;
        document.getElementById('blast-fx').style.opacity = "1";
        playSfx(sndBlast);
        setTimeout(() => document.getElementById('blast-fx').style.opacity = "0", 150);
        updateUI();
    }

    setTimeout(resetGame, 4000);
}

function resetGame() {
    isProcessing = false;
    isBetActive = false;
    activeSelection = null;
    lockedBet = 0;

    elBtnBet.disabled = false;
    elBtnCut.disabled = true;
    elTimer.textContent = "05.00";
    elTimer.style.color = "#ff0000";
    elTimer.style.textShadow = "0 0 25px rgba(255, 0, 0, 0.8)";
    elStatus.innerHTML = `<i class="fas fa-hand-pointer mr-2 animate-bounce"></i> Choose a wire to neutralize`;
    elStage.style.background = "";

    document.querySelectorAll('.wire-path').forEach(p => {
        p.classList.remove('wire-selected', 'wire-cut-anim');
        p.style.opacity = "1";
    });
}

// History
function addHistory(type, amount) {
    const entry = {
        type,
        amount,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    historyData.unshift(entry);
    if(historyData.length > 50) historyData.pop();
    renderHistory();
}

function renderHistory() {
    if(historyData.length === 0) {
        elHistoryList.innerHTML = `<div class="text-center py-8 text-gray-700 text-[9px] uppercase font-bold tracking-widest italic opacity-40">No activity logged</div>`;
        return;
    }
    elHistoryList.innerHTML = historyData.map(item => {
        const isWin = item.type === 'WIN';
        const isDeposit = item.type === 'DEPOSIT';
        const colorClass = isWin ? 'text-green-500' : (isDeposit ? 'text-indigo-400' : 'text-red-500');
        return `
            <div class="history-item">
                <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full ${isWin ? 'bg-green-500' : (isDeposit ? 'bg-indigo-400' : 'bg-red-500')}"></div>
                    <span class="text-[10px] font-black uppercase tracking-tighter opacity-80">${item.type}</span>
                </div>
                <div class="flex items-center gap-4">
                    <span class="${colorClass} font-orbitron font-black text-xs">${item.amount > 0 ? '+' : ''}${typeof item.amount === 'number' ? item.amount.toFixed(2) : item.amount}</span>
                    <span class="text-gray-700 font-mono text-[9px]">${item.time}</span>
                </div>
            </div>
        `;
    }).join('');
}

function clearHistory() {
    historyData = [];
    renderHistory();
}

function showToast(msg, color) {
    const t = document.createElement('div');
    t.className = `fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 md:px-10 md:py-4 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[11px] uppercase tracking-widest text-white z-[3000] shadow-2xl transition-all duration-500 transform translate-y-10 opacity-0`;
    t.style.backgroundColor = color === 'red' ? '#ff2d2d' : '#4f46e5';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.remove('translate-y-10', 'opacity-0'), 10);
    setTimeout(() => {
        t.classList.add('opacity-0', 'translate-y-[-20px]');
        setTimeout(() => t.remove(), 500);
    }, 2500);
}

// ========== PhantomBet Bridge Integration ==========
PhantomBridge.init('Cut Wire Pro');
PhantomBridge.onReady(function(bal) {
    wallet = bal;
    updateUI();
});
PhantomBridge.onBalanceChange(function(bal) {
    wallet = bal;
    updateUI();
});
