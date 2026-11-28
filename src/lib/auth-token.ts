let accessToken: string | null = null
let accountId: number | null = null
let tokenRevision = 0
let unauthorizedHandler: (() => void) | null = null

// Delete credentials persisted by earlier versions. Refresh now uses a server-set cookie.
try {
  localStorage.removeItem("pho-viet-auth-tokens")
} catch {
  // Browser storage may be unavailable.
}

export function getAccessToken() {
  return accessToken
}

export function getTokenAccountId() {
  return accountId
}

export function getTokenRevision() {
  return tokenRevision
}

export function setAccessToken(token: string, owner: number) {
  accessToken = token
  accountId = owner
  tokenRevision++
}

export function clearTokens() {
  accessToken = null
  accountId = null
  tokenRevision++
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

export function notifyUnauthorized() {
  unauthorizedHandler?.()
}
