let balance = 0;
let spinning = false;

const slot = document.getElementById("slot");
const spinBtn = document.getElementById("spinBtn");
const betInput = document.getElementById("betInput");
let reels = [];

for (let i = 0; i < 18; i++) {
    let d = document.createElement("div");
    d.className = "reel";
    d.innerText = "❔";
    slot.appendChild(d);
    reels.push(d);
}

function setBet(val) {
    betInput.value = val;
}

function getBet() {
    let b = parseFloat(betInput.value);
    if (isNaN(b) || b < 0.1) b = 0.1;
    if (b > 50) b = 50;
    betInput.value = b;
    return b;
}

function render(grid) {
    for (let r = 0; r < 6; r++) {
        for (let i = 0; i < 3; i++) {
            reels[r * 3 + i].innerText = grid[r][i];
            reels[r * 3 + i].classList.remove("win");
        }
    }
}

function updateUI(win) {
    document.getElementById("balance").innerText = "Balance: $" + balance.toFixed(2);
    document.getElementById("winText").innerText = win > 0 ? "Win: $" + win.toFixed(2) : "";
    if (win > 200) show("🔥 BIG WIN");
    if (win > 500) show("💎 MEGA WIN");
}

function show(text) {
    let o = document.getElementById("overlay");
    o.innerText = text;
    o.classList.add("show");
    setTimeout(() => o.classList.remove("show"), 2000);
}

async function spin() {
    if (spinning) return;
    const bet = getBet();

    if (bet > balance) {
        document.getElementById("winText").innerText = "Insufficient balance!";
        return;
    }

    spinning = true;
    spinBtn.disabled = true;

    // Deduct bet via bridge
    const deductResult = await PhantomBridge.deductBet(bet);
    if (!deductResult.success) {
        document.getElementById("winText").innerText = deductResult.error || "Bet failed";
        spinning = false;
        spinBtn.disabled = false;
        return;
    }
    balance = deductResult.balance;

    // Animate reels
    for (let i = 0; i < 18; i++) {
        reels[i].innerText = "⏳";
        reels[i].classList.remove("win");
    }

    await new Promise(r => setTimeout(r, 400));

    let grid = generateGrid();
    render(grid);
    let win = evaluate(grid, bet);

    if (win > 0) {
        const creditResult = await PhantomBridge.creditWin(win, "Scatter Bomb Win");
        if (creditResult.success) {
            balance = creditResult.balance;
        }
    }

    updateUI(win);
    spinning = false;
    spinBtn.disabled = false;
}

// Bridge integration
PhantomBridge.init("Scatter Bomb");
PhantomBridge.onReady(function(bal) {
    balance = bal;
    updateUI(0);
});
PhantomBridge.onBalanceChange(function(bal) {
    balance = bal;
    document.getElementById("balance").innerText = "Balance: $" + balance.toFixed(2);
});
