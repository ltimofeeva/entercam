import React, { useMemo, useState } from "react";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { normPlate, uid } from "../lib/utils.js";
import { getTgContext } from "../lib/tg.js";

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

function normalizePlateForValidation(value) {
  if (!value) return "";

  const map = {
    A: "A",
    А: "A",
    B: "B",
    В: "B",
    E: "E",
    Е: "E",
    K: "K",
    К: "K",
    M: "M",
    М: "M",
    H: "H",
    Н: "H",
    O: "O",
    О: "O",
    P: "P",
    Р: "P",
    C: "C",
    С: "C",
    T: "T",
    Т: "T",
    Y: "Y",
    У: "Y",
    X: "X",
    Х: "X",
  };

  return String(value)
    .toUpperCase()
    .replace(/\s+/g, "")
    .split("")
    .map((char) => map[char] || char)
    .join("");
}

function isValidCarPlate(value) {
  const normalized = normalizePlateForValidation(value);
  return /^[ABEKMHOPCTYX]\d{3}[ABEKMHOPCTYX]{2}\d{2,3}$/.test(normalized);
}

export default function Guests({ state, setState }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showDateTimeFields, setShowDateTimeFields] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState(createEmptyForm());

  const guestsArray = normalizeGuests(state?.guests);

  const getChatIdData = () => {
    const ctx = getTgContext();
    return {
      chat_id: state?.currentUser?.chat_id || ctx?.user_id || "",
    };
  };

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
    setShowDateTimeFields(true);
    setErrors({});
  };

  const openAddModal = () => {
    resetForm();
    setOpen(true);
  };

  const openEditModal = (guest) => {
    setForm({
      fio: guest.fio || guest.name || "",
      plate: guest.plate || "",
      entryDate: guest.entryDate || getTodayDate(),
      entryTime: guest.entryTime || "00:00",
      exitDate: guest.exitDate || getTodayDate(),
      exitTime: guest.exitTime || "23:59",
    });

    setEditingId(guest.id);
    setShowDateTimeFields(true);
    setErrors({});
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
    chat_id: guest.chat_id || "",
  });

  const validateForm = () => {
    const nextErrors = {};

    if (!(form.fio || "").trim()) {
      nextErrors.fio = "Заполните поле «ФИО»";
    }

    if (!(form.plate || "").trim()) {
      nextErrors.plate = "Заполните поле «Номер авто»";
    } else if (!isValidCarPlate(form.plate)) {
      nextErrors.plate = "Неверный формат номера авто. Пример: Н123НН74";
    }

    if (!(form.entryDate || "").trim()) {
      nextErrors.entryDate = "Заполните поле «Дата въезда»";
    }

    if (!(form.exitDate || "").trim()) {
      nextErrors.exitDate = "Заполните поле «Дата выезда»";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      alert(Object.values(nextErrors)[0]);
      return false;
    }

    return true;
  };

  const saveGuest = async () => {
    if (saving) return;
    if (!validateForm()) return;

    const plate = normPlate(normalizePlateForValidation(form.plate));
    const fio = (form.fio || "").trim();
    const chatIdData = getChatIdData();

    const payload = {
      fio,
      plate,
      entryDate: form.entryDate,
      entryTime: showDateTimeFields ? form.entryTime : "",
      exitDate: form.exitDate,
      exitTime: showDateTimeFields ? form.exitTime : "",
      type: "car_number",
      ...chatIdData,
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
          chat_id: payload.chat_id,
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
                    chat_id: updatedGuest.chat_id,
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
          chat_id: payload.chat_id,
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
            chat_id: guest.chat_id || state?.currentUser?.chat_id || getTgContext()?.user_id || "",
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
        chat_id: guest.chat_id || state?.currentUser?.chat_id || getTgContext()?.user_id || "",
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

      <button
        className="btn primary"
        onClick={openAddModal}
        disabled={saving}
        style={{ width: "100%", marginTop: 12, marginBottom: 12 }}
      >
        + Добавить гостевую машину
      </button>

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
        {list.map((g) => {
          const isInactiveTab = activeTab === "inactive";

          return (
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

                {g.exitDate ? (
                  <div className="muted">
                    Дата выезда: {formatDateDisplay(g.exitDate)}
                  </div>
                ) : null}

                <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="btn"
                    onClick={() => openEditModal(g)}
                    disabled={saving}
                  >
                    Изменить
                  </button>

                  <button
                    className={isInactiveTab ? "btn" : "btn primary"}
                    onClick={() => allowGuestExit(g)}
                    disabled={saving}
                  >
                    Разрешить выезд
                  </button>

                  <button
                    className={isInactiveTab ? "btn" : "btn danger"}
                    onClick={() => deleteGuest(g)}
                    disabled={saving}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

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
              disabled={saving}
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </>
        }
      >
        <div className="col" style={{ gap: 10 }}>
          <div>
            <Input
              label="ФИО*"
              placeholder="Напр. Иванов Иван Иванович"
              value={form.fio}
              onChange={(e) => {
                setForm({ ...form, fio: e.target.value });
                if (errors.fio) setErrors((prev) => ({ ...prev, fio: "" }));
              }}
            />
            {errors.fio ? (
              <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                {errors.fio}
              </div>
            ) : null}
          </div>

          <div>
            <Input
              label="Номер авто*"
              placeholder="Напр. Н123НН74"
              value={form.plate}
              onChange={(e) => {
                setForm({ ...form, plate: e.target.value });
                if (errors.plate) setErrors((prev) => ({ ...prev, plate: "" }));
              }}
            />
            {errors.plate ? (
              <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                {errors.plate}
              </div>
            ) : null}
          </div>

          {showDateTimeFields ? (
            <div className="col" style={{ gap: 10 }}>
              <div className="col" style={{ gap: 6 }}>
                <div className="muted" style={{ fontWeight: 800 }}>Дата въезда *</div>
                <input
                  className="input"
                  type="date"
                  value={form.entryDate}
                  onChange={(e) => {
                    const newEntryDate = e.target.value;
                    setForm({
                      ...form,
                      entryDate: newEntryDate,
                      exitDate: form.exitDate || newEntryDate,
                    });
                    if (errors.entryDate) {
                      setErrors((prev) => ({ ...prev, entryDate: "" }));
                    }
                  }}
                />
                {errors.entryDate ? (
                  <div style={{ color: "#dc2626", fontSize: 12 }}>
                    {errors.entryDate}
                  </div>
                ) : null}
              </div>

              <div className="col" style={{ gap: 6 }}>
                <div className="muted" style={{ fontWeight: 800 }}>Дата выезда *</div>
                <input
                  className="input"
                  type="date"
                  value={form.exitDate}
                  onChange={(e) => {
                    setForm({ ...form, exitDate: e.target.value });
                    if (errors.exitDate) {
                      setErrors((prev) => ({ ...prev, exitDate: "" }));
                    }
                  }}
                />
                {errors.exitDate ? (
                  <div style={{ color: "#dc2626", fontSize: 12 }}>
                    {errors.exitDate}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
