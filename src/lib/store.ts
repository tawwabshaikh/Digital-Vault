import { v4 as uuidv4 } from 'uuid';
import type {
  User, Credential, Account, Subscription, Document,
  Notification, ActivityLog, UserSettings
} from './types';

const STORAGE_PREFIX = 'dv_';

function getKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

function get<T>(key: string): T | null {
  try {
    const data = localStorage.getItem(getKey(key));
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(getKey(key), JSON.stringify(value));
}

function remove(key: string): void {
  localStorage.removeItem(getKey(key));
}

// ===== USER MANAGEMENT =====

export function getUsers(): User[] {
  return get<User[]>('users') || [];
}

export function getUserById(id: string): User | null {
  return getUsers().find(u => u.id === id) || null;
}

export function getUserByEmail(email: string): User | null {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function createUser(email: string, name: string, passwordHash: string, salt: string, masterKeySalt: string): User {
  const users = getUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Email already registered');
  }
  const user: User = {
    id: uuidv4(),
    email,
    name,
    passwordHash,
    salt,
    masterKeySalt,
    createdAt: new Date().toISOString(),
    onboardingComplete: false,
    settings: {
      theme: 'dark',
      autoLockTimeout: 15,
      currency: 'USD',
      notifications: {
        renewalReminders: true,
        trialAlerts: true,
        securityAlerts: true,
      },
    },
  };
  users.push(user);
  set('users', users);
  return user;
}

export function updateUser(id: string, updates: Partial<User>): User | null {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...updates };
  set('users', users);
  return users[idx];
}

export function updateUserSettings(userId: string, settings: Partial<UserSettings>): void {
  const user = getUserById(userId);
  if (!user) return;
  updateUser(userId, { settings: { ...user.settings, ...settings } });
}

// ===== SESSION MANAGEMENT =====

export function setSession(userId: string): void {
  set('session', { userId, token: uuidv4(), createdAt: Date.now() });
}

export function getSession(): { userId: string; token: string; createdAt: number } | null {
  return get('session');
}

export function clearSession(): void {
  remove('session');
}

// ===== CREDENTIALS =====

export function getCredentials(userId: string): Credential[] {
  const all = get<Credential[]>('credentials') || [];
  return all.filter(c => c.userId === userId);
}

export function getCredentialById(userId: string, id: string): Credential | null {
  return getCredentials(userId).find(c => c.id === id) || null;
}

