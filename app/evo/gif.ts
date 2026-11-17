/* ── app/evo/gif.ts ──────────────────────────────────────────────────────────
   A small animated-GIF encoder (GIF89a, one global 256-colour palette, LZW),
   so a run can be shared as a looping picture without any library.

   The palette is the game's own colours plus a 6×6×6 colour cube; every pixel
   maps to its nearest entry through a 15-bit lookup table.
   --------------------------------------------------------------------------- */

const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export function makePalette(named: string[]): number[][] {
  const pal: number[][] = named.map(hex);
  for (let r = 0; r < 6; r++) for (let g = 0; g < 6; g++) for (let b = 0; b < 6; b++) pal.push([r * 51, g * 51, b * 51]);
  for (let i = 1; pal.length < 256; i++) { const v = Math.round((i * 255) / 24); pal.push([v, v, v]); }
  return pal.slice(0, 256);
}

/** Build a palette from real frames: the most common colours, kept apart from
    each other, so soft gradients survive instead of banding into a cube palette. */
export function adaptivePalette(samples: Uint8ClampedArray[], named: string[] = []): number[][] {
  const cnt = new Float64Array(32768), sr = new Float64Array(32768), sg = new Float64Array(32768), sb = new Float64Array(32768);
  for (const d of samples) for (let i = 0; i < d.length; i += 4) {
    const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
    cnt[k]++; sr[k] += d[i]; sg[k] += d[i + 1]; sb[k] += d[i + 2];
  }
  const keys: number[] = [];
  for (let k = 0; k < 32768; k++) if (cnt[k]) keys.push(k);
  keys.sort((a, b) => cnt[b] - cnt[a]);
  const pal: number[][] = named.map(hex);
  const far = (c: number[], min: number) => pal.every((p) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2 >= min);
  for (const min of [64, 16, 1]) {
    for (const k of keys) {
      if (pal.length >= 256) break;
      const c = [Math.round(sr[k] / cnt[k]), Math.round(sg[k] / cnt[k]), Math.round(sb[k] / cnt[k])];
      if (far(c, min)) pal.push(c);
    }
  }
  while (pal.length < 256) pal.push([0, 0, 0]);
  return pal.slice(0, 256);
}

export class GifWriter {
  private bytes: number[] = [];
  private lut = new Int16Array(32768).fill(-1);
  constructor(private w: number, private h: number, private pal: number[][]) {
    const b = this.bytes;
    const str = (s: string) => { for (const ch of s) b.push(ch.charCodeAt(0)); };
    const u16 = (v: number) => b.push(v & 255, (v >> 8) & 255);
    str("GIF89a");
    u16(w); u16(h);
    b.push(0xf7, 0, 0); // global table, 8 bits, 256 entries
    for (let i = 0; i < 256; i++) b.push(...(pal[i] ?? [0, 0, 0]));
    // loop forever
    b.push(0x21, 0xff, 0x0b); str("NETSCAPE2.0"); b.push(3, 1, 0, 0, 0);
  }

  private nearest(r: number, g: number, bl: number): number {
    const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (bl >> 3);
    const hit = this.lut[k];
    if (hit >= 0) return hit;
    let best = 0, bd = Infinity;
    for (let i = 0; i < Math.min(255, this.pal.length); i++) {
      const p = this.pal[i];
      const d = (p[0] - r) ** 2 * 2 + (p[1] - g) ** 2 * 3 + (p[2] - bl) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    this.lut[k] = best;
    return best;
  }

  /** Add one frame from RGBA pixels; `delay` in hundredths of a second. */
  private prev: Uint8Array | null = null;

  /** Add one frame from RGBA pixels; `delay` in hundredths of a second.
      Only the rectangle that changed is stored, and unchanged pixels inside it
      are transparent (index 255), which keeps long clips small. */
  frame(rgba: Uint8ClampedArray, delay: number) {
    const W = this.w, n = W * this.h;
    const idx = new Uint8Array(n);
    for (let i = 0; i < n; i++) idx[i] = this.nearest(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
    const prev = this.prev;
    let x0 = 0, y0 = 0, x1 = W - 1, y1 = this.h - 1;
    if (prev) {
      x0 = W; y0 = this.h; x1 = -1; y1 = -1;
      for (let i = 0; i < n; i++) if (idx[i] !== prev[i]) {
        const x = i % W, y = (i / W) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      if (x1 < 0) { x0 = 0; y0 = 0; x1 = 0; y1 = 0; }
    }
    const fw = x1 - x0 + 1, fh = y1 - y0 + 1;
    const sub = new Uint8Array(fw * fh);
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      const i = (y + y0) * W + x + x0;
      sub[y * fw + x] = prev && idx[i] === prev[i] ? 255 : idx[i];
    }
    this.prev = idx;
    const b = this.bytes;
    b.push(0x21, 0xf9, 4, prev ? 0x05 : 0x04, delay & 255, (delay >> 8) & 255, prev ? 255 : 0, 0);
    b.push(0x2c, x0 & 255, x0 >> 8, y0 & 255, y0 >> 8, fw & 255, fw >> 8, fh & 255, fh >> 8, 0);
    b.push(8);
    const data = lzw(sub, 8);
    for (let i = 0; i < data.length; i += 255) {
      const chunk = data.subarray(i, i + 255);
      b.push(chunk.length);
      for (let j = 0; j < chunk.length; j++) b.push(chunk[j]);
    }
    b.push(0);
  }

  finish(): Uint8Array<ArrayBuffer> {
    this.bytes.push(0x3b);
    return new Uint8Array(this.bytes);
  }
}

function lzw(px: Uint8Array, minSize: number): Uint8Array {
  const clear = 1 << minSize, eoi = clear + 1;
  const out: number[] = [];
  let cur = 0, nbits = 0;
  let size = minSize + 1;
  const emit = (code: number) => {
    cur |= code << nbits;
    nbits += size;
    while (nbits >= 8) { out.push(cur & 255); cur >>>= 8; nbits -= 8; }
  };
  let dict = new Map<number, number>();
  let next = eoi + 1;
  emit(clear);
  let prefix = px[0];
  for (let i = 1; i < px.length; i++) {
    const k = px[i];
    const key = (prefix << 8) | k;
    const hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    emit(prefix);
    if (next < 4096) {
      dict.set(key, next++);
      if (next > 1 << size && size < 12) size++;
    } else {
      emit(clear);
      dict = new Map();
      next = eoi + 1;
      size = minSize + 1;
    }
    prefix = k;
  }
  emit(prefix);
  emit(eoi);
  if (nbits > 0) out.push(cur & 255);
  return new Uint8Array(out);
}
