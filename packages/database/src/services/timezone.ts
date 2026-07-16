import { domainError } from "../domain-errors.js";

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function zonedParts(value: Date, timeZone: string): DateParts {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(value);
  } catch {
    throw domainError("VALIDATION_ERROR", "The school timezone is invalid.");
  }
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

export function localDateForInstant(value: Date, timeZone: string): string {
  const part = zonedParts(value, timeZone);
  return `${part.year}-${String(part.month).padStart(2, "0")}-${String(part.day).padStart(2, "0")}`;
}

export function addLocalDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + days))
    .toISOString()
    .slice(0, 10);
}

export function isoWeekday(localDate: string): number {
  const [year, month, day] = localDate.split("-").map(Number);
  const weekday = new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function localDateTimeToInstant(
  localDate: string,
  clockTime: string,
  timeZone: string,
): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  const clock = /^(\d{2}):(\d{2})$/.exec(clockTime);
  if (!match || !clock) {
    throw domainError("VALIDATION_ERROR", "Date and time must use YYYY-MM-DD and HH:mm.");
  }
  const desired = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(clock[1]),
    Number(clock[2]),
  );
  let candidate = new Date(desired);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const observed = zonedParts(candidate, timeZone);
    const observedAsUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second,
    );
    candidate = new Date(candidate.getTime() + desired - observedAsUtc);
  }
  const finalDate = localDateForInstant(candidate, timeZone);
  const final = zonedParts(candidate, timeZone);
  if (
    finalDate !== localDate ||
    final.hour !== Number(clock[1]) ||
    final.minute !== Number(clock[2])
  ) {
    throw domainError("VALIDATION_ERROR", "The local class time does not exist in the school timezone.");
  }
  return candidate;
}

export function schoolDayBounds(
  timeZone: string,
  now = new Date(),
): { localDate: string; startsAt: Date; endsAt: Date } {
  const localDate = localDateForInstant(now, timeZone);
  return {
    localDate,
    startsAt: localDateTimeToInstant(localDate, "00:00", timeZone),
    endsAt: localDateTimeToInstant(addLocalDays(localDate, 1), "00:00", timeZone),
  };
}
