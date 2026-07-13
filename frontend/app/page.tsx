import { getApiHealth } from "@/lib/api";

export default async function Home() {
  const health = await getApiHealth();
  const apiOnline = health?.status === "ok";

  return (
    <main style={{
      minHeight: "100vh",
      backgroundColor: "#f9fafb",
      fontFamily: "Inter, system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
    }}>

      <div style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "3rem 3.5rem",
        maxWidth: "600px",
        width: "100%",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
      }}>

        {/* Logo / Icon */}
        <div style={{
          width: "48px",
          height: "48px",
          backgroundColor: "#1d4ed8",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1.5rem",
        }}>
          <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>

        {/* Institution */}
        <p style={{
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "#6b7280",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: "0.5rem",
        }}>
          Faculté des Sciences et Techniques — Mohammedia
        </p>

        {/* Title */}
        <h1 style={{
          fontSize: "1.75rem",
          fontWeight: 700,
          color: "#111827",
          margin: "0 0 0.75rem 0",
          lineHeight: 1.3,
        }}>
          Système de Gestion RH
        </h1>

        {/* Description */}
        <p style={{
          fontSize: "0.95rem",
          color: "#6b7280",
          lineHeight: 1.7,
          margin: "0 0 2rem 0",
        }}>
          Plateforme de gestion des ressources humaines pour les professeurs
          et les employés administratifs de la FST Mohammedia.
        </p>

        {/* Divider */}
        <div style={{ height: "1px", backgroundColor: "#f3f4f6", marginBottom: "1.5rem" }} />

        {/* Stack */}
        <div style={{ marginBottom: "2rem" }}>
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.75rem", fontWeight: 500 }}>
            STACK TECHNIQUE
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {["Laravel 11", "Next.js 16", "MySQL 8", "Docker"].map((tech) => (
              <span key={tech} style={{
                fontSize: "0.8rem",
                color: "#374151",
                backgroundColor: "#f3f4f6",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                padding: "0.25rem 0.75rem",
                fontWeight: 500,
              }}>
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* API Status */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.75rem 1rem",
          backgroundColor: apiOnline ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${apiOnline ? "#bbf7d0" : "#fecaca"}`,
          borderRadius: "8px",
        }}>
          <div style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: apiOnline ? "#16a34a" : "#dc2626",
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: "0.85rem",
            color: apiOnline ? "#15803d" : "#dc2626",
            fontWeight: 500,
          }}>
            API {apiOnline ? "connectée et opérationnelle" : "non disponible"}
          </span>
        </div>

      </div>

      {/* Footer */}
      <p style={{
        marginTop: "2rem",
        fontSize: "0.75rem",
        color: "#9ca3af",
      }}>
        FST Mohammedia — {new Date().getFullYear()}
      </p>

    </main>
  );
}
