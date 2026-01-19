import type { Capsule } from "../contracts/capsule";
 
function formatTime(ts: number) {
  return new Date(ts).toLocaleString();
}

export default function CapsuleDetail({ capsule, onDelete }: { capsule: Capsule, onDelete: () => void; }) {
  const kind = capsule.payload.kind;
  const value = capsule.payload.value;
 
  return (
    <div
      style={{
        border: "1px solid var(--card-border)",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 18,
        padding: 18,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: "0 26px 70px rgba(0,0,0,0.35)"
      }}
    >
        {capsule.payload.kind === "url" && 
         capsule.payload.meta?.previewImage && (
            <div
                style={{
                width: "100%",
                height: 160,
                borderRadius: 14,
                overflow: "hidden",
                marginBottom: 16,
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.08)"
                }}
            >
                <img
                src={capsule.payload.meta.previewImage}
                alt=""
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                }}
                />
            </div>
        )}
    
    

      {/* ---------- HEADER ---------- */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          {kind === "url"
            ? "Link capsule"
            : kind === "text"
            ? "Text capsule"
            : "File capsule"}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          {formatTime(capsule.createdAt)} · {capsule.source.client}
        </div>
      </div>

      {/* ---------- CONTENT ---------- */}
      <div style={{ marginTop: 14 }}>

        {/* IMAGE CAPSULE */}
        {capsule.payload.kind === "image" && (
          <img
            src={capsule.payload.value}
            style={{
              maxWidth: "100%",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
        )}
        {/* URL CAPSULE */}
        {kind === "url" && typeof value === "string" && (
          <>
            <div
              style={{
                fontSize: 18,
                fontWeight: 750,
                marginBottom: 8
              }}
            >
              {capsule.payload.meta?.title ?? "Untitled link"}
            </div>

            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "var(--url)",
                textDecoration: "none",
                wordBreak: "break-all",
                fontSize: 13
              }}
            >
              {value}
            </a>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 10,
                flexWrap: "wrap"
              }}
            >
              <button
                onClick={() => navigator.clipboard.writeText(value)}
                style={{
                  border: "1px solid var(--card-border)",
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text)",
                  padding: "8px 10px",
                  borderRadius: 10,
                  cursor: "pointer"
                }}
              >
                Copy URL
              </button>

              <button
                onClick={() => window.open(value, "_blank")}
                style={{
                  border: "1px solid var(--card-border)",
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text)",
                  padding: "8px 10px",
                  borderRadius: 10,
                  cursor: "pointer"
                }}
              >
                Open
              </button>
            </div>
          </>
        )}

        {/* TEXT CAPSULE */}
        {kind === "text" && typeof value === "string" && (
          <>
            <div
              style={{
                fontSize: 13,
                color: "var(--muted)",
                marginBottom: 10
              }}
            >
              Captured text
            </div>

            <div
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.55,
                fontSize: 14
              }}
            >
              {value}
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => navigator.clipboard.writeText(value)}
                style={{
                  border: "1px solid var(--card-border)",
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text)",
                  padding: "8px 10px",
                  borderRadius: 10,
                  cursor: "pointer"
                }}
              >
                Copy text
              </button>
            </div>
          </>
        )}

        {/* FILE CAPSULE (SAFE PLACEHOLDER) */}
        {kind === "file" && (
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            File capsules are not yet supported in the UI.
          </div>
        )}
      </div>

            <div
        style={{
            pointerEvents: "auto",
            position: "relative",
            zIndex: 10000
        }}
        >
            <button
            onClick={() => {
             
            onDelete();
            }}
            style={{
                marginTop: 16,
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid rgba(239,68,68,0.4)",
                background: "rgba(239,68,68,0.12)",
                color: "#fecaca",
                cursor: "pointer",
                fontSize: 13
            }}
            >
            Delete capsule
            </button>
        </div>
      {/* ---------- FOOTER META ---------- */}
      <div
        style={{
          marginTop: 18,
          paddingTop: 12,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          fontSize: 12,
          color: "var(--muted)"
        }}
      >
        <div>
          <strong style={{ color: "var(--text)" }}>Type:</strong>{" "}
          {kind}
        </div>
        <div>
          <strong style={{ color: "var(--text)" }}>Version:</strong>{" "}
          {capsule.version}
        </div>
        <div>
          <strong style={{ color: "var(--text)" }}>Device:</strong>{" "}
          {capsule.source.deviceId}
        </div>
      </div>
    </div>
  );
}
