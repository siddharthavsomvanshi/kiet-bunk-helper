import React, { useEffect, useState } from "react";

export interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  name?: string;
  contributions?: number;
  role?: string;
}

export const FOUNDERS: Contributor[] = [
  {
    login: "siddharthavsomvanshi",
    name: "Siddhartha V. Somvanshi",
    avatar_url: "https://github.com/siddharthavsomvanshi.png",
    html_url: "https://github.com/siddharthavsomvanshi",
    role: "Founder & Core Lead",
  },
];

export const PROJECT_LEADS: Contributor[] = [
  {
    login: "vanshsrivastava14",
    name: "Vansh Srivastava",
    avatar_url: "https://github.com/vanshsrivastava14.png",
    html_url: "https://github.com/vanshsrivastava14",
    role: "Project Lead",
  },
];

export const STATIC_CO_FOUNDERS: Contributor[] = [
  {
    login: "tarun1899",
    name: "tarun1899",
    avatar_url: "https://github.com/tarun1899.png",
    html_url: "https://github.com/tarun1899",
    role: "Co-Founder",
  },
  {
    login: "chetan78999",
    name: "yaman",
    avatar_url: "https://github.com/chetan78999.png",
    html_url: "https://github.com/chetan78999",
    role: "Co-Founder",
  },
];

export function FooterCollaborators() {
  const [coFounders, setCoFounders] = useState<Contributor[]>(STATIC_CO_FOUNDERS);

  useEffect(() => {
    let isMounted = true;
    async function fetchContributors() {
      try {
        const res = await fetch(
          "https://api.github.com/repos/siddharthavsomvanshi/kiet-bunk-helper/contributors"
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && isMounted) {
            const apiList: Contributor[] = data
              .filter(
                (item: any) =>
                  item.login &&
                  !item.login.toLowerCase().includes("vercel") &&
                  !item.login.toLowerCase().includes("[bot]")
              )
              .map((item: any) => ({
                login: item.login,
                avatar_url: item.avatar_url,
                html_url: item.html_url,
                contributions: item.contributions,
                role: "Co-Founder",
              }));

            // Merge static list with API list to ensure no duplicates
            const combinedMap = new Map<string, Contributor>();
            [...STATIC_CO_FOUNDERS, ...apiList].forEach((c) => {
              const key = c.login.toLowerCase();
              if (!combinedMap.has(key)) {
                combinedMap.set(key, c);
              } else {
                const existing = combinedMap.get(key)!;
                combinedMap.set(key, { ...existing, ...c });
              }
            });

            setCoFounders(Array.from(combinedMap.values()));
          }
        }
      } catch (err) {
        console.warn("Could not fetch GitHub contributors dynamically:", err);
      }
    }

    fetchContributors();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter out main founder, project lead, and vercel/bot accounts from co-founders list
  const nonMainFounders = coFounders.filter(
    (c) =>
      !FOUNDERS.some((f) => f.login.toLowerCase() === c.login.toLowerCase()) &&
      !PROJECT_LEADS.some((p) => p.login.toLowerCase() === c.login.toLowerCase()) &&
      !c.login.toLowerCase().includes("vercel") &&
      !c.login.toLowerCase().includes("[bot]")
  );

  return (
    <div
      style={{
        paddingTop: 14,
        paddingBottom: 4,
        borderTop: "1px solid var(--border)",
        display: "grid",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        {/* Main Founder */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-muted)",
            }}
          >
            Founder:
          </span>
          {FOUNDERS.map((founder) => (
            <a
              key={founder.login}
              href={founder.html_url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 12px 5px 6px",
                borderRadius: 20,
                background: "var(--bg-section)",
                border: "1px solid var(--border)",
                textDecoration: "none",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
              title={`${founder.name || founder.login} (${founder.role || "Founder"})`}
            >
              <img
                src={founder.avatar_url}
                alt={founder.login}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "1.5px solid var(--primary)",
                }}
              />
              <span>@{founder.login}</span>
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 7px",
                  borderRadius: 10,
                  background: "var(--primary-soft)",
                  color: "var(--primary)",
                  fontWeight: 700,
                }}
              >
                Founder
              </span>
            </a>
          ))}
        </div>

        {/* Project Lead */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-muted)",
            }}
          >
            Project Lead:
          </span>
          {PROJECT_LEADS.map((lead) => (
            <a
              key={lead.login}
              href={lead.html_url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 12px 5px 6px",
                borderRadius: 20,
                background: "var(--bg-section)",
                border: "1px solid var(--border)",
                textDecoration: "none",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
              title={`${lead.name || lead.login} (${lead.role || "Project Lead"})`}
            >
              <img
                src={lead.avatar_url}
                alt={lead.login}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "1.5px solid var(--info)",
                }}
              />
              <span>@{lead.login}</span>
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 7px",
                  borderRadius: 10,
                  background: "var(--info-soft)",
                  color: "var(--info)",
                  fontWeight: 700,
                }}
              >
                Project Lead
              </span>
            </a>
          ))}
        </div>

        {/* Co-Founders */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-muted)",
            }}
          >
            Co-Founders:
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {nonMainFounders.map((c) => (
              <a
                key={c.login}
                href={c.html_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px 4px 5px",
                  borderRadius: 20,
                  background: "var(--bg-card-subtle)",
                  border: "1px solid var(--border)",
                  textDecoration: "none",
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  fontWeight: 500,
                  transition: "all 0.15s ease",
                }}
                title={`@${c.login}${c.name ? ` (${c.name})` : ""} • Co-Founder`}
              >
                <img
                  src={c.avatar_url}
                  alt={c.login}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
                <span>@{c.login}</span>
                {c.name && c.name !== c.login && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>({c.name})</span>
                )}
              </a>
            ))}

            <a
              href="https://github.com/siddharthavsomvanshi/kiet-bunk-helper/graphs/contributors"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 12px",
                borderRadius: 20,
                background: "transparent",
                border: "1px dashed var(--border-strong)",
                textDecoration: "none",
                color: "var(--primary)",
                fontSize: 12,
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
            >
              <span>+ Join & Contribute</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
