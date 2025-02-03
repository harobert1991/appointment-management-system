export const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
  projectId: process.env.GOOGLE_PROJECT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
};

export const getGoogleOAuthConfig = () => ({
  web: {
    client_id: googleConfig.clientId,
    project_id: googleConfig.projectId,
    auth_uri: googleConfig.auth_uri,
    token_uri: googleConfig.token_uri,
    auth_provider_x509_cert_url: googleConfig.auth_provider_x509_cert_url,
    client_secret: googleConfig.clientSecret,
    redirect_uris: [googleConfig.redirectUri]
  }
}); 