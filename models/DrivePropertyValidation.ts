const maxPayloadSize = 124; // Drive counts UTF-8 bytes of the key and value together.

export const validateDrivePropertySize = (key: string, payload: string) => {
  const encoder = new TextEncoder();
  const size = encoder.encode(key).byteLength + encoder.encode(payload).byteLength;
  if (size > maxPayloadSize) {
    throw new Error(`Payload for ${key} is too big (${size} bytes)`);
  }
};
