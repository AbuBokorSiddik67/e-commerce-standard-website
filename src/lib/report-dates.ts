// Bangladesh business dates use UTC+06:00 year-round. Keep the date labels as
// calendar dates and convert only the query boundaries to UTC instants.
const DAY_MS = 86_400_000;
const OFFSET_MS = 6 * 3_600_000;

export function bangladeshDate(date = new Date()) {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

function validDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function bangladeshDayStart(date: string) {
  return new Date(`${date}T00:00:00+06:00`);
}

export function reportDates(from?: string | null, to?: string | null, now = new Date()) {
  const toDate = validDate(to) ? to : bangladeshDate(now);
  const endDay = bangladeshDayStart(toDate);
  const defaultFrom = bangladeshDate(new Date(endDay.getTime() - 29 * DAY_MS));
  const fromDate = validDate(from) && from <= toDate ? from : defaultFrom;
  return {
    fromDate, toDate, dateFrom: bangladeshDayStart(fromDate), dateTo: new Date(endDay.getTime() + DAY_MS - 1),
  };
}
