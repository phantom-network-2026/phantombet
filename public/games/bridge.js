/**
 * PhantomBet Bridge - Connects iframe games to the platform's real balance system.
 * Include this script in each game's HTML before the game's own script.
 * 
 * Usage in games:
 *   - Call PhantomBridge.getBalance() to get current balance
 *   - Call PhantomBridge.deductBet(amount) before starting a round (returns false if insufficient)
 *   - Call PhantomBridge.creditWin(amount) when player wins (amount = total payout)
 *   - The bridge auto-syncs with the parent app which calls the server.
 */
window.PhantomBridge = {
  _balance: 0,
  _ready: false,
  _pendingResolves: {},
  _nextId: 0,
  _gameType: '',
  _onBalanceUpdate: null,
  _onReady: null,
  _readyPromiseResolve: null,

  init(gameType) {
    this._gameType = gameType || 'Unknown Game';
    
    this._readyPromise = new Promise((resolve) => {
      this._readyPromiseResolve = resolve;
    });

    window.addEventListener('message', (e) => {
      const data = e.data;
      if (!data || !data.type) return;

      if (data.type === 'INIT_BALANCE') {
        this._balance = data.balance;
        this._ready = true;
        if (this._onReady) this._onReady(this._balance);
        if (this._readyPromiseResolve) this._readyPromiseResolve(this._balance);
        if (this._onBalanceUpdate) this._onBalanceUpdate(this._balance);
      }

      if (data.type === 'BALANCE_UPDATED') {
        this._balance = data.balance;
        if (this._onBalanceUpdate) this._onBalanceUpdate(this._balance);
      }

      if (data.type === 'SETTLE_RESPONSE') {
        const cb = this._pendingResolves[data.callbackId];
        if (cb) {
          cb(data);
          delete this._pendingResolves[data.callbackId];
        }
      }
    });

    // Tell parent we're ready
    window.parent.postMessage({ type: 'GAME_READY', gameType: this._gameType }, '*');
  },

  /** Wait for bridge to be ready (balance received from parent) */
  whenReady() {
    if (this._ready) return Promise.resolve(this._balance);
    return this._readyPromise;
  },

  /** Get current balance */
  getBalance() {
    return this._balance;
  },

  /** Check if bridge is connected to parent */
  isConnected() {
    return this._ready;
  },

  /**
   * Deduct a bet from balance. Returns a promise that resolves to { success, balance } or { success: false, error }.
   * The parent will call game-settle with negative amount.
   */
  deductBet(amount) {
    if (amount <= 0) return Promise.resolve({ success: false, error: 'Invalid amount' });
    if (amount > this._balance) return Promise.resolve({ success: false, error: 'Insufficient balance' });

    return new Promise((resolve) => {
      const id = ++this._nextId;
      this._pendingResolves[id] = (response) => {
        if (response.success) {
          this._balance = response.balance;
          if (this._onBalanceUpdate) this._onBalanceUpdate(this._balance);
        }
        resolve(response);
      };
      window.parent.postMessage({
        type: 'DEDUCT_BET',
        amount: amount,
        gameType: this._gameType,
        callbackId: id
      }, '*');
    });
  },

  /**
   * Credit a win to balance. Returns a promise that resolves to { success, balance }.
   * Amount should be the TOTAL PAYOUT (not just profit).
   */
  creditWin(amount, outcome) {
    if (amount <= 0) return Promise.resolve({ success: false, error: 'Invalid amount' });

    return new Promise((resolve) => {
      const id = ++this._nextId;
      this._pendingResolves[id] = (response) => {
        if (response.success) {
          this._balance = response.balance;
          if (this._onBalanceUpdate) this._onBalanceUpdate(this._balance);
        }
        resolve(response);
      };
      window.parent.postMessage({
        type: 'CREDIT_WIN',
        amount: amount,
        gameType: this._gameType,
        outcome: outcome || 'Win',
        callbackId: id
      }, '*');
    });
  },

  /**
   * Set callback for balance updates
   */
  onBalanceChange(callback) {
    this._onBalanceUpdate = callback;
  },

  /**
   * Set callback for when bridge is ready
   */
  onReady(callback) {
    this._onReady = callback;
    if (this._ready) callback(this._balance);
  }
};
