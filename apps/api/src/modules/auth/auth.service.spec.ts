import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

const mockUser = {
  id: 'user-1',
  email: 'test@test.com',
  name: 'Test',
  avatarUrl: null,
};

const mockUsersService = {
  findById: jest.fn(),
  saveRefreshTokenHash: jest.fn(),
  getRefreshTokenHash: jest.fn(),
  clearRefreshToken: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
  verify: jest.fn(),
};

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => `mock-${key}`),
  get: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwtService.signAsync.mockResolvedValue('mock-token');
    mockUsersService.saveRefreshTokenHash.mockResolvedValue(undefined);
  });

  describe('login', () => {
    it('generates tokens and saves refresh token hash', async () => {
      const result = await service.login(mockUser);

      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockUsersService.saveRefreshTokenHash).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
      );
      expect(result.user).toEqual(mockUser);
      expect(result.accessToken).toBe('mock-token');
    });
  });

  describe('logout', () => {
    it('clears refresh token', async () => {
      mockUsersService.clearRefreshToken.mockResolvedValue(undefined);
      await service.logout('user-1');
      expect(mockUsersService.clearRefreshToken).toHaveBeenCalledWith('user-1');
    });
  });

  describe('refresh', () => {
    it('throws when no stored hash', async () => {
      mockUsersService.getRefreshTokenHash.mockResolvedValue(null);
      await expect(service.refresh('user-1', 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyRefreshToken', () => {
    it('throws UnauthorizedException on invalid token', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error();
      });
      expect(() => service.verifyRefreshToken('bad-token')).toThrow(
        UnauthorizedException,
      );
    });

    it('returns payload on valid token', () => {
      const payload = { sub: 'user-1', email: 'test@test.com' };
      mockJwtService.verify.mockReturnValue(payload);
      const result = service.verifyRefreshToken('valid-token');
      expect(result).toEqual(payload);
    });
  });
});
