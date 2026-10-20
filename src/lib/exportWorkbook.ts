// Builds an .xlsx in the layout of the original "531 Diego.xlsx": the 531 cycle sheet,
// Program, 531 Archive, Assistance Archive and Bodyweight. Cells keep the spreadsheet's
// formulas so the file keeps working in Excel; each formula carries its computed result
// so previews (Files, Quick Look) show numbers too.
import type { Cell, Worksheet } from "exceljs";
import { convert, estimated1RM, sameExercise, todayISO } from "./lifting";
import {
  DAYS,
  LIFT_NAMES,
  roundToPlate,
  trainingMax,
  WEEK_SETS,
  type Day,
  type Lift,
  type TrainingMaxes,
  type Week,
} from "./programme";
import type { Bodyweight, Entry, Unit } from "./types";

interface ExportInput {
  entries: Entry[];
  maxes: TrainingMaxes;
  weights: Bodyweight[];
  unit: Unit;
}

/** Sheet order and rows, as in the original. */
const LIFT_ORDER: Lift[] = ["bench", "squat", "deadlift", "ohp"];
const MAX_ROW: Record<Lift, number> = { bench: 3, squat: 4, deadlift: 5, ohp: 6 };
const BLOCK_ROW: Record<Lift, number> = { bench: 9, squat: 16, deadlift: 23, ohp: 30 };
/** Reps, Weight and Y/N columns for each week. */
const WEEK_COLS: Record<Week, [string, string, string]> = { 1: ["C", "D", "E"], 2: ["F", "G", "H"], 3: ["I", "J", "K"] };
const WEEKS: Week[] = [1, 2, 3];

const byDateAsc = (a: Entry, b: Entry) =>
  a.performed_on === b.performed_on ? (a.created_at < b.created_at ? -1 : 1) : a.performed_on < b.performed_on ? -1 : 1;

const is531 = (e: Entry, lift: Lift) => !!e.set_results && sameExercise(e.exercise, LIFT_NAMES[lift]);

function formula(cell: Cell, f: string, result: number | string | null) {
  cell.value = result === null ? { formula: f } : { formula: f, result };
}

function bold(ws: Worksheet, ...addresses: string[]) {
  for (const a of addresses) ws.getCell(a).font = { bold: true };
}

const floor25 = (n: number) => 2.5 * Math.floor(n / 2.5);

export async function buildWorkbook({ entries, maxes, weights, unit }: ExportInput): Promise<Blob> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Hephaestus";
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;

  build531Sheet(wb.addWorksheet("531"), entries, maxes);
  buildProgramSheet(wb.addWorksheet("Program"));
  buildArchiveSheet(wb.addWorksheet("531 Archive"), entries);
  buildAssistanceSheet(wb.addWorksheet("Assistance Archive"), entries);
  buildBodyweightSheet(wb.addWorksheet("Bodyweight"), weights, unit);

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function exportFileName(): string {
  return `Hephaestus 531 ${todayISO()}.xlsx`;
}

