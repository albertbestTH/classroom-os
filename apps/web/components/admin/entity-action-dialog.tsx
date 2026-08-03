"use client";

import { CheckCircle2, XCircle } from "lucide-react";

export type EntityActionFeedback = {
  kind: "success" | "error";
  title: string;
  message: string;
};

export function ConfirmEntityDeleteDialog({
  title,
  description,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  busy: boolean;
  onCancel(): void;
  onConfirm(): void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="alertdialog" aria-modal="true" aria-labelledby="entity-delete-title" aria-describedby="entity-delete-description">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="entity-delete-title" className="text-xl font-bold text-slate-950">{title}</h2>
        <p id="entity-delete-description" className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={onCancel} className="min-h-11 rounded-xl border border-slate-300 px-5 font-semibold disabled:opacity-50">ยกเลิก</button>
          <button type="button" disabled={busy} onClick={onConfirm} className="min-h-11 rounded-xl bg-red-600 px-5 font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:opacity-50">
            {busy ? "กำลังลบ…" : "ยืนยันการลบ"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EntityActionResultDialog({ feedback, onClose }: { feedback: EntityActionFeedback; onClose(): void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="entity-action-result-title">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
        {feedback.kind === "success"
          ? <CheckCircle2 aria-hidden="true" className="mx-auto h-14 w-14 text-emerald-600" strokeWidth={1.9} />
          : <XCircle aria-hidden="true" className="mx-auto h-14 w-14 text-red-600" strokeWidth={1.9} />}
        <h2 id="entity-action-result-title" className="mt-4 text-xl font-bold text-slate-950">{feedback.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{feedback.message}</p>
        <button type="button" onClick={onClose} className="mt-6 min-h-11 w-full rounded-xl bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">ตกลง</button>
      </div>
    </div>
  );
}
