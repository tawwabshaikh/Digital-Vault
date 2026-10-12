import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as store from '../lib/store';
import type { Account, AccountStatus, CredentialCategory } from '../lib/types';
import { Button, Input, Select, Textarea, Modal, SearchInput, Badge, Card, EmptyState, Dropdown, ConfirmDialog, showToast } from '../components/ui';
import { useSearchParams } from 'react-router-dom';
import { Users, Plus, Edit2, Trash2, Star, MoreVertical, ExternalLink, Globe } from 'lucide-react';

const categories: CredentialCategory[] = ['Social', 'Development', 'Finance', 'Shopping', 'Education', 'Work', 'Entertainment', 'Productivity', 'Cloud', 'Travel', 'Other'];
const statuses: AccountStatus[] = ['Active', 'Inactive', 'Closed', 'Unknown'];

export default function Accounts() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Account | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const accounts = useMemo(() => {
    if (!user) return [];
    return store.getAccounts(user.id);
  }, [user]);

  const filtered = useMemo(() => {
    let items = accounts;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(a =>
        a.serviceName.toLowerCase().includes(q) || a.username.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) || a.website.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'All') items = items.filter(a => a.status === statusFilter);
    if (categoryFilter !== 'All') items = items.filter(a => a.category === categoryFilter);
    return items.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || b.updatedAt.localeCompare(a.updatedAt));
  }, [accounts, search, statusFilter, categoryFilter]);

  useEffect(() => {
    if (searchParams.get('action') === 'add') { setShowAdd(true); setSearchParams({}); }
  }, [searchParams]);

  const toggleFavorite = (id: string) => {
    if (!user) return;
    const acc = accounts.find(a => a.id === id);
    if (acc) store.updateAccount(user.id, id, { favorite: !acc.favorite });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Accounts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{accounts.length} account{accounts.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Account</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search accounts..." className="flex-1" />
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          options={[{ value: 'All', label: 'All Statuses' }, ...statuses.map(s => ({ value: s, label: s }))]} className="sm:w-40" />
        <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          options={[{ value: 'All', label: 'All Categories' }, ...categories.map(c => ({ value: c, label: c }))]} className="sm:w-44" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={24} className="text-gray-400" />}
          title={search || statusFilter !== 'All' ? 'No matching accounts' : 'No accounts yet'}
          description={search || statusFilter !== 'All' ? 'Try adjusting your filters' : 'Track where you have online accounts'}
          action={!search && statusFilter === 'All' ? <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Account</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(account => (
            <Card key={account.id} className="relative">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/20">
                    <Globe size={18} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{account.serviceName}</p>
                      {account.favorite && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{account.username || account.email || 'No credentials'}</p>
                  </div>
                </div>
                <Dropdown
                  trigger={<button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><MoreVertical size={14} className="text-gray-500" /></button>}
                  items={[
                    { label: 'Edit', icon: <Edit2 size={14} />, onClick: () => setEditItem(account) },
                    { label: account.favorite ? 'Unfavorite' : 'Favorite', icon: <Star size={14} />, onClick: () => toggleFavorite(account.id) },
                    { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => setDeleteConfirm(account.id), danger: true },
                  ]}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant={account.status === 'Active' ? 'success' : account.status === 'Closed' ? 'danger' : 'default'}>{account.status}</Badge>
                <Badge>{account.category}</Badge>
                {account.tags.map(t => <Badge key={t} variant="info">{t}</Badge>)}
              </div>
              {account.website && (
                <a href={account.website.startsWith('http') ? account.website : `https://${account.website}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  <ExternalLink size={10} /> {account.website}
                </a>
              )}
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 flex justify-between">
                <span>Created: {new Date(account.createdDate).toLocaleDateString()}</span>
                <span>Reviewed: {new Date(account.lastReviewed).toLocaleDateString()}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(showAdd || editItem) && (
        <AccountForm
          account={editItem}
          credentials={user ? store.getCredentials(user.id) : []}
          onClose={() => { setShowAdd(false); setEditItem(null); }}
          onSave={(data) => {
            if (!user) return;
            if (editItem) {
              store.updateAccount(user.id, editItem.id, data);
              showToast('success', 'Account updated');
            } else {
              store.createAccount(user.id, { ...data, userId: user.id } as any);
              showToast('success', 'Account added');
            }
            setShowAdd(false);
            setEditItem(null);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (user && deleteConfirm) {
            store.deleteAccount(user.id, deleteConfirm);
            showToast('success', 'Account deleted');
          }
        }}
        title="Delete Account"
        message="Are you sure you want to delete this account?"
        confirmText="Delete"
        danger
      />
    </div>
  );
}

function AccountForm({ account, credentials, onClose, onSave }: {
  account: Account | null;
  credentials: { id: string; name: string }[];
  onClose: () => void;
  onSave: (data: Partial<Account>) => void;
}) {
  const [serviceName, setServiceName] = useState(account?.serviceName || '');
  const [website, setWebsite] = useState(account?.website || '');
  const [email, setEmail] = useState(account?.email || '');
  const [username, setUsername] = useState(account?.username || '');
  const [accountType, setAccountType] = useState(account?.accountType || 'Personal');
  const [category, setCategory] = useState<CredentialCategory>(account?.category || 'Other');
  const [status, setStatus] = useState<AccountStatus>(account?.status || 'Active');
  const [linkedCredentialId, setLinkedCredentialId] = useState(account?.linkedCredentialId || '');
  const [notes, setNotes] = useState(account?.notes || '');
  const [tags, setTags] = useState(account?.tags.join(', ') || '');
  const [favorite, setFavorite] = useState(account?.favorite || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      serviceName, website, email, username, accountType, category, status,
      linkedCredentialId: linkedCredentialId || null,
      notes,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      favorite,
      createdDate: account?.createdDate || new Date().toISOString(),
      lastReviewed: account?.lastReviewed || new Date().toISOString(),
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={account ? 'Edit Account' : 'Add Account'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Service Name *" placeholder="e.g., GitHub" value={serviceName} onChange={e => setServiceName(e.target.value)} required />
          <Input label="Website" placeholder="https://github.com" value={website} onChange={e => setWebsite(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Username" placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
          <Input label="Email" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Account Type" placeholder="Personal, Business..." value={accountType} onChange={e => setAccountType(e.target.value)} />
          <Select label="Category" value={category} onChange={e => setCategory(e.target.value as CredentialCategory)} options={categories.map(c => ({ value: c, label: c }))} />
          <Select label="Status" value={status} onChange={e => setStatus(e.target.value as AccountStatus)} options={statuses.map(s => ({ value: s, label: s }))} />
        </div>
        <Select
          label="Link to Credential"
          value={linkedCredentialId || ''}
          onChange={e => setLinkedCredentialId(e.target.value)}
          options={[{ value: '', label: 'None' }, ...credentials.map(c => ({ value: c.id, label: c.name }))]}
        />
        <Input label="Tags" placeholder="personal, work (comma separated)" value={tags} onChange={e => setTags(e.target.value)} />
        <Textarea label="Notes" placeholder="Additional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={favorite} onChange={e => setFavorite(e.target.checked)} className="rounded border-gray-300" />
          <Star size={14} className="text-yellow-500" /> Mark as favorite
        </label>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">{account ? 'Update' : 'Save'} Account</Button>
        </div>
      </form>
    </Modal>
  );
}
