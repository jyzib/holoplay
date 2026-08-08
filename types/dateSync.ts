export type DateSyncStatus = 'playing' | 'paused';

export type ChatDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'seen';

export interface DateSyncMedia {
  type: 'movie' | 'tv';
  imdbId?: string;
  tmdbId?: string;
  season?: number;
  episode?: number;
  title?: string;
  poster?: string;
}

export interface DateSyncState {
  media: DateSyncMedia | null;
  status: DateSyncStatus;
  progress: number;
  updatedAt: number;
  seq: number;
}

export interface DateChatMessage {
  id: string;
  clientId: string;
  text: string;
  createdAt: number;
  senderName: string;
  mine?: boolean;
  status?: ChatDeliveryStatus;
}

export type DateSyncMessage =
  | { kind: 'hello'; clientId: string; name: string }
  | { kind: 'ping'; clientId: string }
  | { kind: 'profile'; clientId: string; name: string }
  | { kind: 'state'; clientId: string; state: DateSyncState }
  | {
      kind: 'chat';
      clientId: string;
      id: string;
      text: string;
      createdAt: number;
      name: string;
    }
  | {
      kind: 'chat_ack';
      clientId: string;
      id: string;
      status: 'delivered' | 'seen';
    }
  | {
      kind: 'typing';
      clientId: string;
      isTyping: boolean;
    };

export type DateConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'waiting'
  | 'paired'
  | 'error';
