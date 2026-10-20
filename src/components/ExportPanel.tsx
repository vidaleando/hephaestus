import { useState } from "react";
import type { TrainingMaxes } from "../lib/programme";
import { saveFile } from "../lib/saveFile";
import type { Bodyweight, Entry, Unit } from "../lib/types";

interface Props {
  entries: Entry[];
  maxes: TrainingMaxes;
  weights: Bodyweight[];
  unit: Unit;
  toast: (message: string) => void;
}

/** Download everything as an .xlsx in the layout of Brad's 5/3/1 spreadsheet. */
export function ExportPanel({ entries, maxes, weights, unit, toast }: Props) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const { buildWorkbook, exportFileName } = await import("../lib/exportWorkbook");
      const blob = await buildWorkbook({ entries, maxes, weights, unit });
      if (await saveFile(blob, exportFileName())) toast("Excel file ready");
    } catch {
      toast("Couldn't create the Excel file. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel export">
      <div>
        <h2>Export</h2>
        <p className="hint">
          Your current cycle, the programme, every + set, everything else you've logged, and your body weight, in the
          layout of Brad's 5/3/1.
        </p>
      </div>
      <button type="button" className="secondary" onClick={download} disabled={busy}>
        {busy ? "Preparing…" : "Download Excel file"}
      </button>
    </div>
  );
}
