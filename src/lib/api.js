async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
  };
}

export const api = {
  async allowExitByPlate(plate) {
    return request("https://n8n.lpaderina.ru/webhook-test/allow_exit", {
      method: "POST",
      body: JSON.stringify({ plate }),
    });
  },
};
