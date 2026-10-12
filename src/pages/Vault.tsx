import { useState, useMemo, useEffect } from 'react';
import { useAuth, encryptData, decryptData } from '../context/AuthContext';
import * as store from '../lib/store';
import type { Credential, CredentialCategory, CustomField } from '../lib/types';
import { generatePassword, calculatePasswordStrength } from '../lib/crypto';
import { Button, Input, Textarea, Select, Modal, SearchInput, Badge, Card, EmptyState, PasswordStrengthIndicator, Dropdown, ConfirmDialog, showToast } from '../components/ui';
import { useSearchParams } from 'react-router-dom';
import {
  Key, Plus, Search, Eye, EyeOff, Copy, Edit2, Trash2, Star,
  Lock, Unlock, Shield, RefreshCw, X, MoreVertical, ExternalLink, Check
} from 'lucide-react';

const categories: CredentialCategory[] = ['Social', 'Development', 'Finance', 'Shopping', 'Education', 'Work', 'Entertainment', 'Productivity', 'Cloud', 'Travel', 'Other'];

export default function Vault() {
  const { user, masterKey, isVaultUnlocked, unlockVault } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Credential | null>(null);
  const [viewItem, setViewItem] = useState<Credential | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showMasterInput, setShowMasterInput] = useState(false);
  const [masterInput, setMasterInput] = useState('');
  const [masterError, setMasterError] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());

  const credentials = useMemo(() => {
    if (!user) return [];
    return store.getCredentials(user.id);
  }, [user]);

  const filtered = useMemo(() => {
    let items = credentials;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(c =>
        c.name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) || c.website.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (categoryFilter !== 'All') {
      items = items.filter(c => c.category === categoryFilter);
    }
    return items.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || b.updatedAt.localeCompare(a.updatedAt));
  }, [credentials, search, categoryFilter]);

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setShowAdd(true);
      setSearchParams({});
    }
  }, [searchParams]);

  const handleUnlock = async () => {
    const result = await unlockVault(masterInput);
    if (result.success) {
      setShowMasterInput(false);
      setMasterInput('');
      showToast('success', 'Vault unlocked');
    } else {
      setMasterError(result.error || 'Invalid master password');
    }
  };

  const toggleFavorite = (id: string) => {
    if (!user) return;
    const cred = credentials.find(c => c.id === id);
    if (cred) {
      store.updateCredential(user.id, id, { favorite: !cred.favorite });
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedPasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast('success', `${label} copied to clipboard`);
    // Clear clipboard after 30 seconds
    setTimeout(() => { navigator.clipboard.writeText(''); }, 30000);
  };

  // Vault locked state
  if (!isVaultUnlocked) {
    if (showMasterInput) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/20">
                <Lock size={32} className="text-amber-500" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Unlock Vault</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Enter your master password to access credentials</p>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Master password"
                value={masterInput}
                onChange={e => { setMasterInput(e.target.value); setMasterError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                error={masterError}
              />
              <Button onClick={handleUnlock} className="w-full">Unlock</Button>
              <button onClick={() => { setShowMasterInput(false); setMasterError(''); }} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">Cancel</button>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20">
              <Shield size={32} className="text-blue-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Vault is Locked</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Your credentials are encrypted and require your master password to access.</p>
          <Button onClick={() => setShowMasterInput(true)}>
            <Unlock size={16} /> Unlock Vault
          </Button>
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">You can still browse accounts and subscriptions without unlocking.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Vault</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{credentials.length} credential{credentials.length !== 1 ? 's' : ''} stored</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Credential</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search credentials..." className="flex-1" />
        <Select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          options={[{ value: 'All', label: 'All Categories' }, ...categories.map(c => ({ value: c, label: c }))]}
          className="sm:w-48"
        />
      </div>

      {/* Credentials List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Key size={24} className="text-gray-400" />}
          title={search || categoryFilter !== 'All' ? 'No matching credentials' : 'No credentials yet'}
          description={search || categoryFilter !== 'All' ? 'Try adjusting your search or filters' : 'Add your first credential to get started'}
          action={!search && categoryFilter === 'All' ? <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Credential</Button> : undefined}
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map(cred => (
            <CredentialCard
              key={cred.id}
              credential={cred}
              isRevealed={revealedPasswords.has(cred.id)}
              onToggleReveal={() => toggleReveal(cred.id)}
              onCopy={copyToClipboard}
              onEdit={() => setEditItem(cred)}
              onView={() => setViewItem(cred)}
              onToggleFavorite={() => toggleFavorite(cred.id)}
              onDelete={() => setDeleteConfirm(cred.id)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAdd || editItem) && (
        <CredentialForm
          credential={editItem}
          onClose={() => { setShowAdd(false); setEditItem(null); }}
          onSave={(data) => {
            if (!user) return;
            if (editItem) {
              store.updateCredential(user.id, editItem.id, data);
              showToast('success', 'Credential updated');
            } else {
              store.createCredential(user.id, { ...data, userId: user.id } as any);
              showToast('success', 'Credential added');
            }
            setShowAdd(false);
            setEditItem(null);
          }}
        />
      )}

      {/* View Modal */}
      {viewItem && (
        <Modal isOpen={true} onClose={() => setViewItem(null)} title={viewItem.name} size="lg">
          <CredentialDetail credential={viewItem} onCopy={copyToClipboard} />
        </Modal>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (user && deleteConfirm) {
            store.deleteCredential(user.id, deleteConfirm);
            showToast('success', 'Credential deleted');
          }
        }}
        title="Delete Credential"
        message="Are you sure you want to delete this credential? This action cannot be undone."
        confirmText="Delete"
        danger
      />
    </div>
  );
}

// Credential Card Component
function CredentialCard({ credential, isRevealed, onToggleReveal, onCopy, onEdit, onView, onToggleFavorite, onDelete }: {
  credential: Credential;
  isRevealed: boolean;
  onToggleReveal: () => void;
  onCopy: (text: string, label: string) => void;
  onEdit: () => void;
  onView: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20 shrink-0">
        <Key size={18} className="text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onView}>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{credential.name}</p>
          {credential.favorite && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
          {credential.has2FA && <Shield size={12} className="text-green-500" />}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{credential.username || credential.email || credential.website}</p>
      </div>
      <div className="hidden sm:flex items-center gap-1">
        <Badge variant="default">{credential.category}</Badge>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onCopy(credential.username || credential.email, 'Username')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Copy username">
          <Copy size={14} />
        </button>
        <button onClick={onToggleReveal} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title={isRevealed ? 'Hide password' : 'Show password'}>
          {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        {isRevealed && (
          <button onClick={() => onCopy(credential.password, 'Password')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Copy password">
            <Copy size={14} />
          </button>
        )}
        <button onClick={onToggleFavorite} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Favorite">
          <Star size={14} className={credential.favorite ? 'text-yellow-500 fill-yellow-500' : ''} />
        </button>
        <Dropdown
          trigger={<button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><MoreVertical size={14} /></button>}
          items={[
            { label: 'Edit', icon: <Edit2 size={14} />, onClick: onEdit },
            { label: 'View Details', icon: <Eye size={14} />, onClick: onView },
            { label: 'Delete', icon: <Trash2 size={14} />, onClick: onDelete, danger: true },
          ]}
        />
      </div>
    </div>
  );
}

// Credential Detail View
function CredentialDetail({ credential, onCopy }: { credential: Credential; onCopy: (text: string, label: string) => void }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/20">
          <Key size={24} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{credential.name}</h3>
          <Badge>{credential.category}</Badge>
        </div>
      </div>

      <div className="space-y-3">
        {credential.username && (
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Username</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{credential.username}</p>
            </div>
            <button onClick={() => onCopy(credential.username, 'Username')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Copy size={14} className="text-gray-500" /></button>
          </div>
        )}
        {credential.email && (
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{credential.email}</p>
            </div>
            <button onClick={() => onCopy(credential.email, 'Email')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Copy size={14} className="text-gray-500" /></button>
          </div>
        )}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Password</p>
            <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">{showPassword ? credential.password : '••••••••••••'}</p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setShowPassword(!showPassword)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              {showPassword ? <EyeOff size={14} className="text-gray-500" /> : <Eye size={14} className="text-gray-500" />}
            </button>
            <button onClick={() => onCopy(credential.password, 'Password')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Copy size={14} className="text-gray-500" /></button>
          </div>
        </div>
        {credential.website && (
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Website</p>
              <a href={credential.website.startsWith('http') ? credential.website : `https://${credential.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                {credential.website} <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}
        {credential.has2FA !== null && (
          <div className="py-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">Two-Factor Authentication</p>
            <Badge variant={credential.has2FA ? 'success' : 'warning'}>{credential.has2FA ? 'Enabled' : 'Not enabled'}</Badge>
          </div>
        )}
        {credential.notes && (
          <div className="py-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">Notes</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{credential.notes}</p>
          </div>
        )}
        {credential.tags.length > 0 && (
          <div className="py-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tags</p>
            <div className="flex flex-wrap gap-1">
              {credential.tags.map(t => <Badge key={t}>{t}</Badge>)}
            </div>
          </div>
        )}
        {credential.customFields.length > 0 && (
          <div className="py-2 border-t border-gray-200 dark:border-gray-700 pt-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Custom Fields</p>
            {credential.customFields.map(f => (
              <div key={f.id} className="flex items-center justify-between py-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">{f.label}</span>
                <span className="text-sm text-gray-900 dark:text-gray-100">{f.type === 'password' ? '••••••' : f.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 flex justify-between">
        <span>Created: {new Date(credential.createdAt).toLocaleDateString()}</span>
        <span>Updated: {new Date(credential.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

// Credential Form
function CredentialForm({ credential, onClose, onSave }: {
  credential: Credential | null;
  onClose: () => void;
  onSave: (data: Partial<Credential>) => void;
}) {
  const [name, setName] = useState(credential?.name || '');
  const [username, setUsername] = useState(credential?.username || '');
  const [email, setEmail] = useState(credential?.email || '');
  const [password, setPassword] = useState(credential?.password || '');
  const [website, setWebsite] = useState(credential?.website || '');
  const [category, setCategory] = useState<CredentialCategory>(credential?.category || 'Other');
  const [notes, setNotes] = useState(credential?.notes || '');
  const [tags, setTags] = useState(credential?.tags.join(', ') || '');
  const [has2FA, setHas2FA] = useState<boolean | null>(credential?.has2FA ?? null);
  const [favorite, setFavorite] = useState(credential?.favorite || false);
  const [showPassword, setShowPassword] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [genLength, setGenLength] = useState(20);
  const [genOptions, setGenOptions] = useState({ uppercase: true, lowercase: true, numbers: true, symbols: true, excludeAmbiguous: false });

  const strength = calculatePasswordStrength(password);

  const handleGenerate = () => {
    const pw = generatePassword(genLength, genOptions);
    setPassword(pw);
    setShowPassword(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name, username, email, password, website, category, notes,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      has2FA, favorite,
      customFields: credential?.customFields || [],
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={credential ? 'Edit Credential' : 'Add Credential'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Name *" placeholder="e.g., GitHub" value={name} onChange={e => setName(e.target.value)} required />
          <Select label="Category" value={category} onChange={e => setCategory(e.target.value as CredentialCategory)} options={categories.map(c => ({ value: c, label: c }))} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Username" placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
          <Input label="Email" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password *</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Button type="button" variant="outline" onClick={() => setShowGenerator(!showGenerator)} title="Generate password">
              <RefreshCw size={16} />
            </Button>
          </div>
          {password && <PasswordStrengthIndicator strength={strength} />}
        </div>

        {/* Password Generator */}
        {showGenerator && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Password Generator</p>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 dark:text-gray-400">Length:</label>
              <input type="range" min="8" max="64" value={genLength} onChange={e => setGenLength(Number(e.target.value))} className="flex-1" />
              <span className="text-sm font-mono w-8 text-center">{genLength}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { key: 'uppercase', label: 'Uppercase (A-Z)' },
                { key: 'lowercase', label: 'Lowercase (a-z)' },
                { key: 'numbers', label: 'Numbers (0-9)' },
                { key: 'symbols', label: 'Symbols (!@#)' },
                { key: 'excludeAmbiguous', label: 'Exclude ambiguous' },
              ].map(opt => (
                <label key={opt.key} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={genOptions[opt.key as keyof typeof genOptions]}
                    onChange={e => setGenOptions({ ...genOptions, [opt.key]: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleGenerate}>
              <RefreshCw size={14} /> Generate
            </Button>
          </div>
        )}

        <Input label="Website URL" placeholder="https://example.com" value={website} onChange={e => setWebsite(e.target.value)} />
        <Input label="Tags" placeholder="personal, work, important (comma separated)" value={tags} onChange={e => setTags(e.target.value)} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="2FA Status"
            value={has2FA === null ? 'unknown' : has2FA ? 'yes' : 'no'}
            onChange={e => setHas2FA(e.target.value === 'unknown' ? null : e.target.value === 'yes')}
            options={[{ value: 'unknown', label: 'Unknown' }, { value: 'yes', label: 'Enabled' }, { value: 'no', label: 'Not enabled' }]}
          />
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 pb-2.5">
              <input type="checkbox" checked={favorite} onChange={e => setFavorite(e.target.checked)} className="rounded border-gray-300" />
              <Star size={14} className="text-yellow-500" /> Mark as favorite
            </label>
          </div>
        </div>

        <Textarea label="Notes" placeholder="Additional notes..." value={notes} onChange={e => setNotes(e.target.value)} />

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">{credential ? 'Update' : 'Save'} Credential</Button>
        </div>
      </form>
    </Modal>
  );
}
