/**
 * PhantomBet integration for Pirate Bay slot.
 * - Replaces in-game coin economy with platform USD balance via PhantomBridge.
 * - Maps the in-game bet to a real USD bet (1 game-coin per spin = 1 cent base; clamped to $0.10–$5).
 * - Sends every win to game-settle so the server applies global house edge / Force Loss / RTP.
 * - Display still uses in-game coins for visuals; the real balance is shown in the parent header.
 */
(function () {
  const GAME_TYPE = window.__PB_CLONE_TITLE__ || 'Pirate Bay';
  // Standard platform USD bet tiers, capped at $5 (parity with rest of platform).
  const BET_TIERS = [0.10, 0.20, 0.50, 1.00, 2.00, 5.00];
  const MAX_BET_USD = 5.00;

  // Player-facing tier index drives the actual USD bet.
  let tierIndex = 3; // default $1.00
  function currentUsdBet() { return BET_TIERS[tierIndex]; }
  function formatUsd(v) { return '$' + v.toFixed(2); }

  // Push the current USD bet into the in-game total bet display.
  function syncBetDisplay() {
    try {
      const game = window.slotGame;
      const sc = game && game.scene && game.scene.scenes && game.scene.scenes[0];
      const ctrls = sc && sc.slotControls;
      if (ctrls && ctrls.totalBetSumText) {
        ctrls.totalBetSumText.text = formatUsd(currentUsdBet());
      }
      if (ctrls && ctrls.lineBetAmountText) {
        ctrls.lineBetAmountText.text = formatUsd(currentUsdBet());
      }
    } catch (e) {}
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

    // Patch SlotControls: bet adjustment cycles tier index; applyBet uses USD.
    waitForClass('SlotControls', (SlotControls) => {
      const origApply = SlotControls.prototype.applyBet;
      const origPlus  = SlotControls.prototype.lineBetPlus_Click;
      const origMinus = SlotControls.prototype.lineBetMinus_Click;
      const origMax   = SlotControls.prototype.maxBet_Click;

      SlotControls.prototype.lineBetPlus_Click = function () {
        if (tierIndex < BET_TIERS.length - 1) tierIndex++;
        try { this.scene.soundController.playClip('button_click'); } catch (e) {}
        syncBetDisplay();
      };
      SlotControls.prototype.lineBetMinus_Click = function () {
        if (tierIndex > 0) tierIndex--;
        try { this.scene.soundController.playClip('button_click'); } catch (e) {}
        syncBetDisplay();
      };
      SlotControls.prototype.maxBet_Click = function () {
        tierIndex = BET_TIERS.length - 1; // $5 max
        try { this.scene.soundController.playClip('button_click'); } catch (e) {}
        syncBetDisplay();
      };

      SlotControls.prototype.applyBet = function () {
        const usdBet = Math.min(currentUsdBet(), MAX_BET_USD);
        lastUsdBet = usdBet;
        if (PhantomBridge.getBalance() < usdBet) {
          lastBetAccepted = false;
          return false;
        }
        PhantomBridge.deductBet(usdBet).then((res) => {
          if (!res.success) {
            console.warn('[PhantomBridge] Bet deduction failed:', res.error);
          }
        });
        lastBetAccepted = true;
        try { origApply.call(this); } catch (e) {}
        syncBetDisplay();
        return true;
      };
    });

    // Patch SlotPlayer.addCoins to forward positive deltas as real-money wins
    waitForClass('SlotPlayer', (SlotPlayer) => {
      const origAdd = SlotPlayer.prototype.addCoins;
      SlotPlayer.prototype.addCoins = function (count) {
        if (typeof count === 'number' && count > 0 && lastBetAccepted) {
          let usdWin = 0;
          try {
            const ctrls = this._scene && this._scene.slotControls;
            const inGameBet = ctrls && typeof ctrls.getTotalBet === 'function' ? ctrls.getTotalBet() : null;
            if (inGameBet && inGameBet > 0) {
              usdWin = (count / inGameBet) * lastUsdBet;
            } else {
              usdWin = count / 1000;
            }
          } catch (e) {
            usdWin = count / 1000;
          }
          usdWin = Math.max(0.01, Math.round(usdWin * 100) / 100);
          usdWin = Math.min(usdWin, 5000);
          PhantomBridge.creditWin(usdWin, 'Spin Win').then((res) => {
            if (res.success) console.log('[PhantomBridge] Win credited:', usdWin);
          });
        }
        return origAdd.call(this, count);
      };
    });

    // Capture the scene for SlotPlayer.addCoins ratio calc + initial display sync.
    waitForClass('SlotGame', () => {
      const observer = setInterval(() => {
        const game = window.slotGame;
        if (game && game.scene && game.scene.scenes && game.scene.scenes[0]) {
          const sc = game.scene.scenes[0];
          if (sc.slotPlayer) {
            sc.slotPlayer._scene = sc;
            syncBetDisplay();
            clearInterval(observer);
          }
        }
      }, 200);
      setTimeout(() => clearInterval(observer), 30000);
    });

    // Keep the USD bet visible even if the game refreshes the display.
    setInterval(syncBetDisplay, 1000);
  });
})();
