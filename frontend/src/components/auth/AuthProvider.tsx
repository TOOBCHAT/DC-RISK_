import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { getWalletNonce, verifyWalletSignature } from '../../lib/api';

// ─── Types ──────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithWallet: (walletType: 'phantom' | 'solflare') => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    // Subscribe to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Email / Password ──────────────────────────────────────────
  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };

    return { error: null };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  // ── Google OAuth ──────────────────────────────────────────────
  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  // ── Solana Wallet ─────────────────────────────────────────────
  const signInWithWallet = useCallback(async (walletType: 'phantom' | 'solflare') => {
    try {
      // Get wallet provider
      const provider = walletType === 'phantom'
        ? (window as any).phantom?.solana
        : (window as any).solflare;

      if (!provider) {
        return { error: `${walletType === 'phantom' ? 'Phantom' : 'Solflare'} wallet not found. Please install it.` };
      }

      // Connect wallet
      await provider.connect();
      
      // Some providers return a response object with publicKey, others set it on the provider itself
      const pubKeyObj = provider.publicKey;
      if (!pubKeyObj) {
        throw new Error('Could not get public key from wallet');
      }
      const publicKey = pubKeyObj.toString();

      // Get nonce from backend
      const { nonce } = await getWalletNonce();

      // Sign nonce with wallet
      const message = new TextEncoder().encode(
        `DC-RISK Authentication\nNonce: ${nonce}`
      );
      const signedMessage = await provider.signMessage(message, 'utf8');
      
      // Use bs58 instead of Node's Buffer
      const bs58 = (await import('bs58')).default;
      
      // Phantom returns { signature: Uint8Array }, some older wallets return Uint8Array directly
      // Wrap in Uint8Array to ensure it hasn't lost its prototype
      const rawBytes = signedMessage.signature ? signedMessage.signature : signedMessage;
      const rawSignature = new Uint8Array(rawBytes);
      const signature = bs58.encode(rawSignature);

      // Verify with backend and get Supabase tokens
      const { access_token, refresh_token } = await verifyWalletSignature(
        publicKey,
        signature,
        nonce,
      );

      // Set session in Supabase client
      await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      return { error: null };
    } catch (err: any) {
      console.error('[DC-RISK] Wallet auth error:', err);
      return { error: err.message || 'Wallet authentication failed' };
    }
  }, []);

  // ── Sign Out ──────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        signInWithWallet,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ───────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
