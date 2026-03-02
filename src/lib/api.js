const N8N_EMPLOYEE_WEBHOOK = "https://n8n.lpaderina.ru/webhook-test/employee";

async function safeJson(res) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { _nonJson: true, _text: text };
  }
}

export const api = {
  // Проверка регистрации + получение сотрудников отдела
  async employeeCheck(payload) {
    const res = await fetch(N8N_EMPLOYEE_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await safeJson(res);

    if (!res.ok) {
      const err = new Error(`employeeCheck HTTP ${res.status}`);
      err.data = data;
      throw err;
    }

    return data;
  },

  async allowExitByPlate(plate) {
    return { ok: true, plate };
  },
};
