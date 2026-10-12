import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '../lib/types';
import * as store from '../lib/store';
import { deriveKey, hashPassword, generateSaltString, saltFromString, encrypt, decrypt } from '../lib/crypto';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isVaultUnlocked: boolean;
  masterKey: CryptoKey | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, name: string, password: string, masterPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  unlockVault: (masterPassword: string) => Promise<{ success: boolean; error?: string }>;
  lockVault: () => void;
  completeOnboarding: () => void;
  lastActivity: number;
  updateLastActivity: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const autoLockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const session = store.getSession();
    if (session) {
      const u = store.getUserById(session.userId);
      if (u) {
        setUser(u);
        setLastActivity(Date.now());
      } else {
        store.clearSession();
      }
    }
    setIsLoading(false);
  }, []);

  // Auto-lock check
  useEffect(() => {
    if (autoLockRef.current) clearInterval(autoLockRef.current);
    if (user && masterKey) {
      autoLockRef.current = setInterval(() => {
        const timeout = user.settings.autoLockTimeout;
        if (timeout > 0 && Date.now() - lastActivity > timeout * 60 * 1000) {
          setMasterKey(null);
        }
      }, 30000);
    }
    return () => { if (autoLockRef.current) clearInterval(autoLockRef.current); };
  }, [user, masterKey, lastActivity]);

  const updateLastActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  const login = async (email: string, password: string) => {
    const u = store.getUserByEmail(email);
    if (!u) return { success: false, error: 'Invalid email or password' };

    const salt = saltFromString(u.salt);
    const hash = await hashPassword(password, salt);

    if (hash !== u.passwordHash) {
      return { success: false, error: 'Invalid email or password' };
    }

    setUser(u);
    store.setSession(u.id);
    store.logActivity(u.id, 'login', 'Session', 'User logged in');
    setLastActivity(Date.now());
    return { success: true };
  };

  const register = async (email: string, name: string, password: string, masterPassword: string) => {
    if (store.getUserByEmail(email)) {
      return { success: false, error: 'Email already registered' };
    }

    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }

    if (masterPassword.length < 12) {
      return { success: false, error: 'Master password must be at least 12 characters' };
    }

    const salt = generateSaltString();
    const masterKeySalt = generateSaltString();
    const passwordHash = await hashPassword(password, saltFromString(salt));

    const u = store.createUser(email, name, passwordHash, salt, masterKeySalt);
    setUser(u);
    store.setSession(u.id);
    store.logActivity(u.id, 'register', 'Account', 'New account created');

    // Derive and store master key
    const key = await deriveKey(masterPassword, saltFromString(masterKeySalt));
    setMasterKey(key);
    setLastActivity(Date.now());

    return { success: true };
  };

  const logout = () => {
    if (user) {
      store.logActivity(user.id, 'logout', 'Session', 'User logged out');
    }
    setUser(null);
    setMasterKey(null);
    store.clearSession();
  };

  const unlockVault = async (masterPassword: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const key = await deriveKey(masterPassword, saltFromString(user.masterKeySalt));
      // Test decryption with a known value
      // Test by encrypting and decrypting a test value
      const testEncrypted = await encrypt('vault_test', key);
      const testDecrypted = await decrypt(testEncrypted, key);
      if (testDecrypted !== 'vault_test') throw new Error('Decryption failed');
      setMasterKey(key);
      setLastActivity(Date.now());
      store.logActivity(user.id, 'unlock', 'Vault', 'Vault unlocked');
      return { success: true };
    } catch {
      return { success: false, error: 'Invalid master password' };
    }
  };

  const lockVault = () => {
    if (user) {
      store.logActivity(user.id, 'lock', 'Vault', 'Vault locked');
    }
    setMasterKey(null);
  };

  const completeOnboarding = () => {
    if (user) {
      store.updateUser(user.id, { onboardingComplete: true });
      setUser({ ...user, onboardingComplete: true });
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isVaultUnlocked: !!masterKey,
    masterKey,
    isLoading,
    login,
    register,
    logout,
    unlockVault,
    lockVault,
    completeOnboarding,
    lastActivity,
    updateLastActivity,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Helper to encrypt/decrypt vault data
export async function encryptData(data: string, masterKey: CryptoKey): Promise<string> {
  return encrypt(data, masterKey);
}

export async function decryptData(data: string, masterKey: CryptoKey): Promise<string> {
  return decrypt(data, masterKey);
}
