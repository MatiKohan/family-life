import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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
    it('returns existing user without creating', async () => {
      const existing = { id: 'user-1', ...profile };
      mockPrisma.user.findUnique.mockResolvedValue(existing);

      const result = await service.findOrCreate(profile);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(result.id).toBe('user-1');
    });

    it('creates user when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'user-2', ...profile });

      const result = await service.findOrCreate(profile);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: profile,
      });
      expect(result.id).toBe('user-2');
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
