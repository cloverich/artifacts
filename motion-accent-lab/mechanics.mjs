export const DURATION = 1800;
export function sampleTime(time, stepped) {
  const clamped = Math.min(DURATION, Math.max(0, time));
  return clamped === DURATION ? clamped : stepped ? Math.floor(clamped / (1000 / 12)) * (1000 / 12) : clamped;
}
export function illumination(nx, ny, nz, angle, bands = 0) {
  const light = Math.max(0, nx * Math.cos(angle) * .8 + ny * Math.sin(angle) * .8 + nz * .6);
  const q = bands ? Math.round(light * (bands - 1)) / (bands - 1) : light;
  return .22 + .78 * q;
}
