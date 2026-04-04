<div
  style={{
    display: "flex",
    gap: 8,
    marginBottom: 12,
  }}
>
  <button
    className={`btn ${activeTab === "active" ? "primary" : ""}`}
    onClick={() => setActiveTab("active")}
    disabled={saving}
    style={{ flex: 1 }}
  >
    Активные
  </button>

  <button
    className={`btn ${activeTab === "inactive" ? "primary" : ""}`}
    onClick={() => setActiveTab("inactive")}
    disabled={saving}
    style={{ flex: 1 }}
  >
    Неактивные
  </button>
</div>
