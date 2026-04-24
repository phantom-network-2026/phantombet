/**
 * PhantomBet integration for Pirate Bay slot (and clones).
 * - Lets the in-game bet controls work normally (line bet +/-/max).
 * - Maps the internal total-bet to a real USD bet via the player's selected tier.
 * - Caps any single spin at $5.00 USD (platform standard).
 * - Sends every win to PhantomBridge so server applies house edge / Force Loss / RTP.
 * - Display shows USD on the bet panels.
 */
(function () {
  const GAME_TYPE = window.__PB_CLONE_TITLE__ || 'Pirate Bay';
  const BET_TIERS = [0.10, 0.20, 0.50, 1.00, 2.00, 5.00];
  const MAX_BET_USD = 5.00;
  let tierIndex = 3; // default $1.00

  function currentUsdBet() { return BET_TIERS[tierIndex]; }
  function formatUsd(v) { return '$' + Number(v).toFixed(2); }

  // Map the internal getTotalBet() → USD for display, scaled by the chosen tier.
  // baseTotalBet captures the engine's "1x" total bet so we can build a ratio.
  let baseTotalBet = null;

  function getCtrls() {
    try {
      const game = window.slotGame;
      const sc = game && game.scene && game.scene.scenes && game.scene.scenes[0];
      return sc && sc.slotControls;
    } catch (e) { return null; }
  }

  function currentDisplayedUsd() {
    const ctrls = getCtrls();
    if (!ctrls || typeof ctrls.getTotalBet !== 'function') return currentUsdBet();
    const internal = ctrls.getTotalBet();
    if (!baseTotalBet || baseTotalBet <= 0) baseTotalBet = internal || 1;
    const ratio = internal / baseTotalBet;
    let usd = currentUsdBet() * ratio;
    if (usd > MAX_BET_USD) usd = MAX_BET_USD;
    if (usd < 0.01) usd = 0.01;
    return Math.round(usd * 100) / 100;
  }

  function syncBetDisplay() {
    const ctrls = getCtrls();
    if (!ctrls) return;
    const usd = currentDisplayedUsd();
    const txt = formatUsd(usd);
    try { if (ctrls.totalBetSumText) ctrls.totalBetSumText.text = txt; } catch (e) {}
    try { if (ctrls.lineBetAmountText) ctrls.lineBetAmountText.text = txt; } catch (e) {}
  }

  function waitForClass(name, cb) {
    if (window[name]) return cb(window[name]);
    const t = setInterval(() => {
      if (window[name]) { clearInterval(t); cb(window[name]); }
    }, 50);
    setTimeout(() => clearInterval(t), 30000);
  }

  PhantomBridge.init(GAME_TYPE);

  let lastUsdBetCharged = 0;
  let lastBetAccepted = false;

  PhantomBridge.whenReady().then((bal) => {
    console.log('[PhantomBridge] Ready. Balance:', bal);

    // Make the in-game wallet effectively unlimited; real funds checked via PhantomBridge.
    waitForClass('SlotPlayer', (SlotPlayer) => {
      SlotPlayer.prototype.hasMoneyForBet = function () { return true; };

      // Forward positive coin deltas as real USD wins.
      const origAdd = SlotPlayer.prototype.addCoins;
      SlotPlayer.prototype.addCoins = function (count) {
        if (typeof count === 'number' && count > 0 && lastBetAccepted && lastUsdBetCharged > 0) {
          let usdWin = 0;
          try {
            const ctrls = this._scene && this._scene.slotControls;
            const internalBet = ctrls && typeof ctrls.getTotalBet === 'function' ? ctrls.getTotalBet() : null;
            if (internalBet && internalBet > 0) {
              usdWin = (count / internalBet) * lastUsdBetCharged;
            } else {
              usdWin = count / 1000;
            }
          } catch (e) { usdWin = count / 1000; }
          usdWin = Math.max(0.01, Math.round(usdWin * 100) / 100);
          usdWin = Math.min(usdWin, 5000);
          PhantomBridge.creditWin(usdWin, 'Spin Win').then((res) => {
            if (res && res.success) console.log('[PhantomBridge] Win credited:', usdWin);
          });
        }
        return origAdd.call(this, count);
      };
    });

    waitForClass('SlotControls', (SlotControls) => {
      const origPlus  = SlotControls.prototype.lineBetPlus_Click;
      const origMinus = SlotControls.prototype.lineBetMinus_Click;
      const origMax   = SlotControls.prototype.maxBet_Click;
      const origLoop  = SlotControls.prototype.lineBetLoop_Click;
      const origApply = SlotControls.prototype.applyBet;

      // The +/- buttons cycle the USD tier; we ALSO call the original so the
      // engine's internal bet display events fire (then we overwrite with USD).
      SlotControls.prototype.lineBetPlus_Click = function () {
        if (tierIndex < BET_TIERS.length - 1) tierIndex++;
        try { origPlus && origPlus.call(this); } catch (e) {
          try { this.scene.soundController.playClip('button_click'); } catch (e2) {}
        }
        syncBetDisplay();
      };
      SlotControls.prototype.lineBetMinus_Click = function () {
        if (tierIndex > 0) tierIndex--;
        try { origMinus && origMinus.call(this); } catch (e) {
          try { this.scene.soundController.playClip('button_click'); } catch (e2) {}
        }
        syncBetDisplay();
      };
      SlotControls.prototype.lineBetLoop_Click = function () {
        tierIndex = (tierIndex + 1) % BET_TIERS.length;
        try { origLoop && origLoop.call(this); } catch (e) {
          try { this.scene.soundController.playClip('button_click'); } catch (e2) {}
        }
        syncBetDisplay();
      };
      SlotControls.prototype.maxBet_Click = function () {
        tierIndex = BET_TIERS.length - 1; // $5
        try { origMax && origMax.call(this); } catch (e) {
          try { this.scene.soundController.playClip('button_click'); } catch (e2) {}
        }
        syncBetDisplay();
      };

      SlotControls.prototype.applyBet = function () {
        const usdBet = Math.min(currentDisplayedUsd(), MAX_BET_USD);
        if (PhantomBridge.getBalance() < usdBet) {
          lastBetAccepted = false;
          lastUsdBetCharged = 0;
          return false;
        }
        lastUsdBetCharged = usdBet;
        lastBetAccepted = true;
        PhantomBridge.deductBet(usdBet).then((res) => {
          if (!res || !res.success) {
            console.warn('[PhantomBridge] Bet deduction failed:', res && res.error);
          }
        });
        try { origApply && origApply.call(this); } catch (e) {}
        syncBetDisplay();
        return true;
      };
    });

    // Capture scene for SlotPlayer ratio calc + initial sync.
    waitForClass('SlotGame', () => {
      const observer = setInterval(() => {
        const game = window.slotGame;
        if (game && game.scene && game.scene.scenes && game.scene.scenes[0]) {
          const sc = game.scene.scenes[0];
          if (sc.slotPlayer) {
            sc.slotPlayer._scene = sc;
            // Capture engine's base total bet at startup
            try {
              const c = sc.slotControls;
              if (c && typeof c.getTotalBet === 'function') baseTotalBet = c.getTotalBet() || 1;
            } catch (e) {}
            syncBetDisplay();
            clearInterval(observer);
          }
        }
      }, 200);
      setTimeout(() => clearInterval(observer), 30000);
    });

    // Re-paint USD over any internal text refreshes.
    setInterval(syncBetDisplay, 400);
  });
})();
