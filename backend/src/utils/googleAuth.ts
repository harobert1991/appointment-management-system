import { OAuth2Client, Credentials } from 'google-auth-library';
import { logger } from './logger';

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class GoogleCalendarAuth {
  private static instance: GoogleCalendarAuth;
  private oAuth2Client: OAuth2Client;

  private constructor(config: GoogleAuthConfig) {
    logger.debug('Initializing GoogleCalendarAuth with config:', {
      clientId: config.clientId ? 'exists' : 'missing',
      clientSecret: config.clientSecret ? 'exists' : 'missing',
      redirectUri: config.redirectUri,
    });

    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      throw new Error('Missing required Google OAuth configuration');
    }

    this.oAuth2Client = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  public static getInstance(config?: GoogleAuthConfig): GoogleCalendarAuth {
    if (!GoogleCalendarAuth.instance) {
      if (!config) {
        throw new Error('Configuration required for first initialization');
      }
      GoogleCalendarAuth.instance = new GoogleCalendarAuth(config);
    }
    return GoogleCalendarAuth.instance;
  }

  public getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const url = this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      include_granted_scopes: true
    });

    logger.debug('Generated auth URL:', { url });
    return url;
  }

  public async getToken(code: string): Promise<Credentials> {
    const { tokens } = await this.oAuth2Client.getToken(code);
    this.oAuth2Client.setCredentials(tokens);
    return tokens;
  }

  public getClient(): OAuth2Client {
    return this.oAuth2Client;
  }

  public setCredentials(tokens: Credentials): void {
    this.oAuth2Client.setCredentials(tokens);
  }

  public async refreshAccessToken(refreshToken: string): Promise<Credentials> {
    try {
      console.log("GoogleAuth refreshing with token:", refreshToken);
      this.oAuth2Client.setCredentials({ refresh_token: refreshToken });
      const response = await this.oAuth2Client.refreshAccessToken();
      console.log("OAuth2Client response:", response);
      return response.credentials;
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  public async validateToken(accessToken: string): Promise<boolean> {
    try {
      const tokenInfo = await this.oAuth2Client.getTokenInfo(accessToken);
      const expiryDate = tokenInfo.expiry_date || 0;
      const now = Date.now();
      return expiryDate - now > 5 * 60 * 1000; // Token valid if more than 5 minutes left
    } catch (error) {
      logger.warn('Token validation failed, token may be expired:', error);
      return false;
    }
  }

  public async revokeToken(accessToken: string): Promise<void> {
    await this.oAuth2Client.revokeToken(accessToken);
  }
} 