import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IApartmentProvider } from './apartment-provider.interface';
import { ApartmentSearchParams, ApartmentListing } from '@family-life/types';

@Injectable()
export class Yad2ApifyProvider implements IApartmentProvider {
  readonly providerName = 'yad2-apify';
  private readonly logger = new Logger(Yad2ApifyProvider.name);
  private readonly token: string | null;
  private readonly actorId = 'swerve~yad2-scraper';

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {
    this.token = config.get<string>('APIFY_TOKEN') ?? null;
    if (!this.token) {
      this.logger.warn('APIFY_TOKEN not set — yad2-apify provider disabled');
    }
  }

  get isConfigured(): boolean {
    return this.token !== null;
  }

  private buildInput(params: ApartmentSearchParams): Record<string, unknown> {
    return {
      dealType: params.dealType === 'buy' ? 'forsale' : 'rent',
      ...(params.city ? { city: params.city } : {}),
      ...(params.neighbourhood ? { neighbourhood: params.neighbourhood } : {}),
      ...(params.minRooms != null ? { minRooms: params.minRooms } : {}),
      ...(params.maxRooms != null ? { maxRooms: params.maxRooms } : {}),
      ...(params.minPrice != null ? { minPrice: params.minPrice } : {}),
      ...(params.maxPrice != null ? { maxPrice: params.maxPrice } : {}),
      ...(params.minFloor != null ? { minFloor: params.minFloor } : {}),
      ...(params.maxFloor != null ? { maxFloor: params.maxFloor } : {}),
      enrichListings: false,
      requireParking: params.requireParking ?? false,
      requireBalcony: params.requireBalcony ?? false,
      requireElevator: params.requireElevator ?? false,
      requireSecureRoom: params.requireSecureRoom ?? false,
      maxItems: 100,
    };
  }

  private s(v: unknown): string {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return '';
  }

  private mapListing(raw: Record<string, unknown>): ApartmentListing {
    const id = this.s(raw['listingId']) || String(Math.random());

    const street = this.s(raw['address']) || this.s(raw['streetName']);
    const neighbourhood = this.s(raw['neighbourhood']);
    const city = this.s(raw['city']) || this.s(raw['cityHebrew']);
    const title = [street, neighbourhood, city].filter(Boolean).join(', ');

    const floorStr = this.s(raw['floor']);
    const floorNum = floorStr !== '' ? parseInt(floorStr, 10) : null;

    const imageUrl =
      typeof raw['coverImage'] === 'string'
        ? raw['coverImage']
        : Array.isArray(raw['images']) &&
            (raw['images'] as unknown[]).length > 0
          ? this.s((raw['images'] as unknown[])[0])
          : null;

    return {
      id,
      title,
      price: raw['price'] != null ? Number(raw['price']) : null,
      rooms: raw['rooms'] != null ? Number(raw['rooms']) : null,
      floor: floorNum != null && !isNaN(floorNum) ? floorNum : null,
      area: neighbourhood || null,
      city: city || null,
      url: this.s(raw['url']),
      imageUrl,
      description:
        typeof raw['listingDescription'] === 'string'
          ? raw['listingDescription']
          : null,
      provider: this.providerName,
      foundAt: new Date().toISOString(),
      seenBy: [],
    };
  }

  async search(params: ApartmentSearchParams): Promise<ApartmentListing[]> {
    if (!this.token) return [];

    const input = this.buildInput(params);
    this.logger.log(`Searching yad2 via Apify: ${JSON.stringify(input)}`);

    try {
      const { data } = await firstValueFrom(
        this.http.post(
          `https://api.apify.com/v2/acts/${this.actorId}/run-sync-get-dataset-items?token=${this.token}&timeout=120`,
          input,
          { timeout: 130_000 },
        ),
      );
      const results = (data as Record<string, unknown>[]).map((r) =>
        this.mapListing(r),
      );
      this.logger.log(`Apify returned ${results.length} listing(s)`);
      return results;
    } catch (err) {
      this.logger.error(`Apify yad2 search failed: ${String(err)}`);
      return [];
    }
  }
}
