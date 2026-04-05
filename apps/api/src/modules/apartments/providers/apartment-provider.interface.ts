import { ApartmentSearchParams, ApartmentListing } from '@family-life/types';

export interface IApartmentProvider {
  readonly providerName: string;
  readonly isConfigured: boolean;
  search(params: ApartmentSearchParams): Promise<ApartmentListing[]>;
}

export const APARTMENT_PROVIDERS = Symbol('APARTMENT_PROVIDERS');
