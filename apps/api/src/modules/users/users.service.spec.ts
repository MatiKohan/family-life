import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  familyMember: {
    findMany: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  const profile = {
    googleId: 'google-123',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
  };

  describe('findOrCreate', () => {
    it('returns existing user by googleId and updates name/avatar', async () => {
      const existing = { id: 'user-1', ...profile };
      mockPrisma.user.findUnique.mockResolvedValue(existing);
      mockPrisma.user.update.mockResolvedValue(existing);

      const result = await service.findOrCreate(profile);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: profile.name, avatarUrl: profile.avatarUrl },
      });
      expect(result.id).toBe('user-1');
    });

    it('links googleId to existing email account and updates name/avatar', async () => {
      const existingByEmail = { id: 'user-1', ...profile, googleId: null };
      // First call (by googleId) returns null, second call (by email) returns existing
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingByEmail);
      mockPrisma.user.update.mockResolvedValue({
        ...existingByEmail,
        googleId: profile.googleId,
      });

      const result = await service.findOrCreate(profile);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          googleId: profile.googleId,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
        },
      });
      expect(result.id).toBe('user-1');
    });

    it('creates user when not found by googleId or email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'user-2', ...profile });

      const result = await service.findOrCreate(profile);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: profile,
      });
      expect(result.id).toBe('user-2');
    });
  });

  describe('deleteAccount', () => {
    it('deletes the user when they are not a sole owner of any family', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([]);
      mockPrisma.user.delete.mockResolvedValue({});

      await service.deleteAccount('user-1');

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('deletes the user when they are an owner but there are other owners in the family', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([
        {
          userId: 'user-1',
          role: 'OWNER',
          family: {
            id: 'family-1',
            members: [
              { userId: 'user-1', role: 'OWNER' },
              { userId: 'user-2', role: 'OWNER' },
            ],
          },
        },
      ]);
      mockPrisma.user.delete.mockResolvedValue({});

      await service.deleteAccount('user-1');

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('throws BadRequestException when user is the sole owner of a family', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([
        {
          userId: 'user-1',
          role: 'OWNER',
          family: {
            id: 'family-1',
            members: [{ userId: 'user-1', role: 'OWNER' }],
          },
        },
      ]);

      await expect(service.deleteAccount('user-1')).rejects.toThrow(
        'You are the sole owner of one or more families. Transfer ownership or delete the family before deleting your account.',
      );
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });

    it('returns AuthUser when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        ...profile,
      });
      const result = await service.findById('user-1');
      expect(result?.id).toBe('user-1');
    });
  });
});
