import { format } from "date-fns";

/**
 * Safely convert common Firestore timestamp shapes into a formatted date string.
 * Returns "Invalid Date" when the input is missing or invalid.
 */
export function formatFirestoreDate(value: unknown): string {
  if (value == null) return "Invalid Date";

  // Firestore SDK Timestamp instance
  try {
    // @ts-ignore runtime check for Firestore Timestamp
    if (typeof (value as any)?.toDate === "function") {
      // value is a Firestore Timestamp
      const date = (value as any).toDate() as Date;
      return format(date, "MMM dd, yyyy HH:mm");
    }
  } catch (e) {
    // fallthrough to other checks
  }

  // Plain object like { seconds, nanoseconds }
  if (
    typeof value === "object" &&
    value !== null &&
    // @ts-ignore
    typeof (value as any).seconds === "number"
  ) {
    // @ts-ignore
    const date = new Date((value as any).seconds * 1000);
    if (!isNaN(date.getTime())) {
      return format(date, "MMM dd, yyyy HH:mm");
    }
  }

  // ISO string
  if (typeof value === "string") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return format(date, "MMM dd, yyyy HH:mm");
    }
  }

  // Epoch number (ms or seconds)
  if (typeof value === "number") {
    // Heuristic: if value < 1e12, treat as seconds
    const maybeMs = value < 1e12 ? value * 1000 : value;
    const date = new Date(maybeMs);
    if (!isNaN(date.getTime())) {
      return format(date, "MMM dd, yyyy HH:mm");
    }
  }

  return "Invalid Date";
}
