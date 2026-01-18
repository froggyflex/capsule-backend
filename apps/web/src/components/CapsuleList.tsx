import type { Capsule } from "@capsule/contract";

const TEXT_PREVIEW_LIMIT = 160;

function isLongText(text: string) {
  return text.length > TEXT_PREVIEW_LIMIT;
}

function previewText(text: string) {
  return text.slice(0, TEXT_PREVIEW_LIMIT) + "…";
}

function CapsuleIcon({ kind }: { kind: string }) {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        fontSize: 16,
        borderRadius: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.06)",
        color: "var(--muted)",
        flexShrink: 0
      }}
    >
      {kind === "url" && "🔗"}
      {kind === "text" && "✍️"}
      {kind === "file" && "📎"}
    </div>
  );
}

function typeColor(kind: string) {
  return kind === "url"
    ? "var(--url)"
    : kind === "text"
    ? "var(--textCapsule)"
    : "var(--file)";
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString();
}

export default function CapsuleList({
  capsules,
  loading,
  selectedId,
  onSelect,
  isDesktop
}: {
  capsules: Capsule[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (capsule: Capsule) => void;
  isDesktop: boolean;
}) {
  if (loading) {
    return (
      <div
        style={{
          border: "1px solid var(--card-border)",
          background: "rgba(255,255,255,0.04)",
          borderRadius: 16,
          padding: 14,
          color: "var(--muted)"
        }}
      >
        Loading…
      </div>
    );
  }

  if (!capsules.length) {
    return (
      <div
        style={{
          border: "1px solid var(--card-border)",
          background: "rgba(255,255,255,0.04)",
          borderRadius: 16,
          padding: 14,
          color: "var(--muted)"
        }}
      >
        No capsules yet. Send one from the extension.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {capsules.map(c => {
        const active = selectedId === c._id;
        const value = c.payload.value;

        return (
          <div
            key={c._id}
            onClick={() => onSelect(c)}
            style={{
              display: "flex",
              gap: 12,
              padding: "12px 14px",

              background: active
                ? "rgba(255,255,255,0.10)"
                : "var(--card)",
              borderRadius: "999px 18px 18px 999px",
              border: active
                ? "1px solid rgba(255,255,255,0.16)"
                : "1px solid var(--card-border)",
              borderLeft: `4px solid ${typeColor(c.payload.kind)}`,

              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",

              boxShadow: active
                ? "0 24px 50px rgba(0,0,0,0.45)"
                : "0 16px 36px rgba(0,0,0,0.30)",

              cursor: "pointer",
              transition: "transform 0.12s ease, box-shadow 0.12s ease",
              transform: active ? "translateY(-1px)" : "translateY(0)"
            }}
          >
            <CapsuleIcon kind={c.payload.kind} />

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* ---------- URL CAPSULE ---------- */}
              {c.payload.kind === "url" && (
                <div
                  style={{
                    fontWeight: 650,
                    fontSize: 14,
                    color: "var(--text)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {c.payload.meta?.title ??
                    (typeof value === "string" ? value : "")}
                </div>
              )}

              {/* ---------- TEXT CAPSULE ---------- */}
              {c.payload.kind === "text" &&
                typeof value === "string" && (
                  <div
                    style={{
                      fontSize: 13.5,
                      lineHeight: 1.4,
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {isLongText(value) ? previewText(value) : value}
                  </div>
                )}

              {/* ---------- META ---------- */}
              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  letterSpacing: "0.04em",
                  color: "var(--muted)",
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap"
                }}
              >
                <span>{formatTime(c.createdAt)}</span>
                <span>·</span>
                <span>{c.source.client}</span>
                {isDesktop && (
                  <>
                    <span>·</span>
                    <span>{c.payload.kind.toUpperCase()}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
