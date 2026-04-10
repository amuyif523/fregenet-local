export function normalizePdfPath(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("/uploads/")) {
    return trimmed;
  }

  if (trimmed.startsWith("uploads/")) {
    return `/${trimmed}`;
  }

  if (trimmed.toLowerCase().endsWith(".pdf")) {
    return `/uploads/local/${trimmed}`;
  }

  return null;
}

export function extractPdfPath(source: string | null) {
  if (!source) {
    return null;
  }

  const byDelimiter = source.split("|").map((entry) => entry.trim());

  for (const candidate of byDelimiter.reverse()) {
    const normalized = normalizePdfPath(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return normalizePdfPath(source);
}
