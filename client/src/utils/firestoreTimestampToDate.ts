// src/utils/firestoreTimestampToDate.ts
import { Timestamp } from "firebase/firestore";

/**
 * Safely convert common Firestore timestamp shapes into a JS Date.
 * Returns null when the input is missing or invalid.
 */
export function firestoreTimestampToDate(value: unknown): Date | null {
  if (value == null) return null;

  // Firestore SDK Timestamp instance
  try {
    // @ts-ignore runtime check for Firestore Timestamp
    if (typeof (value as any)?.toDate === "function") {
      // value is a Firestore Timestamp
      return (value as any).toDate() as Date;
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
    return new Date((value as any).seconds * 1000);
  }

  // ISO string
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // Epoch number (ms or seconds)
  if (typeof value === "number") {
    // Heuristic: if value < 1e12, treat as seconds
    const maybeMs = value < 1e12 ? value * 1000 : value;
    const d = new Date(maybeMs);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}
