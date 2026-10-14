/**
 * A minimal ZIP writer: entries are stored (method 0, no compression), names are UTF-8 (general purpose flag bit 11),
 * no ZIP64, no directory entries (unzip tools create the folders from the paths). Enough for a filter file with its
 * `sounds/` and `icons/` folders; mp3 files hardly compress anyway.
 *
 * Layout (APPNOTE.TXT 4.3): for each entry a local file header + name + data, then one central directory header per
 * entry, then the end of central directory record. All numbers are little-endian.
 */

export interface ZipEntry {
  /** Forward-slash path inside the archive, e.g. `sounds/gong.mp3`. */
  readonly path: string;
  readonly data: Uint8Array;
}

export const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
export const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
export const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;

const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const END_RECORD_SIZE = 22;
/** 2.0: the version that introduced folders; stored entries need no more. */
const VERSION = 20;
const UTF8_FLAG = 1 << 11;
const MAX_UINT32 = 0xffffffff;
const MAX_UINT16 = 0xffff;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 (IEEE 802.3, reflected polynomial 0xEDB88320), as ZIP uses it. */
export function crc32(data: Uint8Array): number {
  let crc = MAX_UINT32;
  for (const byte of data) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ MAX_UINT32) >>> 0;
}

/** MS-DOS time and date fields (local time, 2-second resolution, years 1980 to 2107). */
export function dosDateTime(date: Date): { readonly time: number; readonly date: number } {
  const year = Math.min(Math.max(date.getFullYear(), 1980), 2107);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/** Builds a stored-only ZIP archive of `entries`, every entry stamped with `modified` (default: now). */
export function buildZip(entries: readonly ZipEntry[], modified: Date = new Date()): Uint8Array<ArrayBuffer> {
  if (entries.length > MAX_UINT16) throw new Error('Too many files for a ZIP without ZIP64');
  const encoder = new TextEncoder();
  const stamp = dosDateTime(modified);
  const items = entries.map((entry) => {
    const name = encoder.encode(entry.path);
    if (name.length > MAX_UINT16) throw new Error(`File name too long: ${entry.path}`);
    return { name, data: entry.data, crc: crc32(entry.data) };
  });

  const localSize = items.reduce((sum, item) => sum + LOCAL_HEADER_SIZE + item.name.length + item.data.length, 0);
  const centralSize = items.reduce((sum, item) => sum + CENTRAL_HEADER_SIZE + item.name.length, 0);
  if (localSize + centralSize > MAX_UINT32) throw new Error('Archive too large for a ZIP without ZIP64');

  const bytes = new Uint8Array(new ArrayBuffer(localSize + centralSize + END_RECORD_SIZE));
  const view = new DataView(bytes.buffer);
  let at = 0;
  const u16 = (value: number) => {
    view.setUint16(at, value, true);
    at += 2;
  };
  const u32 = (value: number) => {
    view.setUint32(at, value, true);
    at += 4;
  };
  const raw = (value: Uint8Array) => {
    bytes.set(value, at);
    at += value.length;
  };

  const offsets: number[] = [];
  for (const item of items) {
    offsets.push(at);
    u32(LOCAL_FILE_HEADER_SIGNATURE);
    u16(VERSION); // version needed to extract
    u16(UTF8_FLAG);
    u16(0); // method: stored
    u16(stamp.time);
    u16(stamp.date);
    u32(item.crc);
    u32(item.data.length); // compressed size
    u32(item.data.length); // uncompressed size
    u16(item.name.length);
    u16(0); // extra field length
    raw(item.name);
    raw(item.data);
  }

  const centralOffset = at;
  items.forEach((item, index) => {
    u32(CENTRAL_DIRECTORY_SIGNATURE);
    u16(VERSION); // version made by (upper byte 0: MS-DOS attributes)
    u16(VERSION); // version needed to extract
    u16(UTF8_FLAG);
    u16(0); // method: stored
    u16(stamp.time);
    u16(stamp.date);
    u32(item.crc);
    u32(item.data.length);
    u32(item.data.length);
    u16(item.name.length);
    u16(0); // extra field length
    u16(0); // file comment length
    u16(0); // disk number start
    u16(0); // internal attributes
    u32(0); // external attributes
    u32(offsets[index] ?? 0);
    raw(item.name);
  });

  const centralLength = at - centralOffset;
  u32(END_OF_CENTRAL_DIRECTORY_SIGNATURE);
  u16(0); // this disk
  u16(0); // disk with the central directory
  u16(items.length); // entries on this disk
  u16(items.length); // entries in total
  u32(centralLength); // central directory size
  u32(centralOffset);
  u16(0); // comment length
  return bytes;
}
