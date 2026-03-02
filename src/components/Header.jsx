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

      {subtitle && (
        <div className="header-sub">
          {subtitle.fio && (
            <div className="header-user">{subtitle.fio}</div>
          )}
          {subtitle.department && (
            <div className="header-dept">{subtitle.department}</div>
          )}
          {subtitle.single && (
            <div className="header-single">{subtitle.single}</div>
          )}
        </div>
      )}
    </div>
  );
}
