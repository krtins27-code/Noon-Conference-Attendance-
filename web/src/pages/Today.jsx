import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api.js";

export default function Today() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api
      .getTodayCheckins()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (!data) {
    return <div className="text-gray-500">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border p-4">
        <p className="text-sm text-gray-500">
          {new Date(data.date + "T00:00:00").toLocaleDateString([], {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        {data.topic && <p className="text-gray-700 mt-1">{data.topic}</p>}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-brand-600">{data.count}</span>
          <span className="text-gray-500">checked in</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border divide-y">
        {data.checkins.length === 0 && (
          <p className="text-gray-500 p-4 text-center">No check-ins yet.</p>
        )}
        {data.checkins.map((c, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-gray-900">{c.resident_name}</p>
              {c.pgy_level && <p className="text-xs text-gray-500">{c.pgy_level}</p>}
            </div>
            <span className="text-sm text-gray-500">
              {new Date(c.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
