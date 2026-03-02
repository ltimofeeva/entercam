const N8N_EMPLOYEE_WEBHOOK = "https://n8n.lpaderina.ru/webhook-test/employee";

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  // n8n иногда отвечает пустым телом — не ломаемся
  const text = await res.text().catch(() => "");
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.data = data;
    throw err;
  }
  return { ok: true, data };
}

export const api = {
  async notifyEmployeeScreenOpened(payload) {
    // payload: { user_id, chat_id, initData, ... }
    return postJson(N8N_EMPLOYEE_WEBHOOK, payload);
  },

  async allowExitByPlate(plate) {
    // как было (заглушка)
    return { ok: true, plate };
  }
};
