import { Credentials } from 'google-auth-library';
import { google } from 'googleapis';
import { GoogleCalendarAuth } from '../utils/googleAuth';
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

  private constructor(private readonly googleAuth: GoogleCalendarAuth) {
    this.calendar = google.calendar({ version: 'v3', auth: this.googleAuth.getClient() });
  }

  public static getInstance(googleAuth?: GoogleCalendarAuth): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      if (!googleAuth) {
        throw new Error('GoogleAuth instance required for first initialization');
      }
      GoogleCalendarService.instance = new GoogleCalendarService(googleAuth);
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
    return this.googleAuth.getAuthUrl();
  }

  public async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    try {
      logger.debug('Exchanging code for tokens with code:', code);
      const tokens = await this.googleAuth.getToken(code);

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

    const isValid = await this.googleAuth.validateToken(tokens.access_token!);
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
      console.log("Starting refresh with token:", refreshToken);
      
      const credentials = await this.googleAuth.refreshAccessToken(refreshToken);
      console.log("Received credentials:", credentials);
      
      if (!credentials?.refresh_token) {
        credentials.refresh_token = refreshToken;
      }

      await this.storeTokens(credentials);
      const response =  this.formatTokenResponse(credentials);
      console.log(response);
      return response;
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
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
}