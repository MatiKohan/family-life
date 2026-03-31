import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '@family-life/types';

interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(profile: GoogleProfile): Promise<AuthUser> {
    const existing = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    if (existing) {
      return this.toAuthUser(existing);
    }

    const user = await this.prisma.user.create({
      data: {
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      },
    });

    return this.toAuthUser(user);
  }

  findByEmail(email: string): Promise<{
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    password: string | null;
  } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        password: true,
      },
    });
  }

  async createWithPassword(
    email: string,
    name: string,
    hashedPassword: string,
  ): Promise<AuthUser> {
    const user = await this.prisma.user.create({
      data: { email, name, password: hashedPassword },
    });
    return this.toAuthUser(user);
  }

  async findById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toAuthUser(user) : null;
  }

  async saveRefreshTokenHash(userId: string, hash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }

  async getRefreshTokenHash(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { refreshTokenHash: true },
    });
    return user?.refreshTokenHash ?? null;
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };
  }
}
