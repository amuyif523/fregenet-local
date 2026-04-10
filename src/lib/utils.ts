export function cn(...values: Array<string | undefined | null | false>) {
  return values.filter(Boolean).join(" ");
}

export function normalizeEthiopianPhone(value: string) {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) {
    return "";
  }

  let local = digitsOnly;

  if (digitsOnly.startsWith("2510") && digitsOnly.length === 13) {
    local = digitsOnly.slice(4);
  } else if (digitsOnly.startsWith("251") && digitsOnly.length === 12) {
    local = digitsOnly.slice(3);
  } else if (digitsOnly.startsWith("0") && digitsOnly.length === 10) {
    local = digitsOnly.slice(1);
  }

  if (!/^[79]\d{8}$/.test(local)) {
    return "";
  }

  return local;
}
