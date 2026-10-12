import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import * as store from '../lib/store';
import { calculatePasswordStrength } from '../lib/crypto';
import { Card, Badge } from '../components/ui';
import { Shield, AlertTriangle, Check, Key, Lock, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function Security() {
  const { user } = useAuth();
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const analysis = useMemo(() => {
    if (!user) return null;
    const credentials = store.getCredentials(user.id);
    const accounts = store.getAccounts(user.id);

    let weakPasswords: { id: string; name: string; score: number }[] = [];
    let reusedPasswords: { id: string; name: string; count: number }[] = [];
    let oldPasswords: { id: string; name: string; days: number }[] = [];
    let missing2FA: { id: string; name: string }[] = [];

    const passwordMap = new Map<string, { ids: string[]; names: string[] }>();
    const now = Date.now();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;

    credentials.forEach(c => {
      if (c.password) {
        const strength = calculatePasswordStrength(c.password);
        if (strength.score <= 4) {
          weakPasswords.push({ id: c.id, name: c.name, score: strength.score });
        }

        const existing = passwordMap.get(c.password);
        if (existing) {
          existing.ids.push(c.id);
          existing.names.push(c.name);
        } else {
          passwordMap.set(c.password, { ids: [c.id], names: [c.name] });
        }

        const age = now - new Date(c.updatedAt).getTime();
        if (age > ninetyDays) {
          oldPasswords.push({ id: c.id, name: c.name, days: Math.floor(age / (24 * 60 * 60 * 1000)) });
        }
      }

      if (c.has2FA === false) {
        missing2FA.push({ id: c.id, name: c.name });
      }
    });

    passwordMap.forEach((value) => {
      if (value.ids.length > 1) {
        reusedPasswords.push({ id: value.ids[0], name: value.names.join(', '), count: value.ids.length });
      }
    });

    const totalIssues = weakPasswords.length + reusedPasswords.length + oldPasswords.length + missing2FA.length;
    const totalCreds = credentials.length || 1;
    const score = Math.max(0, Math.min(100, Math.round(100 - (totalIssues / totalCreds) * 50)));
    const goodPasswords = credentials.length - weakPasswords.length;

    return {
      score,
      weakPasswords,
      reusedPasswords,
      oldPasswords,
      missing2FA,
      totalCredentials: credentials.length,
      totalAccounts: accounts.length,
      goodPasswords,
      critical: weakPasswords.length + reusedPasswords.length,
      warnings: oldPasswords.length + missing2FA.length,
    };
  }, [user]);

  if (!analysis) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Security Center</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Monitor and improve your vault security</p>
      </div>

      {/* Score Card */}
      <Card className="text-center">
        <div className="flex flex-col items-center">
          <div className="relative inline-flex items-center justify-center mb-4">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="none" className="text-gray-200 dark:text-gray-700" />
              <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="none"
                className={analysis.score >= 80 ? 'text-green-500' : analysis.score >= 60 ? 'text-yellow-500' : 'text-red-500'}
                strokeDasharray={`${analysis.score * 3.52} 352`} strokeLinecap="round" />
            </svg>
            <div className="absolute text-center">
              <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analysis.score}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">/100</span>
            </div>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Security Score</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {analysis.score >= 80 ? 'Your vault security is good' : analysis.score >= 60 ? 'Some improvements needed' : 'Several security issues found'}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{analysis.critical}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Critical</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-500">{analysis.warnings}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Warnings</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">{analysis.goodPasswords}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Good</p>
          </div>
        </div>
      </Card>

      {/* Issues */}
      <div className="space-y-4">
        {/* Weak Passwords */}
        {analysis.weakPasswords.length > 0 && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20">
                <AlertTriangle size={16} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Weak Passwords</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{analysis.weakPasswords.length} credential{analysis.weakPasswords.length > 1 ? 's' : ''} with weak passwords</p>
              </div>
            </div>
            <div className="space-y-2">
              {analysis.weakPasswords.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-red-50 dark:bg-red-900/10">
                  <span className="text-sm text-gray-900 dark:text-gray-100">{item.name}</span>
                  <Badge variant="danger">Score: {item.score}/10</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Reused Passwords */}
        {analysis.reusedPasswords.length > 0 && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/20">
                <Key size={16} className="text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Reused Passwords</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{analysis.reusedPasswords.length} password{analysis.reusedPasswords.length > 1 ? 's' : ''} used across multiple accounts</p>
              </div>
            </div>
            <div className="space-y-2">
              {analysis.reusedPasswords.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-orange-50 dark:bg-orange-900/10">
                  <span className="text-sm text-gray-900 dark:text-gray-100">{item.name}</span>
                  <Badge variant="warning">Used {item.count}x</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Old Passwords */}
        {analysis.oldPasswords.length > 0 && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
                <Lock size={16} className="text-yellow-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Old Passwords</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{analysis.oldPasswords.length} password{analysis.oldPasswords.length > 1 ? 's' : ''} not updated in 90+ days</p>
              </div>
            </div>
            <div className="space-y-2">
              {analysis.oldPasswords.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10">
                  <span className="text-sm text-gray-900 dark:text-gray-100">{item.name}</span>
                  <Badge variant="warning">{item.days} days old</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Missing 2FA */}
        {analysis.missing2FA.length > 0 && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/20">
                <Shield size={16} className="text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Missing 2FA</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{analysis.missing2FA.length} account{analysis.missing2FA.length > 1 ? 's' : ''} without two-factor authentication</p>
              </div>
            </div>
            <div className="space-y-2">
              {analysis.missing2FA.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-50 dark:bg-amber-900/10">
                  <span className="text-sm text-gray-900 dark:text-gray-100">{item.name}</span>
                  <Badge variant="warning">2FA not enabled</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* All Clear */}
        {analysis.critical === 0 && analysis.warnings === 0 && (
          <Card className="text-center py-8">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/20">
                <Check size={32} className="text-green-500" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">All Clear!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No security issues found. Your vault is well-protected.</p>
          </Card>
        )}
      </div>

      {/* Recommendations */}
      <Card>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Recommendations</h3>
        <div className="space-y-3">
          {analysis.weakPasswords.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 shrink-0 mt-0.5">
                <span className="text-xs font-bold text-red-500">1</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Strengthen weak passwords</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Use the password generator to create strong, unique passwords for each credential.</p>
              </div>
            </div>
          )}
          {analysis.reusedPasswords.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20 shrink-0 mt-0.5">
                <span className="text-xs font-bold text-orange-500">2</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Use unique passwords</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Never reuse passwords across different services. Each account should have its own unique password.</p>
              </div>
            </div>
          )}
          {analysis.missing2FA.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20 shrink-0 mt-0.5">
                <span className="text-xs font-bold text-amber-500">3</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Enable 2FA where possible</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Two-factor authentication adds an extra layer of security to your accounts.</p>
              </div>
            </div>
          )}
          {analysis.oldPasswords.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20 shrink-0 mt-0.5">
                <span className="text-xs font-bold text-yellow-500">4</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Update old passwords</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Consider updating passwords that haven't been changed in over 90 days.</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20 shrink-0 mt-0.5">
              <span className="text-xs font-bold text-blue-500">★</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Regular security reviews</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Check your security score regularly and address any new issues promptly.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
