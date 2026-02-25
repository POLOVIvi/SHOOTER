export function safeUuid(): string {
  const g = globalThis as typeof globalThis & {
    crypto?: Crypto;
  };

  if (g.crypto?.randomUUID) {
    return g.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (g.crypto?.getRandomValues) {
    g.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // RFC4122 v4 bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function ensureRandomUuidPolyfill() {
  const g = globalThis as {
    crypto?: Crypto & { randomUUID?: () => string };
  };

  if (g.crypto?.randomUUID) return;

  const randomUUID = () =>
    safeUuid() as `${string}-${string}-${string}-${string}-${string}`;

  if (g.crypto) {
    try {
      g.crypto.randomUUID = randomUUID;
      return;
    } catch {
      try {
        Object.defineProperty(g.crypto, 'randomUUID', {
          value: randomUUID,
          configurable: true,
        });
        return;
      } catch {
        return;
      }
    }
  }

  // Last resort for legacy webviews with no crypto object.
  g.crypto = {
    getRandomValues<T extends ArrayBufferView>(array: T): T {
      const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
    randomUUID,
  } as Crypto & { randomUUID: () => string };
}
