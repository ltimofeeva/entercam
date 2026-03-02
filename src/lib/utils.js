export const uid = () =>
  (Date.now().toString(36) + Math.random().toString(36).slice(2, 9)).toUpperCase();

export function normPlate(s) {
  return String(s ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function fmtDate(d) {
  if (!d) return "";
  const [y, m, day] = String(d).split("-");
  if (!y || !m || !day) return d;
  return `${day}.${m}.${y}`;
}
