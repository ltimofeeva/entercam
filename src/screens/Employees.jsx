import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { normPlate, uid } from "../lib/utils.js";
import { getTgContext } from "../lib/tg.js";

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
  const carsRaw =
    (Array.isArray(root?.cars) && root.cars) ||
    (Array.isArray(root?.data?.cars) && root.data.cars) ||
    (Array.isArray(root?.["Машины"]) && root["Машины"]) ||
    [];

  return carsRaw.map((car) => ({
    id: car.id ?? uid(),
    plate: normPlate(car.plate ?? car.number ?? car.gosnomer ?? ""),
    brand: car.brand ?? "",
    model: car.model ?? "",
    color: car.color ?? "",
  }));
}

function normalizeChangedEmployeeResponse(raw, fallback) {
  const data = Array.isArray(raw) ? raw[0] : raw;

  const employeeRaw =
    data?.employee ??
    data?.data?.employee ??
    data?.data ??
    data?.result ??
    data;

  return {
    id: employeeRaw?.id ?? fallback.id,
    name: employeeRaw?.name ?? employeeRaw?.fio ?? fallback.name,
    phone: employeeRaw?.phone
      ? String(employeeRaw.phone).startsWith("+")
        ? String(employeeRaw.phone)
        : `+${String(employeeRaw.phone)}`
      : fallback.phone,
    email: employeeRaw?.email ?? fallback.email,
    dept: employeeRaw?.dept ?? employeeRaw?.department ?? fallback.dept,
    cars: Array.isArray(employeeRaw?.cars) ? employeeRaw.cars : fallback.cars,
  };
}

function isValidPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return /^9\d{9}$/.test(digits);
}

