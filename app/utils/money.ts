/**
 * Money formatting utilities
 * All API monetary values are in cents (integers)
 * Display values are in euros (decimals)
 */

/**
 * Convert cents to euros and format for display
 * @param cents - Amount in cents (e.g., 1299)
 * @returns Formatted string (e.g., "€12.99")
 */
export function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`
}

/**
 * Convert cents to euros number
 * @param cents - Amount in cents (e.g., 1299)
 * @returns Number in euros (e.g., 12.99)
 */
export function centsToEuros(cents: number): number {
  return cents / 100
}

/**
 * Convert euros to cents for API
 * @param euros - Amount in euros (e.g., 12.99)
 * @returns Amount in cents (e.g., 1299)
 */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100)
}

/**
 * Parse a user input string to cents
 * Handles both comma and dot as decimal separators
 * @param input - User input (e.g., "12,99" or "12.99")
 * @returns Amount in cents (e.g., 1299)
 */
export function parseInputToCents(input: string): number {
  // Replace comma with dot for parsing
  const normalized = input.replace(',', '.')
  const euros = parseFloat(normalized)
  if (isNaN(euros)) return 0
  return eurosToCents(euros)
}

/**
 * Format cents for input field (without € symbol)
 * @param cents - Amount in cents
 * @returns String for input (e.g., "12.99")
 */
export function centsToInputValue(cents: number): string {
  return (cents / 100).toFixed(2)
}
