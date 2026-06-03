import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { uid } from "../lib/utils.js";

const ADD_EMPLOYEE_WEBHOOK =
  "https://n8n.lpaderina.ru/webhook/add_employee_dop";

const GET_EMPLOYEES_WEBHOOK =
  "https://n8n.lpaderina.ru/webhook/get_employee_list";

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

function normalizeEmployeesResponse(raw, currentUser) {
  const data = Array.isArray(raw) ? raw[0] : raw;

  const employeesRaw =
    (Array.isArray(raw) && raw) ||
    (Array.isArray(data?.employees) && data.employees) ||
    (Array.isArray(data?.["Сотрудники"]) && data["Сотрудники"]) ||
    (Array.isArray(data?.data) && data.data) ||
    [];

  return employeesRaw.map((e) => ({
    id: e.id ?? e.uid ?? uid(),
    name: e.name ?? e.fio ?? e.FIO ?? "",
    phone: e.phone
      ? String(e.phone).startsWith("+")
        ? String(e.phone)
        : `+${String(e.phone)}`
      : "",
    email: e.email ?? "",
    dept:
      e.dept ??
      e.department ??
      e.Otdel ??
      currentUser?.department ??
      "",
    cars: Array.isArray(e.cars) ? e.cars : [],
  }));
}

function normalizeCreatedEmployeeResponse(raw, fallback) {
  const data = Array.isArray(raw) ? raw[0] : raw;

  const employeeRaw =
    data?.employee ??
    data?.data?.employee ??
    data?.data ??
    data?.result ??
    data;

  return {
    id: employeeRaw?.id ?? employeeRaw?.uid ?? fallback.id,
    name:
      employeeRaw?.name ??
      employeeRaw?.fio ??
      employeeRaw?.FIO ??
      fallback.name,
    phone: employeeRaw?.phone
      ? String(employeeRaw.phone).startsWith("+")
        ? String(employeeRaw.phone)
        : `+${String(employeeRaw.phone)}`
      : fallback.phone,
    email: employeeRaw?.email ?? fallback.email,
    dept:
      employeeRaw?.dept ??
      employeeRaw?.department ??
      employeeRaw?.Otdel ??
      fallback.dept,
    cars: Array.isArray(employeeRaw?.cars) ? employeeRaw.cars : fallback.cars,
  };
}

function isValidPhone(value) {
  const digits = normalizePhoneDigits(value);

  return /^7\d{10}$/.test(digits);
}

export default function Employees({ state, setState, goEmployee }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    dept: "",
  });

  const [loading, setLoading] = useState(true);
  const [departmentName, setDepartmentName] = useState("");
  const [saving, setSaving] = useState(false);

  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadEmployees = async () => {
      try {
        setLoading(true);

        const currentUser = state.currentUser ?? null;

        const depName = currentUser?.department ?? "";
        setDepartmentName(depName);

        const response = await fetch(GET_EMPLOYEES_WEBHOOK, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event: "employees_get",
            user: currentUser,
            phone: currentUser?.phone ?? currentUser?.Tel_num ?? "",
            department: currentUser?.department ?? "",
            department_id:
              currentUser?.department_id ??
              currentUser?.Otdel_id ??
              "",
            ts: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error(`Webhook error: ${response.status}`);
        }

        const raw = await response.json();
        console.log("Employees webhook response:", raw);

        if (cancelled) return;

        const employees = normalizeEmployeesResponse(raw, currentUser);

        setState((s) => ({
          ...s,
          employees,
        }));
      } catch (e) {
        console.error("loadEmployees error:", e);

        if (!cancelled) {
          setState((s) => ({
            ...s,
            employees: s.employees || [],
          }));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadEmployees();

    return () => {
      cancelled = true;
    };
  }, [setState, state.currentUser]);

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return state.employees || [];

    return (state.employees || []).filter((e) => {
      const hay = `${e.name} ${e.phone} ${e.email} ${e.dept}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [q, state.employees]);

  const resetForm = () => {
    setForm({
      name: "",
      phone: "",
      email: "",
      dept: departmentName || state.currentUser?.department || "",
    });
    setNameError("");
    setPhoneError("");
  };

  const addEmployee = async () => {
    if (saving) return;

    let hasError = false;

    if (!form.name.trim()) {
      setNameError("Введите ФИО");
      hasError = true;
    } else {
      setNameError("");
    }

    if (!form.phone.trim() || !isValidPhone(form.phone)) {
      setPhoneError("Введите номер телефона полностью");
      hasError = true;
    } else {
      setPhoneError("");
    }

    if (hasError) return;

    const phoneDigits = normalizePhoneDigits(form.phone);

    const draftEmployee = {
      id: uid(),
      name: form.name.trim(),
      phone: phoneDigits,
      email: form.email.trim(),
      dept: departmentName || state.currentUser?.department || "",
      cars: [],
    };

    const payload = {
      event: "add_employee",
      ts: new Date().toISOString(),
      current_user: state.currentUser ?? null,
      employee: {
        name: draftEmployee.name,
        phone: draftEmployee.phone,
        email: draftEmployee.email,
        dept: draftEmployee.dept,
      },
    };

    try {
      setSaving(true);

      const res = await fetch(ADD_EMPLOYEE_WEBHOOK, {
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
      const savedEmployee = normalizeCreatedEmployeeResponse(raw, draftEmployee);

      setState((s) => ({
        ...s,
        employees: [savedEmployee, ...(s.employees || [])],
      }));

      resetForm();
      setOpen(false);
    } catch (e) {
      console.error("addEmployee error:", e);
      alert("Не удалось сохранить сотрудника. Проверьте вебхук или сеть.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="content">
        <EmptyState
          title="Загрузка…"
          hint="Получаем список сотрудников."
        />
      </div>
    );
  }

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
          hint="Список сотрудников пуст."
          action={
            <button
              className="btn primary"
              onClick={() => {
                resetForm();
                setOpen(true);
              }}
            >
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
                {e.phone ? <div className="muted">{formatPhone(e.phone)}</div> : null}
                {e.email ? <div className="muted">{e.email}</div> : null}
                <div className="muted">Отдел: {e.dept || "Не указан"}</div>
              </div>

              <div className="muted" style={{ fontWeight: 900 }}>
                ›
              </div>
            </div>
          </Card>
        ))}
      </div>

      <button
        className="btn primary"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
      >
        + Добавить сотрудника
      </button>

      {open ? (
        <div className="modalBack" onMouseDown={() => !saving && setOpen(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalTitle">Добавить сотрудника</div>

            <div className="col" style={{ gap: 10 }}>
              <div>
                <Input
                  label="ФИО*"
                  placeholder="Иванов Иван Иванович"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
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
                  placeholder="+7 (___) ___-__-__"
                  value={form.phone}
                  onFocus={() => {
                    if (!form.phone) {
                      setForm((f) => ({ ...f, phone: "+7" }));
                    }
                  }}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      phone: formatPhone(e.target.value),
                    }));
                    if (phoneError) setPhoneError("");
                  }}
                  onBlur={() => {
                    if (form.phone === "+7") {
                      setForm((f) => ({ ...f, phone: "" }));
                    }
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
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />

              <Input
                label="Отдел"
                value={form.dept || departmentName || state.currentUser?.department || ""}
                disabled
              />
            </div>

            <div className="modalActions">
              <button
                className="btn"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Отмена
              </button>
              <button
                className="btn primary"
                onClick={addEmployee}
                disabled={saving}
              >
                {saving ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
