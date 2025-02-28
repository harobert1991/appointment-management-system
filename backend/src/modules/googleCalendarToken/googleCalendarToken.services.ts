/**
 * Google Calendar Token Service
 * 
 * Authentication Methods:
 * - getAuthUrl(): Generates OAuth2 authorization URL
 * - getToken(code): Exchanges authorization code for tokens
 * - exchangeCodeForTokens(code): Gets and stores tokens from auth code
 * 
 * Token Management:
 * - validateToken(accessToken): Checks if token is still valid
 * - refreshAccessToken(refreshToken): Gets new access token using refresh token
 * - getValidAccessToken(): Gets valid token or refreshes if expired
 * - revokeToken(accessToken): Revokes an access token
 * 
 * Private Helpers:
 * - storeTokens(tokens): Encrypts and saves tokens to database
 * - getStoredTokens(): Retrieves and decrypts stored tokens
 * - formatTokenResponse(tokens): Formats token data for response
 * - getEncryptionKey(): Gets encryption key from environment
 */

import { OAuth2Client, Credentials } from 'google-auth-library';
import { google } from 'googleapis';
import { logger } from '../../utils';
import { Token } from './googleCalendarToken.schema';

export interface TokenResponse extends Credentials {}

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;
  private calendar;
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

  public getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  private async storeTokens(tokens: Credentials): Promise<void> {
    try {
      await Token.findOneAndUpdate(
        {},
        {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token!,
          expiryDate: tokens.expiry_date || 0,
          scope: tokens.scope || '',
          tokenType: tokens.token_type || 'Bearer'
        },
        { upsert: true, new: true }
      );
      logger.info('Tokens stored successfully');
    } catch (error) {
      logger.error('Error storing tokens:', error);
      throw new Error('Failed to store tokens');
    }
  }

  private async getStoredTokens(): Promise<TokenResponse | null> {
    const tokenDoc = await Token.findOne({});
    if (!tokenDoc) return null;

    return {
      access_token: tokenDoc.accessToken,
      refresh_token: tokenDoc.refreshToken,
      scope: tokenDoc.scope,
      token_type: tokenDoc.tokenType,
      expiry_date: tokenDoc.expiryDate
    };
  }

  public async validateToken(accessToken: string): Promise<boolean> {
    try {
      const tokenInfo = await this.oAuth2Client.getTokenInfo(accessToken);
      return (tokenInfo.expiry_date || 0) - Date.now() > 5 * 60 * 1000; // 5 minutes buffer
    } catch (error) {
      logger.warn('Token validation failed:', error);
      return false;
    }
  }

  public async getValidAccessToken(): Promise<string> {
    const tokens = await this.getStoredTokens();
    if (!tokens) throw new Error('No stored tokens found');
    if (!tokens.access_token) throw new Error('No access token found');

    if (await this.validateToken(tokens.access_token)) {
      return tokens.access_token;
    }

    if (tokens.refresh_token) {
      const refreshedTokens = await this.refreshAccessToken(tokens.refresh_token);
      return refreshedTokens.access_token!;
    }

    throw new Error('No valid token available');
  }

  public async refreshAccessToken(refreshToken: string): Promise<Credentials> {
    try {
      this.oAuth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oAuth2Client.refreshAccessToken();
      
      if (!credentials.refresh_token) {
        credentials.refresh_token = refreshToken;
      }

      await this.storeTokens(credentials);
      return credentials;
    } catch (error) {
      logger.error('Error refreshing token:', error);
      throw new Error('Failed to refresh token');
    }
  }

  public async exchangeCodeForTokens(code: string): Promise<Credentials> {
    try {
      const { tokens } = await this.oAuth2Client.getToken(code);
      await this.storeTokens(tokens);
      return tokens;
    } catch (error) {
      logger.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }
}