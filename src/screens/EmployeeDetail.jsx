import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { normPlate, uid } from "../lib/utils.js";
import { getTgContext } from "../lib/tg.js";

const DELETE_EMPLOYEE_WEBHOOK =
  "https://n8n.lpaderina.ru/webhook/delete_employee";

const GET_EMPLOYEE_CARS_WEBHOOK =
  "https://n8n.lpaderina.ru/webhook/get_employee_cars";

const ADD_EMPLOYEE_CAR_WEBHOOK =
  "https://n8n.lpaderina.ru/webhook/add_employee_car";

const DELETE_EMPLOYEE_CAR_WEBHOOK =
  "https://n8n.lpaderina.ru/webhook/delete_employee_car";

const CHANGE_EMPLOYEE_WEBHOOK =
  "https://n8n.lpaderina.ru/webhook/change_employee";

function normalizeCarsResponse(raw) {
  const root = Array.isArray(raw) ? raw[0] : raw;
  const data = Array.isArray(root?.cars)
    ? root.cars
    : Array.isArray(root?.data)
    ? root.data
    : Array.isArray(root?.vehicles)
    ? root.vehicles
    : Array.isArray(root)
    ? root
    : [];

  return data
    .map((c) => {
      if (typeof c === "string") {
        const plate = normPlate(c);
        return plate ? { id: uid(), plate } : null;
      }

      const plate = normPlate(
        c?.plate ?? c?.carNumber ?? c?.number ?? c?.gosnomer ?? ""
      );

      if (!plate) return null;

      return {
        id: c?.id ?? uid(),
        plate,
      };
    })
    .filter(Boolean);
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

function formatPhone(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "";

  if (digits[0] === "8") {
    digits = "7" + digits.slice(1);
  }

  if (digits[0] !== "7") {
    digits = "7" + digits;
  }

  digits = digits.slice(0, 11);

  const country = "+7";
  const p1 = digits.slice(1, 4);
  const p2 = digits.slice(4, 7);
  const p3 = digits.slice(7, 9);
  const p4 = digits.slice(9, 11);

  let result = country;

  if (p1) result += ` (${p1}`;
  if (p1.length === 3) result += ")";
  if (p2) result += ` ${p2}`;
  if (p3) result += `-${p3}`;
  if (p4) result += `-${p4}`;

  return result;
}

function normalizePhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export default function EmployeeDetail({ state, setState, employeeId, onBack }) {
  const emp = useMemo(
    () => (state.employees || []).find((e) => e.id === employeeId),
    [state.employees, employeeId]
  );

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [plate, setPlate] = useState("");
  const [plateError, setPlateError] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    dept: "",
  });

  const [confirm, setConfirm] = useState({
    open: false,
    carId: null,
    carPlate: "",
  });
  const [confirmEmp, setConfirmEmp] = useState(false);

  const [deletingEmployee, setDeletingEmployee] = useState(false);
  const [carsLoading, setCarsLoading] = useState(false);
  const [addingCar, setAddingCar] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [deletingCarId, setDeletingCarId] = useState(null);

  useEffect(() => {
    if (!emp) return;

    setEditForm({
      name: emp.name ?? "",
      phone: formatPhone(emp.phone ?? ""),
      email: emp.email ?? "",
      dept: emp.dept || state.currentUser?.department || "",
    });
  }, [emp, state.currentUser]);

  useEffect(() => {
    let cancelled = false;

    const loadEmployeeCars = async () => {
      if (!emp?.id) return;

      try {
        setCarsLoading(true);

        const ctx = getTgContext();
        const userId = ctx?.user_id ?? null;

        const payload = {
          event: "get_employee_cars",
          ts: new Date().toISOString(),
          user_id: userId,
          current_user: state.currentUser ?? null,
          employee: {
            id: emp.id,
            name: emp.name ?? "",
            phone: emp.phone ?? "",
            email: emp.email ?? "",
            dept: emp.dept ?? "",
          },
        };

        const res = await fetch(GET_EMPLOYEE_CARS_WEBHOOK, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(`Webhook error: ${res.status}`);
        }

        const raw = await res.json();
        const cars = normalizeCarsResponse(raw);

        if (cancelled) return;

        setState((s) => ({
          ...s,
          employees: (s.employees || []).map((e) =>
            e.id === emp.id ? { ...e, cars } : e
          ),
        }));
      } catch (e) {
        console.error("loadEmployeeCars error:", e);
      } finally {
        if (!cancelled) {
          setCarsLoading(false);
        }
      }
    };

    loadEmployeeCars();

    return () => {
      cancelled = true;
    };
  }, [emp?.id, setState, state.currentUser]);

  if (!emp) {
    return (
      <div className="content">
        <EmptyState
          title="Сотрудник не найден"
          action={
            <button className="btn" onClick={onBack}>
              Назад
            </button>
          }
        />
      </div>
    );
  }

  const validatePlate = (value) => {
    const raw = (value || "").trim();

    if (!raw) {
      return "Введите госномер.";
    }

    if (!isValidCarPlate(raw)) {
      return "Неверный формат номера. Пример: Н123НН74";
    }

    return "";
  };

  const addCar = async () => {
    const validationError = validatePlate(plate);
    if (validationError || addingCar) {
      setPlateError(validationError);
      if (validationError) alert(validationError);
      return;
    }

    const p = normPlate(normalizePlateForValidation(plate));

    if (!emp?.id) {
      alert("У сотрудника отсутствует корректный ID. Проверьте ответ вебхука add_employee.");
      return;
    }

    const alreadyExists = (emp.cars || []).some((c) => normPlate(c.plate) === p);
    if (alreadyExists) {
      alert("Этот номер уже добавлен сотруднику.");
      return;
    }

    const ctx = getTgContext();
    const userId = ctx?.user_id ?? null;

    const newCar = {
      id: uid(),
      plate: p,
    };

    const payload = {
      event: "add_employee_car",
      ts: new Date().toISOString(),
      user_id: userId,
      current_user: state.currentUser ?? null,
      employee: {
        id: emp.id,
        name: emp.name ?? "",
        phone: emp.phone ?? "",
        email: emp.email ?? "",
        dept: emp.dept ?? "",
      },
      car: {
        id: newCar.id,
        plate: newCar.plate,
      },
    };

    try {
      setAddingCar(true);

      const res = await fetch(ADD_EMPLOYEE_CAR_WEBHOOK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Webhook error: ${res.status}`);
      }

      setState((s) => ({
        ...s,
        employees: (s.employees || []).map((e) =>
          e.id === emp.id
            ? { ...e, cars: [newCar, ...(e.cars ?? [])] }
            : e
        ),
      }));

      setPlate("");
      setPlateError("");
      setAddOpen(false);
    } catch (e) {
      console.error("addCar error:", e);
      alert("Не удалось добавить номер. Проверьте вебхук или сеть.");
    } finally {
      setAddingCar(false);
    }
  };

  const saveEmployee = async () => {
    if (savingEmployee) return;

    const nextEmployee = {
      id: emp.id,
      name: (editForm.name ?? "").trim(),
      phone: normalizePhoneDigits(emp.phone),
      email: (editForm.email ?? "").trim(),
      dept: emp.dept || state.currentUser?.department || "",
    };

    if (!nextEmployee.name) {
      alert("Укажите имя сотрудника.");
      return;
    }

    const ctx = getTgContext();
    const userId = ctx?.user_id ?? null;

    const payload = {
      event: "change_employee",
      ts: new Date().toISOString(),
      user_id: userId,
      current_user: state.currentUser ?? null,
      employee_before: {
        id: emp.id,
        name: emp.name ?? "",
        phone: emp.phone ?? "",
        email: emp.email ?? "",
        dept: emp.dept ?? "",
      },
      employee: {
        ...nextEmployee,
        cars: Array.isArray(emp.cars) ? emp.cars : [],
      },
    };

    try {
      setSavingEmployee(true);

      const res = await fetch(CHANGE_EMPLOYEE_WEBHOOK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Webhook error: ${res.status}`);
      }

      setState((s) => ({
        ...s,
        employees: (s.employees || []).map((e) =>
          e.id === emp.id
            ? {
                ...e,
                name: nextEmployee.name,
                phone: nextEmployee.phone,
                email: nextEmployee.email,
                dept: nextEmployee.dept,
              }
            : e
        ),
      }));

      setEditOpen(false);
    } catch (e) {
      console.error("saveEmployee error:", e);
      alert("Не удалось сохранить данные сотрудника. Проверьте вебхук или сеть.");
    } finally {
      setSavingEmployee(false);
    }
  };

  const deleteCar = async (carId) => {
    if (!carId || deletingCarId) return;

    const car = (emp.cars || []).find((c) => c.id === carId);
    if (!car) return;

    const ctx = getTgContext();
    const userId = ctx?.user_id ?? null;

    const payload = {
      event: "delete_employee_car",
      ts: new Date().toISOString(),
      user_id: userId,
      current_user: state.currentUser ?? null,
      employee: {
        id: emp.id,
        name: emp.name ?? "",
        phone: emp.phone ?? "",
        email: emp.email ?? "",
        dept: emp.dept ?? "",
      },
      car: {
        id: car.id ?? "",
        plate: car.plate ?? "",
      },
    };

    try {
      setDeletingCarId(carId);

      const res = await fetch(DELETE_EMPLOYEE_CAR_WEBHOOK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Webhook error: ${res.status}`);
      }

      setState((s) => ({
        ...s,
        employees: (s.employees || []).map((e) =>
          e.id === emp.id
            ? { ...e, cars: (e.cars ?? []).filter((c) => c.id !== carId) }
            : e
        ),
      }));

      setConfirm({ open: false, carId: null, carPlate: "" });
    } catch (e) {
      console.error("deleteCar error:", e);
      alert("Не удалось удалить номер. Проверьте вебхук или сеть.");
    } finally {
      setDeletingCarId(null);
    }
  };

  const deleteEmployee = async () => {
    if (deletingEmployee) return;

    const ctx = getTgContext();
    const userId = ctx?.user_id ?? null;

    const payload = {
      event: "delete_employee",
      ts: new Date().toISOString(),
      user_id: userId,
      current_user: state.currentUser ?? null,
      employee: {
        id: emp.id,
        name: emp.name ?? "",
        phone: emp.phone ?? "",
        email: emp.email ?? "",
        dept: emp.dept ?? "",
        cars: Array.isArray(emp.cars) ? emp.cars : [],
      },
    };

    try {
      setDeletingEmployee(true);

      const res = await fetch(DELETE_EMPLOYEE_WEBHOOK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Webhook error: ${res.status}`);
      }

      setState((s) => ({
        ...s,
        employees: (s.employees || []).filter((e) => e.id !== emp.id),
      }));

      setConfirmEmp(false);
      onBack();
    } catch (e) {
      console.error("deleteEmployee error:", e);
      alert("Не удалось удалить сотрудника. Проверьте вебхук или сеть.");
    } finally {
      setDeletingEmployee(false);
    }
  };

  return (
    <div className="content">
      <Card>
        <div className="col">
          <div className="big">{emp.name}</div>
          {emp.phone ? <div className="muted">{formatPhone(emp.phone)}</div> : null}
          {emp.email || emp.dept ? (
            <div className="muted">
              {[emp.dept, emp.email].filter(Boolean).join(" • ")}
            </div>
          ) : null}

          <div style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => setEditOpen(true)}>
              Изменить данные о сотруднике
            </button>
          </div>
        </div>
      </Card>

      <div className="row">
        <div className="big">Машины сотрудника</div>
        <button className="btn primary" onClick={() => setAddOpen(true)}>
          + Добавить
        </button>
      </div>

      {carsLoading ? (
        <EmptyState title="Загрузка машин..." hint="Получаем номера сотрудника." />
      ) : (emp.cars?.length ?? 0) === 0 ? (
        <EmptyState title="Пока нет машин" hint="Добавьте госномер сотрудника." />
      ) : null}

      <div className="list">
        {(emp.cars ?? []).map((c) => (
          <Card key={c.id}>
            <div className="row">
              <div className="big">{c.plate}</div>
              <button
                className="btn danger"
                onClick={() =>
                  setConfirm({ open: true, carId: c.id, carPlate: c.plate })
                }
                disabled={deletingCarId !== null}
              >
                {deletingCarId === c.id ? "Удаление..." : "Удалить"}
              </button>
            </div>
          </Card>
        ))}
      </div>

      <div className="sep" />

      <button className="btn danger" onClick={() => setConfirmEmp(true)}>
        Удалить сотрудника
      </button>

      <Modal
        open={editOpen}
        title="Изменить данные сотрудника"
        onClose={() => !savingEmployee && setEditOpen(false)}
        actions={
          <>
            <button
              className="btn"
              onClick={() => setEditOpen(false)}
              disabled={savingEmployee}
            >
              Отмена
            </button>
            <button
              className="btn primary"
              onClick={saveEmployee}
              disabled={!editForm.name.trim() || savingEmployee}
            >
              {savingEmployee ? "Сохраняем..." : "Сохранить"}
            </button>
          </>
        }
      >
        <Input
          label="ФИО*"
          placeholder="Введите ФИО"
          value={editForm.name}
          onChange={(e) =>
            setEditForm((f) => ({ ...f, name: e.target.value }))
          }
        />

        <div>
        

          <Input
            label="Телефон"
            value={formatPhone(emp.phone)}
            disabled
          />
          <div
            className="muted"
            style={{
              marginBottom: 6,
              fontSize: 13,
              color: "#dc2626",
              fontWeight: 700,
            }}
          >
            Номер телефона изменить нельзя
          </div>
        </div>

        <Input
          label="Email"
          placeholder="example@mail.ru"
          value={editForm.email}
          onChange={(e) =>
            setEditForm((f) => ({ ...f, email: e.target.value }))
          }
        />

        <Input
          label="Отдел"
          value={editForm.dept || state.currentUser?.department || ""}
          disabled
        />
      </Modal>

      <Modal
        open={addOpen}
        title="Добавить машину"
        onClose={() => {
          if (addingCar) return;
          setAddOpen(false);
          setPlate("");
          setPlateError("");
        }}
        actions={
          <>
            <button
              className="btn"
              onClick={() => {
                setAddOpen(false);
                setPlate("");
                setPlateError("");
              }}
              disabled={addingCar}
            >
              Отмена
            </button>
            <button
              className="btn primary"
              onClick={addCar}
              disabled={!plate.trim() || !!validatePlate(plate) || addingCar}
            >
              {addingCar ? "Сохраняем..." : "Добавить"}
            </button>
          </>
        }
      >
        <Input
          label="Госномер*"
          placeholder="Напр. Н123НН74"
          value={plate}
          onChange={(e) => {
            setPlate(e.target.value);
            if (plateError) {
              setPlateError("");
            }
          }}
        />
        {plateError ? (
          <div style={{ color: "#dc2626", fontSize: 12, marginTop: 6 }}>
            {plateError}
          </div>
        ) : null}
        <div className="muted" style={{ marginTop: 8 }}>
          Номер будет сохранён в верхнем регистре без пробелов.
        </div>
      </Modal>

      <Modal
        open={confirm.open}
        title={`Удалить номер ${confirm.carPlate}?`}
        onClose={() =>
          !deletingCarId &&
          setConfirm({ open: false, carId: null, carPlate: "" })
        }
        actions={
          <>
            <button
              className="btn"
              onClick={() =>
                setConfirm({ open: false, carId: null, carPlate: "" })
              }
              disabled={deletingCarId !== null}
            >
              Отмена
            </button>
            <button
              className="btn danger"
              onClick={() => deleteCar(confirm.carId)}
              disabled={deletingCarId !== null}
            >
              {deletingCarId === confirm.carId ? "Удаление..." : "Удалить"}
            </button>
          </>
        }
      >
        <div className="muted">Сотрудник: {emp.name}</div>
      </Modal>

      <Modal
        open={confirmEmp}
        title="Удалить сотрудника?"
        onClose={() => !deletingEmployee && setConfirmEmp(false)}
        actions={
          <>
            <button
              className="btn"
              onClick={() => setConfirmEmp(false)}
              disabled={deletingEmployee}
            >
              Отмена
            </button>
            <button
              className="btn danger"
              onClick={deleteEmployee}
              disabled={deletingEmployee}
            >
              {deletingEmployee ? "Удаление..." : "Удалить"}
            </button>
          </>
        }
      >
        <div className="muted">{emp.name}</div>
      </Modal>
    </div>
  );
}
