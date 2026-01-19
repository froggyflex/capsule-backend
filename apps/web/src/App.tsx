import CapsuleDetail from "./components/CapsuleDetail";
import { useEffect, useMemo, useState } from "react";
import type { Capsule } from "./contracts/capsule";
import { fetchCapsules } from "./api/capsules";
import CapsuleList from "./components/CapsuleList";




function useIsDesktop(breakpointPx = 1024) {  
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(min-width: ${breakpointPx}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpointPx}px)`);
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpointPx]);

  return isDesktop;
}

function useIsMobile(maxWidthPx = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${maxWidthPx}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [maxWidthPx]);

  return isMobile;
}



 
export default function App() {
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isMobile = useIsMobile(768);
  const isDesktop = useIsDesktop(1024);
  const [toast, setToast] = useState<{
    message: string;
    type?: "success" | "error";
  }  | null>(null);


  useEffect(() => {
  function onPaste(e: ClipboardEvent) {
    const target = e.target as HTMLElement;

    // 🚫 don't hijack paste inside inputs
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    const items = e.clipboardData?.items;
    if (!items) return;

    // 1️⃣ Try image first
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          handleImagePaste(file);
          return;
        }
      }
    }

  // 2️⃣ Fallback to text
  const text = e.clipboardData?.getData("text/plain");
  if (text) {
    handlePaste(text);
  }
}

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);


  useEffect(() => {
    fetchCapsules()
      .then(data => {
        setCapsules(data);
        // auto-select newest on desktop for immediate detail view
        if (data.length && !selectedId && isDesktop) {
          setSelectedId(data[0]._id);
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop]);

  const selected = useMemo(
    () => capsules.find(c => c._id === selectedId) ?? null,
    [capsules, selectedId]
  );

function handleImagePaste(file: File) {
  const reader = new FileReader();

  reader.onload = async () => {
    const base64 = reader.result as string;

    await fetch(`${import.meta.env.VITE_API_URL}/capsules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payload: {
          kind: "image",
          value: base64,
          meta: {
            mimeType: file.type,
            name: "clipboard-image.png",
            size: file.size,
          },
        },
        source: {
          deviceId: "web",
          client: "web",
        },
      }),
    });

    await fetchCapsules();
    showToast("Image captured ✓");
  };

  reader.readAsDataURL(file);
}

function classifyPaste(text: string) {
  try {
    const url = new URL(text);
    return { kind: "url" as const, value: url.toString() };
  } catch {
    return { kind: "text" as const, value: text };
  }
}
function onPaste(e: ClipboardEvent) {
  const target = e.target as HTMLElement;

  if (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  ) {
    return;
  }

  const text = e.clipboardData?.getData("text/plain");
  if (!text) return;

  handlePaste(text);
}

  let lastPaste = "";
  let lastTime = 0;
  async function handlePaste(text: string) {
    let payload;

    const now = Date.now();
    if (text === lastPaste && now - lastTime < 2000) return;

    lastPaste = text;
    lastTime = now;

    try {
      const url = new URL(text);
      payload = { kind: "url", value: url.toString() };
    } catch {
      payload = { kind: "text", value: text };
    }

    await fetch(`${import.meta.env.VITE_API_URL}/capsules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payload,
        source: {
          deviceId: "web",
          client: "web",
        },
      }),
    });

    await fetchCapsules();  
    showToast("Captured ✓");
  }
      async function pasteFromClipboard() {
      try {
        const text = await navigator.clipboard.readText();
        if (!text || !text.trim()) return;

        await fetch(`${import.meta.env.VITE_API_URL}/capsules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payload: {
              kind: "text",
              value: text
            },
            source: {
              deviceId: "phone",
              client: "web"
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1
          })
        });

        const data = await fetchCapsules();
        setCapsules(data);
      } catch (err) {
        console.error("Clipboard paste failed", err);
      }
    }
  
  function showToast(
    message: string,
    type: "success" | "error" = "success",
    duration = 1500
  ) {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }

