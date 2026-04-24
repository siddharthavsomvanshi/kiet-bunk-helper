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
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="panel-header" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h2 className="panel-title" style={{ margin: "0 0 6px", fontSize: 22 }}>
            {title}
          </h2>
          <p className="panel-subtitle" style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>
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
        border: "1px dashed var(--border-strong)",
        color: "var(--text-muted)",
        background: "var(--bg-card-subtle)",
      }}
    >
      {message}
    </div>
  );
}
