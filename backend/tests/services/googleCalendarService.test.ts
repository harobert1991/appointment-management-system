import { jest, describe, it, expect, beforeEach } from '@jest/globals';
/// <reference types="jest" />

// Add these mocks BEFORE any imports
jest.mock('googleapis', () => ({
  google: {
    calendar: jest.fn(),
    auth: {
      OAuth2: jest.fn()
    }
  }
}));

jest.mock('google-auth-library');
jest.mock('../../src/utils/googleAuth');

// Now we can import
import { GoogleCalendarService } from '../../src/services/googleCalendarService';
import { GoogleCalendarAuth } from '../../src/utils';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { google } from 'googleapis';

let mockOAuth2Client: jest.Mocked<OAuth2Client>;

// Create mock before using it
mockOAuth2Client = {
  generateAuthUrl: jest.fn(),
  getToken: jest.fn(),
  setCredentials: jest.fn(),
  refreshAccessToken: jest.fn().mockResolvedValue({ credentials: {} as Credentials } as never),
  getTokenInfo: jest.fn(),
  revokeToken: jest.fn()
} as unknown as jest.Mocked<OAuth2Client>;

jest.mock('google-auth-library', () => {
  return { OAuth2Client: jest.fn(() => mockOAuth2Client) };
});

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;

  beforeEach(() => {
    jest.clearAllMocks();
    (google.calendar as jest.Mock).mockReturnValue({});
    service = GoogleCalendarService.getInstance({
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
      redirectUri: 'mock-redirect-uri'
    });
  });

  describe('refreshAccessToken', () => {
    it('should successfully refresh access token', async () => {
      const mockCredentials: Credentials = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        scope: 'https://www.googleapis.com/auth/calendar',
        token_type: 'Bearer',
        expiry_date: Date.now() + 3600000
      };

      mockOAuth2Client.refreshAccessToken.mockResolvedValueOnce({ credentials: mockCredentials } as never);
      jest.spyOn(service as any, 'storeTokens').mockResolvedValueOnce(undefined);

      const result = await service.refreshAccessToken('mock_refresh_token');
      expect(result).toEqual({
        access_token: mockCredentials.access_token,
        refresh_token: mockCredentials.refresh_token,
        scope: mockCredentials.scope || '',
        token_type: mockCredentials.token_type || 'Bearer',
        expiry_date: mockCredentials.expiry_date || 0
      });
    });

    it('should handle refresh token errors', async () => {
      (mockOAuth2Client.refreshAccessToken as jest.Mock).mockRejectedValueOnce(
        new Error('Refresh token failed') as never
      );
      
      await expect(service.refreshAccessToken('mock_refresh_token'))
        .rejects
        .toThrow('Failed to refresh access token');
    });
  });

  describe('getValidAccessToken', () => {
    it('should return valid token from storage', async () => {
      // Mock implementation will be added based on your getValidAccessToken implementation
    });

    it('should refresh token if stored token is invalid', async () => {
      const storedTokens: Credentials = {
        access_token: 'old_token',
        refresh_token: 'stored_refresh_token',
        expiry_date: Date.now() - 1000
      };

      const newTokens: Credentials = {
        access_token: 'new_token',
        refresh_token: 'new_refresh_token',
        expiry_date: Date.now() + 3600000
      };

      // Mock getStoredTokens to return stored tokens
      jest.spyOn(service as any, 'getStoredTokens')
        .mockResolvedValueOnce(storedTokens);

      // Mock validateToken to return false (invalid token)
      mockOAuth2Client.getTokenInfo.mockResolvedValueOnce({
        aud: 'mock-aud',
        scopes: ['https://www.googleapis.com/auth/calendar'],
        expiry_date: Date.now() - 1000
      });

      // Mock refreshAccessToken to return new tokens
      mockOAuth2Client.refreshAccessToken.mockResolvedValueOnce({ credentials: newTokens } as never);

      const result = await service.getValidAccessToken();
      console.log("the result", result);
      expect(result).toBe(newTokens.access_token);
    });
  });
}); 