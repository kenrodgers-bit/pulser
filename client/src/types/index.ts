export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "file"
  | "sticker"
  | "emoji";

export type ViewMode = "once" | "unlimited";
export type PrivacyLevel = "everyone" | "friends" | "nobody";

export interface ChatParticipant {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  bio: string;
  avatarUrl?: string;
  authProvider?: "local" | "google";
  isVerified?: boolean;
  needsUsernameSetup?: boolean;
  friends: string[];
  friendRequestsSent: string[];
  friendRequestsReceived: string[];
  privacy: {
    lastSeen: PrivacyLevel;
    avatar: PrivacyLevel;
    stories: PrivacyLevel;
  };
  notificationSettings: {
    pushEnabled: boolean;
    customSound: boolean;
    mutedChats: string[];
    mutedChannels: string[];
  };
}

export interface Chat {
  id: string;
  participants: Array<ChatParticipant | string>;
  isGroup: boolean;
  groupName?: string;
  groupDescription?: string;
  groupAvatar?: string;
  admins: string[];
  ownerId?: string | null;
  inviteCode?: string;
  mutedBy: string[];
  pinnedMessages: string[];
  lastMessage?: {
    messageId: string;
    senderId: string;
    type: MessageType;
    snippet: string;
    createdAt: string;
  } | null;
  updatedAt: string;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
}

export interface MessageMetadata {
  publicId?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  thumbnailUrl?: string;
  previewUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  isViewable?: boolean;
  wasOpened?: boolean;
}

export interface Message {
  id: string;
  chatId?: string | null;
  channelId?: string | null;
  senderId: string;
  sender?: ChatParticipant | null;
  type: MessageType;
  content: string | null;
  viewMode: ViewMode;
  viewedBy: string[];
  deliveredTo: string[];
  readBy: string[];
  replyTo?:
    | {
        id: string;
        senderId: string;
        content: string;
        type: MessageType;
      }
    | string
    | null;
  reactions: MessageReaction[];
  deletedFor: string[];
  deletedForEveryoneAt?: string | null;
  editedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  metadata?: MessageMetadata | null;
}

export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  thumbnailUrl?: string;
  caption?: string;
  viewers: Array<{
    userId: string;
    user?: ChatParticipant | null;
    viewedAt: string;
  }>;
  reactions: Array<{
    userId: string;
    emoji: string;
  }>;
  expiresAt: string;
  createdAt: string;
}

export interface StoryGroup {
  user: ChatParticipant;
  stories: Story[];
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatarUrl?: string;
  visibility: "public" | "private";
  ownerId: string;
  admins: string[];
  members: string[];
  inviteCode?: string;
  mutedBy: string[];
  subscriberCount: number;
  lastPost?: {
    messageId: string;
    senderId: string;
    type: MessageType;
    snippet: string;
    createdAt: string;
  } | null;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string | null>;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  data: T;
}
