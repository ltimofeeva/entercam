import React, { useEffect, useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import BottomNav from "./components/BottomNav.jsx";
import Employees from "./screens/Employees.jsx";
import EmployeeDetail from "./screens/EmployeeDetail.jsx";
import Guests from "./screens/Guests.jsx";
import Auth from "./screens/Auth.jsx";
import { initTg, haptic, showAlert } from "./lib/tg.js";
import { loadState, saveState } from "./lib/storage.js";
import { normPlate } from "./lib/utils.js";
import { api } from "./lib/api.js";
import "./styles.css";

function normalizeGuestResponse(raw) {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.flatMap((item) =>
      Array.isArray(item?.guests)
        ? item.guests.map((guest) => ({
            id: guest.id || crypto.randomUUID(),
            fio: guest.fio || guest.name || "",
            name: guest.fio || guest.name || "",
            plate: guest.plate || "",
            entryDate: guest.entryDate || "",
            entryTime: guest.entryTime || "",
            exitDate: guest.exitDate || "",
            exitTime: guest.exitTime || "",
            type: guest.type || "car_number",
          }))
        : []
    );
  }

  if (Array.isArray(raw?.guests)) {
    return raw.guests.map((guest) => ({
      id: guest.id || crypto.randomUUID(),
      fio: guest.fio || guest.name || "",
      name: guest.fio || guest.name || "",
      plate: guest.plate || "",
      entryDate: guest.entryDate || "",
      entryTime: guest.entryTime || "",
      exitDate: guest.exitDate || "",
      exitTime: guest.exitTime || "",
      type: guest.type || "car_number",
    }));
  }

  return [];
}

export default function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [state, setState] = useState(() => ({
    ...loadState(),
    guests: loadState()?.guests || [],
  }));

  const [tab, setTab] = useState("employees"); // employees | guests
  const [view, setView] = useState({ name: "tab", employeeId: null });
  const [guestsLoading, setGuestsLoading] = useState(false);

  useEffect(() => {
    initTg();

    const savedAuth = localStorage.getItem("entercam_auth");
    const savedUser = localStorage.getItem("entercam_user");

    if (savedAuth === "true" && savedUser) {
      setIsAuth(true);

      try {
        const user = JSON.parse(savedUser);

        setState((s) => ({
          ...s,
          currentUser: user,
        }));
      } catch (error) {
        localStorage.removeItem("entercam_auth");
        localStorage.removeItem("entercam_user");
      }
    }

    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (isAuth) {
      saveState(state);
    }
  }, [state, isAuth]);

  useEffect(() => {
    if (!isAuth) return;
    if (tab !== "guests") return;

    const loadGuests = async () => {
      try {
        setGuestsLoading(true);

        const res = await fetch("https://n8n.lpaderina.ru/webhook/guest_get", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user: state.currentUser || null,
          }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log("Guests webhook response:", data);

        const guests = normalizeGuestResponse(data);
        console.log("Normalized guests:", guests);

        setState((s) => ({
          ...s,
          guests,
        }));
      } catch (err) {
        console.error("Guests webhook error:", err);
        showAlert("Не удалось загрузить список гостей");
      } finally {
        setGuestsLoading(false);
      }
    };

    loadGuests();
  }, [tab, state.currentUser, isAuth]);

  const handleLogin = (userData) => {
    localStorage.setItem("entercam_auth", "true");
    localStorage.setItem("entercam_user", JSON.stringify(userData));

    setState((s) => ({
      ...s,
      currentUser: userData,
    }));

    setIsAuth(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("entercam_auth");
    localStorage.removeItem("entercam_user");

    setState((s) => ({
      ...s,
      currentUser: null,
    }));

    setIsAuth(false);
    setTab("employees");
    setView({ name: "tab", employeeId: null });
  };

  const title = useMemo(() => {
    if (view.name === "employee") return "Сотрудник";
    if (tab === "employees") return "Сотрудники";
    if (tab === "guests") return "Гости";
    return "Мини-приложение";
  }, [tab, view.name]);

  const subtitle = useMemo(() => {
    if (tab === "employees" && state.currentUser) {
      return {
        fio: state.currentUser.fio || state.currentUser.name || state.currentUser.login,
        department: state.currentUser.department || "",
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

      haptic("notify", "success");
      showAlert(`Выезд разрешён: ${plate}`);
    } catch (e) {
      haptic("notify", "error");
      showAlert(`Не удалось разрешить выезд: ${plate}`);
    }
  }

  const left =
    view.name === "employee" ? (
      <button className="btn ghost" onClick={onBack}>
        ←
      </button>
    ) : null;

  if (checkingAuth) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="big">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!isAuth) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <Header
        title={title}
        subtitle={subtitle}
        left={left}
        right={
          <button className="btn ghost" onClick={handleLogout}>
            Выйти
          </button>
        }
      />

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
            guestsLoading ? (
              <div className="content">
                <div className="card">
                  <div className="big">Загрузка...</div>
                  <div className="muted" style={{ marginTop: 8 }}>
                    Загружаем список гостевых машин
                  </div>
                </div>
              </div>
            ) : (
              <Guests state={state} setState={setState} allowExit={allowExit} />
            )
          ) : null}
        </>
      )}

      {view.name !== "employee" ? (
        <BottomNav active={tab} onChange={setTab} />
      ) : null}
    </div>
  );
}
