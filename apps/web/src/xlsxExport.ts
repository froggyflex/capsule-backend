import type { FlightTurn } from "./flightOperations";
import { operationCode } from "./flightOperations";

const encoder = new TextEncoder();

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function zipStore(files: Array<{ name: string; content: string }>) {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const timestamp = dosDateTime(new Date());

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(10, timestamp.time, true);
    view.setUint16(12, timestamp.date, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, name.length, true);
    local.set(name, 30);
    chunks.push(local, data);

    const directory = new Uint8Array(46 + name.length);
    const directoryView = new DataView(directory.buffer);
    directoryView.setUint32(0, 0x02014b50, true);
    directoryView.setUint16(4, 20, true);
    directoryView.setUint16(6, 20, true);
    directoryView.setUint16(12, timestamp.time, true);
    directoryView.setUint16(14, timestamp.date, true);
    directoryView.setUint32(16, crc, true);
    directoryView.setUint32(20, data.length, true);
    directoryView.setUint32(24, data.length, true);
    directoryView.setUint16(28, name.length, true);
    directoryView.setUint32(42, offset, true);
    directory.set(name, 46);
    central.push(directory);
    offset += local.length + data.length;
  }

  const centralSize = central.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  const parts = [...chunks, ...central, end];
  const archive = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let cursor = 0;
  for (const part of parts) {
    archive.set(part, cursor);
    cursor += part.length;
  }
  return new Blob([archive.buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function excelSerial(date: Date) {
  return date.getTime() / 86400000 + 25569;
}

function inlineCell(reference: string, value: string, style = 0) {
  const styleAttribute = style ? ` s="${style}"` : "";
  return `<c r="${reference}"${styleAttribute} t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function numberCell(reference: string, value: number, style = 0) {
  const styleAttribute = style ? ` s="${style}"` : "";
  return `<c r="${reference}"${styleAttribute}><v>${value}</v></c>`;
}

function worksheetXml(rows: FlightTurn[]) {
  const headers = ["", "Flight", "From", "STA", "Pax", "GTM", "Reg.", "Own / Sub", "Flight", "To", "STD", "Pax"];
  const columns = ["H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S"];
  const title = `LS DAILY OPERATIONS - ${operationCode(rows)}`;
  const dataRows = rows.map((row, offset) => {
    const excelRow = offset + 12;
    return `<row r="${excelRow}">` + [
      numberCell(`H${excelRow}`, row.index),
      inlineCell(`I${excelRow}`, row.inboundFlight),
      inlineCell(`J${excelRow}`, row.from),
      numberCell(`K${excelRow}`, excelSerial(row.sta), 1),
      numberCell(`L${excelRow}`, row.inboundPax),
      numberCell(`M${excelRow}`, row.gtm),
      inlineCell(`N${excelRow}`, row.registration),
      inlineCell(`O${excelRow}`, row.operator),
      inlineCell(`P${excelRow}`, row.outboundFlight),
      inlineCell(`Q${excelRow}`, row.to),
      numberCell(`R${excelRow}`, excelSerial(row.std), 1),
      numberCell(`S${excelRow}`, row.outboundPax),
    ].join("") + "</row>";
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="H10:S${Math.max(11, rows.length + 11)}"/>
  <sheetViews><sheetView tabSelected="1" zoomScale="70" zoomScaleNormal="70" workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>
    <col min="8" max="8" width="4" customWidth="1"/>
    <col min="9" max="9" width="12" customWidth="1"/>
    <col min="10" max="10" width="10" customWidth="1"/>
    <col min="11" max="11" width="19" customWidth="1"/>
    <col min="12" max="13" width="8" customWidth="1"/>
    <col min="14" max="14" width="12" customWidth="1"/>
    <col min="15" max="15" width="12" customWidth="1"/>
    <col min="16" max="16" width="12" customWidth="1"/>
    <col min="17" max="17" width="10" customWidth="1"/>
    <col min="18" max="18" width="19" customWidth="1"/>
    <col min="19" max="19" width="8" customWidth="1"/>
  </cols>
  <sheetData>
    <row r="10" ht="22" customHeight="1">${inlineCell("H10", title, 3)}</row>
    <row r="11">${headers.map((header, index) => inlineCell(`${columns[index]}11`, header || "   ", 2)).join("")}</row>
    ${dataRows}
  </sheetData>
  <mergeCells count="1"><mergeCell ref="H10:S10"/></mergeCells>
  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
  <pageSetup paperSize="9" orientation="portrait"/>
</worksheet>`;
}

function workbookFiles(rows: FlightTurn[]) {
  const now = new Date().toISOString();
  return [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    },
    {
      name: "docProps/core.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>Toolbox</dc:creator><cp:lastModifiedBy>Toolbox</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`,
    },
    {
      name: "docProps/app.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Toolbox</Application></Properties>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029"/></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      name: "xl/styles.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><color theme="1"/><name val="Aptos Narrow"/><family val="2"/></font><font><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos Narrow"/><family val="2"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFF0000"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color indexed="64"/></left><right style="thin"><color indexed="64"/></right><top style="thin"><color indexed="64"/></top><bottom style="thin"><color indexed="64"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="22" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    },
    { name: "xl/worksheets/sheet1.xml", content: worksheetXml(rows) },
  ];
}

export function downloadFlightWorkbook(rows: FlightTurn[]) {
  const blob = zipStore(workbookFiles(rows));
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `LS_Daily_Operations_${operationCode(rows)}.xlsx`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
