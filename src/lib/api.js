/**
 * Заглушка под n8n/Entercam.
 * Заменишь на реальные fetch() запросы.
 */
export const api = {
  async allowExitByPlate(plate) {
    // пример:
    // await fetch("https://n8n.domain/webhook/allow-exit", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ plate })
    // });
    return { ok: true, plate };
  }
};
