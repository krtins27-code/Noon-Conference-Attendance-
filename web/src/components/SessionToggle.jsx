import { SESSIONS, SESSION_LABELS } from "../lib/sessions.js";

// Reusable Morning / Noon segmented control.
export default function SessionToggle({ value, onChange }) {
  return (
    <div role="tablist" className="flex w-full rounded-xl border bg-white p-1">
      {SESSIONS.map((s) => (
        <button
          key={s}
          type="button"
          role="tab"
          aria-selected={value === s}
          onClick={() => onChange(s)}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
            value === s ? "bg-brand-600 text-white" : "text-gray-600"
          }`}
        >
          {SESSION_LABELS[s]}
        </button>
      ))}
    </div>
  );
}
