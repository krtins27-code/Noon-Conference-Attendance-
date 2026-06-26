import { useEffect, useState, useCallback } from "react";
import { api, getStoredPasscode, storePasscode, clearStoredPasscode } from "../lib/api.js";

function PasscodeGate({ onUnlock }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setChecking(true);
    setError("");
    storePasscode(passcode);
    try {
      await api.getOrganizerConference();
      onUnlock();
    } catch (err) {
      clearStoredPasscode();
      setError(err.message || "Incorrect passcode.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Organizer Access</h2>
      <input
        type="password"
        inputMode="numeric"
        autoFocus
        className="w-full border rounded-xl px-4 py-3 text-lg"
        placeholder="Passcode"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={checking || !passcode}
        className="w-full py-3 rounded-xl bg-brand-600 disabled:opacity-40 text-white font-semibold"
      >
        {checking ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}

function OrganizerPanel() {
  const [conference, setConference] = useState(null);
  const [topicInput, setTopicInput] = useState("");
  const [attendance, setAttendance] = useState(null);
  const [residents, setResidents] = useState([]);
  const [newName, setNewName] = useState("");
  const [newPgy, setNewPgy] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    api.getOrganizerConference().then((c) => {
      setConference(c);
      setTopicInput(c.topic || "");
    });
    api.getCheckins().then(setAttendance);
    api.getResidents().then(setResidents);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRegenerate() {
    if (!conference) return;
    if (!confirm("Regenerate today's code? The previous code will stop working immediately.")) return;
    const updated = await api.regenerateCode(conference.date);
    setConference(updated);
  }

  async function handleSaveTopic(e) {
    e.preventDefault();
    if (!conference) return;
    const updated = await api.setTopic(conference.date, topicInput);
    setConference(updated);
  }

  async function handleSendReport() {
    if (!conference) return;
    setSending(true);
    setStatus("");
    try {
      const result = await api.sendReport(conference.date);
      setStatus(`Report sent for ${result.date} — ${result.count} present.`);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  async function handleAddResident(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    await api.addResident(newName.trim(), newPgy || null);
    setNewName("");
    setNewPgy("");
    api.getResidents().then(setResidents);
  }

  async function handleRemoveResident(id) {
    if (!confirm("Remove this resident from the roster?")) return;
    await api.removeResident(id);
    api.getResidents().then(setResidents);
  }

  function handleLogout() {
    clearStoredPasscode();
    window.location.reload();
  }

  if (!conference) return <div className="text-gray-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={handleLogout} className="text-sm text-gray-500 underline">
          Lock screen
        </button>
      </div>

      <section className="bg-white rounded-2xl shadow-sm border p-5 space-y-3">
        <h2 className="font-bold text-gray-900">
          Today's Code &mdash; {conference.date}
        </h2>
        <div className="text-4xl font-mono font-bold tracking-widest text-center bg-gray-50 rounded-xl py-4 text-brand-600">
          {conference.check_in_code}
        </div>
        <button
          onClick={handleRegenerate}
          className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium"
        >
          Regenerate Code
        </button>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border p-5 space-y-3">
        <h2 className="font-bold text-gray-900">Topic</h2>
        <form onSubmit={handleSaveTopic} className="flex gap-2">
          <input
            type="text"
            className="flex-1 border rounded-xl px-3 py-2"
            placeholder="e.g. Diabetic Ketoacidosis"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
          />
          <button type="submit" className="px-4 py-2 rounded-xl bg-brand-600 text-white font-medium">
            Save
          </button>
        </form>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border p-5 space-y-3">
        <div className="flex justify-between items-baseline">
          <h2 className="font-bold text-gray-900">Attendance</h2>
          <span className="text-sm text-gray-500">{attendance?.count ?? 0} present</span>
        </div>
        <div className="divide-y max-h-64 overflow-y-auto">
          {(attendance?.checkins ?? []).map((c, i) => (
            <div key={i} className="flex justify-between py-2 text-sm">
              <span>
                {c.resident_name} {c.pgy_level && <span className="text-gray-400">({c.pgy_level})</span>}
              </span>
              <span className="text-gray-500">
                {new Date(c.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
          ))}
          {attendance?.checkins?.length === 0 && (
            <p className="text-gray-500 text-sm py-2">No check-ins yet.</p>
          )}
        </div>
        <button
          onClick={handleSendReport}
          disabled={sending}
          className="w-full py-3 rounded-xl bg-emerald-600 disabled:opacity-40 text-white font-semibold"
        >
          {sending ? "Generating & sending…" : "Generate and Email Report"}
        </button>
        {status && <p className="text-sm text-gray-600">{status}</p>}
      </section>

      <section className="bg-white rounded-2xl shadow-sm border p-5 space-y-3">
        <h2 className="font-bold text-gray-900">Roster</h2>
        <form onSubmit={handleAddResident} className="flex gap-2">
          <input
            type="text"
            className="flex-1 border rounded-xl px-3 py-2"
            placeholder="New resident name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="text"
            className="w-20 border rounded-xl px-2 py-2"
            placeholder="PGY"
            value={newPgy}
            onChange={(e) => setNewPgy(e.target.value)}
          />
          <button type="submit" className="px-3 py-2 rounded-xl bg-brand-600 text-white font-medium">
            Add
          </button>
        </form>
        <div className="divide-y max-h-64 overflow-y-auto">
          {residents.map((r) => (
            <div key={r.id} className="flex justify-between items-center py-2 text-sm">
              <span>
                {r.name} {r.pgy_level && <span className="text-gray-400">({r.pgy_level})</span>}
              </span>
              <button
                onClick={() => handleRemoveResident(r.id)}
                className="text-red-500 text-xs underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function Organizer() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (getStoredPasscode()) {
      api
        .getOrganizerConference()
        .then(() => setUnlocked(true))
        .catch(() => clearStoredPasscode());
    }
  }, []);

  return unlocked ? <OrganizerPanel /> : <PasscodeGate onUnlock={() => setUnlocked(true)} />;
}
