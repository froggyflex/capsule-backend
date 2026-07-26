export type FlightTurn = {
  index: number;
  inboundFlight: string;
  from: string;
  sta: Date;
  inboundPax: number;
  gtm: number;
  registration: string;
  operator: string;
  outboundFlight: string;
  to: string;
  std: Date;
  outboundPax: number;
};

export type ParseResult = {
  rows: FlightTurn[];
  rejectedLines: number;
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const flightPattern = /^[A-Z0-9]{2,3}\s?\d{2,4}[A-Z]?$/i;
const datePattern = /^(\d{1,2})([A-Za-z]{3})\s+(\d{1,2}):(\d{2})$/;

function parseOperationDate(value: string, now = new Date()) {
  const match = value.trim().match(datePattern);
  if (!match) return null;
  const month = months.findIndex((item) => item.toLowerCase() === match[2].toLowerCase());
  if (month < 0) return null;

  let year = now.getFullYear();
  let result = new Date(Date.UTC(year, month, Number(match[1]), Number(match[3]), Number(match[4])));
  const delta = result.getTime() - now.getTime();
  if (delta > 183 * 86400000) year -= 1;
  if (delta < -183 * 86400000) year += 1;
  result = new Date(Date.UTC(year, month, Number(match[1]), Number(match[3]), Number(match[4])));
  return result;
}

function numberValue(value: string | undefined) {
  const parsed = Number(value?.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function fromFixedColumns(cells: string[], index: number): FlightTurn | null {
  const sta = parseOperationDate(cells[2] ?? "");
  const std = parseOperationDate(cells[16] ?? "");
  const inboundPax = numberValue(cells[7]);
  const gtm = numberValue(cells[9]);
  const outboundPax = numberValue(cells[21]);
  if (!sta || !std || inboundPax === null || gtm === null || outboundPax === null) return null;

  return {
    index,
    inboundFlight: cells[0],
    from: cells[1],
    sta,
    inboundPax,
    gtm,
    registration: cells[11],
    operator: cells[12],
    outboundFlight: cells[14],
    to: cells[15],
    std,
    outboundPax,
  };
}

function fromSemanticColumns(cells: string[], index: number): FlightTurn | null {
  const flightPositions = cells
    .map((cell, position) => (flightPattern.test(cell) ? position : -1))
    .filter((position) => position >= 0);
  const datePositions = cells
    .map((cell, position) => (datePattern.test(cell) ? position : -1))
    .filter((position) => position >= 0);
  if (flightPositions.length < 2 || datePositions.length < 2) return null;

  const inboundFlightAt = flightPositions[0];
  const outboundFlightAt = flightPositions.find((position) => position > datePositions[0]) ?? flightPositions[1];
  const staAt = datePositions[0];
  const stdAt = datePositions.find((position) => position > outboundFlightAt) ?? datePositions[1];
  const ownerAt = cells.findIndex((cell, position) => position > staAt && position < outboundFlightAt && cell.includes("/"));
  const gtmAt = cells.findIndex((cell, position) => {
    const numeric = numberValue(cell);
    return position > staAt && position < outboundFlightAt && numeric !== null && numeric >= 40 && numeric <= 60;
  });
  const inboundNumbers = cells
    .map((cell, position) => ({ position, value: numberValue(cell) }))
    .filter((item) => item.position > staAt && item.position < gtmAt && item.value !== null);
  const inboundPax = inboundNumbers.at(-1)?.value ?? null;
  const outboundPax = cells
    .slice(stdAt + 1)
    .map(numberValue)
    .filter((value): value is number => value !== null)
    .at(-1) ?? null;

  const sta = parseOperationDate(cells[staAt]);
  const std = parseOperationDate(cells[stdAt]);
  if (!sta || !std || inboundPax === null || outboundPax === null || gtmAt < 0 || ownerAt < 0) return null;

  const registration = cells
    .slice(gtmAt + 1, ownerAt)
    .find((cell) => /^[A-Z0-9-]{4,8}$/i.test(cell) && !["SKD"].includes(cell.toUpperCase())) ?? "";

  return {
    index,
    inboundFlight: cells[inboundFlightAt],
    from: cells[inboundFlightAt + 1] ?? "",
    sta,
    inboundPax,
    gtm: numberValue(cells[gtmAt]) ?? 0,
    registration,
    operator: cells[ownerAt],
    outboundFlight: cells[outboundFlightAt],
    to: cells[outboundFlightAt + 1] ?? "",
    std,
    outboundPax,
  };
}

export function parseFlightText(text: string): ParseResult {
  const rows: FlightTurn[] = [];
  let rejectedLines = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const indexMatch = rawLine.match(/^\s*(\d+)\.\s*/);
    if (!indexMatch) continue;
    const index = Number(indexMatch[1]);
    const remainder = rawLine.slice(indexMatch[0].length).replace(/^\t+/, "");
    const tabCells = remainder.split("\t").map((cell) => cell.trim());
    const cells = tabCells.length >= 20
      ? tabCells
      : remainder.split(/\s{2,}|\t+/).map((cell) => cell.trim()).filter(Boolean);
    const parsed = tabCells.length >= 22
      ? fromFixedColumns(tabCells, index)
      : fromSemanticColumns(cells, index);

    if (parsed) rows.push(parsed);
    else rejectedLines += 1;
  }

  return { rows, rejectedLines };
}

export function formatFlightDate(date: Date) {
  return `${String(date.getUTCDate()).padStart(2, "0")} ${months[date.getUTCMonth()]} ${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

export function operationCode(rows: FlightTurn[]) {
  const date = rows[0]?.sta ?? new Date();
  return `${String(date.getUTCDate()).padStart(2, "0")}${months[date.getUTCMonth()].toUpperCase()}${String(date.getUTCFullYear()).slice(-2)}`;
}
