import { OAuth2Client, Credentials } from 'google-auth-library';
import { google } from 'googleapis';
import { logger, Encryption } from '../utils';
import { Token } from '../models/token';

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;
  private calendar;
  private encryptionKey?: string;
  private oAuth2Client: OAuth2Client;

  private constructor(config: { clientId: string; clientSecret: string; redirectUri: string }) {
    this.oAuth2Client = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
    this.calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client });
  }

  public static getInstance(config?: { clientId: string; clientSecret: string; redirectUri: string }): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      if (!config) {
        throw new Error('Config required for first initialization');
      }
      GoogleCalendarService.instance = new GoogleCalendarService(config);
    }
    return GoogleCalendarService.instance;
  }

  private getEncryptionKey(): string {
    if (!this.encryptionKey) {
      if (!process.env.TOKEN_ENCRYPTION_KEY) {
        throw new Error('TOKEN_ENCRYPTION_KEY is not defined in environment variables');
      }
      this.encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
    }
    return this.encryptionKey;
  }

  public getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      include_granted_scopes: true
    });
  }

  public async getToken(code: string): Promise<Credentials> {
    const { tokens } = await this.oAuth2Client.getToken(code);
    this.oAuth2Client.setCredentials(tokens);
    return tokens;
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

  private async storeTokens(tokens: Credentials): Promise<void> {
    try {
      const tokenString = JSON.stringify(tokens);
      const encryptedTokens = Encryption.encrypt(tokenString, this.getEncryptionKey());

      await Token.findOneAndUpdate(
        {},
        { encryptedTokens },
        { upsert: true, new: true }
      );

      logger.info(`Global token stored successfully`);
    } catch (error) {
      logger.error('Error storing tokens:', error);
      throw new Error('Failed to store tokens securely');
    }
  }

  private async getStoredTokens(): Promise<Credentials | null> {
    try {
      const tokenDoc = await Token.findOne({});
      if (!tokenDoc) return null;

      const decryptedString = Encryption.decrypt(tokenDoc.encryptedTokens, this.getEncryptionKey());
      return JSON.parse(decryptedString);
    } catch (error) {
      logger.error('Error retrieving tokens:', error);
      throw new Error('Failed to retrieve tokens');
    }
  }

  public async getValidAccessToken(): Promise<string> {
    const tokens = await this.getStoredTokens();
    if (!tokens) throw new Error('No stored tokens found');

    const isValid = await this.validateToken(tokens.access_token!);
    if (isValid) return tokens.access_token!;

    if (tokens.refresh_token) {
      const refreshedTokens = await this.refreshAccessToken(tokens.refresh_token);
      console.log("Refreshed tokens in valid access tokens:", refreshedTokens);
      return refreshedTokens.access_token;
    }

    throw new Error('No valid token available');
  }

  public async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    try {
      this.oAuth2Client.setCredentials({ refresh_token: refreshToken });
      const response = await this.oAuth2Client.refreshAccessToken();
      const credentials = response.credentials;

      if (!credentials?.refresh_token) {
        credentials.refresh_token = refreshToken;
      }

      await this.storeTokens(credentials);
      return this.formatTokenResponse(credentials);
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  public async revokeToken(accessToken: string): Promise<void> {
    await this.oAuth2Client.revokeToken(accessToken);
  }

  private formatTokenResponse(tokens: Credentials): TokenResponse {
    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token ?? undefined,
      scope: tokens.scope || '',
      token_type: tokens.token_type || 'Bearer',
      expiry_date: tokens.expiry_date || 0,
    };
  }

  public async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    try {
      logger.debug('Exchanging code for tokens with code:', code);
      const tokens = await this.getToken(code);

      if (!tokens?.access_token) {
        throw new Error('No access token received');
      }

      await this.storeTokens(tokens);
      return this.formatTokenResponse(tokens);
    } catch (error) {
      logger.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }
}