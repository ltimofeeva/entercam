import React from "react";

export default function Input({ label, ...props }) {
  return (
    <div className="col" style={{ gap: 6 }}>
      {label ? <div className="muted" style={{ fontWeight: 800 }}>{label}</div> : null}
      <input className="input" {...props} />
    </div>
  );
}
