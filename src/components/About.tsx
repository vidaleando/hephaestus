import { useEffect, useRef } from "react";

/** About sheet, opened from the app name in the header. */
export function About({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="about"
      aria-labelledby="about-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="about-body">
        <h2 id="about-title" className="about-title">
          Hephaestus
        </h2>
        <p>A gym log built around the 5/3/1 programme devised by Jim Wendler.</p>
        <p className="about-credit">Created by Milo and Diego Vidal</p>
        <button type="button" className="secondary" onClick={onClose} autoFocus>
          Close
        </button>
      </div>
    </dialog>
  );
}
