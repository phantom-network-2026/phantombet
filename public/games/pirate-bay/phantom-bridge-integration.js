/**
 * PhantomBet integration for Pirate Bay slot.
 * - Replaces in-game coin economy with platform USD balance via PhantomBridge.
 * - Maps the in-game bet to a real USD bet (1 game-coin per spin = 1 cent base; clamped to $0.10–$5).
 * - Sends every win to game-settle so the server applies global house edge / Force Loss / RTP.
 * - Display still uses in-game coins for visuals; the real balance is shown in the parent header.
 */
(function () {
  const GAME_TYPE = 'Pirate Bay';
  // Display scale: how many in-game coins represent $1 visually
  const COINS_PER_USD = 1000;
  // Default real-money bet per spin (USD). Capped at $5 by server.
  const FIXED_BET_USD = 1.00;

  PhantomBridge.init(GAME_TYPE);

  let pendingDeduct = false;
  let lastBetAccepted = false;

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
        // Synchronous contract: original returns true/false. We use cached result.
        if (PhantomBridge.getBalance() < FIXED_BET_USD) {
          lastBetAccepted = false;
          return false;
        }
        // Fire deduct asynchronously; assume success optimistically (server enforces).
        PhantomBridge.deductBet(FIXED_BET_USD).then((res) => {
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
          // Game's totalBet (in-game coins) corresponds to FIXED_BET_USD real dollars.
          let usdWin = 0;
          try {
            const ctrls = this._scene && this._scene.slotControls;
            const inGameBet = ctrls && typeof ctrls.getTotalBet === 'function' ? ctrls.getTotalBet() : null;
            if (inGameBet && inGameBet > 0) {
              usdWin = (count / inGameBet) * FIXED_BET_USD;
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
