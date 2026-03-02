import React from "react";
import Card from "../components/Card.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function Gate({ state, allowExit }) {
  const feed = state.gateFeed ?? [];

  if (feed.length === 0) {
    return (
      <div className="content">
        <EmptyState title="Событий у ворот нет" hint="Когда подключим Entercam — тут появятся машины у шлагбаума." />
      </div>
    );
  }

  return (
    <div className="content">
      <div className="list">
        {feed.map((ev) => (
          <Card key={ev.id}>
            <div className="row">
              <div className="col">
                <div className="big">{ev.plate}</div>
                <div className="muted">{ev.label}</div>
                <div className="muted">{ev.time} • {ev.status === "allowed" ? "Выезд разрешён" : "У ворот"}</div>
              </div>
              <button
                className="btn primary"
                disabled={ev.status === "allowed"}
                onClick={() => allowExit(ev.plate)}
              >
                Разрешить выезд
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
