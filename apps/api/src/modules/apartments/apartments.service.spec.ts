import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApartmentsService } from './apartments.service';
import { PrismaService } from '../../database/prisma.service';
import { APARTMENT_PROVIDERS } from './providers/apartment-provider.interface';
import { ApartmentListing, ApartmentSearchParams } from '@family-life/types';

const makeListing = (
  id: string,
  overrides: Partial<ApartmentListing> = {},
): ApartmentListing => ({
  id,
  title: `Apt ${id}`,
  price: 5000,
  rooms: 3,
  floor: 2,
  area: 'Tel Aviv',
  city: 'Tel Aviv',
  url: `https://example.com/${id}`,
  imageUrl: null,
  description: null,
  provider: 'mock',
  foundAt: new Date().toISOString(),
  seenBy: [],
  ...overrides,
});

const mockProvider = {
  providerName: 'mock',
  isConfigured: true,
  search: jest.fn(),
};

const mockPrisma = {
  page: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  familyMember: {
    findUnique: jest.fn(),
  },
};

describe('ApartmentsService', () => {
  let service: ApartmentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApartmentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: APARTMENT_PROVIDERS, useValue: [mockProvider] },
      ],
    }).compile();

    service = module.get<ApartmentsService>(ApartmentsService);
  });

  describe('syncPage', () => {
    const pageId = 'page-1';
    const searchParams: ApartmentSearchParams = {
      dealType: 'rent',
      city: 'TLV',
    };

    it('replaces listings, preserves seenBy for returning IDs, and returns new count', async () => {
      const existingListing = makeListing('existing-1', { seenBy: ['user-1'] });
      const newListing = makeListing('new-1');

      mockPrisma.page.findUnique.mockResolvedValue({
        id: pageId,
        type: 'apartments',
        metadata: searchParams,
        apartmentListings: [existingListing],
      });
      // Provider returns existing + new (existing-1 re-appears, new-1 is brand new)
      mockProvider.search.mockResolvedValue([existingListing, newListing]);
      mockPrisma.page.update.mockResolvedValue({});

      const newCount = await service.syncPage(pageId);

      expect(mockProvider.search).toHaveBeenCalledWith(searchParams);
      // Both listings saved; existing-1 retains seenBy, new-1 gets empty seenBy
      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: pageId },
        data: expect.objectContaining({
          apartmentListings: [
            { ...existingListing, seenBy: ['user-1'] },
            { ...newListing, seenBy: [] },
          ],
          lastSyncedAt: expect.any(Date),
        }),
      });
      expect(newCount).toBe(1);
    });

    it('does nothing when page is not found', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await service.syncPage(pageId);

      expect(mockProvider.search).not.toHaveBeenCalled();
      expect(mockPrisma.page.update).not.toHaveBeenCalled();
    });

    it('does nothing when page has no search params', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: pageId,
        type: 'apartments',
        metadata: {},
        apartmentListings: [],
      });

      await service.syncPage(pageId);

      expect(mockProvider.search).not.toHaveBeenCalled();
    });

    it('skips sync when no provider is configured', async () => {
      const unconfiguredProvider = { ...mockProvider, isConfigured: false };
      const moduleNoProvider: TestingModule = await Test.createTestingModule({
        providers: [
          ApartmentsService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: APARTMENT_PROVIDERS, useValue: [unconfiguredProvider] },
        ],
      }).compile();

      const svcNoProvider =
        moduleNoProvider.get<ApartmentsService>(ApartmentsService);
      await svcNoProvider.syncPage(pageId);

      expect(mockPrisma.page.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.page.update).not.toHaveBeenCalled();
    });

    it('returns 0 new count when all returned listings already exist', async () => {
      const existingListing = makeListing('existing-1');

      mockPrisma.page.findUnique.mockResolvedValue({
        id: pageId,
        type: 'apartments',
        metadata: searchParams,
        apartmentListings: [existingListing],
      });
      mockProvider.search.mockResolvedValue([existingListing]);
      mockPrisma.page.update.mockResolvedValue({});

      const newCount = await service.syncPage(pageId);

      expect(newCount).toBe(0);
      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: pageId },
        data: expect.objectContaining({
          apartmentListings: [{ ...existingListing, seenBy: [] }],
        }),
      });
    });
  });

  describe('syncAll', () => {
    it('calls syncPage for each apartments page', async () => {
      const pages = [
        { id: 'page-1', type: 'apartments' },
        { id: 'page-2', type: 'apartments' },
      ];
      mockPrisma.page.findMany.mockResolvedValue(pages);
      mockPrisma.page.findUnique.mockResolvedValue(null); // simplified — syncPage handles gracefully

      await service.syncAll();

      expect(mockPrisma.page.findMany).toHaveBeenCalledWith({
        where: { type: 'apartments' },
      });
      expect(mockPrisma.page.findUnique).toHaveBeenCalledTimes(2);
    });

    it('continues processing other pages when one fails', async () => {
      const pages = [{ id: 'page-fail' }, { id: 'page-ok' }];
      mockPrisma.page.findMany.mockResolvedValue(pages);
      mockPrisma.page.findUnique
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce(null);

      await expect(service.syncAll()).resolves.not.toThrow();
    });
  });

  describe('updateSearchParams', () => {
    const familyId = 'fam-1';
    const pageId = 'page-1';
    const userId = 'user-1';
    const params: ApartmentSearchParams = { dealType: 'buy', city: 'Haifa' };

    it('saves search params to page metadata', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue({ id: 'mem-1' });
      mockPrisma.page.findFirst.mockResolvedValue({ id: pageId });
      mockPrisma.page.update.mockResolvedValue({});

      await service.updateSearchParams(familyId, pageId, userId, params);

      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: pageId },
        data: { metadata: params },
      });
    });

    it('throws ForbiddenException when user is not a member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSearchParams(familyId, pageId, userId, params),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when page not found', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue({ id: 'mem-1' });
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSearchParams(familyId, pageId, userId, params),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markSeen', () => {
    const familyId = 'fam-1';
    const pageId = 'page-1';
    const userId = 'user-1';
    const listingId = 'listing-1';

    it('adds userId to listing seenBy array', async () => {
      const listing = makeListing(listingId, { seenBy: [] });
      const otherListing = makeListing('other', { seenBy: [] });

      mockPrisma.familyMember.findUnique.mockResolvedValue({ id: 'mem-1' });
      mockPrisma.page.findFirst.mockResolvedValue({
        id: pageId,
        apartmentListings: [listing, otherListing],
      });
      mockPrisma.page.update.mockResolvedValue({});

      await service.markSeen(familyId, pageId, listingId, userId);

      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: pageId },
        data: {
          apartmentListings: [{ ...listing, seenBy: [userId] }, otherListing],
        },
      });
    });

    it('does not add duplicate userId to seenBy', async () => {
      const listing = makeListing(listingId, { seenBy: [userId] });

      mockPrisma.familyMember.findUnique.mockResolvedValue({ id: 'mem-1' });
      mockPrisma.page.findFirst.mockResolvedValue({
        id: pageId,
        apartmentListings: [listing],
      });
      mockPrisma.page.update.mockResolvedValue({});

      await service.markSeen(familyId, pageId, listingId, userId);

      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: pageId },
        data: { apartmentListings: [listing] },
      });
    });

    it('throws ForbiddenException when user is not a member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.markSeen(familyId, pageId, listingId, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when page not found', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue({ id: 'mem-1' });
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(
        service.markSeen(familyId, pageId, listingId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('syncPageForUser', () => {
    const familyId = 'fam-1';
    const pageId = 'page-1';
    const userId = 'user-1';

    it('throws ForbiddenException when user is not a member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.syncPageForUser(familyId, pageId, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when page not found', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue({ id: 'mem-1' });
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(
        service.syncPageForUser(familyId, pageId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('calls syncPage when member and page exist', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue({ id: 'mem-1' });
      mockPrisma.page.findFirst.mockResolvedValue({ id: pageId });
      mockPrisma.page.findUnique.mockResolvedValue(null); // syncPage handles null gracefully

      await service.syncPageForUser(familyId, pageId, userId);

      expect(mockPrisma.page.findUnique).toHaveBeenCalledWith({
        where: { id: pageId },
      });
    });
  });
});
