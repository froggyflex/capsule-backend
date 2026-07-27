import { useState } from "react";
import "./App.css";
import CapsulesTool from "./components/CapsulesTool";
import DelayExtractorTool from "./components/DelayExtractorTool";
import FlightOperationsTool from "./components/FlightOperationsTool";

type ToolId = "capsules" | "flight-operations" | "delay-extractor";

function LogoMark() {
  return (
    <div className="logo-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function ArchiveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M6 7v12h12V7M9 11h6M5 4h14v3H5z" />
    </svg>
  );
}

function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m3 11 7 1 7-8 2 1-4 8 5 2v2l-6-1-3 5-2-1 1-5-7-2z" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4H4v4m12-4h4v4M8 20H4v-4m12 4h4v-4M7 12h10M9 9h6m-6 6h6" />
    </svg>
  );
}

const tools: Array<{
  id: ToolId;
  label: string;
  description: string;
  icon: typeof ArchiveIcon;
}> = [
  {
    id: "capsules",
    label: "Capsules",
    description: "Capture and carry",
    icon: ArchiveIcon,
  },
  {
    id: "flight-operations",
    label: "Flight operations",
    description: "Build the daily sheet",
    icon: PlaneIcon,
  },
  {
    id: "delay-extractor",
    label: "Delay extractor",
    description: "Screenshot to table",
    icon: ScanIcon,
  },
];

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId>("flight-operations");
  const active = tools.find((tool) => tool.id === activeTool) ?? tools[0];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <LogoMark />
          <div>
            <strong>Toolbox</strong>
            <span>Daily utilities</span>
          </div>
        </div>

        <nav className="tool-nav" aria-label="Tools">
          <p className="nav-label">YOUR TOOLS</p>
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                type="button"
                className={`tool-link ${activeTool === tool.id ? "active" : ""}`}
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
              >
                <span className="tool-icon"><Icon /></span>
                <span>
                  <strong>{tool.label}</strong>
                  <small>{tool.description}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-note">
          <span className="status-dot" />
          <div>
            <strong>Ready when you are</strong>
            <small>Your work stays in this browser until you choose to save it.</small>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div>
            <span className="eyebrow">TOOLBOX / {active.label.toUpperCase()}</span>
            <h1>{active.label}</h1>
          </div>
          <div className="local-badge"><span /> Local workspace</div>
        </header>

        {activeTool === "capsules" && <CapsulesTool />}
        {activeTool === "flight-operations" && <FlightOperationsTool />}
        {activeTool === "delay-extractor" && <DelayExtractorTool />}
      </div>
    </div>
  );
}
