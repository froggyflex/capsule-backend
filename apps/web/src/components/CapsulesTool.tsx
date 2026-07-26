import { useEffect, useMemo, useRef, useState } from "react";
import type { Capsule } from "../contracts/capsule";
import { fetchCapsules } from "../api/capsules";
import CapsuleDetail from "./CapsuleDetail";
import CapsuleList from "./CapsuleList";

function useMedia(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

export default function CapsulesTool() {
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const lastPaste = useRef({ value: "", time: 0 });
  const isDesktop = useMedia("(min-width: 1024px)");
  const isMobile = useMedia("(max-width: 768px)");

  const refresh = async () => {
    const data = await fetchCapsules();
    setCapsules(data);
    if (data.length && isDesktop && !selectedId) setSelectedId(data[0]._id);
    return data;
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  };

  const createCapsule = async (payload: Capsule["payload"]) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/capsules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payload,
        source: { deviceId: "web", client: "web" },
      }),
    });
    if (!response.ok) throw new Error("Could not create capsule");
    await refresh();
    showToast("Captured");
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) return;

      const image = Array.from(event.clipboardData?.items ?? []).find((item) =>
        item.type.startsWith("image/"),
      );
      const file = image?.getAsFile();
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          void createCapsule({
            kind: "image",
            value: reader.result as string,
            meta: { mimeType: file.type, name: file.name || "clipboard-image.png", size: file.size },
          });
        };
        reader.readAsDataURL(file);
        return;
      }

      const text = event.clipboardData?.getData("text/plain")?.trim();
      if (!text) return;
      const now = Date.now();
      if (lastPaste.current.value === text && now - lastPaste.current.time < 2000) return;
      lastPaste.current = { value: text, time: now };

      let payload: Capsule["payload"];
      try {
        payload = { kind: "url", value: new URL(text).toString() };
      } catch {
        payload = { kind: "text", value: text };
      }
      void createCapsule(payload);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const selected = useMemo(
    () => capsules.find((capsule) => capsule._id === selectedId) ?? null,
    [capsules, selectedId],
  );

  const deleteCapsule = async (id: string) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/capsules/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) return;
    const updated = capsules.filter((capsule) => capsule._id !== id);
    setCapsules(updated);
    if (selectedId === id) setSelectedId(updated[0]?._id ?? null);
  };

  const pasteFromClipboard = async () => {
    const text = (await navigator.clipboard.readText()).trim();
    if (text) await createCapsule({ kind: "text", value: text });
  };

  return (
    <main className="capsules-workspace">
      <div className="section-heading">
        <div>
          <span className="section-kicker">CROSS-DEVICE CLIPBOARD</span>
          <h2>Your capsules</h2>
          <p>Paste anywhere on this page to capture text, links, or images.</p>
        </div>
        <button className="secondary-button" onClick={() => void refresh()}>Refresh</button>
      </div>

      <div className="capsule-grid">
        <section>
          <div className="capsule-count">{loading ? "Loading…" : `${capsules.length} capsules`}</div>
          <CapsuleList
            capsules={capsules}
            loading={loading}
            selectedId={selectedId}
            onSelect={(capsule) => setSelectedId(capsule._id)}
            isDesktop={isDesktop}
          />
        </section>
        <section>
          {selected ? (
            <CapsuleDetail capsule={selected} onDelete={() => void deleteCapsule(selected._id)} />
          ) : (
            <div className="empty-detail">Select a capsule to see its details.</div>
          )}
        </section>
      </div>

      {isMobile && (
        <button className="mobile-paste" onClick={() => void pasteFromClipboard()}>
          Paste from clipboard
        </button>
      )}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
