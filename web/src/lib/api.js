// Relative by default so the deployed site (Netlify serving frontend + functions
// from the same domain) just works with no CORS hop. Local dev overrides this via
// web/.env to point at the locally running Express server.
const API_URL = import.meta.env.VITE_API_URL || "/api";

const PASSCODE_KEY = "organizer_passcode";

export function getStoredPasscode() {
  return sessionStorage.getItem(PASSCODE_KEY) || "";
}

export function storePasscode(passcode) {
  sessionStorage.setItem(PASSCODE_KEY, passcode);
}

export function clearStoredPasscode() {
  sessionStorage.removeItem(PASSCODE_KEY);
}

async function request(path, { method = "GET", body, organizer = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (organizer) {
    headers["x-organizer-passcode"] = getStoredPasscode();
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let error = "Something went wrong.";
    try {
      const data = await res.json();
      error = data.error || error;
    } catch {
      // ignore
    }
    const err = new Error(error);
    err.status = res.status;
    throw err;
  }

  if (res.headers.get("content-type")?.includes("application/json")) {
    return res.json();
  }
  return res.blob();
}

function query(params) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  return q ? `?${q}` : "";
}

async function downloadReport(date, session) {
  const path = `/report/xlsx${query({ date, session })}`;
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "x-organizer-passcode": getStoredPasscode() },
  });
  if (!res.ok) {
    let error = "Failed to generate report.";
    try {
      const data = await res.json();
      error = data.error || error;
    } catch {
      // ignore
    }
    throw new Error(error);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance-${session || "noon"}-${date || "today"}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  getTodayConference: (session) => request(`/conferences/today${query({ session })}`),
  getOrganizerConference: (date, session) =>
    request(`/conferences/today/organizer${query({ date, session })}`, { organizer: true }),
  setDetails: (date, { topic, presenter }, session) =>
    request(`/conferences/${date}/details`, {
      method: "PUT",
      body: { topic, presenter, session },
      organizer: true,
    }),
  regenerateCode: (date, session) =>
    request(`/conferences/${date}/regenerate-code`, { method: "POST", body: { session }, organizer: true }),

  checkIn: (payload) => request("/checkins", { method: "POST", body: payload }),
  getTodayCheckins: (session) => request(`/checkins/today${query({ session })}`),

  downloadReport,
};

export { API_URL };
