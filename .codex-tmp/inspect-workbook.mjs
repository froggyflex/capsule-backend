import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourcePath = "C:/Users/User/Downloads/25JUL26.xlsx";
const outputDir = "C:/Users/User/capsule-backend/.codex-tmp/workbook-preview";

await fs.mkdir(outputDir, { recursive: true });

const input = await FileBlob.load(sourcePath);
const workbook = await SpreadsheetFile.importXlsx(input);

const overview = await workbook.inspect({
  kind: "workbook,sheet,table,definedName,drawing",
  maxChars: 12000,
  tableMaxRows: 12,
  tableMaxCols: 24,
  tableMaxCellChars: 100,
});
console.log("OVERVIEW");
console.log(overview.ndjson);

for (let index = 0; index < workbook.worksheets.items.length; index += 1) {
  const sheet = workbook.worksheets.getItemAt(index);
  const used = sheet.getUsedRange();
  console.log(`SHEET ${index + 1}: ${sheet.name}`);
  if (used) {
    const region = await workbook.inspect({
      kind: "region",
      sheetId: sheet.name,
      range: used.address,
      maxChars: 16000,
      tableMaxRows: 80,
      tableMaxCols: 30,
      tableMaxCellChars: 120,
    });
    console.log(region.ndjson);

    const formulas = await workbook.inspect({
      kind: "formula",
      sheetId: sheet.name,
      range: used.address,
      maxChars: 6000,
      options: { maxResults: 100 },
    });
    console.log("FORMULAS");
    console.log(formulas.ndjson);

    const styles = await workbook.inspect({
      kind: "computedStyle",
      sheetId: sheet.name,
      range: used.address,
      maxChars: 8000,
    });
    console.log("STYLES");
    console.log(styles.ndjson);
  }

  const preview = await workbook.render({
    sheetName: sheet.name,
    autoCrop: "all",
    scale: 1.5,
    format: "png",
  });
  const safeName = sheet.name.replace(/[<>:"/\\|?*]+/g, "_");
  await fs.writeFile(
    path.join(outputDir, `${index + 1}-${safeName}.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );
}
