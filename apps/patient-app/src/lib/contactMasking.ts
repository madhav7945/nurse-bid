// ═══════════════════════════════════════════════════════════════════════════════
// Privacy & Contact Masking Engine — Single Source of Truth
// Strictly enforces privacy protection until Protected Care Deposit is funded.
// Replaces phone numbers with "[Protected Contact - Unlocked upon booking]"
// and email addresses with "[Protected Email - Unlocked upon booking]".
// Automatically unmasks upon booking confirmation + deposit, and re-masks on dispute.
// ═══════════════════════════════════════════════════════════════════════════════

export const PHONE_MASK_REPLACEMENT = "[Protected Contact - Unlocked upon booking]";
export const EMAIL_MASK_REPLACEMENT = "[Protected Email - Unlocked upon booking]";
export const ADDRESS_MASK_REPLACEMENT = "[Protected Address - Unlocked upon booking]";

// Standard and obfuscated email regex
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const OBFUSCATED_EMAIL_REGEX = /[a-zA-Z0-9._%+-]+\s*(?:@|\[at\]|\(at\)|\bat\b)\s*[a-zA-Z0-9.-]+\s*(?:\.|\bdot\b|\[dot\]|\(dot\))\s*(?:com|in|org|net|co|io|edu|gov|ai|gmail|yahoo|outlook|hotmail)/gi;
const EMAIL_PROVIDER_REGEX = /\b[a-zA-Z0-9._%+-]+\s*(?:@|at)\s*(?:gmail|yahoo|outlook|hotmail|icloud|protonmail)\b/gi;

// Indian phone patterns: +91, 0 prefix, spaced/hyphenated digits, 10-digit mobiles starting with 6-9
const PHONE_REGEX = /(?:\+?91[\s.-]?)?(?:0)?[6-9](?:[\s.-]?\d){9}\b/g;
const SPACED_DIGITS_PHONE_REGEX = /\b[6-9](?:\s*\d){9}\b/g;
const BARE_DIGITS_REGEX = /\b\d{10,12}\b/g;

// External channels (WhatsApp, Telegram, UPI handles)
const WHATSAPP_REGEX = /(?:wa\.me|api\.whatsapp\.com)\/\d+/gi;
const UPI_REGEX = /[a-zA-Z0-9._-]+@(?:paytm|ybl|okicici|okhdfcbank|oksbi|apl|axl|ibl|upi|gpay|phonepe|freecharge|airtel|jio|kotak|indus|axis|hdfc|icici|sbi|bob|pnb|barodampay|federal|rbl|yes|citi|sc|idbi|dbs|hsbc|idfcfirst)\b/gi;
const SOCIAL_REGEX = /\b(?:whatsapp|wa|telegram|tg|instagram|insta|facebook|fb|call\s*me\s*at|call\s*on|ping\s*me\s*at|reach\s*me\s*at|msg\s*on)\s*(?::|at|on)?\s*[@a-zA-Z0-9._+-]+/gi;

/**
 * Checks if a booking's escrow deposit is funded and active.
 * Re-masks automatically if status is 'disputed' or 'refunded'.
 */
export function isBookingDepositFunded(bookingStatus?: string | null, escrowStatus?: string | null): boolean {
  if (!bookingStatus && !escrowStatus) return false;
  
  const bStatus = (bookingStatus || "").toLowerCase().trim();
  const eStatus = (escrowStatus || "").toLowerCase().trim();

  // If explicitly disputed, cancelled, or refunded, strictly mask
  if (bStatus === "disputed" || eStatus === "disputed" || bStatus === "cancelled" || eStatus === "refunded") {
    return false;
  }

  // Pre-escrow or inquiry or pending must always be masked
  if (eStatus === "pre_escrow" || bStatus === "inquiry" || bStatus === "pending" || bStatus === "vetting") {
    return false;
  }

  // Both booking must be confirmed/active AND escrow must be funded/held/released
  const isBookingActive = bStatus === "confirmed" || bStatus === "active" || bStatus === "funded" || bStatus === "completed";
  const isEscrowSecured = eStatus === "held" || eStatus === "funded" || eStatus === "released";

  return isBookingActive && isEscrowSecured;
}

/**
 * Masks contact and address information in a chat message text.
 * @param text - The raw message string
 * @param isEscrowFunded - Whether the booking has a funded Protected Care Deposit
 */
export function maskContactInfo(text: string, isEscrowFunded: boolean): string {
  if (isEscrowFunded) return text;
  if (!text) return text;

  let masked = text;

  // 1. Mask Emails
  masked = masked.replace(EMAIL_REGEX, EMAIL_MASK_REPLACEMENT);
  masked = masked.replace(OBFUSCATED_EMAIL_REGEX, EMAIL_MASK_REPLACEMENT);
  masked = masked.replace(EMAIL_PROVIDER_REGEX, EMAIL_MASK_REPLACEMENT);

  // 2. Mask Phone Numbers & WhatsApp
  masked = masked.replace(WHATSAPP_REGEX, PHONE_MASK_REPLACEMENT);
  masked = masked.replace(PHONE_REGEX, PHONE_MASK_REPLACEMENT);
  masked = masked.replace(SPACED_DIGITS_PHONE_REGEX, PHONE_MASK_REPLACEMENT);
  masked = masked.replace(BARE_DIGITS_REGEX, PHONE_MASK_REPLACEMENT);

  // 3. Mask UPI and external channels
  masked = masked.replace(UPI_REGEX, PHONE_MASK_REPLACEMENT);
  masked = masked.replace(SOCIAL_REGEX, PHONE_MASK_REPLACEMENT);

  return masked;
}

/**
 * Backward compatibility alias for nurse-app
 */
export function maskSensitiveContacts(text: string, isMasked: boolean = true): string {
  return maskContactInfo(text, !isMasked);
}

/**
 * Checks if a string contains contact details (for warning indicators).
 */
export function containsContactInfo(text: string): boolean {
  if (!text) return false;
  EMAIL_REGEX.lastIndex = 0;
  OBFUSCATED_EMAIL_REGEX.lastIndex = 0;
  PHONE_REGEX.lastIndex = 0;
  SPACED_DIGITS_PHONE_REGEX.lastIndex = 0;
  BARE_DIGITS_REGEX.lastIndex = 0;
  WHATSAPP_REGEX.lastIndex = 0;
  UPI_REGEX.lastIndex = 0;
  SOCIAL_REGEX.lastIndex = 0;

  return (
    EMAIL_REGEX.test(text) ||
    OBFUSCATED_EMAIL_REGEX.test(text) ||
    PHONE_REGEX.test(text) ||
    SPACED_DIGITS_PHONE_REGEX.test(text) ||
    BARE_DIGITS_REGEX.test(text) ||
    WHATSAPP_REGEX.test(text) ||
    UPI_REGEX.test(text) ||
    SOCIAL_REGEX.test(text)
  );
}

export const containsContactDetails = containsContactInfo;

/**
 * Masks residential address unless booking is confirmed and funded.
 * Shows only locality and city pre-deposit.
 */
export function maskAddress(
  fullAddress: string | null | undefined,
  locality: string | null | undefined,
  city: string | null | undefined,
  isEscrowFunded: boolean
): string {
  if (isEscrowFunded && fullAddress && fullAddress.trim()) {
    return fullAddress;
  }
  const cleanLocality = locality?.trim() || "";
  const cleanCity = city?.trim() || "Punjab";
  return cleanLocality ? `${cleanLocality}, ${cleanCity}` : cleanCity;
}
