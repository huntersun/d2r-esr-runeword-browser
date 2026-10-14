import { describe, expect, it } from 'vitest';
import {
  CENTRAL_DIRECTORY_SIGNATURE,
  END_OF_CENTRAL_DIRECTORY_SIGNATURE,
  LOCAL_FILE_HEADER_SIGNATURE,
  buildZip,
  crc32,
  dosDateTime,
} from './zip';

interface ParsedEntry {
  readonly name: string;
  readonly data: Uint8Array;
  readonly crc: number;
  readonly flags: number;
  readonly method: number;
  readonly time: number;
  readonly date: number;
}

/** Reads an archive the way an unzip tool does: end record, then the central directory, then each local header. */
function parseZip(bytes: Uint8Array): ParsedEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(END_OF_CENTRAL_DIRECTORY_SIGNATURE);
  expect(view.getUint16(end + 4, true)).toBe(0);
  expect(view.getUint16(end + 6, true)).toBe(0);
  const count = view.getUint16(end + 8, true);
  expect(view.getUint16(end + 10, true)).toBe(count);
  const centralSize = view.getUint32(end + 12, true);
  const centralOffset = view.getUint32(end + 16, true);
  expect(view.getUint16(end + 20, true)).toBe(0);
  expect(centralOffset + centralSize).toBe(end);

  const entries: ParsedEntry[] = [];
  let at = centralOffset;
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(at, true)).toBe(CENTRAL_DIRECTORY_SIGNATURE);
    const flags = view.getUint16(at + 8, true);
    const method = view.getUint16(at + 10, true);
    const time = view.getUint16(at + 12, true);
    const date = view.getUint16(at + 14, true);
    const crc = view.getUint32(at + 16, true);
    const compressed = view.getUint32(at + 20, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extra = view.getUint16(at + 30, true);
    const comment = view.getUint16(at + 32, true);
    const localOffset = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    expect(compressed).toBe(size);

    // The local header repeats the central directory's fields.
    expect(view.getUint32(localOffset, true)).toBe(LOCAL_FILE_HEADER_SIGNATURE);
    expect(view.getUint16(localOffset + 6, true)).toBe(flags);
    expect(view.getUint16(localOffset + 8, true)).toBe(method);
    expect(view.getUint32(localOffset + 14, true)).toBe(crc);
    expect(view.getUint32(localOffset + 18, true)).toBe(compressed);
    expect(view.getUint32(localOffset + 22, true)).toBe(size);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtra = view.getUint16(localOffset + 28, true);
    expect(decoder.decode(bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength))).toBe(name);
    const dataStart = localOffset + 30 + localNameLength + localExtra;
    const data = bytes.slice(dataStart, dataStart + size);
    expect(crc32(data)).toBe(crc);

    entries.push({ name, data, crc, flags, method, time, date });
    at += 46 + nameLength + extra + comment;
  }
  expect(at).toBe(end);
  return entries;
}

const text = (value: string) => new TextEncoder().encode(value);

describe('crc32', () => {
  it('matches the standard check values', () => {
    expect(crc32(new Uint8Array())).toBe(0);
    expect(crc32(text('123456789'))).toBe(0xcbf43926);
    expect(crc32(text('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339);
  });
});

describe('dosDateTime', () => {
  it('packs local time with two-second resolution', () => {
    const { time, date } = dosDateTime(new Date(2026, 9, 14, 13, 45, 31));
    expect(time).toBe((13 << 11) | (45 << 5) | 15);
    expect(date).toBe((46 << 9) | (10 << 5) | 14);
  });

  it('clamps years before 1980', () => {
    expect(dosDateTime(new Date(1975, 0, 1)).date >> 9).toBe(0);
  });
});

describe('buildZip', () => {
  const modified = new Date(2026, 9, 14, 13, 45, 30);

  it('writes stored entries that read back with their names, data and CRCs', () => {
    const binary = new Uint8Array(1000).map((_, i) => (i * 37) & 0xff);
    const zip = buildZip(
      [
        { path: 'my-filter.json', data: text('{ "formatVersion": 1 }\n') },
        { path: 'sounds/gong.mp3', data: binary },
        { path: 'icons/goldstar.sprite', data: new Uint8Array() },
      ],
      modified
    );
    const entries = parseZip(zip);
    expect(entries.map((entry) => entry.name)).toEqual(['my-filter.json', 'sounds/gong.mp3', 'icons/goldstar.sprite']);
    expect(new TextDecoder().decode(entries[0]?.data)).toBe('{ "formatVersion": 1 }\n');
    expect(entries[1]?.data).toEqual(binary);
    expect(entries[2]?.data.length).toBe(0);
    for (const entry of entries) {
      expect(entry.method).toBe(0);
      expect(entry.flags).toBe(0x0800);
      expect(entry.time).toBe(dosDateTime(modified).time);
      expect(entry.date).toBe(dosDateTime(modified).date);
    }
  });

  it('encodes names as UTF-8', () => {
    const [entry] = parseZip(buildZip([{ path: 'sounds/épée-ÿc4.mp3', data: text('x') }], modified));
    expect(entry?.name).toBe('sounds/épée-ÿc4.mp3');
  });

  it('writes an empty archive as a lone end record', () => {
    const zip = buildZip([], modified);
    expect(zip.length).toBe(22);
    expect(parseZip(zip)).toEqual([]);
  });
});
