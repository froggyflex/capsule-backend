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
  shortageCover: boolean;
  operatorNote: string | null;
};

export type ScheduledFlight = ScheduleFlight & {
  arrivalDuty: DutyAssignment;
  departureDuty: DutyAssignment;
};

type DutyTask = {
  id: string;
  flightId: string;
  kind: "arrival" | "departure";
  eventTime: number;
  fallbackRelease: number;
  start: number;
  end: number;
};

type EmployeeBooking = DutyTask;

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
  if (normalized === "CH" || normalized === "CSA") return 0;
  if (normalized === "SS") return 1;
  if (normalized === "DM") return 2;
  return 3;
}

function emptyAssignment(start: number, end: number): DutyAssignment {
  return {
    employee: null,
    position: null,
    shiftLabel: null,
    start,
    end,
    shortageCover: false,
    operatorNote: null,
  };
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
  const normalized = text
    .normalize("NFKC")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\r\n?/g, "\n");
  const flightPattern = /\bLS[\s-]*\d{1,5}[A-Z]?\b/gi;
  const matches = Array.from(normalized.matchAll(flightPattern));
  const rows: ScheduleFlight[] = [];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const segmentStart = (match.index ?? 0) + match[0].length;
    const segmentEnd = matches[index + 1]?.index ?? normalized.length;
    const segment = normalized.slice(segmentStart, segmentEnd);
    const destination = segment.match(/(?:^|[\t ,;|])([A-Z]{3})(?=$|[\t ,;|\n])/i)?.[1] ?? "";
    rows.push({
      id: `flight-${Date.now()}-${index}`,
      flightNumber: match[0].replace(/[\s-]+/g, "").toUpperCase(),
      destination: destination.toUpperCase(),
      arrival: "",
      departure: "",
    });
  }
  return rows;
}

