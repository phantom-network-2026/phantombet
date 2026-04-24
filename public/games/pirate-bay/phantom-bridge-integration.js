/**
 * PhantomBet integration for Pirate Bay slot.
 * - Replaces in-game coin economy with platform USD balance via PhantomBridge.
 * - Maps the in-game bet to a real USD bet (1 game-coin per spin = 1 cent base; clamped to $0.10–$5).
 * - Sends every win to game-settle so the server applies global house edge / Force Loss / RTP.
 * - Display still uses in-game coins for visuals; the real balance is shown in the parent header.
 */
(function () {
  const GAME_TYPE = window.__PB_CLONE_TITLE__ || 'Pirate Bay';
  // Display scale: how many in-game coins represent $1 visually
  const COINS_PER_USD = 1000;
  // Standard platform bet tiers (USD). Max bet is $5, matching the rest of the slots.
  const BET_TIERS = [0.10, 0.20, 0.50, 1.00, 2.00, 5.00];
  const MAX_BET_USD = 5.00;

  // Map the in-game coin bet to one of the standard USD tiers.
  // The game's internal bet ladder typically has 6+ steps; we pick the tier
  // by index when possible, otherwise fall back to a proportional mapping.
  function resolveUsdBet() {
    try {
      const game = window.slotGame;
      const sc = game && game.scene && game.scene.scenes && game.scene.scenes[0];
      const ctrls = sc && sc.slotControls;
      if (ctrls) {
        // Try to read the current bet step / index if exposed
        const idx = (typeof ctrls.getBetIndex === 'function') ? ctrls.getBetIndex()
                  : (typeof ctrls._betIndex === 'number') ? ctrls._betIndex
                  : null;
        if (idx !== null && idx >= 0) {
          return BET_TIERS[Math.min(idx, BET_TIERS.length - 1)];
        }
        // Fall back: derive tier from total in-game bet relative to its min
        const totalBet = (typeof ctrls.getTotalBet === 'function') ? ctrls.getTotalBet() : null;
        const minBet   = (typeof ctrls.getMinBet === 'function')   ? ctrls.getMinBet()   : null;
        if (totalBet && minBet && minBet > 0) {
          const ratio = totalBet / minBet; // 1, 2, 5, 10, 20, 50…
          // Map ratio to nearest tier index
          const ladder = [1, 2, 5, 10, 20, 50];
          let bestIdx = 0, bestDiff = Infinity;
          ladder.forEach((v, i) => {
            const d = Math.abs(v - ratio);
            if (d < bestDiff) { bestDiff = d; bestIdx = i; }
          });
          return BET_TIERS[bestIdx];
        }
      }
    } catch (e) {}
    return 1.00; // safe default
  }

  PhantomBridge.init(GAME_TYPE);

  let pendingDeduct = false;
  let lastBetAccepted = false;
  let lastUsdBet = 1.00;

  function waitForClass(name, cb) {
    if (window[name]) return cb(window[name]);
    const t = setInterval(() => {
      if (window[name]) {
        clearInterval(t);
        cb(window[name]);
      }
    }, 50);
    setTimeout(() => clearInterval(t), 30000);
  }

  PhantomBridge.whenReady().then((bal) => {
    console.log('[PhantomBridge] Ready. Balance:', bal);

    // Patch SlotControls.applyBet to use real money
    waitForClass('SlotControls', (SlotControls) => {
      const origApply = SlotControls.prototype.applyBet;
      SlotControls.prototype.applyBet = function () {
        // Determine the USD bet for this spin from the player's selected level (capped at $5).
        const usdBet = Math.min(resolveUsdBet(), MAX_BET_USD);
        lastUsdBet = usdBet;
        // Synchronous contract: original returns true/false. We use cached result.
        if (PhantomBridge.getBalance() < usdBet) {
          lastBetAccepted = false;
          return false;
        }
        // Fire deduct asynchronously; assume success optimistically (server enforces).
        PhantomBridge.deductBet(usdBet).then((res) => {
          if (!res.success) {
            console.warn('[PhantomBridge] Bet deduction failed:', res.error);
          }
        });
        lastBetAccepted = true;
        // Still call original to update internal coin display
        try { origApply.call(this); } catch (e) {}
        return true;
      };
    });

    // Patch SlotPlayer.addCoins to forward positive deltas as real-money wins
    waitForClass('SlotPlayer', (SlotPlayer) => {
      const origAdd = SlotPlayer.prototype.addCoins;
      SlotPlayer.prototype.addCoins = function (count) {
        if (typeof count === 'number' && count > 0 && lastBetAccepted) {
          // Convert in-game coin win → USD using the player's current bet ratio.
          // Game's totalBet (in-game coins) corresponds to lastUsdBet real dollars.
          let usdWin = 0;
          try {
            const ctrls = this._scene && this._scene.slotControls;
            const inGameBet = ctrls && typeof ctrls.getTotalBet === 'function' ? ctrls.getTotalBet() : null;
            if (inGameBet && inGameBet > 0) {
              usdWin = (count / inGameBet) * lastUsdBet;
            } else {
              usdWin = count / COINS_PER_USD;
            }
          } catch (e) {
            usdWin = count / COINS_PER_USD;
          }
          usdWin = Math.max(0.01, Math.round(usdWin * 100) / 100);
          // Cap absurd payouts
          usdWin = Math.min(usdWin, 5000);
          PhantomBridge.creditWin(usdWin, 'Spin Win').then((res) => {
            if (res.success) console.log('[PhantomBridge] Win credited:', usdWin);
          });
        }
        return origAdd.call(this, count);
      };
    });

    // Capture the scene for SlotPlayer.addCoins ratio calc
    waitForClass('SlotGame', () => {
      // Phaser scene wires player → store reference
      const observer = setInterval(() => {
        const game = window.slotGame;
        if (game && game.scene && game.scene.scenes && game.scene.scenes[0]) {
          const sc = game.scene.scenes[0];
          if (sc.slotPlayer) {
            sc.slotPlayer._scene = sc;
            clearInterval(observer);
          }
        }
      }, 200);
      setTimeout(() => clearInterval(observer), 30000);
    });
  });
})();
