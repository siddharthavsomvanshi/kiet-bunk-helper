import React, { ReactNode } from "react";

export function Panel({
  title,
  subtitle,
  children,
  headerAction,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  headerAction?: ReactNode;
}) {
  return (
    <section
      className="premium-panel rise-in"
      style={{
        padding: 20,
        borderRadius: 28,
        background: "rgba(255, 255, 255, 0.90)",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        boxShadow: "0 24px 70px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h2 className="panel-title" style={{ margin: "0 0 6px", fontSize: 22 }}>
            {title}
          </h2>
          <p className="panel-subtitle" style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
            {subtitle}
          </p>
        </div>
        {headerAction && <div style={{ flexShrink: 0 }}>{headerAction}</div>}
      </div>
      {children}
    </section>
  );
}

export function EmptyMessage({ message }: { message: string }) {
  return (
    <div
      className="empty-state"
      style={{
        padding: 18,
        borderRadius: 22,
        border: "1px dashed rgba(100, 116, 139, 0.5)",
        color: "#64748b",
        background: "rgba(248, 250, 252, 0.85)",
      }}
    >
      {message}
    </div>
  );
}
