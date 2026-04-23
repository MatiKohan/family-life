import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard, Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@family-life/types';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(2)
  name!: string;
}

const REFRESH_COOKIE = 'refresh_token';

function cookieOptions(configService: ConfigService) {
  const isProd = configService.get<string>('NODE_ENV') === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ('none' as const) : ('lax' as const),
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.register(
      body.email,
      body.password,
      body.name,
    );
    res.cookie(
      REFRESH_COOKIE,
      tokens.refreshToken,
      cookieOptions(this.configService),
    );
    return { accessToken: tokens.accessToken, user: tokens.user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.loginWithCredentials(
      body.email,
      body.password,
    );
    res.cookie(
      REFRESH_COOKIE,
      tokens.refreshToken,
      cookieOptions(this.configService),
    );
    return { accessToken: tokens.accessToken, user: tokens.user };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @Throttle({ medium: { ttl: 60000, limit: 10 } })
  googleLogin() {
    // Passport redirects to Google — no body needed
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @SkipThrottle()
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.authService.login(req.user as AuthUser);
    const webUrl = this.configService.get<string>(
      'WEB_URL',
      'http://localhost:5173',
    );

    res.cookie(
      REFRESH_COOKIE,
      tokens.refreshToken,
      cookieOptions(this.configService),
    );
    res.redirect(`${webUrl}/auth/callback?accessToken=${tokens.accessToken}`);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { ttl: 60000, limit: 10 } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken: string | undefined = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) throw new UnauthorizedException();

    const payload = this.authService.verifyRefreshToken(refreshToken);
    const tokens = await this.authService.refresh(payload.sub, refreshToken);

    res.cookie(
      REFRESH_COOKIE,
      tokens.refreshToken,
      cookieOptions(this.configService),
    );
    return { accessToken: tokens.accessToken, user: tokens.user };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipThrottle()
  async logout(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.id);
    res.clearCookie(REFRESH_COOKIE, cookieOptions(this.configService));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipThrottle()
  async deleteAccount(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.usersService.deleteAccount(user.id);
    res.clearCookie('refresh_token', cookieOptions(this.configService));
  }
}
