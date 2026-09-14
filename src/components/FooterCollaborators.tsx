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

export const STATIC_COLLABORATORS: Contributor[] = [
  {
    login: "tarun1899",
    name: "tarun1899",
    avatar_url: "https://github.com/tarun1899.png",
    html_url: "https://github.com/tarun1899",
    role: "Collaborator",
  },
  {
    login: "chetan78999",
    name: "yaman",
    avatar_url: "https://github.com/chetan78999.png",
    html_url: "https://github.com/chetan78999",
    role: "Collaborator",
  },
];

export function FooterCollaborators() {
  const [collaborators, setCollaborators] = useState<Contributor[]>(STATIC_COLLABORATORS);

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
            const apiList: Contributor[] = data.map((item: any) => ({
              login: item.login,
              avatar_url: item.avatar_url,
              html_url: item.html_url,
              contributions: item.contributions,
            }));

            // Merge static list with API list to ensure no duplicates
            const combinedMap = new Map<string, Contributor>();
            [...STATIC_COLLABORATORS, ...apiList].forEach((c) => {
              const key = c.login.toLowerCase();
              if (!combinedMap.has(key)) {
                combinedMap.set(key, c);
              } else {
                // Merge extra details like contributions if present
                const existing = combinedMap.get(key)!;
                combinedMap.set(key, { ...existing, ...c });
              }
            });

            setCollaborators(Array.from(combinedMap.values()));
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

  // Filter out founders from collaborators display list to avoid duplicate chips
  const nonFounderCollaborators = collaborators.filter(
    (c) => !FOUNDERS.some((f) => f.login.toLowerCase() === c.login.toLowerCase())
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
        {/* Founders */}
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

        {/* Collaborators */}
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
            Collaborators:
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {nonFounderCollaborators.map((c) => (
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
                title={`@${c.login}${c.name ? ` (${c.name})` : ""}${
                  c.contributions ? ` • ${c.contributions} contributions` : ""
                }`}
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
