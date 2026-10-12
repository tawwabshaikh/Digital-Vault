import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as store from '../lib/store';
import type { Subscription, BillingCycle, SubscriptionStatus, SubscriptionCategory } from '../lib/types';
import { Button, Input, Select, Textarea, Modal, SearchInput, Badge, Card, EmptyState, StatCard, Dropdown, ConfirmDialog, showToast } from '../components/ui';
import { useSearchParams } from 'react-router-dom';
import {
  CreditCard, Plus, Edit2, Trash2, Star, MoreVertical, Clock,
  TrendingUp, AlertTriangle, DollarSign, Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const billingCycles: BillingCycle[] = ['Weekly', 'Monthly', 'Quarterly', 'Half-yearly', 'Yearly', 'Custom'];
const statuses: SubscriptionStatus[] = ['Active', 'Trial', 'Paused', 'Cancelled', 'Expired'];
const categories: SubscriptionCategory[] = ['Streaming', 'Productivity', 'Development', 'Design', 'Cloud', 'Communication', 'Finance', 'Gaming', 'Education', 'Health', 'News', 'Other'];

export default function Subscriptions() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Subscription | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const subscriptions = useMemo(() => {
    if (!user) return [];
    return store.getSubscriptions(user.id);
  }, [user]);

  const filtered = useMemo(() => {
    let items = subscriptions;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(s =>
        s.serviceName.toLowerCase().includes(q) || s.provider.toLowerCase().includes(q) ||
        s.planName.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'All') items = items.filter(s => s.status === statusFilter);
    if (categoryFilter !== 'All') items = items.filter(s => s.category === categoryFilter);
    return items.sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime());
  }, [subscriptions, search, statusFilter, categoryFilter]);

  const stats = useMemo(() => {
    const active = subscriptions.filter(s => s.status === 'Active' || s.status === 'Trial');
    const monthly = store.calculateMonthlyCost(active);
    const yearly = store.calculateYearlyCost(active);
    const upcoming = store.getUpcomingRenewals(active, 30);
    const trials = subscriptions.filter(s => s.isTrial);
    const cancelled = subscriptions.filter(s => s.status === 'Cancelled');
    return { active: active.length, monthly, yearly, upcoming: upcoming.length, trials: trials.length, cancelled: cancelled.length };
  }, [subscriptions]);

  const chartData = useMemo(() => {
    const active = subscriptions.filter(s => s.status === 'Active' || s.status === 'Trial');
    const byCategory = active.reduce((acc, sub) => {
      const monthly = sub.billingCycle === 'Monthly' ? sub.price :
        sub.billingCycle === 'Yearly' ? sub.price / 12 :
        sub.billingCycle === 'Quarterly' ? sub.price / 3 :
        sub.billingCycle === 'Half-yearly' ? sub.price / 6 :
        sub.billingCycle === 'Weekly' ? sub.price * 4.33 : sub.price;
      acc[sub.category] = (acc[sub.category] || 0) + monthly;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(byCategory).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value);
  }, [subscriptions]);

  useEffect(() => {
    if (searchParams.get('action') === 'add') { setShowAdd(true); setSearchParams({}); }
  }, [searchParams]);

  const toggleFavorite = (id: string) => {
    if (!user) return;
    const sub = subscriptions.find(s => s.id === id);
    if (sub) store.updateSubscription(user.id, id, { favorite: !sub.favorite });
  };

  const currency = user?.settings.currency || 'USD';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Subscriptions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage and track your subscriptions</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Subscription</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Active" value={stats.active} icon={<CreditCard size={18} className="text-green-500" />} />
        <StatCard label="Monthly Cost" value={`${currency}${Math.round(stats.monthly).toLocaleString()}`} icon={<DollarSign size={18} className="text-blue-500" />} />
        <StatCard label="Yearly Cost" value={`${currency}${Math.round(stats.yearly).toLocaleString()}`} icon={<TrendingUp size={18} className="text-purple-500" />} />
        <StatCard label="Upcoming" value={stats.upcoming} icon={<Clock size={18} className="text-amber-500" />} />
        <StatCard label="Trials" value={stats.trials} icon={<AlertTriangle size={18} className="text-orange-500" />} />
        <StatCard label="Cancelled" value={stats.cancelled} icon={<Calendar size={18} className="text-red-500" />} />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Monthly Spending by Category</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-gray-500" />
                <YAxis tick={{ fontSize: 12 }} className="text-gray-500" />
                <Tooltip formatter={(v: number) => `${currency}${v}/mo`} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search subscriptions..." className="flex-1" />
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          options={[{ value: 'All', label: 'All Statuses' }, ...statuses.map(s => ({ value: s, label: s }))]} className="sm:w-40" />
        <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          options={[{ value: 'All', label: 'All Categories' }, ...categories.map(c => ({ value: c, label: c }))]} className="sm:w-44" />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={24} className="text-gray-400" />}
          title={search || statusFilter !== 'All' ? 'No matching subscriptions' : 'No subscriptions yet'}
          description={search || statusFilter !== 'All' ? 'Try adjusting your filters' : 'Track your paid services and manage renewals'}
          action={!search && statusFilter === 'All' ? <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Subscription</Button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(sub => {
            const daysUntil = store.getDaysUntilRenewal(sub.renewalDate);
            return (
              <div key={sub.id} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
                  sub.isTrial ? 'bg-orange-100 dark:bg-orange-900/20' : 'bg-green-100 dark:bg-green-900/20'
                }`}>
                  <CreditCard size={18} className={sub.isTrial ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{sub.serviceName}</p>
                    {sub.favorite && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                    {sub.isTrial && <Badge variant="warning">Trial</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{sub.planName} • {sub.provider}</p>
                </div>
                <div className="hidden sm:block">
                  <Badge variant={sub.status === 'Active' ? 'success' : sub.status === 'Trial' ? 'warning' : sub.status === 'Cancelled' ? 'danger' : 'default'}>{sub.status}</Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{sub.currency}{sub.price}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">/{sub.billingCycle.toLowerCase()}</p>
                </div>
                <div className="hidden md:block text-right min-w-[100px]">
                  {(sub.status === 'Active' || sub.status === 'Trial') && (
                    <>
                      <p className={`text-xs font-medium ${daysUntil <= 3 ? 'text-red-500' : daysUntil <= 7 ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        {daysUntil <= 0 ? 'Today' : `${daysUntil}d until renewal`}
                      </p>
                      <p className="text-xs text-gray-400">{new Date(sub.renewalDate).toLocaleDateString()}</p>
                    </>
                  )}
                </div>
                <Dropdown
                  trigger={<button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><MoreVertical size={14} className="text-gray-500" /></button>}
                  items={[
                    { label: 'Edit', icon: <Edit2 size={14} />, onClick: () => setEditItem(sub) },
                    { label: sub.favorite ? 'Unfavorite' : 'Favorite', icon: <Star size={14} />, onClick: () => toggleFavorite(sub.id) },
                    { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => setDeleteConfirm(sub.id), danger: true },
                  ]}
                />
              </div>
            );
          })}
        </div>
      )}

      {(showAdd || editItem) && (
        <SubscriptionForm
          subscription={editItem}
          currency={currency}
          onClose={() => { setShowAdd(false); setEditItem(null); }}
          onSave={(data) => {
            if (!user) return;
            if (editItem) {
              store.updateSubscription(user.id, editItem.id, data);
              showToast('success', 'Subscription updated');
            } else {
              store.createSubscription(user.id, { ...data, userId: user.id } as any);
              showToast('success', 'Subscription added');
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
            store.deleteSubscription(user.id, deleteConfirm);
            showToast('success', 'Subscription deleted');
          }
        }}
        title="Delete Subscription"
        message="Are you sure you want to delete this subscription?"
        confirmText="Delete"
        danger
      />
    </div>
  );
}

