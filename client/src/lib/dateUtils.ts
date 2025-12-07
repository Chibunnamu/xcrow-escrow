/**
 * Safely converts Firestore timestamps to readable date strings
 * Handles Timestamp objects {seconds, nanoseconds}, strings, numbers, and Date objects
 * Returns a formatted date string or fallback for invalid values
 */
export function formatFirestoreDate(timestamp: any, fallback: string = "Invalid Date"): string {
  if (!timestamp) return fallback;

  try {
    let date: Date;

    // Handle Firestore Timestamp objects
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      // Firestore Timestamp: { seconds: number, nanoseconds: number }
      date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    }
    // Handle string dates
    else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    }
    // Handle number timestamps (Unix timestamp in milliseconds or seconds)
    else if (typeof timestamp === 'number') {
      // If it's a reasonable Unix timestamp in seconds (before 2038), convert to milliseconds
      if (timestamp < 2147483648) {
        date = new Date(timestamp * 1000);
      } else {
        date = new Date(timestamp);
      }
    }
    // Handle Date objects
    else if (timestamp instanceof Date) {
      date = timestamp;
    }
    // Handle objects with toDate method (Firestore Timestamps)
    else if (timestamp && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    }
    else {
      return fallback;
    }

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return fallback;
    }

    // Format as "2025-01-15 09:20 AM"
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    return `${year}-${month}-${day} ${displayHours}:${minutes} ${ampm}`;
  } catch (error) {
    return fallback;
  }
}

/**
 * Alternative function that returns just the date part (YYYY-MM-DD)
 */
export function formatFirestoreDateOnly(timestamp: any, fallback: string = "Invalid Date"): string {
  const fullDate = formatFirestoreDate(timestamp, fallback);
  if (fullDate === fallback) return fallback;
  return fullDate.split(' ')[0];
}

/**
 * Alternative function that returns just the time part (HH:MM AM/PM)
 */
export function formatFirestoreTimeOnly(timestamp: any, fallback: string = "Invalid Time"): string {
  const fullDate = formatFirestoreDate(timestamp, fallback);
  if (fullDate === fallback) return fallback;
  return fullDate.split(' ').slice(1).join(' ');
}
