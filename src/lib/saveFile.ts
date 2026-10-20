/**
 * Hand a generated file to the user. On phones this opens the share sheet (so iOS can
 * "Save to Files"); elsewhere it downloads. Resolves false if the user cancelled.
 */
export async function saveFile(blob: Blob, name: string): Promise<boolean> {
  const file = new File([blob], name, { type: blob.type });
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return true;
    } catch (err) {
      if ((err as DOMException).name === "AbortError") return false;
      // Sharing failed for another reason; fall through to a plain download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
