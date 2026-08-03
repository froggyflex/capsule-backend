import { useMemo, useState } from "react";
import {
  addMinutes,
  buildSchedule,
  minutesToTime,
  parseFlightsText,
  parseStaffText,
  scheduleToTsv,
  type ScheduleFlight,
  type StaffShift,
} from "../scheduleMaker";

const initialStaffText = `Employee\t\tPosition\tShift
Charitini Mina\t\tDM\t08:00-16:00
Andreas Tallaros\t\tSS\t18:00-02:00
Eleni Kyragianni\t\tCH\t08:00-16:00
Maria Stelletos\t\tCH\t16:30-00:30
Panagiotis Plaggeti\t\tCH\t10:30-13:30
Panagiotis Plaggeti\t\tCH\t20:00-01:00
Fani Akranidou\t\tCH\t14:00-22:00
Eleni Petra\t\tCH\t14:00-22:00
Christos Mantrri\t\tCH\t18:00-02:00`;

const initialFlightsText = `FLT N\tDEST
LS450\tLBA
LS1630\tSTN
LS814\tMAN
LS3142\tLGW
LS1848\tBRS
LS1256\tBHX
LS3854\tLTN`;

function CopyIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h11v11H8zM5 15H4V4h11v1" /></svg>;
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}

function PasteIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h6M9 3h6v4H9zM7 5H5v16h14V5h-2" /></svg>;
}

