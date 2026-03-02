import React, { useMemo, useState } from "react";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { fmtDate, normPlate, uid } from "../lib/utils.js";

export default function Guests({ state, setState, allowExit }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ plate: "", entryDate: "", exitDate: "" });

  const list = useMemo(() => {
    const qq = normPlate(q);
    if (!qq) return state.guests;
    return state.guests.filter((g) => normPlate(g.plate).includes(qq));
  }, [q, state.guests]);

  const addGuest = () => {
    const plate = normPlate(form.plate);
    if (!plate || !form.entryDate) return;

    const next = {
      id: uid(),
      plate,
      entryDate: form.entryDate,
      exitDate: form.exitDate,
      active: true
    };
    setState((s) => ({ ...s, guests: [next, ...s.guests] }));
    setForm({ plate: "", entryDate: "", exitDate: "" });
    setOpen(false);
  };

  const deleteGuest = (id) => {
    setState((s) => ({ ...s, guests: s.guests.filter((g) => g.id !== id) }));
  };

  return (
    <div className="content">
      <Input placeholder="Поиск по номеру" value={q} onChange={(e) => setQ(e.target.value)} />

      {state.guests.length === 0 ? (
        <EmptyState
          title="Гостевых машин нет"
          hint="Добавьте первую гостевую машину."
          action={<button className="btn primary" onClick={() => setOpen(true)}>+ Добавить</button>}
        />
      ) : null}

      <div className="list">
        {list.map((g) => (
          <Card key={g.id}>
            <div className="col">
              <div className="row">
                <div className="big">{g.plate}</div>
                <span className="pill">{g.active ? "Активна" : "Неактивна"}</span>
              </div>
              <div className="muted">Заезд: {fmtDate(g.entryDate)}</div>
              {g.exitDate ? <div className="muted">До: {fmtDate(g.exitDate)}</div> : null}

              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn primary" onClick={() => allowExit(g.plate)}>Разрешить выезд</button>
                <button className="btn danger" onClick={() => deleteGuest(g.id)}>Удалить</button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <button className="btn primary" onClick={() => setOpen(true)}>+ Добавить гостевую машину</button>

      <Modal
        open={open}
        title="Добавить гостевую машину"
        onClose={() => setOpen(false)}
        actions={
          <>
            <button className="btn" onClick={() => setOpen(false)}>Отмена</button>
            <button className="btn primary" onClick={addGuest} disabled={!normPlate(form.plate) || !form.entryDate}>
              Сохранить
            </button>
          </>
        }
      >
        <div className="col" style={{ gap: 10 }}>
          <Input
            label="Госномер*"
            placeholder="Напр. M555MM174"
            value={form.plate}
            onChange={(e) => setForm({ ...form, plate: e.target.value })}
          />
          <div className="col" style={{ gap: 6 }}>
            <div className="muted" style={{ fontWeight: 800 }}>Дата заезда*</div>
            <input className="input" type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} />
          </div>
          <div className="col" style={{ gap: 6 }}>
            <div className="muted" style={{ fontWeight: 800 }}>Дата выезда (опц.)</div>
            <input className="input" type="date" value={form.exitDate} onChange={(e) => setForm({ ...form, exitDate: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
