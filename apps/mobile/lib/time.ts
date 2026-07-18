export function formatTimetableTime(value: string): string {
  return value.match(/(?:^|T)(\d{2}:\d{2})(?::\d{2}(?:\.\d{3})?Z?)?$/)?.[1]
    ?? value.match(/\d{2}:\d{2}/)?.[0]
    ?? value;
}
