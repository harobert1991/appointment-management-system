// import { jest, describe, it, expect, beforeEach } from '@jest/globals';
/// <reference types="jest" />

// Add these mocks BEFORE any imports
jest.mock('googleapis', () => ({
  google: {
    calendar: jest.fn(),
  }
}));

// Mock OAuth2Client
const mockGenerateAuthUrl = jest.fn();
const mockGetToken = jest.fn();
const mockSetCredentials = jest.fn();
const mockRefreshAccessToken = jest.fn();
const mockGetTokenInfo = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    generateAuthUrl: mockGenerateAuthUrl,
    getToken: mockGetToken,
    setCredentials: mockSetCredentials,
    refreshAccessToken: mockRefreshAccessToken,
    getTokenInfo: mockGetTokenInfo
  }))
}));

jest.mock('../googleCalendarToken.schema');

// Now we can import
import { GoogleCalendarService } from '../googleCalendarToken.services';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { Token } from '../googleCalendarToken.schema';

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3000/callback'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (google.calendar as jest.Mock).mockReturnValue({});
    service = GoogleCalendarService.getInstance(mockConfig);
  });

  describe('getAuthUrl', () => {
    it('should generate authorization URL', () => {
      const mockUrl = 'http://mock-auth-url';
      mockGenerateAuthUrl.mockReturnValue(mockUrl);

      const url = service.getAuthUrl();
      
      expect(url).toBe(mockUrl);
      expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: expect.arrayContaining([
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events'
        ]),
        prompt: 'consent'
      });
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens and store them', async () => {
      const mockTokens = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        scope: 'mock-scope',
        expiry_date: 123456789
      };

      mockGetToken.mockResolvedValue({ tokens: mockTokens });
      (Token.findOneAndUpdate as jest.Mock).mockResolvedValue(mockTokens);

      const result = await service.exchangeCodeForTokens('test-code');

      expect(result).toEqual(mockTokens);
      expect(Token.findOneAndUpdate).toHaveBeenCalledWith(
        {},
        {
          accessToken: mockTokens.access_token,
          refreshToken: mockTokens.refresh_token,
          expiryDate: mockTokens.expiry_date,
          scope: mockTokens.scope,
          tokenType: 'Bearer'
        },
        { upsert: true, new: true }
      );
    });
  });

  describe('getValidAccessToken', () => {
    it('should return valid access token if exists', async () => {
      const mockTokens = {
        access_token: 'valid-access-token',
        refresh_token: 'mock-refresh-token',
        scope: 'mock-scope',
        expiry_date: Date.now() + 3600000
      };

      (Token.findOne as jest.Mock).mockResolvedValue({
        accessToken: mockTokens.access_token,
        refreshToken: mockTokens.refresh_token,
        scope: mockTokens.scope,
        expiryDate: mockTokens.expiry_date,
        tokenType: 'Bearer'
      });

      mockGetTokenInfo.mockResolvedValue({
        expiry_date: mockTokens.expiry_date
      });

      const token = await service.getValidAccessToken();
      expect(token).toBe(mockTokens.access_token);
    });

    it('should refresh token if expired', async () => {
      const mockOldTokens = {
        access_token: 'expired-access-token',
        refresh_token: 'mock-refresh-token',
        scope: 'mock-scope',
        expiry_date: Date.now() - 3600000
      };

      const mockNewTokens = {
        access_token: 'new-access-token',
        refresh_token: 'mock-refresh-token',
        scope: 'mock-scope',
        expiry_date: Date.now() + 3600000
      };

      (Token.findOne as jest.Mock).mockResolvedValue({
        accessToken: mockOldTokens.access_token,
        refreshToken: mockOldTokens.refresh_token,
        scope: mockOldTokens.scope,
        expiryDate: mockOldTokens.expiry_date,
        tokenType: 'Bearer'
      });

      mockGetTokenInfo.mockResolvedValue({
        expiry_date: mockOldTokens.expiry_date
      });

      mockRefreshAccessToken.mockResolvedValue({
        credentials: mockNewTokens
      });

      const token = await service.getValidAccessToken();
      expect(token).toBe(mockNewTokens.access_token);
    });
  });
}); 