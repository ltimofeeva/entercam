import React, { useEffect } from "react";

export default function Modal({ open, title, children, actions, onClose }) {
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modalBack" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        {title ? <div className="modalTitle">{title}</div> : null}
        {children}
        {actions ? <div className="modalActions">{actions}</div> : null}
      </div>
    </div>
  );
}
