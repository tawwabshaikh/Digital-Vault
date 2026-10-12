import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as store from '../lib/store';
import { Card, StatCard, Badge, Button } from '../components/ui';
import { calculatePasswordStrength } from '../lib/crypto';
import {
  Key, Users, CreditCard, AlertTriangle, Clock, TrendingUp,
  Shield, FileText, ArrowRight, Plus, Star
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const { user, isVaultUnlocked } = useAuth();
  const navigate = useNavigate();

  const data = useMemo(() => {
    if (!user) return null;

    const credentials = store.getCredentials(user.id);
    const accounts = store.getAccounts(user.id);
    const subscriptions = store.getSubscriptions(user.id);
    const documents = store.getDocuments(user.id);
    const activities = store.getActivities(user.id).slice(0, 8);

    const activeSubs = subscriptions.filter(s => s.status === 'Active' || s.status === 'Trial');
    const monthlyCost = store.calculateMonthlyCost(activeSubs);
    const yearlyCost = store.calculateYearlyCost(activeSubs);
    const upcomingRenewals = store.getUpcomingRenewals(activeSubs, 30);

    // Security analysis
    let weakPasswords = 0;
    let reusedPasswords = 0;
    let missing2FA = 0;
    const passwordMap = new Map<string, number>();

    credentials.forEach(c => {
      if (c.password) {
        const strength = calculatePasswordStrength(c.password);
        if (strength.score <= 4) weakPasswords++;
        passwordMap.set(c.password, (passwordMap.get(c.password) || 0) + 1);
      }
      if (c.has2FA === false) missing2FA++;
    });

    passwordMap.forEach(count => { if (count > 1) reusedPasswords += count; });

    const totalIssues = weakPasswords + reusedPasswords + missing2FA;
    const totalCreds = credentials.length || 1;
    const securityScore = Math.max(0, Math.min(100, Math.round(100 - (totalIssues / totalCreds) * 100)));

    // Category spending
    const categorySpending = activeSubs.reduce((acc, sub) => {
      const monthly = sub.billingCycle === 'Monthly' ? sub.price :
        sub.billingCycle === 'Yearly' ? sub.price / 12 :
        sub.billingCycle === 'Quarterly' ? sub.price / 3 :
        sub.billingCycle === 'Half-yearly' ? sub.price / 6 :
        sub.billingCycle === 'Weekly' ? sub.price * 4.33 : sub.price;
      acc[sub.category] = (acc[sub.category] || 0) + monthly;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(categorySpending).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    })).sort((a, b) => b.value - a.value);

    // Favorites
    const favoriteCreds = credentials.filter(c => c.favorite).slice(0, 5);
    const favoriteSubs = activeSubs.filter(s => s.favorite).slice(0, 5);

    return {
      credentials, accounts, subscriptions, documents, activities,
      activeSubs, monthlyCost, yearlyCost, upcomingRenewals,
      weakPasswords, reusedPasswords, missing2FA, securityScore,
      chartData, favoriteCreds, favoriteSubs,
      currency: user.settings.currency,
    };
  }, [user]);

  if (!data) return null;

  const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back, {user?.name?.split(' ')[0]}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => navigate('/vault?action=add')}><Plus size={14} /> Credential</Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/subscriptions?action=add')}><Plus size={14} /> Subscription</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Accounts" value={data.accounts.length} icon={<Users size={20} className="text-blue-500" />} />
        <StatCard label="Credentials" value={data.credentials.length} icon={<Key size={20} className="text-purple-500" />} />
        <StatCard label="Active Subscriptions" value={data.activeSubs.length} icon={<CreditCard size={20} className="text-green-500" />} />
        <StatCard label="Monthly Spending" value={`${data.currency}${Math.round(data.monthlyCost).toLocaleString()}`} icon={<TrendingUp size={20} className="text-emerald-500" />} />
        <StatCard label="Yearly Spending" value={`${data.currency}${Math.round(data.yearlyCost).toLocaleString()}`} icon={<TrendingUp size={20} className="text-cyan-500" />} />
        <StatCard label="Upcoming Renewals" value={data.upcomingRenewals.length} icon={<Clock size={20} className="text-amber-500" />} />
      </div>

      {/* Security Alert */}
      {!isVaultUnlocked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Vault is locked</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Enter your master password to access sensitive data</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/vault')}>Unlock</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Renewals */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Upcoming Renewals</h3>
            <button onClick={() => navigate('/subscriptions')} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">View all</button>
          </div>
          {data.upcomingRenewals.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No upcoming renewals</p>
          ) : (
            <div className="space-y-3">
              {data.upcomingRenewals.slice(0, 5).map(sub => {
                const days = store.getDaysUntilRenewal(sub.renewalDate);
                return (
                  <div key={sub.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{sub.serviceName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Renews in {days} day{days !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{sub.currency}{sub.price}</p>
                      <Badge variant={days <= 3 ? 'danger' : days <= 7 ? 'warning' : 'default'}>
                        {sub.billingCycle}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Spending Chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Spending by Category</h3>
            <button onClick={() => navigate('/subscriptions')} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">Details</button>
          </div>
          {data.chartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400 text-sm">
              Add subscriptions to see spending analytics
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="w-full sm:w-1/2 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                      {data.chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${data.currency}${v.toFixed(0)}/mo`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 space-y-2">
                {data.chartData.slice(0, 5).map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{item.name}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{data.currency}{item.value}/mo</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Security Overview */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Security Overview</h3>
            <button onClick={() => navigate('/security')} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">Details</button>
          </div>
          <div className="text-center py-4">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200 dark:text-gray-700" />
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none"
                  className={data.securityScore >= 80 ? 'text-green-500' : data.securityScore >= 60 ? 'text-yellow-500' : 'text-red-500'}
                  strokeDasharray={`${data.securityScore * 2.51} 251`} strokeLinecap="round" />
              </svg>
              <span className="absolute text-xl font-bold text-gray-900 dark:text-gray-100">{data.securityScore}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Security Score</p>
          </div>
          <div className="space-y-2 mt-4">
            {data.weakPasswords > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-gray-600 dark:text-gray-400">{data.weakPasswords} weak password{data.weakPasswords > 1 ? 's' : ''}</span>
              </div>
            )}
            {data.reusedPasswords > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle size={14} className="text-orange-500" />
                <span className="text-gray-600 dark:text-gray-400">{data.reusedPasswords} reused password{data.reusedPasswords > 1 ? 's' : ''}</span>
              </div>
            )}
            {data.missing2FA > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle size={14} className="text-yellow-500" />
                <span className="text-gray-600 dark:text-gray-400">{data.missing2FA} missing 2FA</span>
              </div>
            )}
            {data.weakPasswords === 0 && data.reusedPasswords === 0 && data.missing2FA === 0 && (
              <p className="text-sm text-green-600 dark:text-green-400 text-center py-2">✓ No security issues found</p>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h3>
          </div>
          {data.activities.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {data.activities.map(activity => (
                <div key={activity.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    activity.action === 'create' || activity.action === 'upload' ? 'bg-green-100 dark:bg-green-900/20' :
                    activity.action === 'delete' ? 'bg-red-100 dark:bg-red-900/20' :
                    'bg-blue-100 dark:bg-blue-900/20'
                  }`}>
                    {activity.action === 'create' || activity.action === 'upload' ? <Plus size={14} className="text-green-600 dark:text-green-400" /> :
                     activity.action === 'delete' ? <span className="text-red-600 dark:text-red-400 text-xs">✕</span> :
                     <span className="text-blue-600 dark:text-blue-400 text-xs">↻</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                      {activity.target} {activity.action === 'create' ? 'added' : activity.action === 'update' ? 'updated' : activity.action === 'delete' ? 'deleted' : activity.action === 'upload' ? 'uploaded' : activity.action}
                      : <span className="font-medium">{activity.details}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(activity.createdAt).toLocaleDateString()} {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Favorites */}
      {(data.favoriteCreds.length > 0 || data.favoriteSubs.length > 0) && (
        <Card>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Star size={16} className="text-yellow-500" /> Favorites
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.favoriteCreds.map(c => (
              <div key={c.id} onClick={() => navigate('/vault')} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20">
                  <Key size={16} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.username || c.email}</p>
                </div>
              </div>
            ))}
            {data.favoriteSubs.map(s => (
              <div key={s.id} onClick={() => navigate('/subscriptions')} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
                  <CreditCard size={16} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{s.serviceName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.currency}{s.price}/{s.billingCycle.toLowerCase()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
