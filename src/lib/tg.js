export function getTg() {
  return window?.Telegram?.WebApp ?? null;
}

export function initTg() {
  const tg = getTg();
  if (!tg) return;

  tg.ready();
  tg.expand();
}

export function haptic(type = "impact", style = "light") {
  const tg = getTg();
  if (!tg?.HapticFeedback) return;

  if (type === "impact") tg.HapticFeedback.impactOccurred(style);
  if (type === "notify") tg.HapticFeedback.notificationOccurred(style);
  if (type === "select") tg.HapticFeedback.selectionChanged();
}

export function showAlert(msg) {
  const tg = getTg();
  if (tg?.showAlert) tg.showAlert(msg);
  else alert(msg);
}
