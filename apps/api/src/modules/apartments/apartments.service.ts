import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  IApartmentProvider,
  APARTMENT_PROVIDERS,
} from './providers/apartment-provider.interface';
import { ApartmentListing, ApartmentSearchParams } from '@family-life/types';

@Injectable()
export class ApartmentsService {
  private readonly logger = new Logger(ApartmentsService.name);

  constructor(
    @Inject(APARTMENT_PROVIDERS)
    private readonly providers: IApartmentProvider[],
    private readonly prisma: PrismaService,
  ) {}

  private getProvider(): IApartmentProvider | undefined {
    return this.providers.find((p) => p.isConfigured);
  }

  /** Called by the scheduler — syncs ALL apartments pages across all families */
  async syncAll(): Promise<void> {
    const pages = await this.prisma.page.findMany({
      where: { type: 'apartments' },
    });
    this.logger.log(`Syncing ${pages.length} apartments page(s)`);
    for (const page of pages) {
      await this.syncPage(page.id).catch((err) =>
        this.logger.error(`Failed to sync page ${page.id}: ${String(err)}`),
      );
    }
  }

  /** Sync a single apartments page — replace listings, preserve seenBy for returning IDs */
  async syncPage(pageId: string): Promise<number> {
    const provider = this.getProvider();
    if (!provider) {
      this.logger.warn('No apartment provider configured — skipping sync');
      return 0;
    }

    const page = await this.prisma.page.findUnique({ where: { id: pageId } });
    if (!page || page.type !== 'apartments') return 0;

    const searchParams = page.metadata as unknown as ApartmentSearchParams;
    if (!searchParams?.dealType) {
      this.logger.warn(`Page ${pageId} has no search params — skipping`);
      return 0;
    }

    const fetched = await provider.search(searchParams);

    // Preserve seenBy for any listing that already exists
    const existing =
      (page.apartmentListings as unknown as ApartmentListing[]) ?? [];
    const seenByMap = new Map(existing.map((l) => [l.id, l.seenBy]));
    const existingIds = new Set(existing.map((l) => l.id));

    const merged = fetched.map((l) => ({
      ...l,
      seenBy: seenByMap.get(l.id) ?? [],
    }));
    const newCount = fetched.filter((l) => !existingIds.has(l.id)).length;

    this.logger.log(
      `Page ${pageId}: ${fetched.length} total, ${newCount} new listing(s)`,
    );

    await this.prisma.page.update({
      where: { id: pageId },
      data: {
        apartmentListings: merged as object[],
        lastSyncedAt: new Date(),
      },
    });

    return newCount;
  }

  /** API: manually trigger sync for a specific page (member must belong to family) */
  async syncPageForUser(
    familyId: string,
    pageId: string,
    userId: string,
  ): Promise<{ newCount: number }> {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this family');

    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId },
    });
    if (!page) throw new NotFoundException('Page not found');

    const newCount = await this.syncPage(pageId);
    return { newCount };
  }

  /** API: save search params for an apartments page */
  async updateSearchParams(
    familyId: string,
    pageId: string,
    userId: string,
    params: ApartmentSearchParams,
  ): Promise<void> {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this family');

    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId },
    });
    if (!page) throw new NotFoundException('Page not found');

    await this.prisma.page.update({
      where: { id: pageId },
      data: { metadata: params as object },
    });
  }

  /** API: mark a listing as seen by the user (soft dismiss) */
  async markSeen(
    familyId: string,
    pageId: string,
    listingId: string,
    userId: string,
  ): Promise<void> {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this family');

    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId },
    });
    if (!page) throw new NotFoundException('Page not found');

    const listings = (
      page.apartmentListings as unknown as ApartmentListing[]
    ).map((l) =>
      l.id === listingId && !l.seenBy.includes(userId)
        ? { ...l, seenBy: [...l.seenBy, userId] }
        : l,
    );
    await this.prisma.page.update({
      where: { id: pageId },
      data: { apartmentListings: listings as object[] },
    });
  }
}
