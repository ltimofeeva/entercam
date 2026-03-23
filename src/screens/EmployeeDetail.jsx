import React, { useMemo, useState } from "react";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { normPlate, uid } from "../lib/utils.js";
import { getTgContext } from "../lib/tg.js";

const DELETE_EMPLOYEE_WEBHOOK =
  "https://n8n.lpaderina.ru/webhook-test/delete_employee";

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

  const addCar = () => {
    const p = normPlate(plate);
    if (!p) return;

    setState((s) => ({
      ...s,
      employees: (s.employees || []).map((e) =>
        e.id === emp.id
          ? { ...e, cars: [{ id: uid(), plate: p }, ...(e.cars ?? [])] }
          : e
      ),
    }));

    setPlate("");
    setAddOpen(false);
  };

  const deleteCar = (carId) => {
    setState((s) => ({
      ...s,
      employees: (s.employees || []).map((e) =>
        e.id === emp.id
          ? { ...e, cars: (e.cars ?? []).filter((c) => c.id !== carId) }
          : e
      ),
    }));
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

      {(emp.cars?.length ?? 0) === 0 ? (
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
              >
                Удалить
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
        onClose={() => setAddOpen(false)}
        actions={
          <>
            <button className="btn" onClick={() => setAddOpen(false)}>
              Отмена
            </button>
            <button
              className="btn primary"
              onClick={addCar}
              disabled={!normPlate(plate)}
            >
              Добавить
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
        onClose={() => setConfirm({ open: false, carId: null, carPlate: "" })}
        actions={
          <>
            <button
              className="btn"
              onClick={() =>
                setConfirm({ open: false, carId: null, carPlate: "" })
              }
            >
              Отмена
            </button>
            <button
              className="btn danger"
              onClick={() => {
                deleteCar(confirm.carId);
                setConfirm({ open: false, carId: null, carPlate: "" });
              }}
            >
              Удалить
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
