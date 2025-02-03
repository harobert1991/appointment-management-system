import { jest, describe, it, expect, beforeEach } from '@jest/globals';
/// <reference types="jest" />
import { GoogleCalendarService } from '../../src/services/googleCalendarService';
import { GoogleCalendarAuth } from '../../src/utils';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { google } from 'googleapis';

// Mock the GoogleCalendarAuth and OAuth2Client
jest.mock('../../src/utils/googleAuth');
jest.mock('google-auth-library');
jest.mock('googleapis');

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;
  let mockAuth: jest.Mocked<Partial<OAuth2Client>>;
  let mockGoogleAuth: jest.Mocked<GoogleCalendarAuth>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuth = {
      getToken: jest.fn().mockReturnValue(Promise.resolve({ tokens: {} })) as jest.MockedFunction<OAuth2Client['getToken']>,
      setCredentials: jest.fn(),
      refreshAccessToken: jest.fn().mockReturnValue(Promise.resolve({})) as unknown as jest.MockedFunction<OAuth2Client['refreshAccessToken']>,
      getTokenInfo: jest.fn().mockReturnValue(Promise.resolve({})) as jest.MockedFunction<OAuth2Client['getTokenInfo']>
    };

    mockGoogleAuth = {
      getClient: jest.fn().mockReturnValue(mockAuth),
      getAuthUrl: jest.fn(),
      getToken: jest.fn(),
      refreshAccessToken: jest.fn(),
      validateToken: jest.fn(),
      setCredentials: jest.fn(),
      oAuth2Client: mockAuth,
      revokeToken: jest.fn()
    } as unknown as jest.Mocked<GoogleCalendarAuth>;

    (GoogleCalendarAuth.getInstance as jest.Mock).mockReturnValue(mockGoogleAuth);
    (google.calendar as jest.Mock).mockReturnValue({});

    service = GoogleCalendarService.getInstance(mockGoogleAuth);
  });

  describe('exchangeCodeForTokens', () => {
    it('should successfully exchange code for tokens', async () => {
      const mockTokens: Credentials = {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        scope: 'https://www.googleapis.com/auth/calendar',
        token_type: 'Bearer',
        expiry_date: Date.now() + 3600000
      };

      (mockGoogleAuth.getToken as jest.Mock).mockResolvedValueOnce(mockTokens as never);

      const result = await service.exchangeCodeForTokens('mock_code');

      expect(result).toEqual({
        access_token: mockTokens.access_token,
        refresh_token: mockTokens.refresh_token,
        scope: mockTokens.scope || '',
        token_type: mockTokens.token_type || 'Bearer',
        expiry_date: mockTokens.expiry_date || 0
      });
    });

    it('should throw error when no access token received', async () => {
      const mockTokens: Credentials = {
        scope: '',
        token_type: 'Bearer',
        expiry_date: Date.now()
      };

      (mockGoogleAuth.getToken as jest.Mock).mockResolvedValueOnce(mockTokens as never);

      await expect(service.exchangeCodeForTokens('mock_code'))
        .rejects
        .toThrow('No access token received');
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

      mockGoogleAuth.refreshAccessToken.mockResolvedValueOnce(mockCredentials);

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
      (mockGoogleAuth.refreshAccessToken as jest.Mock).mockRejectedValueOnce(
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
      mockGoogleAuth.validateToken.mockResolvedValueOnce(false);

      // Mock refreshAccessToken to return new tokens
      mockGoogleAuth.refreshAccessToken.mockResolvedValueOnce(newTokens);

      const result = await service.getValidAccessToken();
      console.log("the result", result);
      expect(result).toBe(newTokens.access_token);
    });
  });
}); 