/** The cycle sheet: maxes, the three weeks for each lift with Y/N and + set reps, suggestions. */
function build531Sheet(ws: Worksheet, entries: Entry[], maxes: TrainingMaxes) {
  ws.getCell("A1").value = "531 Hybrid";
  ws.getCell("A1").font = { bold: true, size: 14 };

  ["Lift", "Max", "Training max", 'New "Max"', "Goal"].forEach((h, i) => (ws.getCell(2, 2 + i).value = h));
  bold(ws, "B2", "C2", "D2", "E2", "F2");

  // + set reps and weight per lift and week, for the summary and suggestion blocks
  const logged: Record<Lift, Record<Week, { reps: number | null; weight: number | null }>> = {
    bench: { 1: { reps: null, weight: null }, 2: { reps: null, weight: null }, 3: { reps: null, weight: null } },
    squat: { 1: { reps: null, weight: null }, 2: { reps: null, weight: null }, 3: { reps: null, weight: null } },
    deadlift: { 1: { reps: null, weight: null }, 2: { reps: null, weight: null }, 3: { reps: null, weight: null } },
    ohp: { 1: { reps: null, weight: null }, 2: { reps: null, weight: null }, 3: { reps: null, weight: null } },
  };

  // The latest logged session of each lift in each week makes up the current cycle
  const latest = (lift: Lift, week: Week) =>
    entries.filter((e) => is531(e, lift) && e.program_week === week).sort(byDateAsc).pop();

  for (const lift of LIFT_ORDER) {
    const m = MAX_ROW[lift];
    const r = BLOCK_ROW[lift];
    const logRow = r + 5;
    const max = maxes[lift];
    const tm = max == null ? null : trainingMax(max);

    // Top table
    ws.getCell(`B${m}`).value = LIFT_NAMES[lift];
    ws.getCell(`C${m}`).value = max;
    formula(ws.getCell(`D${m}`), `C${m}*0.9`, tm);

    // Lift block header
    ws.getCell(`B${r}`).value = LIFT_NAMES[lift];
    ws.getCell(`B${r}`).font = { bold: true };
    ws.getCell(`C${r}`).value = "Week 1";
    ws.getCell(`F${r}`).value = "Week 2";
    ws.getCell(`I${r}`).value = "Week 3";
    bold(ws, `C${r}`, `F${r}`, `I${r}`);
    ws.getCell(`B${r + 1}`).value = "Set";
    for (const w of WEEKS) {
      const [rc, wc, yc] = WEEK_COLS[w];
      ws.getCell(`${rc}${r + 1}`).value = "Reps";
      ws.getCell(`${wc}${r + 1}`).value = "Weight";
      ws.getCell(`${yc}${r + 1}`).value = "Y/N";
    }
    bold(ws, ...["B", "C", "D", "E", "F", "G", "H", "I", "J", "K"].map((c) => `${c}${r + 1}`));

    let week3Increase: number | null = 0;
    for (const w of WEEKS) {
      const [rc, wc, yc] = WEEK_COLS[w];
      const entry = latest(lift, w);
      const sets = WEEK_SETS[w];

      sets.forEach((set, i) => {
        const row = r + 2 + i;
        ws.getCell(`B${row}`).value = i + 1;
        ws.getCell(`${rc}${row}`).value = set.amrap ? `${set.reps}+` : set.reps;
        formula(
          ws.getCell(`${wc}${row}`),
          `2.5*ROUND(${set.percent / 100}*$D$${m}/2.5,0)`,
          tm == null ? null : roundToPlate((set.percent / 100) * tm),
        );
        const made = entry?.set_results?.[i];
        ws.getCell(`${yc}${row}`).value = made === undefined ? null : made ? 1 : 0;
      });

      // Log row: reps on the + set, its weight, and the training max increase it earns
      const reps = entry?.amrap_reps ?? null;
      const base = sets[2].reps;
      const topWeight = tm == null ? null : roundToPlate((sets[2].percent / 100) * tm);
      ws.getCell(`B${logRow}`).value = "Log";
      ws.getCell(`${rc}${logRow}`).value = reps;
      formula(ws.getCell(`${wc}${logRow}`), `2.5*ROUND(${wc}${r + 4}/2.5,0)`, topWeight);
      const increase = reps && reps > 0 && tm != null ? floor25(0.01 * (reps - base) * tm) : tm == null ? null : 0;
      formula(
        ws.getCell(`${yc}${logRow}`),
        `IF(${rc}${logRow}>0,2.5*FLOOR(0.01*(${rc}${logRow}-${base})*$D$${m}/2.5,1),0)`,
        increase,
      );
      if (w === 3) week3Increase = increase;
      logged[lift][w] = { reps, weight: topWeight };
    }
    // Only the lift block's own columns: the suggestion block to the right shares these rows
    bold(ws, ...["B", "C", "D", "E", "F", "G", "H", "I", "J", "K"].map((c) => `${c}${logRow}`));

    formula(ws.getCell(`E${m}`), `D${m}+K${logRow}`, tm == null ? null : tm + (week3Increase ?? 0));
  }

  // 1RM calculator
  ws.getCell("H2").value = "1RM calculator";
  ws.getCell("H2").font = { bold: true };
  ws.getCell("H3").value = "Num reps";
  ws.getCell("H4").value = "Weight";
  ws.getCell("H5").value = "1RM";
  ws.getCell("I5").value = { formula: 'IF(I4>0,36*I4/(37-I3),"")' };

  // Summary for easy archiving: + set reps and weight per week
  ws.getCell("R2").value = "Summary for easy archiving";
  ws.getCell("R2").font = { bold: true };
  const SUMMARY_COL: Record<Lift, [string, string]> = { bench: ["M", "N"], squat: ["P", "Q"], deadlift: ["S", "T"], ohp: ["V", "W"] };
  for (const lift of LIFT_ORDER) {
    const [rc, wc] = SUMMARY_COL[lift];
    ws.getCell(`${rc}4`).value = LIFT_NAMES[lift];
    ws.getCell(`${rc}4`).font = { bold: true };
    const logRow = BLOCK_ROW[lift] + 5;
    WEEKS.forEach((w, i) => {
      const [lr, lw] = WEEK_COLS[w];
      const { reps, weight } = logged[lift][w];
      formula(ws.getCell(`${rc}${5 + i}`), `IF(${lr}${logRow}="","",${lr}${logRow})`, reps ?? "");
      formula(ws.getCell(`${wc}${5 + i}`), `${lw}${logRow}`, weight);
    });
  }

  // Suggested weight increase for the next cycle
  ws.getCell("N9").value = "Suggested Weight Increase";
  ws.getCell("N9").font = { bold: true };
  ws.getCell("N10").value = "Low";
  ws.getCell("O10").value = "Ave";
  ws.getCell("P10").value = "High";
  bold(ws, "N10", "O10", "P10");
  LIFT_ORDER.forEach((lift, i) => {
    const row = 11 + i;
    const m = MAX_ROW[lift];
    const L = BLOCK_ROW[lift] + 5;
    const part = (col: string, base: number) => `2.5*FLOOR(0.01*(${col}${L}-${base})*D${m}/2.5,1)`;
    const parts = `${part("I", 1)},${part("F", 3)},${part("C", 5)}`;
    const mean = `2.5*FLOOR((0.01*(I${L}-1)*D${m}+0.01*(F${L}-3)*D${m}+0.01*(C${L}-5)*D${m})/(3*2.5),1)`;
    // Same arithmetic as the formulas, with empty cells counting as 0 the way Excel does
    const max = maxes[lift];
    const d = max == null ? null : trainingMax(max);
    const r1 = logged[lift][1].reps ?? 0;
    const r2 = logged[lift][2].reps ?? 0;
    const r3 = logged[lift][3].reps ?? 0;
    const each = d == null ? [0, 0, 0] : [floor25(0.01 * (r3 - 1) * d), floor25(0.01 * (r2 - 3) * d), floor25(0.01 * (r1 - 5) * d)];
    const avg = d == null ? 0 : floor25((0.01 * (r3 - 1) * d + 0.01 * (r2 - 3) * d + 0.01 * (r1 - 5) * d) / 3);
    ws.getCell(`M${row}`).value = LIFT_NAMES[lift];
    formula(ws.getCell(`N${row}`), `IF(I${L}>0,MIN(${parts}),0)`, r3 > 0 ? Math.min(...each) : 0);
    formula(ws.getCell(`O${row}`), `IF(${mean}>0,${mean},0)`, avg > 0 ? avg : 0);
    formula(ws.getCell(`P${row}`), `IF(C${L}>0,MAX(${parts}),0)`, r1 > 0 ? Math.max(...each) : 0);
  });

  ws.getColumn("A").width = 4;
  ws.getColumn("B").width = 11;
  for (const c of ["C", "D", "E", "F", "G", "H", "I", "J", "K"]) ws.getColumn(c).width = 9;
  ws.getColumn("D").width = 12;
  ws.getColumn("E").width = 10;
  ws.getColumn("H").width = 14;
  ws.getColumn("M").width = 10;
  ws.getColumn("N").width = 10;
  ws.getColumn("R").width = 26;
}

