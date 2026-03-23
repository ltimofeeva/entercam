// src/screens/Employees.jsx
import React, { useMemo, useState } from "react";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { uid } from "../lib/utils.js";

export default function Employees({ state, setState, goEmployee }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", dept: "" });

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return state.employees || [];

    return (state.employees || []).filter((e) => {
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
      dept: form.dept.trim(),
      cars: []
    };

    setState((s) => ({ ...s, employees: [next, ...(s.employees || [])] }));
    setForm({ name: "", phone: "", email: "", dept: "" });
    setOpen(false);
  };

  return (
    <div className="content">
      <Input
        placeholder="Поиск по имени / телефону"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {(state.employees || []).length === 0 ? (
        <EmptyState
          title="Сотрудников пока нет"
          hint="Добавьте первого сотрудника"
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
                <div className="big">{e.name || "Без имени"}</div>
                {e.phone ? <div className="muted">{e.phone}</div> : null}
                {e.email ? <div className="muted">{e.email}</div> : null}
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
              />
            </div>

            <div className="modalActions">
              <button className="btn" onClick={() => setOpen(false)}>
                Отмена
              </button>
              <button className="btn primary" onClick={addEmployee} disabled={!form.name.trim()}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
