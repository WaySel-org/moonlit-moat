  // ---------- Controls: key bindings, unlock-aware key help, pause-menu controls list (owned by the controls agent) ----------
  // keyLabel(code) gives the key the player has bound to an action, by its default code ('KeyJ' for light attack).
  // Other systems use it for any text that names a key, so rebinding keeps every hint correct.
  function keyLabel(code) { return code === 'Space' ? 'Space' : code.replace(/^Key|^Digit/, ''); }
