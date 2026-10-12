import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, Eye, EyeOff, ArrowRight, Shield, KeyRound } from 'lucide-react';
import { Button, Input, PasswordStrengthIndicator } from '../components/ui';
import { calculatePasswordStrength } from '../lib/crypto';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmMaster, setConfirmMaster] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showMaster, setShowMaster] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const passwordStrength = calculatePasswordStrength(mode === 'register' ? masterPassword : '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await login(email, password);
        if (result.success) {
          navigate('/dashboard');
        } else {
          setError(result.error || 'Login failed');
        }
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (masterPassword !== confirmMaster) {
          setError('Master passwords do not match');
          setLoading(false);
          return;
        }
        if (masterPassword.length < 12) {
          setError('Master password must be at least 12 characters');
          setLoading(false);
          return;
        }
        const result = await register(email, name, password, masterPassword);
        if (result.success) {
          navigate('/onboarding');
        } else {
          setError(result.error || 'Registration failed');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <Lock size={24} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Digital Vault</span>
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Your digital life,<br />securely organized.
          </h1>
          <p className="text-lg text-blue-100 max-w-md">
            One secure place for all your passwords, accounts, subscriptions, and important documents.
          </p>
          <div className="flex flex-col gap-4 pt-4">
            <div className="flex items-center gap-3 text-blue-100">
              <Shield size={20} className="text-blue-300" />
              <span>End-to-end encrypted vault</span>
            </div>
            <div className="flex items-center gap-3 text-blue-100">
              <KeyRound size={20} className="text-blue-300" />
              <span>Client-side AES-256-GCM encryption</span>
            </div>
            <div className="flex items-center gap-3 text-blue-100">
              <Lock size={20} className="text-blue-300" />
              <span>Zero-knowledge architecture</span>
            </div>
          </div>
        </div>
        <div className="relative z-10 text-sm text-blue-200">
          © 2024 Digital Vault. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12 bg-white dark:bg-gray-950">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <Lock size={28} className="text-blue-500" />
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">Digital Vault</span>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {mode === 'login'
                ? 'Sign in to access your secure vault'
                : 'Start organizing your digital life securely'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <Input
                label="Full Name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={e => setName(e.target.value)}
                icon={<User size={16} />}
                required
              />
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              icon={<Mail size={16} />}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {mode === 'login' ? 'Password' : 'Login Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <>
                <Input
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Master Password <span className="text-xs text-gray-400">(for vault encryption)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showMaster ? 'text' : 'password'}
                        placeholder="Min. 12 characters"
                        value={masterPassword}
                        onChange={e => setMasterPassword(e.target.value)}
                        required
                        minLength={12}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMaster(!showMaster)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showMaster ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {masterPassword && <PasswordStrengthIndicator strength={passwordStrength} />}
                  </div>
                </div>

                <Input
                  label="Confirm Master Password"
                  type={showMaster ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={confirmMaster}
                  onChange={e => setConfirmMaster(e.target.value)}
                  required
                />
              </>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={16} />
                </span>
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
