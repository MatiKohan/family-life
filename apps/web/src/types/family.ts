export type FamilyRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED';

export interface Family {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
  _count?: { members: number };
}

export interface NotificationSettings {
  invite?: boolean;
  itemAssigned?: boolean;
  eventReminder?: boolean;
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
  token: string;
  email: string | null;
  phone: string | null;
  status: InviteStatus;
  expiresAt: string;
}
