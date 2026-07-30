export type StaffShift = {
  id: string;
  employee: string;
  position: string;
  start: string;
  end: string;
};

export type ScheduleFlight = {
  id: string;
  flightNumber: string;
  destination: string;
  arrival: string;
  departure: string;
};

export type DutyAssignment = {
  employee: string | null;
  position: string | null;
  shiftLabel: string | null;
  start: number;
  end: number;
};

export type ScheduledFlight = ScheduleFlight & {
  arrivalDuty: DutyAssignment;
  departureDuty: DutyAssignment;
};

type DutyTask = {
  id: string;
  start: number;
  end: number;
};

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function normalizedWindow(start: string, end: string) {
  const startMinutes = timeToMinutes(start);
  let endMinutes = timeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return null;
  if (endMinutes <= startMinutes) endMinutes += 1440;
  return { start: startMinutes, end: endMinutes };
}

function normalizedFlightTimes(flight: ScheduleFlight) {
  const arrival = timeToMinutes(flight.arrival);
  let departure = timeToMinutes(flight.departure);
  if (arrival === null || departure === null) return null;
  if (departure <= arrival) departure += 1440;
  return { arrival, departure };
}

function overlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

function positionRank(position: string) {
  const normalized = position.trim().toUpperCase();
  if (normalized === "CH") return 0;
  if (normalized === "SS") return 1;
  if (normalized === "DM") return 2;
  return 3;
}

function emptyAssignment(start: number, end: number): DutyAssignment {
  return { employee: null, position: null, shiftLabel: null, start, end };
}

export function parseStaffText(text: string): StaffShift[] {
  const rows: StaffShift[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\t+/g, " ").replace(/\s+/g, " ").trim();
    const match = line.match(/^(.+?)\s+([A-Za-z]{2,5})\s+(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})$/);
    if (!match || /employee/i.test(match[1])) continue;
    rows.push({
      id: `staff-${Date.now()}-${rows.length}`,
      employee: match[1].trim(),
      position: match[2].toUpperCase(),
      start: match[3].padStart(5, "0"),
      end: match[4].padStart(5, "0"),
    });
  }
  return rows;
}

export function parseFlightsText(text: string): ScheduleFlight[] {
  const rows: ScheduleFlight[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\t+/g, " ").replace(/\s+/g, " ").trim();
    const match = line.match(/\b(LS\s*\d{2,5}[A-Z]?)\s+([A-Z]{3})\b/i);
    if (!match) continue;
    rows.push({
      id: `flight-${Date.now()}-${rows.length}`,
      flightNumber: match[1].replace(/\s+/g, "").toUpperCase(),
      destination: match[2].toUpperCase(),
      arrival: "",
      departure: "",
    });
  }
  return rows;
}

export function buildSchedule(
  staff: StaffShift[],
  flights: ScheduleFlight[],
  arrivalLead = 5,
  arrivalService = 15,
  departureLead = 20,
): ScheduledFlight[] {
  const validFlights = flights
    .map((flight) => ({ flight, times: normalizedFlightTimes(flight) }))
    .filter((item): item is { flight: ScheduleFlight; times: { arrival: number; departure: number } } => Boolean(item.times));

  const tasks: DutyTask[] = validFlights.flatMap(({ flight, times }) => [
    { id: `${flight.id}-arrival`, start: times.arrival - arrivalLead, end: times.arrival + arrivalService },
    { id: `${flight.id}-departure`, start: times.departure - departureLead, end: times.departure },
  ]);
  const employeeBookings = new Map<string, Array<{ start: number; end: number }>>();
  const utilization = new Map<string, number>();
  const results = new Map<string, DutyAssignment>();
  const staffWindows = staff
    .map((shift) => ({ shift, window: normalizedWindow(shift.start, shift.end) }))
    .filter((item): item is { shift: StaffShift; window: { start: number; end: number } } => Boolean(item.window));
  const candidateCount = (task: DutyTask) =>
    staffWindows.filter(({ window }) => window.start <= task.start && window.end >= task.end).length;

  tasks
    .sort((a, b) => candidateCount(a) - candidateCount(b) || a.start - b.start)
    .forEach((task) => {
      const eligible = staffWindows
        .filter(({ shift, window }) => {
          if (window.start > task.start || window.end < task.end) return false;
          return !(employeeBookings.get(shift.employee) ?? []).some((booking) =>
            overlap(task.start, task.end, booking.start, booking.end),
          );
        })
        .sort((a, b) => {
          const rankDifference = positionRank(a.shift.position) - positionRank(b.shift.position);
          if (rankDifference) return rankDifference;
          const loadDifference =
            (utilization.get(a.shift.employee) ?? 0) - (utilization.get(b.shift.employee) ?? 0);
          if (loadDifference) return loadDifference;
          return a.window.end - b.window.end;
        });
      const chosen = eligible[0]?.shift;
      if (!chosen) {
        results.set(task.id, emptyAssignment(task.start, task.end));
        return;
      }
      employeeBookings.set(chosen.employee, [
        ...(employeeBookings.get(chosen.employee) ?? []),
        { start: task.start, end: task.end },
      ]);
      utilization.set(chosen.employee, (utilization.get(chosen.employee) ?? 0) + task.end - task.start);
      results.set(task.id, {
        employee: chosen.employee,
        position: chosen.position,
        shiftLabel: `${chosen.start}–${chosen.end}`,
        start: task.start,
        end: task.end,
      });
    });

  return validFlights
    .sort((a, b) => a.times.arrival - b.times.arrival)
    .map(({ flight, times }) => ({
      ...flight,
      arrivalDuty: results.get(`${flight.id}-arrival`) ?? emptyAssignment(times.arrival - arrivalLead, times.arrival + arrivalService),
      departureDuty: results.get(`${flight.id}-departure`) ?? emptyAssignment(times.departure - departureLead, times.departure),
    }));
}

export function minutesToTime(total: number) {
  const normalized = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

export function addMinutes(time: string, minutes: number) {
  const parsed = timeToMinutes(time);
  return parsed === null ? "" : minutesToTime(parsed + minutes);
}

export function scheduleToTsv(rows: ScheduledFlight[], pendingFlights: ScheduleFlight[] = []) {
  return [
    ["Flight", "Destination", "Status", "STA", "STD", "Arrival duty", "Arrival agent", "Position", "Departure duty", "Departure agent", "Position"].join("\t"),
    ...rows.map((row) => [
      row.flightNumber,
      row.destination,
      row.arrivalDuty.employee && row.departureDuty.employee ? "Scheduled" : "Needs coverage",
      row.arrival,
      row.departure,
      `${minutesToTime(row.arrivalDuty.start)}-${minutesToTime(row.arrivalDuty.end)}`,
      row.arrivalDuty.employee ?? "UNASSIGNED",
      row.arrivalDuty.position ?? "",
      `${minutesToTime(row.departureDuty.start)}-${minutesToTime(row.departureDuty.end)}`,
      row.departureDuty.employee ?? "UNASSIGNED",
      row.departureDuty.position ?? "",
    ].join("\t")),
    ...pendingFlights.map((flight) => [
      flight.flightNumber, flight.destination, "Awaiting arrival", flight.arrival, flight.departure,
      "", "", "", "", "", "",
    ].join("\t")),
  ].join("\n");
}
