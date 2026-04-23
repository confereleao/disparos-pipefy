export type Role = 'ADMIN' | 'OPERATOR' | 'VIEWER';
export type QueueStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'ERROR' | 'CANCELLED';
export type TriggerType =
  | 'CARD_CREATED'
  | 'CARD_MOVED_TO_PHASE'
  | 'CARD_LEFT_PHASE'
  | 'FIELD_CHANGED'
  | 'CARD_STALE';
export type TemplateCategory =
  | 'COMMERCIAL'
  | 'BILLING'
  | 'SUPPORT'
  | 'FOLLOW_UP'
  | 'REMINDER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PipeIntegration {
  id: string;
  name: string;
  pipeId: string;
  pipeName: string | null;
  active: boolean;
  lastSyncAt: string | null;
  fieldMapping: Record<string, string>;
  createdAt: string;
  _count?: { automations: number; cardsCache: number };
}

export interface WhatsAppIntegration {
  id: string;
  name: string;
  provider: string;
  apiUrl: string;
  instanceName: string | null;
  active: boolean;
  createdAt: string;
}

export interface Automation {
  id: string;
  name: string;
  description: string | null;
  pipeIntegrationId: string;
  phaseId: string | null;
  phaseName: string | null;
  triggerType: TriggerType;
  triggerConfig: Record<string, unknown>;
  filters: Array<{ fieldId: string; operator: string; value?: string }> | null;
  templateId: string;
  whatsappIntegrationId: string | null;
  delayMinutes: number;
  allowDuplicate: boolean;
  active: boolean;
  createdAt: string;
  pipeIntegration?: { name: string; pipeName: string | null };
  template?: { name: string; category: TemplateCategory };
  whatsappIntegration?: { name: string } | null;
  _count?: { messageLogs: number };
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  content: string;
  variables: string[];
  active: boolean;
  createdAt: string;
}

export interface MessageQueue {
  id: string;
  cardId: string;
  cardTitle: string | null;
  phoneNumber: string;
  messageContent: string;
  status: QueueStatus;
  scheduledAt: string;
  processedAt: string | null;
  attempts: number;
  errorMessage: string | null;
  createdAt: string;
  automation?: { name: string } | null;
  template?: { name: string } | null;
}

export interface MessageLog {
  id: string;
  cardId: string;
  cardTitle: string | null;
  pipeName: string | null;
  phaseName: string | null;
  phoneNumber: string;
  messageContent: string;
  status: QueueStatus;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
  automation?: { name: string } | null;
  template?: { name: string } | null;
  user?: { name: string; email: string } | null;
  pipeIntegration?: { name: string; pipeName: string | null } | null;
}

export interface CardCache {
  id: string;
  cardId: string;
  cardTitle: string | null;
  pipeId: string;
  phaseId: string | null;
  phaseName: string | null;
  fields: Record<string, string>;
  responsibleEmail: string | null;
  responsibleName: string | null;
  lastSyncAt: string;
}

export interface DashboardStats {
  totalSent: number;
  totalError: number;
  totalPending: number;
  todaySent: number;
  todayError: number;
  activeAutomations: number;
  successRate: number;
  last7Days: Array<{ date: string; sent: number; error: number }>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
