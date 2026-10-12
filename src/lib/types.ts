// ===== CORE TYPES =====

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  masterKeySalt: string;
  createdAt: string;
  onboardingComplete: boolean;
  settings: UserSettings;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  autoLockTimeout: number; // minutes, 0 = never
  currency: string;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  renewalReminders: boolean;
  trialAlerts: boolean;
  securityAlerts: boolean;
}

export interface Credential {
  id: string;
  userId: string;
  name: string;
  username: string;
  email: string;
  password: string; // encrypted
  website: string;
  category: CredentialCategory;
  tags: string[];
  notes: string;
  customFields: CustomField[];
  favorite: boolean;
  has2FA: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export type CredentialCategory =
  | 'Social' | 'Development' | 'Finance' | 'Shopping'
  | 'Education' | 'Work' | 'Entertainment' | 'Productivity'
  | 'Cloud' | 'Travel' | 'Other';

export interface CustomField {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'password' | 'url';
}

export interface Account {
  id: string;
  userId: string;
  serviceName: string;
  website: string;
  email: string;
  username: string;
  accountType: string;
  category: CredentialCategory;
  status: AccountStatus;
  linkedCredentialId: string | null;
  createdDate: string;
  lastReviewed: string;
  notes: string;
  tags: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AccountStatus = 'Active' | 'Inactive' | 'Closed' | 'Unknown';

export interface Subscription {
  id: string;
  userId: string;
  serviceName: string;
  provider: string;
  planName: string;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  startDate: string;
  renewalDate: string;
  paymentMethod: string;
  category: SubscriptionCategory;
  status: SubscriptionStatus;
  website: string;
  notes: string;
  tags: string[];
  favorite: boolean;
  isTrial: boolean;
  trialEndDate: string | null;
  lastUsedDate: string | null;
  reminderDays: number[];
  createdAt: string;
  updatedAt: string;
}

export type BillingCycle = 'Weekly' | 'Monthly' | 'Quarterly' | 'Half-yearly' | 'Yearly' | 'Custom';
export type SubscriptionStatus = 'Active' | 'Trial' | 'Paused' | 'Cancelled' | 'Expired';
export type SubscriptionCategory =
  | 'Streaming' | 'Productivity' | 'Development' | 'Design'
  | 'Cloud' | 'Communication' | 'Finance' | 'Gaming'
  | 'Education' | 'Health' | 'News' | 'Other';

export interface Document {
  id: string;
  userId: string;
  name: string;
  type: DocumentType;
  category: DocumentCategory;
  relatedAccountId: string | null;
  relatedSubscriptionId: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  data: string; // base64 encoded
  notes: string;
  tags: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType = 'Invoice' | 'Receipt' | 'Contract' | 'License' | 'Membership' | 'Warranty' | 'Certificate' | 'Other';
export type DocumentCategory = 'Finance' | 'Legal' | 'Work' | 'Personal' | 'Other';

export interface Notification {
  id: string;
  userId: string;
  type: 'renewal' | 'trial' | 'security' | 'reminder' | 'info';
  title: string;
  message: string;
  read: boolean;
  relatedId: string | null;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  target: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface VaultState {
  isLocked: boolean;
  lastActivity: number;
  masterKey: CryptoKey | null;
}

export interface SecurityAnalysis {
  score: number;
  weakPasswords: string[];
  reusedPasswords: string[];
  oldPasswords: string[];
  missing2FA: string[];
  totalCredentials: number;
  goodPasswords: number;
}

export interface SpendingData {
  monthly: number;
  yearly: number;
  byCategory: Record<string, number>;
  currency: string;
}
