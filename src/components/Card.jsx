import React from "react";

export default function Card({ children, onClick }) {
  return (
    <div className="card" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      {children}
    </div>
  );
}
