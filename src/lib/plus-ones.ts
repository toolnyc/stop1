/**
 * Parses and clamps a plus-one count from untrusted input.
 * Always returns an integer in the range [0, 3].
 */
export function parsePlusOneCount(input: unknown): number {
  if (input === null || input === undefined || input === '') return 0;
  const n = Math.floor(Number(input));
  if (isNaN(n)) return 0;
  return Math.min(3, Math.max(0, n));
}
