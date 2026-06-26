import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";

const PGY_OPTIONS = ["PGY-1", "PGY-2", "PGY-3", "Attending"];

export default function CheckIn() {
  const [conference, setConference] = useState(null);
  const [name, setName] = useState("");
  const [pgy, setPgy] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    api.getTodayConference().then(setConference).catch(() => {});
  }, []);

  const canSubmit = useMemo(
    () => name.trim().length > 0 && pgy.length > 0 && code.trim().length > 0 && !submitting,
    [name, pgy, code, submitting]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(null);
    setSubmitting(true);
    try {
      const result = await api.checkIn({
        resident_name: name.trim(),
        pgy_level: pgy,
        code: code.trim(),
      });
      setSuccess(result);
      setCode("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    const time = new Date(success.timestamp).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-6 text-center space-y-3">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-bold text-gray-900">You're checked in!</h2>
        <p className="text-gray-600">
          {success.resident_name} &mdash; {time}
        </p>
        <button
          className="mt-2 w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-medium"
          onClick={() => {
            setSuccess(null);
            setName("");
            setPgy("");
          }}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-white rounded-2xl shadow-sm border p-4">
        <p className="text-sm text-gray-500">Today's conference</p>
        <p className="text-lg font-semibold text-gray-900">
          {conference
            ? new Date(conference.date + "T00:00:00").toLocaleDateString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
              })
            : "Loading…"}
        </p>
        {conference?.topic && <p className="text-gray-600 mt-1">{conference.topic}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Your name</label>
        <input
          type="text"
          className="w-full border rounded-xl px-4 py-3 text-base"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">PGY level</label>
        <select
          className="w-full border rounded-xl px-4 py-3 text-base bg-white"
          value={pgy}
          onChange={(e) => setPgy(e.target.value)}
        >
          <option value="">Select…</option>
          {PGY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Today's check-in code</label>
        <input
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          className="w-full border rounded-xl px-4 py-3 text-2xl text-center tracking-widest font-mono uppercase"
          placeholder="CODE"
          maxLength={12}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <p className="text-xs text-gray-500">Ask your organizer for today's code.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full py-4 rounded-xl bg-brand-600 disabled:opacity-40 text-white font-semibold text-lg active:scale-[0.99] transition"
      >
        {submitting ? "Checking in…" : "Check In"}
      </button>
    </form>
  );
}
