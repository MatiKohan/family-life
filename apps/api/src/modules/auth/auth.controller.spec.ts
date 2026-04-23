import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PrismaModule } from '../../database/prisma.module';
import { PrismaService } from '../../database/prisma.service';
import { AuthModule } from './auth.module';
import { GoogleStrategy } from './strategies/google.strategy';

const mockPrismaService = {
  user: {
    findUnique: jest.fn().mockResolvedValue(null),
    update: jest.fn(),
    create: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// Integration test for JwtAuthGuard — using the real guard wired through AuthModule
describe('AuthController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret',
              JWT_EXPIRES_IN: '15m',
              JWT_REFRESH_SECRET: 'test-refresh-secret',
              JWT_REFRESH_EXPIRES_IN: '7d',
              GOOGLE_CLIENT_ID: 'test-google-client-id',
              GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
              GOOGLE_CALLBACK_URL:
                'http://localhost:3000/api/auth/google/callback',
            }),
          ],
        }),
        ThrottlerModule.forRoot([
          { name: 'short', ttl: 60000, limit: 5 },
          { name: 'medium', ttl: 60000, limit: 10 },
        ]),
        PrismaModule,
        AuthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(GoogleStrategy)
      .useValue({})
      .compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/auth/me — no token → 401', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('POST /api/auth/refresh — no cookie → 401', async () => {
    await request(app.getHttpServer()).post('/api/auth/refresh').expect(401);
  });

  it('POST /api/auth/logout — no token → 401', async () => {
    await request(app.getHttpServer()).post('/api/auth/logout').expect(401);
  });

  it('DELETE /api/auth/me — no token → 401', async () => {
    await request(app.getHttpServer()).delete('/api/auth/me').expect(401);
  });
});
