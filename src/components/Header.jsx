import React from "react";

export default function Header({ title, subtitle, left, right }) {
  return (
    <div className="header">
      <div className="hrow">
        <div className="row" style={{ gap: 10 }}>
          {left}
          <div className="htitle">{title}</div>
        </div>
        {right}
      </div>
      {subtitle ? <div className="hsub">{subtitle}</div> : null}
    </div>
  );
}