export default function EmployeeDetail({ state, setState, employeeId, goBack }) {
  const employee = useMemo(() => {
    return (state.employees || []).find((e) => String(e.id) === String(employeeId));
  }, [state.employees, employeeId]);

  const [cars, setCars] = useState(employee?.cars || []);
  const [loadingCars, setLoadingCars] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    phone: "",
    email: "",
    dept: "",
  });

  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const [carOpen, setCarOpen] = useState(false);
  const [savingCar, setSavingCar] = useState(false);
  const [carForm, setCarForm] = useState({
    plate: "",
    brand: "",
    model: "",
    color: "",
  });

  useEffect(() => {
    if (!employee) return;

    setEmployeeForm({
      name: employee.name || "",
      phone: (employee.phone || "").replace(/^\+/, ""),
      email: employee.email || "",
      dept: employee.dept || "",
    });

    setCars(Array.isArray(employee.cars) ? employee.cars : []);
  }, [employee]);

  useEffect(() => {
    if (!employee?.id) return;

    let cancelled = false;

    (async () => {
      try {
        setLoadingCars(true);

        const ctx = getTgContext();
        const userId = ctx?.user_id ?? null;

        const payload = {
          event: "get_employee_cars",
          ts: new Date().toISOString(),
          user_id: userId,
          current_user: state.currentUser ?? null,
          employee: {
            id: employee.id,
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
        const normalizedCars = normalizeCarsResponse(raw);

        if (cancelled) return;

        setCars(normalizedCars);

        setState((s) => ({
          ...s,
          employees: (s.employees || []).map((item) =>
            String(item.id) === String(employee.id)
              ? { ...item, cars: normalizedCars }
              : item
          ),
        }));
      } catch (e) {
        console.error("get_employee_cars error:", e);
      } finally {
        if (!cancelled) {
          setLoadingCars(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employee?.id, setState, state.currentUser]);

  const resetEmployeeErrors = () => {
    setNameError("");
    setPhoneError("");
  };

  const openEdit = () => {
    if (!employee) return;

    setEmployeeForm({
      name: employee.name || "",
      phone: (employee.phone || "").replace(/^\+/, ""),
      email: employee.email || "",
      dept: employee.dept || "",
    });

    resetEmployeeErrors();
    setEditOpen(true);
  };

  const saveEmployee = async () => {
    if (!employee || savingEmployee) return;

    let hasError = false;

    if (!employeeForm.name.trim()) {
      setNameError("Введите ФИО");
      hasError = true;
    } else {
      setNameError("");
    }

    if (!employeeForm.phone.trim() || !isValidPhone(employeeForm.phone)) {
      setPhoneError("Введите номер телефона начиная с 9");
      hasError = true;
    } else {
      setPhoneError("");
    }

    if (hasError) return;

    const ctx = getTgContext();
    const userId = ctx?.user_id ?? null;

    const phoneDigits = employeeForm.phone.trim().replace(/\D/g, "");

    const draftEmployee = {
      ...employee,
      name: employeeForm.name.trim(),
      phone: phoneDigits,
      email: employeeForm.email.trim(),
      dept: employeeForm.dept.trim(),
    };

    const payload = {
      event: "change_employee",
      ts: new Date().toISOString(),
      user_id: userId,
      current_user: state.currentUser ?? null,
      employee: {
        id: employee.id,
        name: draftEmployee.name,
        phone: draftEmployee.phone,
        email: draftEmployee.email,
        dept: draftEmployee.dept,
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

      const raw = await res.json();
      const savedEmployee = normalizeChangedEmployeeResponse(raw, draftEmployee);

      setState((s) => ({
        ...s,
        employees: (s.employees || []).map((item) =>
          String(item.id) === String(employee.id)
            ? {
                ...item,
                ...savedEmployee,
                cars: Array.isArray(item.cars) ? item.cars : [],
              }
            : item
        ),
      }));

      setEditOpen(false);
    } catch (e) {
      console.error("changeEmployee error:", e);
      alert("Не удалось изменить сотрудника. Проверьте вебхук или сеть.");
    } finally {
      setSavingEmployee(false);
    }
  };

  const addCar = async () => {
    if (!employee || !carForm.plate.trim() || savingCar) return;

    const ctx = getTgContext();
    const userId = ctx?.user_id ?? null;

    const draftCar = {
      id: uid(),
      plate: normPlate(carForm.plate),
      brand: carForm.brand.trim(),
      model: carForm.model.trim(),
      color: carForm.color.trim(),
    };

    const payload = {
      event: "add_employee_car",
      ts: new Date().toISOString(),
      user_id: userId,
      current_user: state.currentUser ?? null,
      employee: {
        id: employee.id,
      },
      car: {
        plate: draftCar.plate,
        brand: draftCar.brand,
        model: draftCar.model,
        color: draftCar.color,
      },
    };

    try {
      setSavingCar(true);

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

      setCars((prev) => [draftCar, ...prev]);

      setState((s) => ({
        ...s,
        employees: (s.employees || []).map((item) =>
          String(item.id) === String(employee.id)
            ? {
                ...item,
                cars: [draftCar, ...(item.cars || [])],
              }
            : item
        ),
      }));

      setCarForm({
        plate: "",
        brand: "",
        model: "",
        color: "",
      });
      setCarOpen(false);
    } catch (e) {
      console.error("add_employee_car error:", e);
      alert("Не удалось добавить машину. Проверьте вебхук или сеть.");
    } finally {
      setSavingCar(false);
    }
  };

  const deleteCar = async (carId) => {
    if (!employee || !carId) return;

    const ctx = getTgContext();
    const userId = ctx?.user_id ?? null;

    const payload = {
      event: "delete_employee_car",
      ts: new Date().toISOString(),
      user_id: userId,
      current_user: state.currentUser ?? null,
      employee: {
        id: employee.id,
      },
      car: {
        id: carId,
      },
    };

    try {
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

      setCars((prev) => prev.filter((car) => String(car.id) !== String(carId)));

      setState((s) => ({
        ...s,
        employees: (s.employees || []).map((item) =>
          String(item.id) === String(employee.id)
            ? {
                ...item,
                cars: (item.cars || []).filter(
                  (car) => String(car.id) !== String(carId)
                ),
              }
            : item
        ),
      }));
    } catch (e) {
      console.error("delete_employee_car error:", e);
      alert("Не удалось удалить машину. Проверьте вебхук или сеть.");
    }
  };

  if (!employee) {
    return (
      <div className="content">
        <EmptyState
          title="Сотрудник не найден"
          hint="Вернитесь назад и попробуйте открыть карточку ещё раз."
          action={
            <button className="btn primary" onClick={goBack}>
              Назад
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="content">
      <button className="btn" onClick={goBack}>
        ← Назад
      </button>

      <Card>
        <div className="col" style={{ gap: 8 }}>
          <div className="big">{employee.name || "Без имени"}</div>
          {employee.phone ? <div className="muted">{employee.phone}</div> : null}
          {employee.email ? <div className="muted">{employee.email}</div> : null}
          <div className="muted">Отдел: {employee.dept || "Не указан"}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={openEdit}>
            Изменить сотрудника
          </button>
        </div>
      </Card>

      <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
        <div className="big">Машины сотрудника</div>
        <button className="btn primary" onClick={() => setCarOpen(true)}>
          + Добавить машину
        </button>
      </div>

      {loadingCars ? (
        <EmptyState title="Загрузка…" hint="Получаем машины сотрудника." />
      ) : cars.length === 0 ? (
        <EmptyState
          title="Машин пока нет"
          hint="Добавьте первую машину сотрудника."
        />
      ) : (
        <div className="list">
          {cars.map((car) => (
            <Card key={car.id}>
              <div className="row" style={{ alignItems: "center" }}>
                <div className="col">
                  <div className="big">{car.plate || "Без номера"}</div>
                  {car.brand || car.model ? (
                    <div className="muted">
                      {[car.brand, car.model].filter(Boolean).join(" ")}
                    </div>
                  ) : null}
                  {car.color ? <div className="muted">{car.color}</div> : null}
                </div>

                <button
                  className="btn"
                  onClick={() => deleteCar(car.id)}
                  style={{ color: "#dc2626" }}
                >
                  Удалить
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editOpen ? (
        <div
          className="modalBack"
          onMouseDown={() => !savingEmployee && setEditOpen(false)}
        >
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalTitle">Изменить сотрудника</div>

            <div className="col" style={{ gap: 10 }}>
              <div>
                <Input
                  label="ФИО*"
                  placeholder="Иванов Иван Иванович"
                  value={employeeForm.name}
                  onChange={(e) => {
                    setEmployeeForm({ ...employeeForm, name: e.target.value });
                    if (nameError) setNameError("");
                  }}
                />
                {nameError ? (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      color: "#dc2626",
                    }}
                  >
                    {nameError}
                  </div>
                ) : null}
              </div>

              <div>
                <Input
                  label="Телефон*"
                  placeholder="9512244555"
                  value={employeeForm.phone}
                  onChange={(e) => {
                    setEmployeeForm({ ...employeeForm, phone: e.target.value });
                    if (phoneError) setPhoneError("");
                  }}
                />
                {phoneError ? (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      color: "#dc2626",
                    }}
                  >
                    {phoneError}
                  </div>
                ) : null}
              </div>

              <Input
                label="Email"
                value={employeeForm.email}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, email: e.target.value })
                }
              />

              <Input
                label="Отдел"
                value={employeeForm.dept}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, dept: e.target.value })
                }
              />
            </div>

            <div className="modalActions">
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
                disabled={savingEmployee}
              >
                {savingEmployee ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {carOpen ? (
        <div className="modalBack" onMouseDown={() => !savingCar && setCarOpen(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalTitle">Добавить машину</div>

            <div className="col" style={{ gap: 10 }}>
              <Input
                label="Госномер*"
                value={carForm.plate}
                onChange={(e) =>
                  setCarForm({ ...carForm, plate: e.target.value })
                }
                placeholder="A123AA174"
              />
              <Input
                label="Марка"
                value={carForm.brand}
                onChange={(e) =>
                  setCarForm({ ...carForm, brand: e.target.value })
                }
              />
              <Input
                label="Модель"
                value={carForm.model}
                onChange={(e) =>
                  setCarForm({ ...carForm, model: e.target.value })
                }
              />
              <Input
                label="Цвет"
                value={carForm.color}
                onChange={(e) =>
                  setCarForm({ ...carForm, color: e.target.value })
                }
              />
            </div>

            <div className="modalActions">
              <button
                className="btn"
                onClick={() => setCarOpen(false)}
                disabled={savingCar}
              >
                Отмена
              </button>
              <button
                className="btn primary"
                onClick={addCar}
                disabled={!carForm.plate.trim() || savingCar}
              >
                {savingCar ? "Сохраняем..." : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