/** The programme's three days, as in the original Program sheet. */
function buildProgramSheet(ws: Worksheet) {
  const DAY_COL: Record<Day, number> = { 1: 2, 2: 7, 3: 12 };
  for (const day of [1, 2, 3] as Day[]) {
    const c = DAY_COL[day];
    ws.getCell(3, c).value = `Day ${day}`;
    ws.getCell(3, c).font = { bold: true };
    ["Exercise", "Reps", "Sets", "Weight"].forEach((h, i) => {
      ws.getCell(4, c + i).value = h;
      ws.getCell(4, c + i).font = { bold: true };
    });
    DAYS[day].forEach((item, i) => {
      const row = 5 + i;
      ws.getCell(row, c).value = item.name;
      if (item.kind === "531") {
        ws.getCell(row, c + 1).value = 531;
        ws.getCell(row, c + 2).value = 531;
        ws.getCell(row, c + 3).value = 531;
      } else {
        ws.getCell(row, c + 1).value = item.reps;
        ws.getCell(row, c + 2).value = item.sets;
        ws.getCell(row, c + 3).value = item.weight || "BW";
      }
    });
    ws.getColumn(c).width = 18;
  }
}

/** Every + set of each main lift, oldest first, with its Brzycki estimated 1RM. */
function buildArchiveSheet(ws: Worksheet, entries: Entry[]) {
  LIFT_ORDER.forEach((lift, i) => {
    const c = 1 + i * 3;
    ws.getCell(1, c).value = LIFT_NAMES[lift];
    ws.getCell(1, c).font = { bold: true };
    ["Reps", "Weight", "E1RM"].forEach((h, j) => {
      ws.getCell(2, c + j).value = h;
      ws.getCell(2, c + j).font = { bold: true };
    });
    const plusSets = entries.filter((e) => is531(e, lift) && e.amrap_reps != null).sort(byDateAsc);
    plusSets.forEach((e, k) => {
      const row = 3 + k;
      const reps = e.amrap_reps!;
      const weight = convert(e.weight, e.unit, "kg");
      const repsCell = ws.getCell(row, c);
      const weightCell = ws.getCell(row, c + 1);
      repsCell.value = reps;
      weightCell.value = weight;
      formula(
        ws.getCell(row, c + 2),
        `IF(${weightCell.address}>0,36*${weightCell.address}/(37-${repsCell.address}),"")`,
        reps > 0 ? Math.round(estimated1RM(weight, reps) * 100) / 100 : weight,
      );
      ws.getCell(row, c + 2).numFmt = "0.0";
      if (e.performed_on) ws.getCell(row, c).note = `${e.performed_on}${e.program_week ? ` · Week ${e.program_week}` : ""}`;
    });
  });
}

