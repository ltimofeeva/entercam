// src/screens/Employees.jsx
import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { uid } from "../lib/utils.js";
import { api } from "../lib/api.js";
import { getTgContext } from "../lib/tg.js";

export default function Employees({ state, setState, goEmployee }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", dept: "" });

  // статусы загрузки/авторизации
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(null); // null | true | false
  const [departmentName, setDepartmentName] = useState("");

  // При открытии экрана: проверяем регистрацию и получаем сотрудников отдела
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        const ctx = getTgContext();
        const userId = ctx?.user_id ?? null;

        // Если открыли не из Telegram WebApp — userId будет null
        if (!userId) {
          if (!cancelled) {
            setAuthorized(false);
            setLoading(false);
          }
          return;
        }

        const payload = {
          event: "employee_open",
          user_id: userId,
          ts: new Date().toISOString(),
          // initData: ctx?.initData ?? "" // если нужно валидировать подпись
        };

        const raw = await api.employeeCheck(payload);

        // n8n может вернуть объект или массив с 1 элементом — нормализуем
        const data = Array.isArray(raw) ? raw[0] : raw;

        const ok = Boolean(data?.authorized ?? data?.ok ?? data?.result);
        if (cancelled) return;

        if (!ok) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        setAuthorized(true);

        const depName =
          data?.user?.department ??
          data?.department?.name ??
          data?.department_name ??
          data?.dept_name ??
          "";

        setDepartmentName(depName);

        const employeesFromApi = Array.isArray(data?.employees) ? data.employees : [];

        // Записываем в общий state, чтобы детали/машины работали без переписывания
        setState((s) => ({
          ...s,
          employees: employeesFromApi,
          currentUser: data?.user ?? null,
        }));

        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setAuthorized(false);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setState]);

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return state.employees;

    return state.employees.filter((e) => {
      const hay = `${e.name} ${e.phone} ${e.email} ${e.dept}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [q, state.employees]);

  const addEmployee = () => {
    if (!form.name.trim()) return;

    const next = {
      id: uid(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      dept: form.dept.trim() || departmentName || "",
      cars: [],
    };

    setState((s) => ({ ...s, employees: [next, ...(s.employees ?? [])] }));
    setForm({ name: "", phone: "", email: "", dept: "" });
    setOpen(false);
  };

  // 1) Лоадер
  if (loading) {
    return (
      <div className="content">
        <EmptyState title="Загрузка…" hint="Проверяем доступ и получаем сотрудников." />
      </div>
    );
  }

  // 2) Не авторизован
  if (authorized === false) {
    return (
      <div className="content">
        <EmptyState
          title="Пройдите регистрацию через бота"
          hint="После регистрации откройте мини-приложение ещё раз."
        />
      </div>
    );
  }

  // 3) Авторизован → показываем сотрудников
  return (
    <div className="content">

      <Input
        placeholder="Поиск по имени / телефону"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {state.employees.length === 0 ? (
        <EmptyState
          title="Сотрудников пока нет"
          hint="В этом отделе пока нет сотрудников."
          action={
            <button className="btn primary" onClick={() => setOpen(true)}>
              + Добавить
            </button>
          }
        />
      ) : null}

      <div className="list">
        {list.map((e) => (
          <Card key={e.id} onClick={() => goEmployee(e.id)}>
            <div className="row">
              <div className="col">
                <div className="big">{e.name}</div>
                {e.phone ? <div className="muted">{e.phone}</div> : null}
                <div className="muted">Машин: {e.cars?.length ?? 0}</div>
              </div>
              <div className="muted" style={{ fontWeight: 900 }}>
                ›
              </div>
            </div>
          </Card>
        ))}
      </div>

      <button className="btn primary" onClick={() => setOpen(true)}>
        + Добавить сотрудника
      </button>

      {open ? (
        <div className="modalBack" onMouseDown={() => setOpen(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalTitle">Добавить сотрудника</div>

            <div className="col" style={{ gap: 10 }}>
              <Input
                label="ФИО*"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label="Телефон"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                label="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label="Отдел"
                value={form.dept}
                onChange={(e) => setForm({ ...form, dept: e.target.value })}
                placeholder={departmentName ? `По умолчанию: ${departmentName}` : ""}
              />
            </div>

            <div className="modalActions">
              <button className="btn" onClick={() => setOpen(false)}>
                Отмена
              </button>
              <button
                className="btn primary"
                onClick={addEmployee}
                disabled={!form.name.trim()}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
