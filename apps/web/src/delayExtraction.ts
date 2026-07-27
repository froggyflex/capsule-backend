export type DelayPair = {
  code: string;
  time: string;
};

export type DelayRow = {
  id: string;
  flightNumber: string;
  delays: [DelayPair, DelayPair, DelayPair, DelayPair];
};

const emptyDelay = (): DelayPair => ({ code: "", time: "" });

function normalizedMinutes(value: string) {
  const clean = value.replace(/[Oo]/g, "0").replace(/[Il|]/g, "1").replace(/\D/g, "");
  if (!clean) return "";
  const total = Number(clean);
  if (!Number.isFinite(total)) return "";
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function parseDelayOcrText(text: string): DelayRow[] {
  const rows: DelayRow[] = [];
  const cleaned = text
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const flightPattern = /\b(?:L[S5]|I[S5]|1[S5])\s*[-:]?\s*([0-9OIl|]{2,5})\b/gi;
  const matches = Array.from(cleaned.matchAll(flightPattern));

  for (let matchIndex = 0; matchIndex < matches.length; matchIndex += 1) {
    const flightMatch = matches[matchIndex];
    const nextMatch = matches[matchIndex + 1];
    const flightNumber = flightMatch[1].replace(/[Oo]/g, "0").replace(/[Il|]/g, "1");
    const segmentStart = (flightMatch.index ?? 0) + flightMatch[0].length;
    const segmentEnd = nextMatch?.index ?? cleaned.length;
    const afterFlight = cleaned.slice(segmentStart, segmentEnd);
    const numericTokens = afterFlight
      .match(/[0-9OIl|]{1,4}/g)
      ?.map((token) => token.replace(/[Oo]/g, "0").replace(/[Il|]/g, "1"))
      .filter((token) => /^\d+$/.test(token)) ?? [];

    const delays: [DelayPair, DelayPair, DelayPair, DelayPair] = [
      emptyDelay(),
      emptyDelay(),
      emptyDelay(),
      emptyDelay(),
    ];
    for (let index = 0; index < 4; index += 1) {
      const code = numericTokens[index * 2] ?? "";
      const minutes = numericTokens[index * 2 + 1] ?? "";
      if (code || minutes) delays[index] = { code, time: normalizedMinutes(minutes) };
    }

    if (delays.some((delay) => delay.code || delay.time)) {
      rows.push({
        id: `${flightNumber}-${rows.length}`,
        flightNumber: `LS ${flightNumber}`,
        delays,
      });
    }
  }
  return rows;
}

export function delayRowsToTsv(rows: DelayRow[], includeHeaders = false) {
  const body = rows.map((row) =>
    row.delays.flatMap((delay) => [delay.code, delay.time]).join("\t"),
  );
  if (!includeHeaders) return body.join("\n");
  return [
    ["DELAY 1", "", "DELAY 2", "", "DELAY 3", "", "DELAY 4", ""].join("\t"),
    ["Code", "Time", "Code", "Time", "Code", "Time", "Code", "Time"].join("\t"),
    ...body,
  ].join("\n");
}
