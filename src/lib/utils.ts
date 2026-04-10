export function cn(...values: Array<string | undefined | null | false>) {
  return values.filter(Boolean).join(" ");
}

export function normalizeEthiopianPhone(value: string) {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) {
    return "";
  }

  if (digitsOnly.startsWith("2510") && digitsOnly.length === 13) {
    return digitsOnly.slice(4);
  }

  if (digitsOnly.startsWith("251") && digitsOnly.length === 12) {
    return digitsOnly.slice(3);
  }

  if (digitsOnly.startsWith("0") && digitsOnly.length === 10) {
    return digitsOnly.slice(1);
  }

  return digitsOnly;
}
