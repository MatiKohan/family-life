export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
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
