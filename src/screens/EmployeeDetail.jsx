import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { normPlate, uid } from "../lib/utils.js";
import { getTgContext } from "../lib/tg.js";

const DELETE_EMPLOYEE_WEBHOOK =
  "https://n8n.lpaderina.ru/webhook-test/delete_employee";

const GET_EMPLOYEE_CARS_WEBHOOK =
  "https://n8n.lpaderina.ru/webhook-test/get_employee_cars";

const ADD_EMPLOYEE_CAR_WEBHOOK =
  "https://n8n.lpaderina.ru/webhook-test/add_employee_car";

const DELETE_EMPLOYEE_CAR_WEBHOOK =
  "https://n8n.lpaderina.ru/webhook-test/delete_employee_car";

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

export default function EmployeeDetail({ state, setState, employeeId, onBack }) {
  const emp = useMemo(
    () => (state.employees || []).find((e) => e.id === employeeId),
    [state.employees, employeeId]
  );

  const [addOpen, setAddOpen] = useState(false);
  const [plate, setPlate] = useState("");
  const [confirm, setConfirm] = useState({ open: false, carId: null, carPlate: "" });
  const [confirmEmp, setConfirmEmp] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState(false);
  const [carsLoading, setCarsLoading] = useState(false);
  const [addingCar, setAddingCar] = useState(false);
  const [deletingCarId, setDeletingCarId] = useState(null);

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

  const addCar = async () => {
    const p = normPlate(plate);
    if (!p || addingCar) return;

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
      setAddOpen(false);
    } catch (e) {
      console.error("addCar error:", e);
      alert("Не удалось добавить номер. Проверьте вебхук или сеть.");
    } finally {
      setAddingCar(false);
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
          {emp.phone ? <div className="muted">{emp.phone}</div> : null}
          {emp.email || emp.dept ? (
            <div className="muted">
              {[emp.dept, emp.email].filter(Boolean).join(" • ")}
            </div>
          ) : null}
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
        open={addOpen}
        title="Добавить машину"
        onClose={() => !addingCar && setAddOpen(false)}
        actions={
          <>
            <button
              className="btn"
              onClick={() => setAddOpen(false)}
              disabled={addingCar}
            >
              Отмена
            </button>
            <button
              className="btn primary"
              onClick={addCar}
              disabled={!normPlate(plate) || addingCar}
            >
              {addingCar ? "Сохраняем..." : "Добавить"}
            </button>
          </>
        }
      >
        <Input
          label="Госномер*"
          placeholder="Напр. A123BC174"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
        />
        <div className="muted" style={{ marginTop: 8 }}>
          Номер будет сохранён в верхнем регистре без пробелов.
        </div>
      </Modal>

      <Modal
        open={confirm.open}
        title={`Удалить номер ${confirm.carPlate}?`}
        onClose={() =>
          !deletingCarId && setConfirm({ open: false, carId: null, carPlate: "" })
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