async function deleteCapsule(id: string) {
   console.log("DELETE CLICKED WITH ID:", id);
  const res = await fetch(`${import.meta.env.VITE_API_URL}/capsules/${id}`, {
    method: "DELETE"
  });

  if (!res.ok) {
    console.error("Failed to delete capsule", id);
    return;
  }

  const updated = capsules.filter(c => c._id !== id);
  setCapsules(updated);

  if (selectedId === id) {
    setSelectedId(updated.length ? updated[0]._id : null);
  }
}


  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "18px 16px 6px",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12
        }}
      >
    
        <div>

          <div style={{ fontSize: 20, fontWeight: 700 }}>Capsules</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Capture on one device, use on another
          </div>
        </div>

        <button
          onClick={async () => {
            setLoading(true);
            const data = await fetchCapsules();
            setCapsules(data);
            if (data.length && isDesktop) setSelectedId(data[0]._id);
            setLoading(false);
          }}
          style={{
            border: "1px solid var(--card-border)",
            background: "rgba(255,255,255,0.06)",
            color: "var(--text)",
            padding: "8px 12px",
            borderRadius: 10,
            cursor: "pointer"
          }}
        >
          Refresh
        </button>
      </header>

      {/* Workspace */}
      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "12px 16px 18px",
          display: isDesktop ? "grid" : "block",
          gridTemplateColumns: isDesktop ? "380px 1fr" : undefined,
          gap: isDesktop ? 18 : undefined
        }}
      >
        {isMobile && (
          <button
            onClick={pasteFromClipboard}
            style={{
              position: "fixed",
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,

              borderRadius: 999,
              padding: "14px 18px",
              fontSize: 14,
              fontWeight: 600,

              background: "rgba(99,102,241,0.95)",
              color: "#fff",
              border: "none",

              boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
              cursor: "pointer"
            }}
          >
            Paste from clipboard
          </button>
        )}

        {/* Left pane */}
        <section
          style={{
            borderRight: isDesktop ? "1px solid rgba(255,255,255,0.08)" : "none",
            paddingRight: isDesktop ? 12 : 0
          }}
        >
          <div style={{ marginBottom: 10, color: "var(--muted)", fontSize: 12 }}>
            {loading ? "Loading…" : `${capsules.length} capsules`}
          </div>

          <CapsuleList
            capsules={capsules}
            loading={loading}
            selectedId={selectedId}
            onSelect={c => setSelectedId(c._id)}
            isDesktop={isDesktop}
          />
        </section>

        {/* Right pane */}
        <section style={{ paddingLeft: isDesktop ? 6 : 0, marginTop: isDesktop ? 0 : 14 }}>
          {isDesktop ? (
            selected ? (
              <CapsuleDetail capsule={selected} 
               onDelete={() => deleteCapsule(selected._id)}
               />
            ) : (
              <div
                style={{
                  border: "1px solid var(--card-border)",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 16,
                  padding: 18,
                  color: "var(--muted)"
                }}
              >
                Select a capsule on the left to see details here.
              </div>
            )
          ) : selected ? (
            // Mobile: show detail below list after selecting
            <CapsuleDetail 
             capsule={selected}
             onDelete={() => deleteCapsule(selected._id)}

            />
          ) : null}
        </section>
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "10px 14px",
            borderRadius: 12,
            background:
              toast.type === "error"
                ? "rgba(239,68,68,0.15)"
                : "rgba(34,197,94,0.15)",
            color:
              toast.type === "error"
                ? "#fecaca"
                : "#bbf7d0",
            border:
              toast.type === "error"
                ? "1px solid rgba(239,68,68,0.4)"
                : "1px solid rgba(34,197,94,0.4)",
            backdropFilter: "blur(6px)",
            fontSize: 13,
            zIndex: 9999,
          }}
        >
          {toast.message}
        </div>
      )}
      </main>


    </div>
  );
}
