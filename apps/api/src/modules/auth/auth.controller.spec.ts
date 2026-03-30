import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AuthModule } from './auth.module';
import { PrismaModule } from '../../database/prisma.module';
import { PrismaService } from '../../database/prisma.service';
import { ConfigModule } from '@nestjs/config';

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
          envFilePath: [
            `.env.${process.env.NODE_ENV ?? 'development'}`,
            '.env',
          ],
        }),
        PrismaModule,
        AuthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
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
});