export default function ScheduleMakerTool() {
  const [staff, setStaff] = useState<StaffShift[]>(() => parseStaffText(initialStaffText));
  const [flights, setFlights] = useState<ScheduleFlight[]>(() => parseFlightsText(initialFlightsText));
  const [staffPaste, setStaffPaste] = useState("");
  const [flightPaste, setFlightPaste] = useState("");
  const [flightParseMessage, setFlightParseMessage] = useState("");
  const [arrivalLead, setArrivalLead] = useState(20);
  const [arrivalService, setArrivalService] = useState(40);
  const [departureLead, setDepartureLead] = useState(20);
  const [arrivalBatchGap, setArrivalBatchGap] = useState(25);
  const [maxArrivalBatch, setMaxArrivalBatch] = useState(3);
  const [fuelingRelease, setFuelingRelease] = useState(20);
  const [copied, setCopied] = useState(false);

  const schedule = useMemo(
    () => buildSchedule(staff, flights, arrivalLead, arrivalService, departureLead, arrivalBatchGap, maxArrivalBatch, fuelingRelease),
    [staff, flights, arrivalLead, arrivalService, departureLead, arrivalBatchGap, maxArrivalBatch, fuelingRelease],
  );
  const pendingFlights = flights.filter((flight) => !flight.arrival || !flight.departure);
  const isPartial = pendingFlights.length > 0;
  const uncoveredDuties = schedule.reduce(
    (count, row) => count + Number(!row.arrivalDuty.employee) + Number(!row.departureDuty.employee),
    0,
  );
  const shortageCovers = schedule.filter((row) => row.departureDuty.shortageCover);

  const applyStaffText = (text: string) => {
    const parsed = parseStaffText(text);
    if (parsed.length) {
      setStaff(parsed);
      setStaffPaste("");
    }
  };

  const applyFlightText = (text: string) => {
    const parsed = parseFlightsText(text);
    if (parsed.length) {
      setFlights(parsed);
      setFlightPaste("");
      setFlightParseMessage(`${parsed.length} flight${parsed.length === 1 ? "" : "s"} imported`);
    } else {
      setFlightParseMessage("No LS flight numbers found — keep the LS number in the copied text.");
    }
  };

  const pasteFromClipboard = async (kind: "staff" | "flights") => {
    try {
      const text = await navigator.clipboard.readText();
      if (kind === "staff") applyStaffText(text);
      else applyFlightText(text);
    } catch {
      if (kind === "flights") setFlightParseMessage("Clipboard access was blocked — paste into the box instead.");
    }
  };

  const updateStaff = (id: string, field: keyof StaffShift, value: string) => {
    setStaff((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
  };

  const updateFlight = (id: string, field: keyof ScheduleFlight, value: string) => {
    setFlights((current) => current.map((row) => {
      if (row.id !== id) return row;
      if (field === "arrival") {
        const useAutomaticDeparture = !row.departure || row.departure === addMinutes(row.arrival, 45);
        return { ...row, arrival: value, departure: useAutomaticDeparture ? addMinutes(value, 45) : row.departure };
      }
      return { ...row, [field]: value };
    }));
  };

  const copySchedule = async () => {
    await navigator.clipboard.writeText(scheduleToTsv(schedule, pendingFlights));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="schedule-workspace">
      <section className="flight-hero">
        <div>
          <span className="section-kicker">SHIFT-AWARE GATE PLANNER</span>
          <h2>Assign arrivals and departures separately.</h2>
          <p>Nearby arrivals can be grouped under one agent, up to the configured limit. CSA/CH duties stay balanced, STD defaults to +45 minutes, and supervisors remain the backup tier.</p>
        </div>
        <div className="schedule-summary">
          <span><strong>{schedule.length}</strong> planned</span>
          <span className={isPartial ? "is-pending" : ""}><strong>{pendingFlights.length}</strong> pending</span>
          <span className={uncoveredDuties ? "has-warning" : ""}><strong>{uncoveredDuties}</strong> open duties</span>
        </div>
      </section>

      <div className="schedule-setup">
        <section className="panel schedule-input-panel">
          <div className="panel-heading">
            <div><span className="step-number">01</span><div><h3>Team shifts</h3><p>Paste the three-column roster or edit rows below.</p></div></div>
            <button className="text-button" onClick={() => void pasteFromClipboard("staff")}><PasteIcon /> Paste shifts</button>
          </div>
          <div className="bulk-paste">
            <textarea
              value={staffPaste}
              placeholder={"Employee    Position    Shift\nName        CH          08:00-16:00"}
              onChange={(event) => setStaffPaste(event.target.value)}
              onPaste={(event) => {
                const pasted = event.clipboardData.getData("text/plain");
                window.setTimeout(() => applyStaffText(pasted), 0);
              }}
            />
            <button disabled={!staffPaste.trim()} onClick={() => applyStaffText(staffPaste)}>Parse roster</button>
          </div>
          <div className="editable-table-wrap">
            <table className="editable-table staff-table">
              <thead><tr><th>Employee</th><th>Position</th><th>Shift</th><th /></tr></thead>
              <tbody>{staff.map((row) => (
                <tr key={row.id}>
                  <td><input value={row.employee} onChange={(event) => updateStaff(row.id, "employee", event.target.value)} /></td>
                  <td><input value={row.position} onChange={(event) => updateStaff(row.id, "position", event.target.value.toUpperCase())} /></td>
                  <td><div className="time-pair"><input type="time" value={row.start} onChange={(event) => updateStaff(row.id, "start", event.target.value)} /><span>–</span><input type="time" value={row.end} onChange={(event) => updateStaff(row.id, "end", event.target.value)} /></div></td>
                  <td><button className="row-remove" aria-label={`Remove ${row.employee}`} onClick={() => setStaff((current) => current.filter((item) => item.id !== row.id))}>×</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <button className="table-add" onClick={() => setStaff((current) => [...current, { id: `staff-${Date.now()}`, employee: "", position: "CH", start: "08:00", end: "16:00" }])}><PlusIcon /> Add employee</button>
        </section>

        <section className="panel schedule-input-panel">
          <div className="panel-heading">
            <div><span className="step-number">02</span><div><h3>Today’s flights</h3><p>Paste Flight + Destination, then enter STA only.</p></div></div>
            <button className="text-button" onClick={() => void pasteFromClipboard("flights")}><PasteIcon /> Paste flights</button>
          </div>
          <div className="bulk-paste">
            <textarea
              value={flightPaste}
              placeholder={"FLT N    DEST\nLS450    LBA\nLS1630   STN"}
              onChange={(event) => setFlightPaste(event.target.value)}
              onPaste={(event) => {
                const pasted = event.clipboardData.getData("text/plain");
                event.preventDefault();
                applyFlightText(pasted);
              }}
            />
            <button disabled={!flightPaste.trim()} onClick={() => applyFlightText(flightPaste)}>Parse flights</button>
            {flightParseMessage && <span className="parse-feedback">{flightParseMessage}</span>}
          </div>
          <div className="editable-table-wrap">
            <table className="editable-table flights-input-table">
              <thead><tr><th>Flight</th><th>Dest.</th><th>Arrival</th><th>STD (+45)</th><th /></tr></thead>
              <tbody>{flights.map((row) => (
                <tr key={row.id}>
                  <td><input value={row.flightNumber} onChange={(event) => updateFlight(row.id, "flightNumber", event.target.value.toUpperCase())} /></td>
                  <td><input value={row.destination} onChange={(event) => updateFlight(row.id, "destination", event.target.value.toUpperCase())} /></td>
                  <td><input type="time" value={row.arrival} onChange={(event) => updateFlight(row.id, "arrival", event.target.value)} /></td>
                  <td><input type="time" value={row.departure} onChange={(event) => updateFlight(row.id, "departure", event.target.value)} /></td>
                  <td><button className="row-remove" aria-label={`Remove ${row.flightNumber}`} onClick={() => setFlights((current) => current.filter((item) => item.id !== row.id))}>×</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <button className="table-add" onClick={() => setFlights((current) => [...current, { id: `flight-${Date.now()}`, flightNumber: "", destination: "", arrival: "", departure: "" }])}><PlusIcon /> Add flight</button>
          <div className="planner-rules three-rules">
            <label>Arrival lead <span><input type="number" min="0" max="30" value={arrivalLead} onChange={(event) => setArrivalLead(Number(event.target.value))} /> min</span></label>
            <label>Arrival service <span><input type="number" min="5" max="60" value={arrivalService} onChange={(event) => setArrivalService(Number(event.target.value))} /> min</span></label>
            <label>Gate lead before STA <span><input type="number" min="0" max="60" value={departureLead} onChange={(event) => setDepartureLead(Number(event.target.value))} /> min</span></label>
            <label>Arrival batch gap <span><input type="number" min="5" max="60" value={arrivalBatchGap} onChange={(event) => setArrivalBatchGap(Number(event.target.value))} /> min</span></label>
            <label>Max arrivals/agent <span><input type="number" min="1" max="5" value={maxArrivalBatch} onChange={(event) => setMaxArrivalBatch(Number(event.target.value))} /></span></label>
            <label>Fueling release <span><input type="number" min="5" max="45" value={fuelingRelease} onChange={(event) => setFuelingRelease(Number(event.target.value))} /> min</span></label>
          </div>
        </section>
      </div>

      <section className="panel schedule-output">
        <div className="panel-heading">
          <div><span className="step-number">03</span><div><h3>Recommended assignments</h3><p>{isPartial ? "Partial program — known arrivals are scheduled while missing times stay pending." : "Complete program — all flights have arrival and departure coverage."}</p></div></div>
          <div className="schedule-actions">
            <span className={`program-state ${isPartial ? "partial" : "complete"}`}><i /> {isPartial ? "Partial program" : "Complete program"}</span>
            <button className="primary-button" disabled={!schedule.length && !pendingFlights.length} onClick={() => void copySchedule()}><CopyIcon /> {copied ? "Copied" : "Copy schedule"}</button>
          </div>
        </div>
        {shortageCovers.length > 0 && (
          <div className="coverage-alert" role="status">
            <strong>{shortageCovers.length} shortage-cover assignment{shortageCovers.length === 1 ? "" : "s"}</strong>
            <span>These reuse an agent from an earlier gate after STA +{fuelingRelease} min. Confirm fueling is complete before moving the agent.</span>
          </div>
        )}
        <div className="schedule-table-wrap">
          <table className="schedule-table two-duty-table">
            <thead><tr><th>Flight</th><th>Dest.</th><th>STA</th><th>STD</th><th>Arrival window</th><th>Arrival agent</th><th>Departure window</th><th>Departure agent</th></tr></thead>
            <tbody>
              {schedule.map((row) => (
                <tr key={row.id} className={!row.arrivalDuty.employee || !row.departureDuty.employee ? "unassigned-row" : ""}>
                  <td><strong>{row.flightNumber}</strong></td><td>{row.destination}</td><td>{row.arrival}</td><td>{row.departure}</td>
                  <td>{minutesToTime(row.arrivalDuty.start)}–{minutesToTime(row.arrivalDuty.end)}</td>
                  <td>{row.arrivalDuty.employee ? <span className="employee-chip"><i />{row.arrivalDuty.employee}<small>{row.arrivalDuty.position}</small></span> : <span className="unassigned-chip">No agent available</span>}</td>
                  <td>{minutesToTime(row.departureDuty.start)}–{minutesToTime(row.departureDuty.end)}</td>
                  <td>{row.departureDuty.employee ? <div className="assignment-cell"><span className={`employee-chip ${row.departureDuty.shortageCover ? "shortage" : ""}`}><i />{row.departureDuty.employee}<small>{row.departureDuty.position}</small></span>{row.departureDuty.shortageCover && <small className="assignment-warning">Confirm earlier fueling complete</small>}</div> : <span className="unassigned-chip">No agent available</span>}</td>
                </tr>
              ))}
              {pendingFlights.map((flight) => (
                <tr key={flight.id} className="pending-row">
                  <td><strong>{flight.flightNumber || "Unnamed"}</strong></td><td>{flight.destination || "—"}</td><td>{flight.arrival || "—"}</td><td>{flight.departure || "—"}</td>
                  <td colSpan={4}><span className="pending-chip">Awaiting arrival time</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="schedule-note">
          <strong>{isPartial ? "Provisional program" : "Duty rules"}</strong>
          <span>{isPartial ? `${pendingFlights.length} flight${pendingFlights.length === 1 ? " is" : "s are"} waiting for an arrival time. Assignments recalculate as times are added.` : `Arrival duty runs from ${arrivalLead} min before STA until ${arrivalService} min after STA. Departure/gate duty runs from ${departureLead} min before STA until STD.`}</span>
        </div>
      </section>
    </main>
  );
}
