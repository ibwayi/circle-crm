/**
 * Escapes ILIKE pattern special characters (`%` and `_`, plus the escape
 * character `\` itself) for safe substring matching. Use when interpolating
 * user-provided strings into ILIKE patterns — without this, a search for
 * `100%` would match every row, and `_` would match any single character.
 *
 * Pairs with the standard `%${escapeIlike(input)}%` substring template
 * across the lib/db helpers.
 */
export function escapeIlike(input: string): string {
  return input.replace(/[\\%_]/g, (m) => `\\${m}`)
}
