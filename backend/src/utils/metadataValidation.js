export function normalizeMetadataValue(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function metadataValueSignature(value) {
  return normalizeMetadataValue(value).toLowerCase();
}

export function isDuplicateMetadataValue(existingValue, nextValue) {
  const current = metadataValueSignature(existingValue);
  const incoming = metadataValueSignature(nextValue);

  return current !== '' && current === incoming;
}
