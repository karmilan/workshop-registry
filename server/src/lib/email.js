const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email) {
  return String(email).trim().toLowerCase()
}

export function validateEmail(email) {
  const normalized = normalizeEmail(email)
  if (!EMAIL_RE.test(normalized)) {
    return null
  }
  return normalized
}
