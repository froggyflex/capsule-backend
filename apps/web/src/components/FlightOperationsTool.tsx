import { useMemo, useState } from "react";
import { formatFlightDate, operationCode, parseFlightText } from "../flightOperations";
import { downloadFlightWorkbook } from "../xlsxExport";

const sample = `\tFlight\tFrom\tSTA\tBest AT\tSTATE\tPosition\tGate\tPax\t\tGTM\tCheck\tReg.\tOwn / Sub\t\tFlight\tTo\tSTD\tBest DT\tSTATE\tPosition\tGate\tPax
1.\tLS3141\tLGW\t27Jul 09:05\t-\tSKD\t \t \t207\t\t50\t \tGHLYI\tLS / 32Q\t\tLS3142\tLGW\t27Jul 09:55\t-\tSKD\t \t \t201
2.\tLS813\tMAN\t27Jul 09:25\t-\tSKD\t \t \t205\t\t50\t \tGHLYK\tLS / 32Q\t\tLS814\tMAN\t27Jul 10:15\t-\tSKD\t \t \t208
3.\tLS1255\tBHX\t27Jul 09:40\t-\tSKD\t \t \t176\t\t50\t \t9AICF\t2F / 73H\t\tLS1256\tBHX\t27Jul 10:30\t-\tSKD\t \t \t185
4.\tLS3853\tLTN\t27Jul 18:55\t-\tSKD\t \t \t207\t\t55\t \tGHLYN\tLS / 32Q\t\tLS3854\tLTN\t27Jul 19:50\t-\tSKD\t \t \t177
5.\tLS1481\tSTN\t27Jul 19:40\t-\tSKD\t \t \t159\t\t50\t \tGHLYH\tLS / 32Q\t\tLS1482\tSTN\t27Jul 20:30\t-\tSKD\t \t \t194`;

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 5h6M9 3h6v4H9zM7 5H5v16h14V5h-2" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12m-5-5 5 5 5-5M5 20h14" />
    </svg>
  );
}

export default function FlightOperationsTool() {
  const [text, setText] = useState(sample);
  const [copied, setCopied] = useState(false);
  const parsed = useMemo(() => parseFlightText(text), [text]);
  const code = operationCode(parsed.rows);

  const paste = async () => {
    const value = await navigator.clipboard.readText();
    if (value.trim()) setText(value);
  };

  const copyTable = async () => {
    const headers = ["", "Flight", "From", "STA", "Pax", "GTM", "Reg.", "Own / Sub", "Flight", "To", "STD", "Pax"];
    const lines = parsed.rows.map((row) => [
      row.index,
      row.inboundFlight,
      row.from,
      formatFlightDate(row.sta),
      row.inboundPax,
      row.gtm,
      row.registration,
      row.operator,
      row.outboundFlight,
      row.to,
      formatFlightDate(row.std),
      row.outboundPax,
    ].join("\t"));
    await navigator.clipboard.writeText([headers.join("\t"), ...lines].join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main className="flight-workspace">
      <section className="flight-hero">
        <div>
          <span className="section-kicker">FLIGHT TURNAROUND FORMATTER</span>
          <h2>From copied roster to a ready-to-send sheet.</h2>
          <p>Paste the operations roster below. The fields you need are extracted instantly and arranged to match your daily Excel table.</p>
        </div>
        <div className="hero-stat">
          <strong>{parsed.rows.length}</strong>
          <span>turnarounds ready</span>
        </div>
      </section>

      <div className="flight-layout">
        <section className="input-card panel">
          <div className="panel-heading">
            <div>
              <span className="step-number">01</span>
              <div>
                <h3>Paste flight data</h3>
                <p>Include the header row if it is available.</p>
              </div>
            </div>
            <button className="text-button" onClick={() => void paste()}>
              <ClipboardIcon /> Paste clipboard
            </button>
          </div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            spellCheck={false}
            aria-label="Flight roster data"
          />
          <div className="input-footer">
            <span className={parsed.rows.length ? "parse-status good" : "parse-status"}>
              <i /> {parsed.rows.length ? `${parsed.rows.length} rows recognized` : "Waiting for roster rows"}
            </span>
            {parsed.rejectedLines > 0 && <span className="warning">{parsed.rejectedLines} row(s) need checking</span>}
            <button className="clear-button" onClick={() => setText("")}>Clear</button>
          </div>
        </section>

        <section className="preview-card panel">
          <div className="panel-heading">
            <div>
              <span className="step-number">02</span>
              <div>
                <h3>Review your table</h3>
                <p>Only the columns used in the final sheet are kept.</p>
              </div>
            </div>
            <button className="text-button" disabled={!parsed.rows.length} onClick={() => void copyTable()}>
              {copied ? "Copied" : "Copy table"}
            </button>
          </div>

          <div className="sheet-frame">
            {parsed.rows.length ? (
              <div className="table-scroll">
                <table className="operations-table">
                  <caption>LS DAILY OPERATIONS - {code}</caption>
                  <thead>
                    <tr>
                      {["", "Flight", "From", "STA", "Pax", "GTM", "Reg.", "Own / Sub", "Flight", "To", "STD", "Pax"].map((header, index) => (
                        <th key={`${header}-${index}`}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.map((row) => (
                      <tr key={`${row.index}-${row.inboundFlight}`}>
                        <td>{row.index}</td>
                        <td>{row.inboundFlight}</td>
                        <td>{row.from}</td>
                        <td className="date-cell">{formatFlightDate(row.sta)}</td>
                        <td>{row.inboundPax}</td>
                        <td>{row.gtm}</td>
                        <td>{row.registration}</td>
                        <td>{row.operator}</td>
                        <td>{row.outboundFlight}</td>
                        <td>{row.to}</td>
                        <td className="date-cell">{formatFlightDate(row.std)}</td>
                        <td>{row.outboundPax}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-sheet">
                <span>✦</span>
                <strong>Your formatted table will appear here</strong>
                <small>Paste roster data in step 01 to begin.</small>
              </div>
            )}
          </div>

          <div className="download-row">
            <div>
              <strong>Ready to send?</strong>
              <span>The download keeps the red title, bordered headers, date cells, and column order from 25JUL26.xlsx.</span>
            </div>
            <button
              className="primary-button"
              disabled={!parsed.rows.length}
              onClick={() => downloadFlightWorkbook(parsed.rows)}
            >
              <DownloadIcon /> Download Excel
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
