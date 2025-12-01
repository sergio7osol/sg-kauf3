/**
 * Utility functions for transforming object keys between camelCase and snake_case.
 * Used by Axios interceptors to bridge frontend (camelCase) and backend (snake_case) conventions.
 */

export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof File) &&
    !(value instanceof Blob) &&
    !(value instanceof FormData)
  )
}

export function transformKeysDeep<T>(
  obj: T,
  transformer: (key: string) => string
): T {
  if (Array.isArray(obj)) {
    return obj.map(item => transformKeysDeep(item, transformer)) as T
  }

  if (isPlainObject(obj)) {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      const newKey = transformer(key)
      result[newKey] = transformKeysDeep(value, transformer)
    }
    return result as T
  }

  // Primitives and special objects (Date, File, etc.) pass through unchanged
  return obj;
}

/**
 * Transform all keys in an object from camelCase to snake_case (deep).
 * Use for outgoing API requests.
 */
export function toSnakeCase<T>(obj: T): T {
  return transformKeysDeep(obj, camelToSnake)
}

/**
 * Transform all keys in an object from snake_case to camelCase (deep).
 * Use for incoming API responses.
 */
export function toCamelCase<T>(obj: T): T {
  return transformKeysDeep(obj, snakeToCamel)
}
