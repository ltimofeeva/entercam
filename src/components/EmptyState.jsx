import React from "react";

export default function EmptyState({ title, hint, action }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <div className="big">{title}</div>
      {hint ? <div className="muted" style={{ marginTop: 6 }}>{hint}</div> : null}
      {action ? <div style={{ marginTop: 12 }}>{action}</div> : null}
    </div>
  );
}
