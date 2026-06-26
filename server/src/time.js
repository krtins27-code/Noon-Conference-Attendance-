import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export const TIME_ZONE = process.env.TIME_ZONE || "America/New_York";

export function todayDateString() {
  return dayjs().tz(TIME_ZONE).format("YYYY-MM-DD");
}

export function nowIso() {
  return dayjs().tz(TIME_ZONE).format();
}

export function formatDisplayDate(dateStr) {
  return dayjs.tz(dateStr, TIME_ZONE).format("MMMM D, YYYY");
}

export function formatDisplayTime(isoStr) {
  return dayjs(isoStr).tz(TIME_ZONE).format("h:mm A");
}

export { dayjs };
