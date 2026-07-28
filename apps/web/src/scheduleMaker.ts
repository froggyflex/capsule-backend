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
  arrival: string;
  departure: string;
};

export type ScheduledFlight = ScheduleFlight & {
  coverageStart: number;
  departurePrep: number;
  coverageEnd: number;
  employee: string | null;
  position: string | null;
  shiftLabel: string | null;
  eligibleEmployees: string[];
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

function flightWindow(flight: ScheduleFlight, arrivalLead: number, departureLead: number) {
  const arrival = timeToMinutes(flight.arrival);
  let departure = timeToMinutes(flight.departure);
  if (arrival === null || departure === null) return null;
  if (departure <= arrival) departure += 1440;
  return {
    start: arrival - arrivalLead,
    departurePrep: departure - departureLead,
    end: departure,
  };
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

export function buildSchedule(
  staff: StaffShift[],
  flights: ScheduleFlight[],
  arrivalLead = 5,
  departureLead = 20,
): ScheduledFlight[] {
  const assignments = new Map<string, Array<{ start: number; end: number }>>();
  const utilization = new Map<string, number>();

  return flights
    .map((flight) => ({ flight, window: flightWindow(flight, arrivalLead, departureLead) }))
    .filter((item): item is { flight: ScheduleFlight; window: NonNullable<ReturnType<typeof flightWindow>> } => Boolean(item.window))
    .sort((a, b) => a.window.start - b.window.start)
    .map(({ flight, window }) => {
      const eligible = staff
        .map((shift) => ({ shift, window: normalizedWindow(shift.start, shift.end) }))
        .filter((item): item is { shift: StaffShift; window: { start: number; end: number } } => Boolean(item.window))
        .filter(({ shift, window: shiftWindow }) => {
          const coversWindow = shiftWindow.start <= window.start && shiftWindow.end >= window.end;
          const employeeAssignments = assignments.get(shift.employee) ?? [];
          return coversWindow && !employeeAssignments.some((assignment) =>
            overlap(window.start, window.end, assignment.start, assignment.end),
          );
        })
        .sort((a, b) => {
          const positionDifference = positionRank(a.shift.position) - positionRank(b.shift.position);
          if (positionDifference) return positionDifference;
          const utilizationDifference =
            (utilization.get(a.shift.employee) ?? 0) - (utilization.get(b.shift.employee) ?? 0);
          if (utilizationDifference) return utilizationDifference;
          return a.window.end - b.window.end;
        });

      const chosen = eligible[0]?.shift ?? null;
      if (chosen) {
        const current = assignments.get(chosen.employee) ?? [];
        current.push({ start: window.start, end: window.end });
        assignments.set(chosen.employee, current);
        utilization.set(
          chosen.employee,
          (utilization.get(chosen.employee) ?? 0) + window.end - window.start,
        );
      }

      return {
        ...flight,
        coverageStart: window.start,
        departurePrep: window.departurePrep,
        coverageEnd: window.end,
        employee: chosen?.employee ?? null,
        position: chosen?.position ?? null,
        shiftLabel: chosen ? `${chosen.start}–${chosen.end}` : null,
        eligibleEmployees: [...new Set(eligible.map(({ shift }) => shift.employee))],
      };
    });
}

export function minutesToTime(total: number) {
  const normalized = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

export function addMinutes(time: string, minutes: number) {
  const parsed = timeToMinutes(time);
  return parsed === null ? "" : minutesToTime(parsed + minutes);
}

export function scheduleToTsv(rows: ScheduledFlight[]) {
  return [
    ["Flight", "Arrival", "Departure", "Gate coverage", "Departure prep", "Employee", "Position", "Shift"].join("\t"),
    ...rows.map((row) => [
      row.flightNumber,
      row.arrival,
      row.departure,
      `${minutesToTime(row.coverageStart)}-${minutesToTime(row.coverageEnd)}`,
      minutesToTime(row.departurePrep),
      row.employee ?? "UNASSIGNED",
      row.position ?? "",
      row.shiftLabel ?? "",
    ].join("\t")),
  ].join("\n");
}
