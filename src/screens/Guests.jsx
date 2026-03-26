import React, { useMemo, useState } from "react";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { normPlate, uid } from "../lib/utils.js";

function normalizeGuests(input) {
  if (!input) return [];

  // Формат:
  // [
  //   { guests: [ ... ] },
  //   { guests: [ ... ] }
  // ]
  if (Array.isArray(input)) {
    return input.flatMap((item) => {
      if (Array.isArray(item?.guests)) return item.guests;
      return [];
    });
  }

  // Формат:
  // { guests: [ ... ] }
  if (Array.isArray(input.guests)) {
    return input.guests;
  }

  return [];
}

export default function Guests({ state, setState, allowExit }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    fio: "",
    plate: "",
    entryDate: "",
    entryTime: "",
    exitDate: "",
    exitTime: "",
  };

  const [form, setForm] = useState(emptyForm);

  const guestsArray = useMemo(() => normalizeGuests(state.guests), [state.guests]);

  const list = useMemo(() => {
    const qq = normPlate(q);
    if (!qq) return guestsArray;
    return guestsArray.filter((g) => normPlate(g.plate || "").includes(qq));
  }, [q, guestsArray]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setOpen(true);
  };

  const openEditModal = (guest) => {
    setForm({
      fio: guest.fio || guest.name || "",
      plate: guest.plate || "",
      entryDate: guest.entryDate || "",
      entryTime: guest.entryTime || "",
      exitDate: guest.exitDate || "",
      exitTime: guest.exitTime || "",
    });
    setEditingId(guest.id);
    setOpen(true);
  };

  const saveGuest = async () => {
    const plate = normPlate(form.plate);
    const fio = (form.fio || "").trim();

    if (!fio || !plate || saving) return;

    const payload = {
      fio,
      plate,
      entryDate: form.entryDate,
      entryTime: form.entryTime,
      exitDate: form.exitDate,
      exitTime: form.exitTime,
      type: "car_number",
    };

    try {
      setSaving(true);

      if (editingId) {
        setState((s) => {
          const currentGuests = normalizeGuests(s.guests);

          return {
            ...s,
            guests: currentGuests.map((g) =>
              g.id === editingId
                ? {
                    ...g,
                    fio: payload.fio,
                    name: payload.fio,
                    plate: payload.plate,
                    entryDate: payload.entryDate,
                    entryTime: payload.entryTime,
                    exitDate: payload.exitDate,
                    exitTime: payload.exitTime,
                    type: payload.type,
                  }
                : g
            ),
          };
        });
      } else {
        const next = {
          id: uid(),
          fio: payload.fio,
          name: payload.fio,
          plate: payload.plate,
          entryDate: payload.entryDate,
          entryTime: payload.entryTime,
          exitDate: payload.exitDate,
          exitTime: payload.exitTime,
          type: payload.type,
        };

        const res = await fetch("https://n8n.lpaderina.ru/webhook-test/guest_add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            guest: {
              id: next.id,
              fio: next.fio,
              plate: next.plate,
              entryDate: next.entryDate,
              entryTime: next.entryTime,
              exitDate: next.exitDate,
              exitTime: next.exitTime,
              type: next.type,
            },
          }),
        });

        if (!res.ok) {
          throw new Error(`Ошибка webhook: ${res.status}`);
        }

        setState((s) => {
          const currentGuests = normalizeGuests(s.guests);

          return {
            ...s,
            guests: [next, ...currentGuests],
          };
        });
      }

      resetForm();
      setOpen(false);
    } catch (err) {
      console.error("guest save error:", err);
      alert(editingId ? "Не удалось изменить гостя" : "Не удалось добавить гостевую машину");
    } finally {
      setSaving(false);
    }
  };

  const deleteGuest = (id) => {
    setState((s) => {
      const currentGuests = normalizeGuests(s.guests);

      return {
        ...s,
        guests: currentGuests.filter((g) => g.id !== id),
      };
    });
  };

  return (
    <div className="content">
      <Input
        placeholder="Поиск по номеру"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {guestsArray.length === 0 ? (
        <EmptyState
          title="Гостевых машин нет"
          hint="Добавьте первую гостевую машину."
          action={
            <button className="btn primary" onClick={openAddModal}>
              + Добавить
            </button>
          }
        />
      ) : null}

      <div className="list">
        {list.map((g) => (
          <Card key={g.id}>
            <div className="col">
              <div className="row">
                <div className="big">{g.plate}</div>
              </div>

              {g.fio || g.name ? (
                <div className="muted">ФИО: {g.fio || g.name}</div>
              ) : null}

              {g.entryDate ? <div className="muted">Дата заезда: {g.entryDate}</div> : null}
              {g.entryTime ? <div className="muted">Время заезда: {g.entryTime}</div> : null}
              {g.exitDate ? <div className="muted">Дата выезда: {g.exitDate}</div> : null}
              {g.exitTime ? <div className="muted">Время выезда: {g.exitTime}</div> : null}

              <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
                <button className="btn" onClick={() => openEditModal(g)}>
                  Изменить
                </button>
                <button className="btn primary" onClick={() => allowExit(g.plate)}>
                  Разрешить выезд
                </button>
                <button className="btn danger" onClick={() => deleteGuest(g.id)}>
                  Удалить
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <button className="btn primary" onClick={openAddModal}>
        + Добавить гостевую машину
      </button>

      <Modal
        open={open}
        title={editingId ? "Изменить гостевую машину" : "Добавить гостевую машину"}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        actions={
          <>
            <button
              className="btn"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              disabled={saving}
            >
              Отмена
            </button>
            <button
              className="btn primary"
              onClick={saveGuest}
              disabled={!form.fio.trim() || !normPlate(form.plate) || saving}
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </>
        }
      >
        <div className="col" style={{ gap: 10 }}>
          <Input
            label="ФИО*"
            placeholder="Напр. Иванов Иван Иванович"
            value={form.fio}
            onChange={(e) => setForm({ ...form, fio: e.target.value })}
          />

          <Input
            label="Номер авто*"
            placeholder="Напр. M555MM174"
            value={form.plate}
            onChange={(e) => setForm({ ...form, plate: e.target.value })}
          />

          <div className="col" style={{ gap: 6 }}>
            <div className="muted" style={{ fontWeight: 800 }}>Дата заезда</div>
            <input
              className="input"
              type="date"
              value={form.entryDate}
              onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
            />
          </div>

          <div className="col" style={{ gap: 6 }}>
            <div className="muted" style={{ fontWeight: 800 }}>Время заезда</div>
            <input
              className="input"
              type="time"
              value={form.entryTime}
              onChange={(e) => setForm({ ...form, entryTime: e.target.value })}
            />
          </div>

          <div className="col" style={{ gap: 6 }}>
            <div className="muted" style={{ fontWeight: 800 }}>Дата выезда</div>
            <input
              className="input"
              type="date"
              value={form.exitDate}
              onChange={(e) => setForm({ ...form, exitDate: e.target.value })}
            />
          </div>

          <div className="col" style={{ gap: 6 }}>
            <div className="muted" style={{ fontWeight: 800 }}>Время выезда</div>
            <input
              className="input"
              type="time"
              value={form.exitTime}
              onChange={(e) => setForm({ ...form, exitTime: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
