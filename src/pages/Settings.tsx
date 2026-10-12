import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as store from '../lib/store';
import { Button, Input, Select, Card, Tabs, showToast, ConfirmDialog } from '../components/ui';
import { exportEncryptedBackup, importEncryptedBackup } from '../lib/crypto';
import {
  User, Shield, Bell, Palette, Database, LogOut, Trash2,
  Download, Upload, Monitor, Moon, Sun, Clock, AlertTriangle
} from 'lucide-react';

export default function Settings() {
  const { user, logout, lockVault, masterKey } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExportWarning, setShowExportWarning] = useState(false);

  if (!user) return null;

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'data', label: 'Data & Privacy', icon: Database },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
  ];

  const updateSetting = (key: string, value: any) => {
    store.updateUserSettings(user.id, { [key]: value });
    showToast('success', 'Settings updated');
  };

  const handleExport = async (encrypted: boolean) => {
    if (!masterKey && encrypted) {
      showToast('error', 'Please unlock your vault first');
      return;
    }

    const data = {
      credentials: store.getCredentials(user.id),
      accounts: store.getAccounts(user.id),
      subscriptions: store.getSubscriptions(user.id),
      documents: store.getDocuments(user.id).map(d => ({ ...d, data: '...' })), // Don't include file data in export
      exportedAt: new Date().toISOString(),
    };

    if (encrypted && masterKey) {
      const backup = await exportEncryptedBackup(JSON.stringify(data), masterKey);
      downloadFile(backup, 'digital-vault-backup.enc', 'application/octet-stream');
      showToast('success', 'Encrypted backup downloaded');
    } else {
      const csv = generateCSV(data);
      downloadFile(csv, 'digital-vault-export.csv', 'text/csv');
      showToast('success', 'CSV export downloaded');
    }
    setShowExportWarning(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();

    if (file.name.endsWith('.csv')) {
      // Parse CSV import
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { showToast('error', 'Invalid CSV file'); return; }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      let imported = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

        if (row.name || row['service name'] || row['service_name']) {
          const name = row.name || row['service name'] || row['service_name'];
          if (row.username !== undefined || row.password !== undefined) {
            // Import as credential
            store.createCredential(user.id, {
              name,
              username: row.username || '',
              email: row.email || '',
              password: row.password || '',
              website: row.url || row.website || '',
              category: 'Other',
              tags: [],
              notes: row.notes || '',
              customFields: [],
              favorite: false,
              has2FA: null,
            });
          } else {
            // Import as subscription
            store.createSubscription(user.id, {
              serviceName: name,
              provider: row.provider || '',
              planName: row.plan || row['plan name'] || '',
              price: parseFloat(row.price || '0'),
              currency: user.settings.currency,
              billingCycle: 'Monthly',
              startDate: new Date().toISOString().split('T')[0],
              renewalDate: row['renewal date'] || row.renewalDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              paymentMethod: '',
              category: 'Other',
              status: 'Active',
              website: row.url || row.website || '',
              notes: row.notes || '',
              tags: [],
              favorite: false,
              isTrial: false,
              trialEndDate: null,
              lastUsedDate: new Date().toISOString(),
              reminderDays: [3, 7],
            });
          }
          imported++;
        }
      }
      showToast('success', `Imported ${imported} records`);
    } else {
      showToast('error', 'Unsupported file format. Use CSV.');
    }
    e.target.value = '';
  };

  const handleDeleteAccount = () => {
    store.clearUserData(user.id);
    const users = store.getUsers().filter(u => u.id !== user.id);
    localStorage.setItem('dv_users', JSON.stringify(users));
    logout();
    showToast('success', 'Account deleted');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-56 shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Profile</h3>
              <div className="space-y-4">
                <Input label="Name" value={user.name} onChange={e => {
                  store.updateUser(user.id, { name: e.target.value });
                }} />
                <Input label="Email" value={user.email} disabled />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Member since {new Date(user.createdAt).toLocaleDateString()}
                </p>
                <Button onClick={() => showToast('success', 'Profile updated')}>Save Changes</Button>
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Auto-Lock</h3>
                <Select
                  label="Lock vault after inactivity"
                  value={user.settings.autoLockTimeout.toString()}
                  onChange={e => updateSetting('autoLockTimeout', parseInt(e.target.value))}
                  options={[
                    { value: '5', label: '5 minutes' },
                    { value: '15', label: '15 minutes' },
                    { value: '30', label: '30 minutes' },
                    { value: '60', label: '1 hour' },
                    { value: '0', label: 'Never' },
                  ]}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  For sensitive environments, a shorter timeout is recommended.
                </p>
              </Card>
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Vault</h3>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={lockVault}>
                    <Shield size={14} /> Lock Vault Now
                  </Button>
                </div>
              </Card>
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Active Sessions</h3>
                <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-700">
                  <Monitor size={20} className="text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Current Session</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Active now • {navigator.userAgent.split(' ').slice(-1)[0]}</p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { key: 'renewalReminders', label: 'Subscription Renewal Reminders', desc: 'Get notified before subscriptions renew' },
                  { key: 'trialAlerts', label: 'Trial Ending Alerts', desc: 'Alert when free trials are about to end' },
                  { key: 'securityAlerts', label: 'Security Alerts', desc: 'Important security notifications' },
                ].map(item => (
                  <label key={item.key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={user.settings.notifications[item.key as keyof typeof user.settings.notifications]}
                      onChange={e => {
                        const notifications = { ...user.settings.notifications, [item.key]: e.target.checked };
                        updateSetting('notifications', notifications);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Appearance</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
                  <div className="flex gap-3">
                    {[
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'light', label: 'Light', icon: Sun },
                    ].map(theme => {
                      const Icon = theme.icon;
                      const isActive = user.settings.theme === theme.value;
                      return (
                        <button
                          key={theme.value}
                          onClick={() => {
                            updateSetting('theme', theme.value);
                            localStorage.setItem('dv-theme', theme.value);
                            document.documentElement.classList.remove('light', 'dark');
                            document.documentElement.classList.add(theme.value);
                          }}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                            isActive
                              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'
                          }`}
                        >
                          <Icon size={16} />
                          {theme.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Select
                  label="Currency"
                  value={user.settings.currency}
                  onChange={e => updateSetting('currency', e.target.value)}
                  options={[
                    { value: 'USD', label: 'USD ($)' },
                    { value: 'EUR', label: 'EUR (€)' },
                    { value: 'GBP', label: 'GBP (£)' },
                    { value: 'INR', label: 'INR (₹)' },
                    { value: 'JPY', label: 'JPY (¥)' },
                    { value: 'CAD', label: 'CAD (C$)' },
                    { value: 'AUD', label: 'AUD (A$)' },
                  ]}
                />
              </div>
            </Card>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Export Data</h3>
                <div className="space-y-3">
                  <Button variant="outline" onClick={() => handleExport(true)}>
                    <Download size={14} /> Export Encrypted Backup
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Downloads an encrypted backup of your vault data. Requires vault to be unlocked.
                  </p>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <Button variant="ghost" onClick={() => setShowExportWarning(true)}>
                      <Download size={14} /> Export as CSV
                    </Button>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      ⚠️ Warning: CSV export contains unencrypted data. Handle with care.
                    </p>
                  </div>
                </div>
              </Card>
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Import Data</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Button variant="outline" onClick={() => document.getElementById('import-file')?.click()}>
                      <Upload size={14} /> Import CSV
                    </Button>
                    <input id="import-file" type="file" accept=".csv" onChange={handleImport} className="hidden" />
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Import credentials or subscriptions from a CSV file. Headers should include: name, username, email, password, url.
                  </p>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'danger' && (
            <Card className="border-red-200 dark:border-red-800">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Sign out all sessions</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Log out from all devices</p>
                  </div>
                  <Button variant="outline" onClick={logout}>Sign Out</Button>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Delete account</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 size={14} /> Delete
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="This will permanently delete your account and ALL associated data. This action cannot be undone."
        confirmText="Delete Account"
        danger
      />

      <ConfirmDialog
        isOpen={showExportWarning}
        onClose={() => setShowExportWarning(false)}
        onConfirm={() => handleExport(false)}
        title="Export as CSV"
        message="CSV export contains your data in plain text, including passwords. Are you sure you want to proceed? Handle this file with extreme care."
        confirmText="Export CSV"
        danger
      />
    </div>
  );
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function generateCSV(data: any): string {
  const rows: string[] = [];

  // Credentials
  rows.push('type,name,username,email,password,url,category,notes');
  data.credentials.forEach((c: any) => {
    rows.push(`credential,"${c.name}","${c.username}","${c.email}","${c.password}","${c.website}","${c.category}","${c.notes}"`);
  });

  // Subscriptions
  data.subscriptions.forEach((s: any) => {
    rows.push(`subscription,"${s.serviceName}","","","","${s.website}","${s.category}","${s.planName}, ${s.currency}${s.price}/${s.billingCycle}"`);
  });

  return rows.join('\n');
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: string }) {
  const variants: Record<string, string> = {
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant] || variants.default}`}>
      {children}
    </span>
  );
}
