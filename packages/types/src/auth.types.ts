export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  locale?: 'en' | 'he';
}

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