export function buildSchedule(
  staff: StaffShift[],
  flights: ScheduleFlight[],
  arrivalLead = 20,
  arrivalService = 40,
  departureLead = 20,
  arrivalBatchGap = 25,
  maxArrivalBatch = 3,
  fuelingRelease = 20,
): ScheduledFlight[] {
  const validFlights = flights
    .map((flight) => ({ flight, times: normalizedFlightTimes(flight) }))
    .filter((item): item is { flight: ScheduleFlight; times: { arrival: number; departure: number } } => Boolean(item.times));

  const tasks: DutyTask[] = validFlights.flatMap(({ flight, times }) => [
    {
      id: `${flight.id}-arrival`,
      flightId: flight.id,
      kind: "arrival",
      eventTime: times.arrival,
      fallbackRelease: times.arrival + arrivalService,
      start: times.arrival - arrivalLead,
      end: times.arrival + arrivalService,
    },
    {
      id: `${flight.id}-departure`,
      flightId: flight.id,
      kind: "departure",
      eventTime: times.arrival,
      fallbackRelease: times.arrival + fuelingRelease,
      start: times.arrival - departureLead,
      end: times.departure,
    },
  ]);
  const employeeBookings = new Map<string, EmployeeBooking[]>();
  const dutyCount = new Map<string, number>();
  const utilization = new Map<string, number>();
  const results = new Map<string, DutyAssignment>();
  const staffWindows = staff
    .map((shift) => ({ shift, window: normalizedWindow(shift.start, shift.end) }))
    .filter((item): item is { shift: StaffShift; window: { start: number; end: number } } => Boolean(item.window));

  const batchAffinity = (employee: string, task: DutyTask) => {
    const bookings = employeeBookings.get(employee) ?? [];
    if (bookings.some((booking) => booking.flightId === task.flightId)) return null;
    const overlappingBookings = bookings.filter((booking) =>
      overlap(task.start, task.end, booking.start, booking.end),
    );
    if (task.kind === "departure") return overlappingBookings.length ? null : 0;
    if (overlappingBookings.some((booking) => booking.kind === "departure")) return null;

    const arrivalBookings = bookings.filter((booking) => booking.kind === "arrival");
    const connected = new Set<EmployeeBooking>();
    let changed = true;
    while (changed) {
      changed = false;
      for (const booking of arrivalBookings) {
        if (connected.has(booking)) continue;
        const connectsToTask = Math.abs(booking.eventTime - task.eventTime) <= arrivalBatchGap;
        const connectsToBatch = Array.from(connected).some(
          (member) => Math.abs(booking.eventTime - member.eventTime) <= arrivalBatchGap,
        );
        if (connectsToTask || connectsToBatch) {
          connected.add(booking);
          changed = true;
        }
      }
    }
    if (connected.size + 1 > maxArrivalBatch) return null;
    if (overlappingBookings.some((booking) => booking.kind === "arrival" && !connected.has(booking))) {
      return null;
    }
    return connected.size;
  };

  tasks
    .sort((a, b) =>
      a.start - b.start ||
      (a.kind === b.kind ? 0 : a.kind === "arrival" ? -1 : 1),
    )
    .forEach((task) => {
      const sortCandidates = <T extends { shift: StaffShift; window: { start: number; end: number }; affinity: number }>(candidates: T[]) =>
        candidates.sort((a, b) => {
          const rankDifference = positionRank(a.shift.position) - positionRank(b.shift.position);
          if (rankDifference) return rankDifference;
          if (task.kind === "arrival" && a.affinity !== b.affinity) return b.affinity - a.affinity;
          const countDifference =
            (dutyCount.get(a.shift.employee) ?? 0) - (dutyCount.get(b.shift.employee) ?? 0);
          if (countDifference) return countDifference;
          const loadDifference =
            (utilization.get(a.shift.employee) ?? 0) - (utilization.get(b.shift.employee) ?? 0);
          if (loadDifference) return loadDifference;
          return a.window.end - b.window.end;
        });

      const strictCandidates = staffWindows
        .map(({ shift, window }) => {
          if (window.start > task.start || window.end < task.end) return false;
          const affinity = batchAffinity(shift.employee, task);
          return affinity === null ? false : { shift, window, affinity };
        })
        .filter((item): item is { shift: StaffShift; window: { start: number; end: number }; affinity: number } => Boolean(item));
      const strict = sortCandidates(strictCandidates)[0];

      const shortageCandidates = !strict && task.kind === "departure"
        ? staffWindows
            .map(({ shift, window }) => {
              if (window.start > task.start || window.end < task.end) return false;
              const bookings = employeeBookings.get(shift.employee) ?? [];
              if (bookings.some((booking) => booking.flightId === task.flightId)) return false;
              const conflicts = bookings.filter((booking) =>
                overlap(task.start, task.end, booking.start, booking.end),
              );
              const canReleaseFromEarlierGates =
                conflicts.length > 0 &&
                conflicts.every(
                  (booking) => booking.kind === "departure" && booking.fallbackRelease <= task.start,
                );
              return canReleaseFromEarlierGates ? { shift, window, affinity: 0 } : false;
            })
            .filter((item): item is { shift: StaffShift; window: { start: number; end: number }; affinity: number } => Boolean(item))
        : [];
      const shortage = sortCandidates(shortageCandidates)[0];
      const selected = strict ?? shortage;
      const chosen = selected?.shift;
      if (!chosen) {
        results.set(task.id, emptyAssignment(task.start, task.end));
        return;
      }
      employeeBookings.set(chosen.employee, [
        ...(employeeBookings.get(chosen.employee) ?? []),
        task,
      ]);
      dutyCount.set(chosen.employee, (dutyCount.get(chosen.employee) ?? 0) + 1);
      utilization.set(chosen.employee, (utilization.get(chosen.employee) ?? 0) + task.end - task.start);
      results.set(task.id, {
        employee: chosen.employee,
        position: chosen.position,
        shiftLabel: `${chosen.start}–${chosen.end}`,
        start: task.start,
        end: task.end,
        shortageCover: Boolean(shortage && !strict),
        operatorNote: shortage && !strict
          ? `Shortage cover: confirm the earlier aircraft has completed fueling before reassigning ${chosen.employee}.`
          : null,
      });
    });

  return validFlights
    .sort((a, b) => a.times.arrival - b.times.arrival)
    .map(({ flight, times }) => ({
      ...flight,
      arrivalDuty: results.get(`${flight.id}-arrival`) ?? emptyAssignment(times.arrival - arrivalLead, times.arrival + arrivalService),
      departureDuty: results.get(`${flight.id}-departure`) ?? emptyAssignment(times.arrival - departureLead, times.departure),
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
    ["Flight", "Destination", "Status", "STA", "STD", "Arrival duty", "Arrival agent", "Position", "Departure duty", "Departure agent", "Position", "Operator note"].join("\t"),
    ...rows.map((row) => [
      row.flightNumber,
      row.destination,
      row.departureDuty.shortageCover
        ? "Shortage cover — confirm fueling"
        : row.arrivalDuty.employee && row.departureDuty.employee ? "Scheduled" : "Needs coverage",
      row.arrival,
      row.departure,
      `${minutesToTime(row.arrivalDuty.start)}-${minutesToTime(row.arrivalDuty.end)}`,
      row.arrivalDuty.employee ?? "UNASSIGNED",
      row.arrivalDuty.position ?? "",
      `${minutesToTime(row.departureDuty.start)}-${minutesToTime(row.departureDuty.end)}`,
      row.departureDuty.employee ?? "UNASSIGNED",
      row.departureDuty.position ?? "",
      row.departureDuty.operatorNote ?? "",
    ].join("\t")),
    ...pendingFlights.map((flight) => [
      flight.flightNumber, flight.destination, "Awaiting arrival", flight.arrival, flight.departure,
      "", "", "", "", "", "", "",
    ].join("\t")),
  ].join("\n");
}
