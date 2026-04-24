/**
 * Recolors slot UI buttons from green to red so they read clearly.
 * Works by scanning the Phaser scene for sprites whose texture name
 * starts with "button_" or "panel_" and applying a red tint.
 * Re-runs periodically in case sprites are created later.
 */
(function () {
  var RED = 0xff3030;          // primary button tint (was green)
  var RED_HOVER = 0xff6060;    // hover state tint
  var PANEL = 0xff5050;        // bet/panel labels — also tinted red

  function tintScene() {
    try {
      var game = window.game || (window.Phaser && Phaser.GAMES && Phaser.GAMES[0]);
      if (!game || !game.scene || !game.scene.scenes) return;
      game.scene.scenes.forEach(function (scene) {
        if (!scene || !scene.children || !scene.children.list) return;
        scene.children.list.forEach(function (obj) {
          if (!obj || !obj.setTint || !obj.texture || !obj.texture.key) return;
          var key = String(obj.texture.key);
          if (key.indexOf('button_') === 0) {
            obj.setTint(key.indexOf('hover') >= 0 ? RED_HOVER : RED);
          } else if (key.indexOf('panel_') === 0) {
            obj.setTint(PANEL);
          }
        });
      });
    } catch (e) { /* ignore */ }
  }

  // Run repeatedly — sprites may be created after game start
  var iv = setInterval(tintScene, 400);
  // Stop heavy polling after 60s; do a few sparse runs after
  setTimeout(function () { clearInterval(iv); setInterval(tintScene, 2000); }, 60000);
})();
