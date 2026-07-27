import { useEffect, useRef, useState } from "react";
import { createWorker, PSM } from "tesseract.js";
import { delayRowsToTsv, parseDelayOcrText, type DelayRow } from "../delayExtraction";

type Status = "idle" | "reading" | "ready" | "error";

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16v14H4zM7 15l3-3 2 2 2-2 3 3M9 9h.01" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 8h11v11H8zM5 15H4V4h11v1" />
    </svg>
  );
}

function emptyRows(): DelayRow[] {
  return [];
}

async function preprocessForOcr(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.max(2, Math.min(4, 1800 / bitmap.width));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is unavailable");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let offset = 0; offset < image.data.length; offset += 4) {
    const red = image.data[offset];
    const green = image.data[offset + 1];
    const blue = image.data[offset + 2];
    const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
    const isDelayRed = red > 120 && red - green > 45 && red - blue > 45;
    const isDarkNeutral = Math.max(red, green, blue) - Math.min(red, green, blue) < 35 && luminance < 165;
    const value = isDelayRed || isDarkNeutral ? 0 : 255;
    image.data[offset] = value;
    image.data[offset + 1] = value;
    image.data[offset + 2] = value;
    image.data[offset + 3] = 255;
  }
  context.putImageData(image, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Image preprocessing failed")), "image/png");
  });
}

export default function DelayExtractorTool() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<DelayRow[]>(emptyRows);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Paste, drop, or choose a screenshot");
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const extractImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setStatus("error");
      setMessage("Please choose an image file.");
      return;
    }

    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setFileName(file.name || "Pasted screenshot");
    setRows([]);
    setStatus("reading");
    setProgress(0);
    setMessage("Preparing OCR…");

    try {
      const preparedImage = await preprocessForOcr(file);
      const worker = await createWorker("eng", 1, {
        logger: (event) => {
          if (typeof event.progress === "number") setProgress(Math.round(event.progress * 100));
          if (event.status) setMessage(event.status.replaceAll("_", " "));
        },
      });
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        tessedit_char_whitelist: "LS0123456789 ",
        preserve_interword_spaces: "1",
      });
      const result = await worker.recognize(preparedImage);
      await worker.terminate();
      const extracted = parseDelayOcrText(result.data.text);
      setRows(extracted);
      setStatus(extracted.length ? "ready" : "error");
      setMessage(
        extracted.length
          ? `${extracted.length} delay row${extracted.length === 1 ? "" : "s"} extracted`
          : "No delay rows were recognized. Try a tighter, clearer crop.",
      );
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage("The screenshot could not be read. Check your connection and try again.");
    }
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.items ?? [])
        .find((item) => item.type.startsWith("image/"))
        ?.getAsFile();
      if (file) {
        event.preventDefault();
        void extractImage(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // imageUrl is intentionally read only when a new image replaces it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  const updateCell = (rowIndex: number, delayIndex: number, field: "code" | "time", value: string) => {
    setRows((current) => current.map((row, currentRow) => {
      if (currentRow !== rowIndex) return row;
      const delays = row.delays.map((delay, currentDelay) =>
        currentDelay === delayIndex ? { ...delay, [field]: value } : delay,
      ) as DelayRow["delays"];
      return { ...row, delays };
    }));
  };

  const copy = async (includeHeaders: boolean) => {
    await navigator.clipboard.writeText(delayRowsToTsv(rows, includeHeaders));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="delay-workspace">
      <section className="flight-hero">
        <div>
          <span className="section-kicker">SCREENSHOT TO CELLS</span>
          <h2>Turn delay screenshots into paste-ready rows.</h2>
          <p>Paste a Flight Delay screenshot anywhere on this page. The delay codes and minutes are read, normalized, and placed into the eight-column layout used by your sheet.</p>
        </div>
        <div className="hero-stat">
          <strong>{rows.length}</strong>
          <span>rows extracted</span>
        </div>
      </section>

      <div className="delay-layout">
        <section
          className={`drop-card panel ${status === "reading" ? "is-reading" : ""}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (file) void extractImage(file);
          }}
        >
          <div className="panel-heading">
            <div>
              <span className="step-number">01</span>
              <div>
                <h3>Add screenshot</h3>
                <p>Paste directly, drag it here, or choose a PNG/JPG.</p>
              </div>
            </div>
            <button className="text-button" onClick={() => fileInput.current?.click()}>
              <ImageIcon /> Choose image
            </button>
            <input
              ref={fileInput}
              hidden
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void extractImage(file);
              }}
            />
          </div>

          <div className="drop-zone">
            {imageUrl ? (
              <img src={imageUrl} alt="Delay screenshot preview" />
            ) : (
              <div className="drop-placeholder">
                <span><ImageIcon /></span>
                <strong>Paste your delay screenshot</strong>
                <small>Use Ctrl+V, or drop the image here</small>
              </div>
            )}
            {status === "reading" && (
              <div className="ocr-overlay">
                <strong>Reading screenshot…</strong>
                <span>{message}</span>
                <div><i style={{ width: `${progress}%` }} /></div>
              </div>
            )}
          </div>
          <div className={`ocr-status ${status}`}>
            <i />
            <span>{message}</span>
            {fileName && <small>{fileName}</small>}
          </div>
        </section>

        <section className="delay-table-card panel">
          <div className="panel-heading">
            <div>
              <span className="step-number">02</span>
              <div>
                <h3>Check and copy</h3>
                <p>Every extracted cell stays editable before copying.</p>
              </div>
            </div>
            <button className="text-button" disabled={!rows.length} onClick={() => void copy(true)}>
              Copy with headers
            </button>
          </div>

          <div className="delay-sheet-wrap">
            {rows.length ? (
              <table className="delay-table">
                <thead>
                  <tr>
                    {[1, 2, 3, 4].map((number) => <th colSpan={2} key={number}>DELAY {number}</th>)}
                  </tr>
                  <tr>
                    {[1, 2, 3, 4].flatMap((number) => [
                      <th key={`${number}-code`}>Code</th>,
                      <th key={`${number}-time`}>Time</th>,
                    ])}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={row.id}>
                      {row.delays.flatMap((delay, delayIndex) => [
                        <td key={`${delayIndex}-code`}>
                          <input
                            aria-label={`Row ${rowIndex + 1}, delay ${delayIndex + 1} code`}
                            value={delay.code}
                            onChange={(event) => updateCell(rowIndex, delayIndex, "code", event.target.value)}
                          />
                        </td>,
                        <td key={`${delayIndex}-time`}>
                          <input
                            aria-label={`Row ${rowIndex + 1}, delay ${delayIndex + 1} time`}
                            value={delay.time}
                            onChange={(event) => updateCell(rowIndex, delayIndex, "time", event.target.value)}
                          />
                        </td>,
                      ])}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-sheet delay-empty">
                <span>⌗</span>
                <strong>The delay table will appear here</strong>
                <small>It will match the DELAY 1–4 layout from your example.</small>
              </div>
            )}
          </div>

          <div className="download-row">
            <div>
              <strong>Paste into Excel in one step</strong>
              <span>“Copy rows” copies only the eight data columns, ready for the first Code cell in your existing template.</span>
            </div>
            <button className="primary-button" disabled={!rows.length} onClick={() => void copy(false)}>
              <CopyIcon /> {copied ? "Copied" : "Copy rows"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
