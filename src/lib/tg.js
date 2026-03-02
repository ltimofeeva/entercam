export function getTg() {
  return window?.Telegram?.WebApp ?? null;
}

export function initTg() {
  const tg = getTg();
  if (!tg) return;
  tg.ready();
  tg.expand();
}

export function getTgContext() {
  const tg = getTg();
  if (!tg) return null;

  const unsafe = tg.initDataUnsafe || {};
  // В зависимости от способа запуска chat может быть undefined
  const chat_id = unsafe?.chat?.id ?? null;

  return {
    initData: tg.initData || "",            // строка initData для серверной валидации
    user_id: unsafe?.user?.id ?? null,      // Telegram user id
    username: unsafe?.user?.username ?? null,
    first_name: unsafe?.user?.first_name ?? null,
    last_name: unsafe?.user?.last_name ?? null,
    chat_id
  };
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
