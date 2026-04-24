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
  let tierIndex = 0; // default $0.10

  function clampTierIndex(value) {
    return Math.max(0, Math.min(BET_TIERS.length - 1, value));
  }

  function setTierIndexFromInternal(lineBet) {
    const numeric = Number(lineBet);
    if (Number.isFinite(numeric)) {
      tierIndex = clampTierIndex(Math.round(numeric) - 1);
    }
    return tierIndex;
  }

  function usdBetForInternalLineBet(lineBet) {
    const numeric = Number(lineBet);
    const resolvedTierIndex = Number.isFinite(numeric)
      ? clampTierIndex(Math.round(numeric) - 1)
      : tierIndex;
    return BET_TIERS[resolvedTierIndex];
  }

  function usdBetForControls(ctrls) {
    return usdBetForInternalLineBet(ctrls && ctrls.lineBet);
  }

  function setInternalBetState(ctrls, nextIndex) {
    if (!ctrls) return;
    const normalizedIndex = clampTierIndex(nextIndex);
    tierIndex = normalizedIndex;
    ctrls.maxLineBet = BET_TIERS.length;
    ctrls.lineBet = normalizedIndex + 1;
    if (!ctrls.selectedLinesCount || Number(ctrls.selectedLinesCount) < 1) {
      ctrls.selectedLinesCount = 1;
    }
    if (!ctrls.holdMultiplier || Number(ctrls.holdMultiplier) < 1) {
      ctrls.holdMultiplier = 1;
    }
  }

  function currentInternalTotalBet(ctrls) {
    const selectedLinesCount = Number(ctrls && ctrls.selectedLinesCount) || 0;
    const lineBet = Number(ctrls && ctrls.lineBet) || 0;
    const holdMultiplier = Number(ctrls && ctrls.holdMultiplier) || 1;
    return selectedLinesCount * lineBet * holdMultiplier;
  }

  function currentUsdBet() { return BET_TIERS[tierIndex]; }
  function formatUsd(v) { return '$' + Number(v).toFixed(2); }

  function getCtrls() {
    try {
      const game = window.slotGame;
      const sc = game && game.scene && game.scene.scenes && game.scene.scenes[0];
      return sc && sc.slotControls;
    } catch (e) { return null; }
  }

  function currentDisplayedUsd() {
    const ctrls = getCtrls();
    if (ctrls) return usdBetForControls(ctrls);
    return currentUsdBet();
  }

  function syncBetDisplay() {
    const ctrls = getCtrls();
    if (!ctrls) return;
    ctrls.maxLineBet = BET_TIERS.length;
    setTierIndexFromInternal(ctrls.lineBet);
    const usd = usdBetForControls(ctrls);
    const txt = formatUsd(usd);
    try { if (ctrls.totalBetSumText) ctrls.totalBetSumText.text = txt; } catch (e) {}
    try { if (ctrls.lineBetAmountText) ctrls.lineBetAmountText.text = txt; } catch (e) {}
    try { if (ctrls.linesCountText) ctrls.linesCountText.text = '1'; } catch (e) {}
  }

  function bindExistingControls() {
    const ctrls = getCtrls();
    if (!ctrls || ctrls.__pbUsdPatched) return false;

    ctrls.__pbUsdPatched = true;
    ctrls.maxLineBet = BET_TIERS.length;
    ctrls.defaultLineBet = 1;

    try { if (ctrls.changeTotalBetEvent && typeof ctrls.changeTotalBetEvent.add === 'function') ctrls.changeTotalBetEvent.add(syncBetDisplay, ctrls); } catch (e) {}
    try { if (ctrls.changeLineBetEvent && typeof ctrls.changeLineBetEvent.add === 'function') ctrls.changeLineBetEvent.add(syncBetDisplay, ctrls); } catch (e) {}
    try { if (ctrls.changeSelectedLinesEvent && typeof ctrls.changeSelectedLinesEvent.add === 'function') ctrls.changeSelectedLinesEvent.add(syncBetDisplay, ctrls); } catch (e) {}

    try {
      ctrls.setLineBet(1);
    } catch (e) {
      ctrls.lineBet = 1;
      setTierIndexFromInternal(1);
    }

    syncBetDisplay();
    return true;
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
            const internalBet = currentInternalTotalBet(ctrls);
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
      const origSetLineBet = SlotControls.prototype.setLineBet;
      const origSetMaxLineBet = SlotControls.prototype.setMaxLineBet;
      const origSetSelectedLinesCount = SlotControls.prototype.setSelectedLinesCount;
      const origRefreshBetLines = SlotControls.prototype.refreshBetLines;
      const origChangeTotal = SlotControls.prototype.changeTotalBetHandler;
      const origChangeLine = SlotControls.prototype.changeLineBetHandler;

      SlotControls.prototype.getTotalBet = function () {
        return usdBetForControls(this);
      };

      SlotControls.prototype.setLineBet = function (count) {
        const normalizedIndex = clampTierIndex(Math.round(Number(count) || 1) - 1);
        setInternalBetState(this, normalizedIndex);
        const result = origSetLineBet ? origSetLineBet.call(this, normalizedIndex + 1) : undefined;
        setInternalBetState(this, normalizedIndex);
        syncBetDisplay();
        return result;
      };
      SlotControls.prototype.setMaxLineBet = function () {
        setInternalBetState(this, BET_TIERS.length - 1);
        const result = origSetMaxLineBet ? origSetMaxLineBet.call(this) : this.setLineBet(BET_TIERS.length);
        setInternalBetState(this, BET_TIERS.length - 1);
        syncBetDisplay();
        return result;
      };

      SlotControls.prototype.setSelectedLinesCount = function (count, burn) {
        const result = this.selectedLinesCount === 1 && count === 1
          ? undefined
          : origSetSelectedLinesCount ? origSetSelectedLinesCount.call(this, 1, burn) : undefined;
        this.selectedLinesCount = 1;
        syncBetDisplay();
        return result;
      };

      SlotControls.prototype.refreshBetLines = function () {
        const result = origRefreshBetLines ? origRefreshBetLines.call(this) : undefined;
        syncBetDisplay();
        return result;
      };
      SlotControls.prototype.changeTotalBetHandler = function () {
        const result = origChangeTotal ? origChangeTotal.call(this, formatUsd(usdBetForControls(this))) : undefined;
        syncBetDisplay();
        return result;
      };
      SlotControls.prototype.changeLineBetHandler = function () {
        const result = origChangeLine ? origChangeLine.call(this, formatUsd(usdBetForControls(this))) : undefined;
        syncBetDisplay();
        return result;
      };

      // The +/- buttons cycle the USD tier; we ALSO call the original so the
      // engine's internal bet display events fire (then we overwrite with USD).
      SlotControls.prototype.lineBetPlus_Click = function () {
        if (tierIndex < BET_TIERS.length - 1) tierIndex++;
        setInternalBetState(this, tierIndex);
        try { origPlus && origPlus.call(this); } catch (e) {
          try { this.scene.soundController.playClip('button_click'); } catch (e2) {}
        }
        setInternalBetState(this, tierIndex);
        syncBetDisplay();
      };
      SlotControls.prototype.lineBetMinus_Click = function () {
        if (tierIndex > 0) tierIndex--;
        setInternalBetState(this, tierIndex);
        try { origMinus && origMinus.call(this); } catch (e) {
          try { this.scene.soundController.playClip('button_click'); } catch (e2) {}
        }
        setInternalBetState(this, tierIndex);
        syncBetDisplay();
      };
      SlotControls.prototype.lineBetLoop_Click = function () {
        tierIndex = (tierIndex + 1) % BET_TIERS.length;
        setInternalBetState(this, tierIndex);
        try { origLoop && origLoop.call(this); } catch (e) {
          try { this.scene.soundController.playClip('button_click'); } catch (e2) {}
        }
        setInternalBetState(this, tierIndex);
        syncBetDisplay();
      };
      SlotControls.prototype.maxBet_Click = function () {
        tierIndex = BET_TIERS.length - 1; // $5
        setInternalBetState(this, tierIndex);
        try { origMax && origMax.call(this); } catch (e) {
          try { this.scene.soundController.playClip('button_click'); } catch (e2) {}
        }
        setInternalBetState(this, tierIndex);
        syncBetDisplay();
      };

      SlotControls.prototype.applyBet = function () {
        const usdBet = Math.min(usdBetForControls(this), MAX_BET_USD);
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
            bindExistingControls();
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
