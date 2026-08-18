import { useEffect, useState, useCallback } from "react";
import { api, getStoredPasscode, storePasscode, clearStoredPasscode } from "../lib/api.js";
import { defaultSession, SESSION_LABELS } from "../lib/sessions.js";
import SessionToggle from "../components/SessionToggle.jsx";

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
      await api.getOrganizerConference(undefined, defaultSession());
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
  const [session, setSession] = useState(() => defaultSession());
  const [conference, setConference] = useState(null);
  const [topicInput, setTopicInput] = useState("");
  const [presenterInput, setPresenterInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");

  const load = useCallback(() => {
    setConference(null);
    api.getOrganizerConference(undefined, session).then((c) => {
      setConference(c);
      setTopicInput(c.topic || "");
      setPresenterInput(c.presenter || "");
    });
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRegenerate() {
    if (!conference) return;
    if (!confirm(`Regenerate the ${SESSION_LABELS[session]} code? The previous code will stop working immediately.`))
      return;
    const updated = await api.regenerateCode(conference.date, session);
    setConference(updated);
  }

  async function handleSaveDetails(e) {
    e.preventDefault();
    if (!conference) return;
    setSaving(true);
    setStatus("");
    try {
      const updated = await api.setDetails(conference.date, { topic: topicInput, presenter: presenterInput }, session);
      setConference(updated);
      setStatus("Saved.");
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateReport() {
    if (!conference) return;
    setGenerating(true);
    setStatus("");
    try {
      await api.downloadReport(conference.date, session);
      setStatus("Report downloaded.");
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }

  function handleLogout() {
    clearStoredPasscode();
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <SessionToggle value={session} onChange={setSession} />
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500 underline whitespace-nowrap">
          Lock screen
        </button>
      </div>

      {!conference ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <>
          <section className="bg-white rounded-2xl shadow-sm border p-5 space-y-3">
            <h2 className="font-bold text-gray-900">
              {SESSION_LABELS[session]} Code &mdash; {conference.date}
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
            <h2 className="font-bold text-gray-900">Topic &amp; Presenter</h2>
            <form onSubmit={handleSaveDetails} className="space-y-3">
              <input
                type="text"
                className="w-full border rounded-xl px-3 py-2"
                placeholder="Topic — e.g. Diabetic Ketoacidosis"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
              />
              <input
                type="text"
                className="w-full border rounded-xl px-3 py-2"
                placeholder="Presenter — e.g. Dr. Patel"
                value={presenterInput}
                onChange={(e) => setPresenterInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-brand-600 disabled:opacity-40 text-white font-medium"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </form>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border p-5 space-y-3">
            <h2 className="font-bold text-gray-900">Report</h2>
            <p className="text-sm text-gray-500">
              Excel file with name, PGY level, date, session, topic, presenter, and check-in time for
              the {SESSION_LABELS[session]} conference.
            </p>
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className="w-full py-3 rounded-xl bg-emerald-600 disabled:opacity-40 text-white font-semibold"
            >
              {generating ? "Generating…" : "Generate Report"}
            </button>
          </section>

          {status && <p className="text-sm text-gray-600">{status}</p>}
        </>
      )}
    </div>
  );
}

export default function Organizer() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (getStoredPasscode()) {
      api
        .getOrganizerConference(undefined, defaultSession())
        .then(() => setUnlocked(true))
        .catch(() => clearStoredPasscode());
    }
  }, []);

  return unlocked ? <OrganizerPanel /> : <PasscodeGate onUnlock={() => setUnlocked(true)} />;
}
