const KEY = "tg_car_access_state_v1";

const seed = {
  employees: [
    {
      id: "EMP1",
      name: "Падерина Любовь",
      phone: "+7 951 792-24-69",
      email: "",
      dept: "",
      cars: [
        { id: "CAR1", plate: "A123BC174" },
        { id: "CAR2", plate: "X777XX174" }
      ]
    }
  ],
  guests: [
    { id: "G1", plate: "M555MM174", entryDate: "2026-03-01", exitDate: "2026-03-05", active: true }
  ],
  gateFeed: [
    { id: "EV1", plate: "X777XX174", kind: "employee", label: "Сотрудник: Падерина Л.", time: "14:32", status: "at_gate" },
    { id: "EV2", plate: "M555MM174", kind: "guest", label: "Гость (до 05.03.2026)", time: "14:28", status: "at_gate" }
  ]
};

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw);
    return { ...seed, ...parsed };
  } catch {
    return seed;
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}
