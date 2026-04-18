export function toAsciiDigits(value: string) {
  return value.replace(/[\u0966-\u096F]/g, (digit) =>
    String(digit.charCodeAt(0) - 0x0966),
  );
}

export function normalizePhone(value: string | null | undefined) {
  const digits = toAsciiDigits(value ?? "").replace(/\D/g, "");

  if (digits.length > 10 && digits.startsWith("91")) {
    return digits.slice(-10);
  }

  return digits;
}

export function isPatientCode(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase().startsWith("PAT-");
}

export function normalizePatientLookup(value: string) {
  const trimmedValue = value.trim();

  if (isPatientCode(trimmedValue)) {
    return trimmedValue.toUpperCase();
  }

  return normalizePhone(trimmedValue);
}
