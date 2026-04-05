import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { Yad2ApifyProvider } from './providers/yad2-apify.provider';
import { APARTMENT_PROVIDERS } from './providers/apartment-provider.interface';
import { ApartmentsService } from './apartments.service';
import { ApartmentsScheduler } from './apartments.scheduler';
import { ApartmentsController } from './apartments.controller';

@Module({
  imports: [HttpModule],
  providers: [
    Yad2ApifyProvider,
    // To add a new provider (e.g. homeless.co.il):
    //   1. Create HomelessProvider implementing IApartmentProvider
    //   2. Add to providers array below and inject list
    {
      provide: APARTMENT_PROVIDERS,
      useFactory: (yad2: Yad2ApifyProvider) => [yad2],
      inject: [Yad2ApifyProvider],
    },
    ApartmentsService,
    ApartmentsScheduler,
  ],
  controllers: [ApartmentsController],
})
export class ApartmentsModule {}
