// Deliberately limited to uncompressed stereo PCM from these Foley exports.
export function readWav(bytes) {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Expected a RIFF/WAVE file (check Git LFS checkout).');
  }
  if (bytes.readUInt32LE(4) + 8 !== bytes.length) throw new Error('Truncated RIFF');
  let fmt, data;
  for (let p = 12; p + 8 <= bytes.length;) {
    const size = bytes.readUInt32LE(p + 4), end = p + 8 + size;
    if (end > bytes.length) throw new Error('Truncated chunk');
    const name = bytes.toString('ascii', p, p + 4);
    if (name === 'fmt ') {
      if (size < 16) throw new Error('Truncated format');
      fmt = { type: bytes.readUInt16LE(p + 8), channels: bytes.readUInt16LE(p + 10),
        rate: bytes.readUInt32LE(p + 12), align: bytes.readUInt16LE(p + 20), bits: bytes.readUInt16LE(p + 22) };
    }
    if (name === 'data') data = bytes.subarray(p + 8, end);
    p = end + (size % 2);
  }
  if (!fmt || !data || fmt.type !== 1 || fmt.channels !== 2 || fmt.rate !== 44100 || fmt.bits !== 16 || fmt.align !== 4 || data.length % 4) {
    throw new Error('Expected 44.1 kHz / stereo / 16-bit PCM');
  }
  return { ...fmt, data, frames: data.length / 4 };
}

export function encodeWav(data) {
  const header = Buffer.alloc(44);
  header.write('RIFF'); header.writeUInt32LE(data.length + 36, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22); header.writeUInt32LE(44100, 24); header.writeUInt32LE(176400, 28);
  header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

export function packCues(parts, gapFrames = 2205) {
  let cursor = 0;
  const cues = {}, chunks = [];
  for (const [name, part] of parts) {
    if (!part.frames || cues[name]) throw new Error('Empty or duplicate cue');
    cues[name] = { start: cursor / 44100, duration: part.frames / 44100, startFrame: cursor, frames: part.frames };
    chunks.push(part.data, Buffer.alloc(gapFrames * 4));
    cursor += part.frames + gapFrames;
  }
  return { wav: encodeWav(Buffer.concat(chunks)), cues, frames: cursor };
}