function SubscriptionForm({ subscription, currency, onClose, onSave }: {
  subscription: Subscription | null;
  currency: string;
  onClose: () => void;
  onSave: (data: Partial<Subscription>) => void;
}) {
  const [serviceName, setServiceName] = useState(subscription?.serviceName || '');
  const [provider, setProvider] = useState(subscription?.provider || '');
  const [planName, setPlanName] = useState(subscription?.planName || '');
  const [price, setPrice] = useState(subscription?.price?.toString() || '');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(subscription?.billingCycle || 'Monthly');
  const [startDate, setStartDate] = useState(subscription?.startDate || new Date().toISOString().split('T')[0]);
  const [renewalDate, setRenewalDate] = useState(subscription?.renewalDate || '');
  const [paymentMethod, setPaymentMethod] = useState(subscription?.paymentMethod || '');
  const [category, setCategory] = useState<SubscriptionCategory>(subscription?.category || 'Other');
  const [status, setStatus] = useState<SubscriptionStatus>(subscription?.status || 'Active');
  const [website, setWebsite] = useState(subscription?.website || '');
  const [notes, setNotes] = useState(subscription?.notes || '');
  const [tags, setTags] = useState(subscription?.tags.join(', ') || '');
  const [favorite, setFavorite] = useState(subscription?.favorite || false);
  const [isTrial, setIsTrial] = useState(subscription?.isTrial || false);
  const [trialEndDate, setTrialEndDate] = useState(subscription?.trialEndDate || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      serviceName, provider, planName, price: parseFloat(price) || 0,
      currency, billingCycle, startDate, renewalDate,
      paymentMethod, category, status, website, notes,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      favorite, isTrial, trialEndDate: isTrial ? trialEndDate : null,
      lastUsedDate: subscription?.lastUsedDate || new Date().toISOString(),
      reminderDays: subscription?.reminderDays || [3, 7],
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={subscription ? 'Edit Subscription' : 'Add Subscription'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Service Name *" placeholder="e.g., Netflix" value={serviceName} onChange={e => setServiceName(e.target.value)} required />
          <Input label="Provider" placeholder="e.g., Netflix Inc." value={provider} onChange={e => setProvider(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Plan Name" placeholder="e.g., Premium" value={planName} onChange={e => setPlanName(e.target.value)} />
          <Input label={`Price (${currency}) *`} type="number" step="0.01" placeholder="9.99" value={price} onChange={e => setPrice(e.target.value)} required />
          <Select label="Billing Cycle" value={billingCycle} onChange={e => setBillingCycle(e.target.value as BillingCycle)} options={billingCycles.map(b => ({ value: b, label: b }))} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <Input label="Renewal Date *" type="date" value={renewalDate} onChange={e => setRenewalDate(e.target.value)} required />
          <Input label="Payment Method" placeholder="Visa ****1234" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Category" value={category} onChange={e => setCategory(e.target.value as SubscriptionCategory)} options={categories.map(c => ({ value: c, label: c }))} />
          <Select label="Status" value={status} onChange={e => setStatus(e.target.value as SubscriptionStatus)} options={statuses.map(s => ({ value: s, label: s }))} />
        </div>
        <Input label="Website" placeholder="https://netflix.com" value={website} onChange={e => setWebsite(e.target.value)} />

        <div className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={isTrial} onChange={e => setIsTrial(e.target.checked)} className="rounded border-gray-300" />
            This is a trial
          </label>
          {isTrial && (
            <Input type="date" value={trialEndDate} onChange={e => setTrialEndDate(e.target.value)} className="flex-1" />
          )}
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={favorite} onChange={e => setFavorite(e.target.checked)} className="rounded border-gray-300" />
            <Star size={14} className="text-yellow-500" /> Favorite
          </label>
        </div>

        <Input label="Tags" placeholder="personal, work (comma separated)" value={tags} onChange={e => setTags(e.target.value)} />
        <Textarea label="Notes" placeholder="Additional notes..." value={notes} onChange={e => setNotes(e.target.value)} />

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">{subscription ? 'Update' : 'Save'} Subscription</Button>
        </div>
      </form>
    </Modal>
  );
}
