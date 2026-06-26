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

export const api = {
  getResidents: () => request("/residents"),
  addResident: (name, pgy_level) =>
    request("/residents", { method: "POST", body: { name, pgy_level }, organizer: true }),
  updateResident: (id, data) =>
    request(`/residents/${id}`, { method: "PUT", body: data, organizer: true }),
  removeResident: (id) => request(`/residents/${id}`, { method: "DELETE", organizer: true }),

  getTodayConference: () => request("/conferences/today"),
  getOrganizerConference: (date) =>
    request(`/conferences/today/organizer${date ? `?date=${date}` : ""}`, { organizer: true }),
  setTopic: (date, topic) =>
    request(`/conferences/${date}/topic`, { method: "PUT", body: { topic }, organizer: true }),
  regenerateCode: (date) =>
    request(`/conferences/${date}/regenerate-code`, { method: "POST", organizer: true }),

  checkIn: (payload) => request("/checkins", { method: "POST", body: payload }),
  getTodayCheckins: () => request("/checkins/today"),
  getCheckins: (date) => request(`/checkins${date ? `?date=${date}` : ""}`, { organizer: true }),

  sendReport: (date) => request("/report/send", { method: "POST", body: { date }, organizer: true }),
};

export { API_URL };
