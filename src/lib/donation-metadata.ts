type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonObject;
}

export function mergeDonationMetadata(existing: unknown, patch: JsonObject): JsonObject {
  return {
    ...asObject(existing),
    ...patch
  };
}
