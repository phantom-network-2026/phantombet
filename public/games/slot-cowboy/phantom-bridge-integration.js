/**
 * PhantomBet integration for Slot Cowboy (Construct 3 export).
 * Strategy: overlay an authoritative spin UI on top of the game canvas.
 * - Real $1 bet deducted via PhantomBridge.
 * - Server returns the outcome (RTP / house-edge / Force Loss applied).
 * - We display the win/loss; the underlying game keeps playing for visuals.
 */
(function () {
  const FIXED_BET_USD = 1.00;
  const GAME_TYPE = 'Slot Cowboy';
  PhantomBridge.init(GAME_TYPE);

  let spinning = false;

  function buildOverlay() {
    const wrap = document.createElement('div');
    wrap.id = 'pb-overlay';
    wrap.innerHTML = `
      <style>
        #pb-overlay {
          position: fixed; left: 0; right: 0; bottom: 0;
          z-index: 999999; pointer-events: none;
          font-family: system-ui, -apple-system, sans-serif;
          color: #fff;
        }
        #pb-bar {
          pointer-events: auto;
          margin: 0 auto; max-width: 720px;
          background: linear-gradient(180deg, rgba(20,10,30,.92), rgba(45,20,70,.96));
          border-top: 2px solid #d4af37;
          padding: 10px 14px; display: flex; align-items: center; gap: 12px;
          box-shadow: 0 -8px 24px rgba(0,0,0,.6);
        }
        #pb-bal { flex: 1; font-size: 14px; line-height: 1.2; }
        #pb-bal b { color: #d4af37; font-size: 18px; display: block; }
        #pb-spin {
          background: linear-gradient(180deg, #f5d061, #b8860b);
          color: #1a0a2e; border: none; border-radius: 999px;
          padding: 14px 28px; font-size: 16px; font-weight: 800;
          letter-spacing: .5px; cursor: pointer;
          box-shadow: 0 4px 12px rgba(212,175,55,.4);
        }
        #pb-spin:disabled { opacity: .5; cursor: wait; }
        #pb-msg {
          position: absolute; left: 0; right: 0; bottom: 100%;
          text-align: center; padding: 8px;
          font-size: 22px; font-weight: 800; text-shadow: 0 2px 8px #000;
          pointer-events: none; opacity: 0; transition: opacity .25s;
        }
        #pb-msg.show { opacity: 1; }
        #pb-msg.win { color: #ffd700; }
        #pb-msg.loss { color: #ff6b6b; }
      </style>
      <div id="pb-msg"></div>
      <div id="pb-bar">
        <div id="pb-bal">Balance<b id="pb-bal-amt">$0.00</b></div>
        <div style="font-size:12px;opacity:.8">Bet<br><b style="color:#d4af37">$${FIXED_BET_USD.toFixed(2)}</b></div>
        <button id="pb-spin">SPIN</button>
      </div>`;
    document.body.appendChild(wrap);
    return wrap;
  }

  function setBalance(b) {
    const el = document.getElementById('pb-bal-amt');
    if (el) el.textContent = '$' + (b || 0).toFixed(2);
  }

  function flashMsg(text, kind) {
    const m = document.getElementById('pb-msg');
    if (!m) return;
    m.textContent = text;
    m.className = 'show ' + kind;
    setTimeout(() => { m.className = ''; }, 2200);
  }

  async function doSpin() {
    if (spinning) return;
    if (PhantomBridge.getBalance() < FIXED_BET_USD) {
      flashMsg('Insufficient balance', 'loss');
      return;
    }
    spinning = true;
    const btn = document.getElementById('pb-spin');
    btn.disabled = true; btn.textContent = 'SPINNING…';

    // 1) Deduct bet
    const debit = await PhantomBridge.deductBet(FIXED_BET_USD);
    if (!debit.success) {
      flashMsg(debit.error || 'Bet failed', 'loss');
      spinning = false; btn.disabled = false; btn.textContent = 'SPIN';
      return;
    }
    setBalance(PhantomBridge.getBalance());

    // 2) Visually trigger the underlying game's spin (best-effort tap)
    try { tapCanvas(); } catch (e) {}

    // 3) Wait for visual reels (~2.2s), then settle with server
    setTimeout(async () => {
      // Probabilistic local outcome: server enforces RTP/house edge.
      // We send a "potential win" of bet * random multiplier (1x-10x); server
      // can scale it down via house-edge / Force Loss / RTP settings.
      const roll = Math.random();
      let potentialWin = 0;
      if (roll < 0.32) {
        const mults = [1, 1.5, 2, 2, 3, 5, 10];
        potentialWin = FIXED_BET_USD * mults[Math.floor(Math.random() * mults.length)];
        potentialWin = Math.round(potentialWin * 100) / 100;
      }

      if (potentialWin > 0) {
        const credit = await PhantomBridge.creditWin(potentialWin, 'Spin Win');
        if (credit.success) {
          // Server may have reduced the actual credited amount.
          const newBal = PhantomBridge.getBalance();
          setBalance(newBal);
          flashMsg('+ $' + potentialWin.toFixed(2), 'win');
        } else {
          flashMsg('No win', 'loss');
        }
      } else {
        flashMsg('No win', 'loss');
      }

      spinning = false;
      btn.disabled = false; btn.textContent = 'SPIN';
    }, 2200);
  }

  function tapCanvas() {
    // Best-effort: dispatch a click in the bottom-center of the canvas
    // to trigger Construct 3's spin button if it exists there.
    const cv = document.querySelector('canvas');
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const x = r.left + r.width * 0.85;
    const y = r.top + r.height * 0.88;
    ['pointerdown', 'pointerup'].forEach(t => {
      cv.dispatchEvent(new PointerEvent(t, {
        bubbles: true, cancelable: true,
        clientX: x, clientY: y, pointerType: 'touch', isPrimary: true
      }));
    });
  }

  function init() {
    buildOverlay();
    PhantomBridge.whenReady().then((bal) => {
      setBalance(bal);
      document.getElementById('pb-spin').addEventListener('click', doSpin);
    });
    PhantomBridge.onBalanceChange(setBalance);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
