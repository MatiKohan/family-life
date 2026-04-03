import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard but does NOT throw when no token is present.
 * req.user will be the authenticated user if a valid token is provided,
 * or undefined if no token / invalid token.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(_err: unknown, user: any) {
    return user ?? null;
  }
}