/** Everything logged that isn't a 5/3/1 main lift session. */
function buildAssistanceSheet(ws: Worksheet, entries: Entry[]) {
  const headers = ["Date", "Exercise", "Weight", "Unit", "Reps", "Sets", "Week", "Day"];
  ws.addRow(headers).font = { bold: true };
  for (const e of entries.filter((x) => !x.set_results).sort(byDateAsc)) {
    ws.addRow([
      new Date(e.performed_on + "T12:00:00"),
      e.exercise,
      e.weight || "BW",
      e.weight ? e.unit : "",
      e.reps,
      e.sets,
      e.program_week ?? "",
      e.program_day ?? "",
    ]);
  }
  ws.getColumn(1).numFmt = "yyyy-mm-dd";
  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 20;
}

/** Weigh-ins with the % change from the one before (the original's "Bp" column). */
function buildBodyweightSheet(ws: Worksheet, weights: Bodyweight[], unit: Unit) {
  ws.getCell("A2").value = "Date";
  ws.getCell("B2").value = "B";
  ws.getCell("C2").value = "Bp";
  bold(ws, "A2", "B2", "C2");
  const rows = [...weights].sort((a, b) =>
    a.measured_on === b.measured_on ? (a.created_at < b.created_at ? -1 : 1) : a.measured_on < b.measured_on ? -1 : 1,
  );
  let prev: number | null = null;
  rows.forEach((w, i) => {
    const row = 3 + i;
    const value = Math.round(convert(w.weight, w.unit, unit) * 10) / 10;
    ws.getCell(`A${row}`).value = new Date(w.measured_on + "T12:00:00");
    ws.getCell(`A${row}`).numFmt = "yyyy-mm-dd";
    ws.getCell(`B${row}`).value = value;
    if (prev !== null) {
      formula(ws.getCell(`C${row}`), `IF(B${row}=0,"",((B${row}-B${row - 1})*100/B${row - 1}))`, ((value - prev) * 100) / prev);
      ws.getCell(`C${row}`).numFmt = "0.00";
    }
    prev = value;
  });
  ws.getCell("E2").value = `Weights in ${unit}`;
  ws.getColumn("A").width = 12;
}
