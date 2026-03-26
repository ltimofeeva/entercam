import React from "react";

const tabs = [
  { key: "employees", label: "Сотрудники", icon: "👤" },
  { key: "guests", label: "Гости", icon: "🚗" }
];

export default function BottomNav({ active, onChange }) {
  return (
    <div className="nav">
      <div className="navwrap">
        {tabs.map((t) => (
          <div
            key={t.key}
            className={`tab ${active === t.key ? "active" : ""}`}
            onClick={() => onChange(t.key)}
            role="button"
          >
            <div className="icon">{t.icon}</div>
            {t.label}
          </div>
        ))}
      </div>
    </div>
  );
}
