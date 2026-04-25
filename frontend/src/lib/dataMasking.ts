function isSensitiveValue(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/
  const tokenRegex = /^[a-f0-9]{32,}$/i
  const jwtRegex = /^eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./

  return (
    emailRegex.test(value) ||
    phoneRegex.test(value) ||
    tokenRegex.test(value) ||
    jwtRegex.test(value) ||
    value.length > 100
  )
}

export function maskSensitiveValue(value: string): string {
  if (!value) return value

  const emailRegex = /^([^\s@]+)@([^\s@]+\.[^\s@]+)$/
  const phoneRegex = /^(\+?[\d\s\-()]{0,3})([\d\s\-()]{3,})([\d\s\-()]{4})$/

  // Email masking: show first char and domain
  const emailMatch = value.match(emailRegex)
  if (emailMatch) {
    return `${emailMatch[1][0]}***@${emailMatch[2]}`
  }

  // Phone masking: show only last 4 digits
  const phoneMatch = value.match(phoneRegex)
  if (phoneMatch) {
    return `${phoneMatch[1]}***${phoneMatch[3]}`
  }

  // Token/long string masking: show first and last 4 chars
  if (value.length > 20) {
    return `${value.slice(0, 4)}...${value.slice(-4)}`
  }

  return value
}

export function displayValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return '(null)'
  if (typeof value !== 'string') return String(value)
  if (value === '') return '(empty)'

  if (isSensitiveValue(value)) {
    return maskSensitiveValue(value)
  }

  return value
}
