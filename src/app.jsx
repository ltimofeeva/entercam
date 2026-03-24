import React, { useEffect, useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import BottomNav from "./components/BottomNav.jsx";
import Employees from "./screens/Employees.jsx";
import EmployeeDetail from "./screens/EmployeeDetail.jsx";
import Guests from "./screens/Guests.jsx";
import Gate from "./screens/Gate.jsx";
import { initTg, haptic, showAlert } from "./lib/tg.js";
import { loadState, saveState } from "./lib/storage.js";
import { normPlate } from "./lib/utils.js";
import { api } from "./lib/api.js";

export default function App() {
  const [state, setState] = useState(() => loadState());
  const [tab, setTab] = useState("employees"); // employees | guests | gate
  const [view, setView] = useState({ name: "tab", employeeId: null });

  useEffect(() => initTg(), []);
  useEffect(() => saveState(state), [state]);
  useEffect(() => {
  if (tab === "guests") {
    fetch("https://n8n.lpaderina.ru/webhook-test/guest_get", {
      method: "POST", // или GET — смотри как настроен вебхук в n8n
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user: state.currentUser || null,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Guests webhook response:", data);

        // если нужно — сразу обновляешь гостей
        if (data?.guests) {
          setState((s) => ({
            ...s,
            guests: data.guests,
          }));
        }
      })
      .catch((err) => {
        console.error("Guests webhook error:", err);
      });
  }
}, [tab]);

  const title = useMemo(() => {
    if (view.name === "employee") return "Сотрудник";
    if (tab === "employees") return "Сотрудники";
    if (tab === "guests") return "Гости";
    if (tab === "gate") return "Шлагбаум";
    return "Мини-приложение";
  }, [tab, view.name]);

  const subtitle = useMemo(() => {
  if (tab === "employees" && state.currentUser) {
    return {
      fio: state.currentUser.fio,
      department: state.currentUser.department
    };
  }

  if (view.name === "employee") {
    const e = state.employees.find((x) => x.id === view.employeeId);
    return e?.phone ? { single: e.phone } : null;
  }

  return null;
}, [tab, view, state]);

  const goEmployee = (id) => {
    setView({ name: "employee", employeeId: id });
  };

  const onBack = () => {
    setView({ name: "tab", employeeId: null });
  };

  async function allowExit(plateRaw) {
    const plate = normPlate(plateRaw);
    try {
      haptic("impact", "medium");
      const res = await api.allowExitByPlate(plate);
      if (!res.ok) throw new Error("API error");

      setState((s) => ({
        ...s,
        gateFeed: (s.gateFeed ?? []).map((ev) =>
          normPlate(ev.plate) === plate ? { ...ev, status: "allowed" } : ev
        )
      }));

      haptic("notify", "success");
      showAlert(`Выезд разрешён: ${plate}`);
    } catch (e) {
      haptic("notify", "error");
      showAlert(`Не удалось разрешить выезд: ${plate}`);
    }
  }

  const left = (view.name === "employee")
    ? <button className="btn ghost" onClick={onBack}>←</button>
    : null;

  const right = null;
  
  return (
    <div className="app">
      <Header title={title} subtitle={subtitle} left={left} right={right} />

      {view.name === "employee" ? (
        <EmployeeDetail
          state={state}
          setState={setState}
          employeeId={view.employeeId}
          onBack={onBack}
        />
      ) : (
        <>
          {tab === "employees" ? (
            <Employees state={state} setState={setState} goEmployee={goEmployee} />
          ) : null}

          {tab === "guests" ? (
            <Guests state={state} setState={setState} allowExit={allowExit} />
          ) : null}

          {tab === "gate" ? (
            <Gate state={state} allowExit={allowExit} />
          ) : null}
        </>
      )}

      {view.name !== "employee" ? (
        <BottomNav active={tab} onChange={setTab} />
      ) : null}
    </div>
  );
}
