import { useMemo, useState } from "react";
import {
  addMinutes,
  buildSchedule,
  minutesToTime,
  scheduleToTsv,
  type ScheduleFlight,
  type StaffShift,
} from "../scheduleMaker";

const initialStaff: StaffShift[] = [
  { id: "staff-1", employee: "Charitini Mina", position: "DM", start: "08:00", end: "16:00" },
  { id: "staff-2", employee: "Andreas Tallaros", position: "SS", start: "18:00", end: "02:00" },
  { id: "staff-3", employee: "Eleni Kyragianni", position: "CH", start: "18:00", end: "02:00" },
  { id: "staff-4", employee: "Maria Stelletos", position: "CH", start: "16:30", end: "00:30" },
  { id: "staff-5", employee: "Eleni Petra", position: "CH", start: "08:00", end: "16:00" },
  { id: "staff-6", employee: "Christos Mantri", position: "CH", start: "10:00", end: "14:00" },
  { id: "staff-7", employee: "Christos Mantri", position: "CH", start: "21:00", end: "01:00" },
];

const initialFlights: ScheduleFlight[] = ["LS1512", "LS566", "LS1848", "LS446", "LS838"].map((flightNumber, index) => ({
  id: `flight-${index + 1}`,
  flightNumber,
  arrival: "",
  departure: "",
}));

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 8h11v11H8zM5 15H4V4h11v1" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function ScheduleMakerTool() {
  const [staff, setStaff] = useState(initialStaff);
  const [flights, setFlights] = useState(initialFlights);
  const [arrivalLead, setArrivalLead] = useState(5);
  const [departureLead, setDepartureLead] = useState(20);
  const [copied, setCopied] = useState(false);
  const schedule = useMemo(
    () => buildSchedule(staff, flights, arrivalLead, departureLead),
    [staff, flights, arrivalLead, departureLead],
  );
  const validFlightCount = flights.filter((flight) => flight.arrival && flight.departure).length;
  const unassignedCount = schedule.filter((row) => !row.employee).length;

  const updateStaff = (id: string, field: keyof StaffShift, value: string) => {
    setStaff((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
  };

  const updateFlight = (id: string, field: keyof ScheduleFlight, value: string) => {
    setFlights((current) => current.map((row) => {
      if (row.id !== id) return row;
      if (field === "arrival") {
        const shouldSetDeparture = !row.departure || row.departure === addMinutes(row.arrival, 60);
        return { ...row, arrival: value, departure: shouldSetDeparture ? addMinutes(value, 60) : row.departure };
      }
      return { ...row, [field]: value };
    }));
  };

  const addFlight = () => {
    setFlights((current) => [
      ...current,
      { id: `flight-${Date.now()}`, flightNumber: "", arrival: "", departure: "" },
    ]);
  };

  const copySchedule = async () => {
    await navigator.clipboard.writeText(scheduleToTsv(schedule));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="schedule-workspace">
      <section className="flight-hero">
        <div>
          <span className="section-kicker">SHIFT-AWARE GATE PLANNER</span>
          <h2>Build a conflict-free daily schedule.</h2>
          <p>Enter each aircraft’s arrival time. Departure defaults to one hour later, then the planner assigns an available employee whose complete shift covers the gate window.</p>
        </div>
        <div className="schedule-summary">
          <span><strong>{schedule.length}</strong> planned</span>
          <span className={unassignedCount ? "has-warning" : ""}><strong>{unassignedCount}</strong> unassigned</span>
        </div>
      </section>

      <div className="schedule-setup">
        <section className="panel schedule-input-panel">
          <div className="panel-heading">
            <div>
              <span className="step-number">01</span>
              <div>
                <h3>Team shifts</h3>
                <p>Overnight and split shifts are supported.</p>
              </div>
            </div>
            <button
              className="text-button"
              onClick={() => setStaff((current) => [...current, {
                id: `staff-${Date.now()}`,
                employee: "",
                position: "CH",
                start: "08:00",
                end: "16:00",
              }])}
            >
              <PlusIcon /> Add employee
            </button>
          </div>
          <div className="editable-table-wrap">
            <table className="editable-table staff-table">
              <thead><tr><th>Employee</th><th>Position</th><th>Shift</th><th /></tr></thead>
              <tbody>
                {staff.map((row) => (
                  <tr key={row.id}>
                    <td><input value={row.employee} onChange={(event) => updateStaff(row.id, "employee", event.target.value)} /></td>
                    <td><input value={row.position} onChange={(event) => updateStaff(row.id, "position", event.target.value.toUpperCase())} /></td>
                    <td>
                      <div className="time-pair">
                        <input type="time" value={row.start} onChange={(event) => updateStaff(row.id, "start", event.target.value)} />
                        <span>–</span>
                        <input type="time" value={row.end} onChange={(event) => updateStaff(row.id, "end", event.target.value)} />
                      </div>
                    </td>
                    <td><button className="row-remove" aria-label={`Remove ${row.employee}`} onClick={() => setStaff((current) => current.filter((item) => item.id !== row.id))}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel schedule-input-panel">
          <div className="panel-heading">
            <div>
              <span className="step-number">02</span>
              <div>
                <h3>Today’s flights</h3>
                <p>STD fills automatically at arrival +60 minutes.</p>
              </div>
            </div>
            <button className="text-button" onClick={addFlight}><PlusIcon /> Add flight</button>
          </div>
          <div className="editable-table-wrap">
            <table className="editable-table flights-input-table">
              <thead><tr><th>Flight</th><th>Arrival</th><th>Departure</th><th /></tr></thead>
              <tbody>
                {flights.map((row) => (
                  <tr key={row.id}>
                    <td><input value={row.flightNumber} onChange={(event) => updateFlight(row.id, "flightNumber", event.target.value.toUpperCase())} /></td>
                    <td><input type="time" value={row.arrival} onChange={(event) => updateFlight(row.id, "arrival", event.target.value)} /></td>
                    <td><input type="time" value={row.departure} onChange={(event) => updateFlight(row.id, "departure", event.target.value)} /></td>
                    <td><button className="row-remove" aria-label={`Remove ${row.flightNumber}`} onClick={() => setFlights((current) => current.filter((item) => item.id !== row.id))}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="planner-rules">
            <label>Arrival lead <span><input type="number" min="0" max="30" value={arrivalLead} onChange={(event) => setArrivalLead(Number(event.target.value))} /> min</span></label>
            <label>Departure lead <span><input type="number" min="0" max="60" value={departureLead} onChange={(event) => setDepartureLead(Number(event.target.value))} /> min</span></label>
          </div>
        </section>
      </div>

      <section className="panel schedule-output">
        <div className="panel-heading">
          <div>
            <span className="step-number">03</span>
            <div>
              <h3>Recommended assignments</h3>
              <p>CH is preferred, then SS and DM. No employee is double-booked or sent beyond their shift.</p>
            </div>
          </div>
          <button className="primary-button" disabled={!schedule.length} onClick={() => void copySchedule()}>
            <CopyIcon /> {copied ? "Copied" : "Copy schedule"}
          </button>
        </div>

        {schedule.length ? (
          <div className="schedule-table-wrap">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>Flight</th>
                  <th>STA</th>
                  <th>STD</th>
                  <th>Gate coverage</th>
                  <th>Dep. prep</th>
                  <th>Assigned employee</th>
                  <th>Position</th>
                  <th>Shift</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => (
                  <tr key={row.id} className={!row.employee ? "unassigned-row" : ""}>
                    <td><strong>{row.flightNumber}</strong></td>
                    <td>{row.arrival}</td>
                    <td>{row.departure}</td>
                    <td>{minutesToTime(row.coverageStart)}–{minutesToTime(row.coverageEnd)}</td>
                    <td>{minutesToTime(row.departurePrep)}</td>
                    <td>
                      {row.employee ? (
                        <span className="employee-chip"><i />{row.employee}</span>
                      ) : (
                        <span className="unassigned-chip">No shift fits</span>
                      )}
                    </td>
                    <td>{row.position ?? "—"}</td>
                    <td>{row.shiftLabel ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-sheet schedule-empty">
            <span>⌚</span>
            <strong>Add arrival times to generate the schedule</strong>
            <small>{validFlightCount ? "Complete both times for each flight." : "Departure will default to one hour after arrival."}</small>
          </div>
        )}
        <div className="schedule-note">
          <strong>Coverage rule</strong>
          <span>An agent is reserved from {arrivalLead} min before STA until STD; departure preparation begins {departureLead} min before STD. Review operational requirements before publishing.</span>
        </div>
      </section>
    </main>
  );
}
