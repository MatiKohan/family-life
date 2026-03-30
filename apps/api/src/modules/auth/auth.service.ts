import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthUser, JwtPayload, TokenResponse } from '@template-repository/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<TokenResponse> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new UnauthorizedException('Email already in use');
    const hash = await bcrypt.hash(password, 10);
    const user = await this.usersService.createWithPassword(email, name, hash);
    return this.login(user);
  }

  async loginWithCredentials(
    email: string,
    password: string,
  ): Promise<TokenResponse> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password)
      throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return this.login({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    });
  }

  async login(user: AuthUser): Promise<TokenResponse> {
    const tokens = await this.generateTokens(user);
    const hash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersService.saveRefreshTokenHash(user.id, hash);
    return tokens;
  }

  async refresh(userId: string, refreshToken: string): Promise<TokenResponse> {
    const storedHash = await this.usersService.getRefreshTokenHash(userId);
    if (!storedHash) throw new UnauthorizedException();

    const valid = await bcrypt.compare(refreshToken, storedHash);
    if (!valid) throw new UnauthorizedException();

    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    const tokens = await this.generateTokens(user);
    const newHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersService.saveRefreshTokenHash(userId, newHash);
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.clearRefreshToken(userId);
  }

  verifyRefreshToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException();
    }
  }

  private async generateTokens(user: AuthUser): Promise<TokenResponse> {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken, user };
  }
}
