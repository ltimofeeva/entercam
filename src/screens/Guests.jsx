import React, { useMemo, useState } from "react";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { normPlate, uid } from "../lib/utils.js";

function normalizeGuests(input) {
  if (!input) return [];

  if (Array.isArray(input) && input.length > 0 && input[0]?.plate) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.reduce((acc, item) => {
      if (Array.isArray(item?.guests)) {
        return acc.concat(item.guests);
      }
      return acc;
    }, []);
  }

  if (Array.isArray(input?.guests)) {
    return input.guests;
  }

  return [];
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  return `${day}.${month}.${year}`;
}

function createEmptyForm() {
  const today = getTodayDate();

  return {
    fio: "",
    plate: "",
    entryDate: today,
    entryTime: "00:00",
    exitDate: today,
    exitTime: "23:59",
  };
}

function isGuestActiveByTime(guest) {
  const timeTo = guest?.time_to || guest?.exitTime || "";

  if (!timeTo) return true;

  const [hours, minutes] = timeTo.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return true;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const guestMinutes = hours * 60 + minutes;

  return guestMinutes > currentMinutes;
}

export default function Guests({ state, setState }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showDateTimeFields, setShowDateTimeFields] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  const [form, setForm] = useState(createEmptyForm());

  const guestsArray = normalizeGuests(state?.guests);

  const list = useMemo(() => {
    const qq = normPlate(q);

    let filtered = guestsArray;

    if (qq) {
      filtered = filtered.filter((g) =>
        normPlate(g?.plate || "").includes(qq)
      );
    }

    filtered = filtered.filter((g) => {
      const isActive = isGuestActiveByTime(g);
      return activeTab === "active" ? isActive : !isActive;
    });

    return filtered;
  }, [q, guestsArray, activeTab]);

  const resetForm = () => {
    setForm(createEmptyForm());
    setEditingId(null);
    setShowDateTimeFields(false);
  };

  const openAddModal = () => {
    resetForm();
    setOpen(true);
  };

  const openEditModal = (guest) => {
    const hasDateTime =
      guest.entryDate || guest.entryTime || guest.exitDate || guest.exitTime;

    setForm({
      fio: guest.fio || guest.name || "",
      plate: guest.plate || "",
      entryDate: guest.entryDate || getTodayDate(),
      entryTime: guest.entryTime || "00:00",
      exitDate: guest.exitDate || getTodayDate(),
      exitTime: guest.exitTime || "23:59",
    });

    setEditingId(guest.id);
    setShowDateTimeFields(Boolean(hasDateTime));
    setOpen(true);
  };

  const buildGuestPayload = (guest) => ({
    id: guest.id,
    fio: guest.fio,
    plate: guest.plate,
    entryDate: guest.entryDate || "",
    entryTime: guest.entryTime || "",
    exitDate: guest.exitDate || "",
    exitTime: guest.exitTime || "",
    type: guest.type || "car_number",
  });

  const saveGuest = async () => {
    const plate = normPlate(form.plate);
    const fio = (form.fio || "").trim();

    if (!fio || !plate || saving) return;

    const payload = {
      fio,
      plate,
      entryDate: showDateTimeFields ? form.entryDate : "",
      entryTime: showDateTimeFields ? form.entryTime : "",
      exitDate: showDateTimeFields ? form.exitDate : "",
      exitTime: showDateTimeFields ? form.exitTime : "",
      type: "car_number",
    };

    try {
      setSaving(true);

      if (editingId) {
        const updatedGuest = {
          id: editingId,
          fio: payload.fio,
          name: payload.fio,
          plate: payload.plate,
          entryDate: payload.entryDate,
          entryTime: payload.entryTime,
          exitDate: payload.exitDate,
          exitTime: payload.exitTime,
          type: payload.type,
        };

        const res = await fetch("https://n8n.lpaderina.ru/webhook/guest_change", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            guest: buildGuestPayload(updatedGuest),
          }),
        });

        if (!res.ok) {
          throw new Error(`Ошибка webhook guest_change: ${res.status}`);
        }

        setState((s) => {
          const currentGuests = normalizeGuests(s?.guests);

          return {
            ...s,
            guests: currentGuests.map((g) =>
              g.id === editingId
                ? {
                    ...g,
                    fio: updatedGuest.fio,
                    name: updatedGuest.name,
                    plate: updatedGuest.plate,
                    entryDate: updatedGuest.entryDate,
                    entryTime: updatedGuest.entryTime,
                    exitDate: updatedGuest.exitDate,
                    exitTime: updatedGuest.exitTime,
                    type: updatedGuest.type,
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

        const res = await fetch("https://n8n.lpaderina.ru/webhook/guest_add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            guest: buildGuestPayload(next),
          }),
        });

        if (!res.ok) {
          throw new Error(`Ошибка webhook guest_add: ${res.status}`);
        }

        setState((s) => {
          const currentGuests = normalizeGuests(s?.guests);

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

  const deleteGuest = async (guest) => {
    try {
      setSaving(true);

      const res = await fetch("https://n8n.lpaderina.ru/webhook/guest_delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guest: buildGuestPayload({
            id: guest.id,
            fio: guest.fio || guest.name || "",
            plate: guest.plate || "",
            entryDate: guest.entryDate || "",
            entryTime: guest.entryTime || "",
            exitDate: guest.exitDate || "",
            exitTime: guest.exitTime || "",
            type: guest.type || "car_number",
          }),
        }),
      });

      if (!res.ok) {
        throw new Error(`Ошибка webhook guest_delete: ${res.status}`);
      }

      setState((s) => {
        const currentGuests = normalizeGuests(s?.guests);

        return {
          ...s,
          guests: currentGuests.filter((g) => g.id !== guest.id),
        };
      });
    } catch (err) {
      console.error("guest delete error:", err);
      alert("Не удалось удалить гостевую машину");
    } finally {
      setSaving(false);
    }
  };

  const allowGuestExit = async (guest) => {
    try {
      setSaving(true);

      const currentDate = getTodayDate();
      const currentTime = getCurrentTime();

      const preparedGuest = {
        id: guest.id,
        fio: guest.fio || guest.name || "",
        plate: guest.plate || "",
        entryDate: guest.entryDate || "",
        entryTime: guest.entryTime || "",
        exitDate: currentDate,
        exitTime: currentTime,
        type: guest.type || "car_number",
      };

      const res = await fetch("https://n8n.lpaderina.ru/webhook/guest_allow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guest: buildGuestPayload(preparedGuest),
        }),
      });

      if (!res.ok) {
        throw new Error(`Ошибка webhook guest_allow: ${res.status}`);
      }

      alert(`Выезд разрешён: ${preparedGuest.plate}`);
    } catch (err) {
      console.error("guest allow error:", err);
      alert("Не удалось разрешить выезд");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content">
      <Input
        placeholder="Поиск по номеру"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          flexWrap: "nowrap",
          width: "100%",
        }}
      >
        <button
          className={`btn ${activeTab === "active" ? "primary" : ""}`}
          onClick={() => setActiveTab("active")}
          disabled={saving}
          style={{ flex: 1 }}
        >
          Активные
        </button>

        <button
          className={`btn ${activeTab === "inactive" ? "primary" : ""}`}
          onClick={() => setActiveTab("inactive")}
          disabled={saving}
          style={{ flex: 1 }}
        >
          Неактивные
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={activeTab === "active" ? "Активных машин нет" : "Неактивных машин нет"}
          hint={
            activeTab === "active"
              ? "Нет машин с актуальным временем выезда."
              : "Нет машин с истёкшим временем выезда."
          }
          action={
            activeTab === "active" ? (
              <button className="btn primary" onClick={openAddModal}>
                + Добавить
              </button>
            ) : null
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

              {g.entryDate ? (
                <div className="muted">
                  Дата заезда: {formatDateDisplay(g.entryDate)}
                </div>
              ) : null}

              {g.entryTime ? (
                <div className="muted">Время заезда: {g.entryTime}</div>
              ) : null}

              {g.exitDate ? (
                <div className="muted">
                  Дата выезда: {formatDateDisplay(g.exitDate)}
                </div>
              ) : null}

              {g.exitTime ? (
                <div className="muted">Время выезда: {g.exitTime}</div>
              ) : null}

              <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
                <button className="btn" onClick={() => openEditModal(g)} disabled={saving}>
                  Изменить
                </button>

                <button
                  className="btn primary"
                  onClick={() => allowGuestExit(g)}
                  disabled={saving}
                >
                  Разрешить выезд
                </button>

                <button
                  className="btn danger"
                  onClick={() => deleteGuest(g)}
                  disabled={saving}
                >
                  Удалить
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <button className="btn primary" onClick={openAddModal} disabled={saving}>
        + Добавить гостевую машину
      </button>

      <Modal
        open={open}
        title={editingId ? "Изменить гостевую машину" : "Добавить гостевую машину"}
        onClose={() => {
          if (saving) return;
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

          {!showDateTimeFields ? (
            <button
              type="button"
              onClick={() => setShowDateTimeFields(true)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                marginTop: 4,
                color: "#2563eb",
                fontWeight: 600,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              + Добавить даты заезда/выезда
            </button>
          ) : (
            <div className="col" style={{ gap: 10 }}>
              <div className="col" style={{ gap: 6 }}>
                <div className="muted" style={{ fontWeight: 800 }}>Дата заезда</div>
                <input
                  className="input"
                  type="date"
                  value={form.entryDate}
                  onChange={(e) => {
                    const newEntryDate = e.target.value;
                    setForm({
                      ...form,
                      entryDate: newEntryDate,
                      exitDate: newEntryDate,
                    });
                  }}
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
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
