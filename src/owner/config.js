// Public configuration only. The OAuth client ID and the web app URL are not secrets:
// every API request is authorised server-side with a verified Google ID token.
// Never put service-account keys or other private credentials in VITE_* variables.
const apiUrl = (import.meta.env.VITE_OWNER_API_URL || '').trim()

export const ownerConfig = {
  googleClientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim(),
  apiUrl: apiUrl.startsWith('https://') ? apiUrl : '',
}

export const isOwnerIntegrationConfigured = Boolean(ownerConfig.googleClientId && ownerConfig.apiUrl)
