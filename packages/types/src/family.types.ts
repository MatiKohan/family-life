export type FamilyRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED';

export interface Family {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
  updatedAt: string;
  _count?: { members: number };
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: FamilyRole;
  whatsappPhone: string | null;
  notificationSettings: NotificationSettings;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface FamilyInvite {
  id: string;
  familyId: string;
  token: string;
  email: string | null;
  phone: string | null;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
}

export interface CreateFamilyRequest {
  name: string;
  emoji?: string;
}

export interface CreateLinkInviteRequest {
  expiresInDays?: number;
}

export interface CreateTargetedInviteRequest {
  email?: string;
  phone?: string;
  expiresInDays?: number;
}

export interface JoinFamilyResponse {
  familyId: string;
  familyName: string;
}

export interface NotificationSettings {
  invite?: boolean;
  itemAssigned?: boolean;
  eventReminder?: boolean;
}
