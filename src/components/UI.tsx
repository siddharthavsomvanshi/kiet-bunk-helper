import React, { ReactNode, useEffect, useId } from "react";

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

export function OverlayDialog({
  title,
  subtitle,
  children,
  onClose,
  headerAction,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  headerAction?: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="overlay-dialog-backdrop" onClick={onClose}>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="overlay-dialog-panel rise-in"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="overlay-dialog-header">
          <div style={{ minWidth: 0 }}>
            <h2 className="panel-title overlay-dialog-title" id={titleId}>
              {title}
            </h2>
            {subtitle && <p className="panel-subtitle overlay-dialog-subtitle">{subtitle}</p>}
          </div>

          <div className="overlay-dialog-actions">
            {headerAction}
            <button
              aria-label="Close dialog"
              className="action-button action-button--secondary overlay-dialog-close"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        </div>

        <div className="overlay-dialog-body">{children}</div>
      </div>
    </div>
  );
}