export function createCredential(userId: string, data: Omit<Credential, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Credential {
  const all = get<Credential[]>('credentials') || [];
  const credential: Credential = {
    ...data,
    id: uuidv4(),
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  all.push(credential);
  set('credentials', all);
  logActivity(userId, 'create', 'Credential', credential.name);
  return credential;
}

export function updateCredential(userId: string, id: string, data: Partial<Credential>): Credential | null {
  const all = get<Credential[]>('credentials') || [];
  const idx = all.findIndex(c => c.id === id && c.userId === userId);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
  set('credentials', all);
  logActivity(userId, 'update', 'Credential', all[idx].name);
  return all[idx];
}

export function deleteCredential(userId: string, id: string): boolean {
  const all = get<Credential[]>('credentials') || [];
  const item = all.find(c => c.id === id && c.userId === userId);
  const filtered = all.filter(c => !(c.id === id && c.userId === userId));
  if (filtered.length === all.length) return false;
  set('credentials', filtered);
  if (item) logActivity(userId, 'delete', 'Credential', item.name);
  return true;
}

// ===== ACCOUNTS =====

export function getAccounts(userId: string): Account[] {
  const all = get<Account[]>('accounts') || [];
  return all.filter(a => a.userId === userId);
}

export function getAccountById(userId: string, id: string): Account | null {
  return getAccounts(userId).find(a => a.id === id) || null;
}

export function createAccount(userId: string, data: Omit<Account, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Account {
  const all = get<Account[]>('accounts') || [];
  const account: Account = {
    ...data,
    id: uuidv4(),
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  all.push(account);
  set('accounts', all);
  logActivity(userId, 'create', 'Account', account.serviceName);
  return account;
}

export function updateAccount(userId: string, id: string, data: Partial<Account>): Account | null {
  const all = get<Account[]>('accounts') || [];
  const idx = all.findIndex(a => a.id === id && a.userId === userId);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
  set('accounts', all);
  logActivity(userId, 'update', 'Account', all[idx].serviceName);
  return all[idx];
}

export function deleteAccount(userId: string, id: string): boolean {
  const all = get<Account[]>('accounts') || [];
  const item = all.find(a => a.id === id && a.userId === userId);
  const filtered = all.filter(a => !(a.id === id && a.userId === userId));
  if (filtered.length === all.length) return false;
  set('accounts', filtered);
  if (item) logActivity(userId, 'delete', 'Account', item.serviceName);
  return true;
}

// ===== SUBSCRIPTIONS =====

export function getSubscriptions(userId: string): Subscription[] {
  const all = get<Subscription[]>('subscriptions') || [];
  return all.filter(s => s.userId === userId);
}

export function getSubscriptionById(userId: string, id: string): Subscription | null {
  return getSubscriptions(userId).find(s => s.id === id) || null;
}

export function createSubscription(userId: string, data: Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Subscription {
  const all = get<Subscription[]>('subscriptions') || [];
  const sub: Subscription = {
    ...data,
    id: uuidv4(),
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  all.push(sub);
  set('subscriptions', all);
  logActivity(userId, 'create', 'Subscription', sub.serviceName);
  return sub;
}

export function updateSubscription(userId: string, id: string, data: Partial<Subscription>): Subscription | null {
  const all = get<Subscription[]>('subscriptions') || [];
  const idx = all.findIndex(s => s.id === id && s.userId === userId);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
  set('subscriptions', all);
  logActivity(userId, 'update', 'Subscription', all[idx].serviceName);
  return all[idx];
}

export function deleteSubscription(userId: string, id: string): boolean {
  const all = get<Subscription[]>('subscriptions') || [];
  const item = all.find(s => s.id === id && s.userId === userId);
  const filtered = all.filter(s => !(s.id === id && s.userId === userId));
  if (filtered.length === all.length) return false;
  set('subscriptions', filtered);
  if (item) logActivity(userId, 'delete', 'Subscription', item.serviceName);
  return true;
}

// ===== DOCUMENTS =====

export function getDocuments(userId: string): Document[] {
  const all = get<Document[]>('documents') || [];
  return all.filter(d => d.userId === userId);
}

export function getDocumentById(userId: string, id: string): Document | null {
  return getDocuments(userId).find(d => d.id === id) || null;
}

export function createDocument(userId: string, data: Omit<Document, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Document {
  const all = get<Document[]>('documents') || [];
  const doc: Document = {
    ...data,
    id: uuidv4(),
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  all.push(doc);
  set('documents', all);
  logActivity(userId, 'upload', 'Document', doc.name);
  return doc;
}

export function deleteDocument(userId: string, id: string): boolean {
  const all = get<Document[]>('documents') || [];
  const item = all.find(d => d.id === id && d.userId === userId);
  const filtered = all.filter(d => !(d.id === id && d.userId === userId));
  if (filtered.length === all.length) return false;
  set('documents', filtered);
  if (item) logActivity(userId, 'delete', 'Document', item.name);
  return true;
}

// ===== NOTIFICATIONS =====

export function getNotifications(userId: string): Notification[] {
  const all = get<Notification[]>('notifications') || [];
  return all.filter(n => n.userId === userId).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function createNotification(userId: string, data: Omit<Notification, 'id' | 'userId' | 'createdAt'>): Notification {
  const all = get<Notification[]>('notifications') || [];
  const notification: Notification = {
    ...data,
    id: uuidv4(),
    userId,
    createdAt: new Date().toISOString(),
  };
  all.push(notification);
  set('notifications', all);
  return notification;
}

export function markNotificationRead(userId: string, id: string): void {
  const all = get<Notification[]>('notifications') || [];
  const idx = all.findIndex(n => n.id === id && n.userId === userId);
  if (idx !== -1) {
    all[idx].read = true;
    set('notifications', all);
  }
}

export function markAllNotificationsRead(userId: string): void {
  const all = get<Notification[]>('notifications') || [];
  all.forEach(n => { if (n.userId === userId) n.read = true; });
  set('notifications', all);
}

// ===== ACTIVITY LOGS =====

export function getActivities(userId: string): ActivityLog[] {
  const all = get<ActivityLog[]>('activities') || [];
  return all.filter(a => a.userId === userId).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function logActivity(userId: string, action: string, target: string, details: string): void {
  const all = get<ActivityLog[]>('activities') || [];
  const activity: ActivityLog = {
    id: uuidv4(),
    userId,
    action,
    target,
    details,
    createdAt: new Date().toISOString(),
  };
  all.push(activity);
  // Keep only last 500 activities per user
  const userActivities = all.filter(a => a.userId === userId);
  if (userActivities.length > 500) {
    const toRemove = userActivities.slice(0, userActivities.length - 500).map(a => a.id);
    const filtered = all.filter(a => !toRemove.includes(a.id));
    set('activities', filtered);
  } else {
    set('activities', all);
  }
}

// ===== UTILITY =====

export function calculateMonthlyCost(subs: Subscription[]): number {
  return subs.reduce((total, sub) => {
    if (sub.status === 'Cancelled' || sub.status === 'Expired') return total;
    switch (sub.billingCycle) {
      case 'Weekly': return total + sub.price * 4.33;
      case 'Monthly': return total + sub.price;
      case 'Quarterly': return total + sub.price / 3;
      case 'Half-yearly': return total + sub.price / 6;
      case 'Yearly': return total + sub.price / 12;
      default: return total + sub.price;
    }
  }, 0);
}

export function calculateYearlyCost(subs: Subscription[]): number {
  return subs.reduce((total, sub) => {
    if (sub.status === 'Cancelled' || sub.status === 'Expired') return total;
    switch (sub.billingCycle) {
      case 'Weekly': return total + sub.price * 52;
      case 'Monthly': return total + sub.price * 12;
      case 'Quarterly': return total + sub.price * 4;
      case 'Half-yearly': return total + sub.price * 2;
      case 'Yearly': return total + sub.price;
      default: return total + sub.price;
    }
  }, 0);
}

export function getUpcomingRenewals(subs: Subscription[], days: number = 30): Subscription[] {
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return subs.filter(s => {
    if (s.status === 'Cancelled' || s.status === 'Expired') return false;
    const renewal = new Date(s.renewalDate);
    return renewal >= now && renewal <= future;
  }).sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime());
}

export function getDaysUntilRenewal(renewalDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const renewal = new Date(renewalDate);
  renewal.setHours(0, 0, 0, 0);
  return Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function generateRenewalNotifications(userId: string): void {
  const subs = getSubscriptions(userId);
  const existingNotifs = getNotifications(userId);

  subs.forEach(sub => {
    if (sub.status === 'Cancelled' || sub.status === 'Expired') return;

    const daysUntil = getDaysUntilRenewal(sub.renewalDate);

    // Check trial ending
    if (sub.isTrial && sub.trialEndDate) {
      const trialDays = getDaysUntilRenewal(sub.trialEndDate);
      if (trialDays <= 3 && trialDays >= 0) {
        const recentTrialNotif = existingNotifs.find(n =>
          n.type === 'trial' && n.relatedId === sub.id &&
          (Date.now() - new Date(n.createdAt).getTime()) < 24 * 60 * 60 * 1000
        );
        if (!recentTrialNotif) {
          createNotification(userId, {
            type: 'trial',
            title: 'Trial Ending Soon',
            message: `${sub.serviceName} trial ends in ${trialDays} day${trialDays !== 1 ? 's' : ''}.`,
            read: false,
            relatedId: sub.id,
          });
        }
      }
    }

    // Check renewal
    if (daysUntil <= 7 && daysUntil >= 0) {
      const recentRenewalNotif = existingNotifs.find(n =>
        n.type === 'renewal' && n.relatedId === sub.id &&
        (Date.now() - new Date(n.createdAt).getTime()) < 24 * 60 * 60 * 1000
      );
      if (!recentRenewalNotif) {
        createNotification(userId, {
          type: 'renewal',
          title: 'Subscription Renewing',
          message: `${sub.serviceName} renews in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} (${sub.currency}${sub.price}/${sub.billingCycle.toLowerCase()}).`,
          read: false,
          relatedId: sub.id,
        });
      }
    }
  });
}

export function clearUserData(userId: string): void {
  const credKeys = ['credentials', 'accounts', 'subscriptions', 'documents', 'notifications', 'activities'];
  credKeys.forEach(key => {
    const all = get<any[]>(key) || [];
    set(key, all.filter((item: any) => item.userId !== userId));
  });
}
