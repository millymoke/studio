"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-config';
import { UPLOADS_STORAGE_KEY } from '@/lib/constants';
import type { Upload } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      // Unblock UI immediately
      setLoading(false);
      if (firebaseUser) {
        // Ensure user doc exists
        const runInBackground = async () => {
          const userRef = doc(db, 'users', firebaseUser.uid);
          try {
            const snap = await getDoc(userRef);
            if (!snap.exists()) {
              await setDoc(userRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email || null,
                phoneNumber: firebaseUser.phoneNumber || null,
                displayName: firebaseUser.displayName || null,
                photoURL: firebaseUser.photoURL || null,
                createdAt: serverTimestamp(),
              });
            }
          } catch (err) {
            console.warn('AuthProvider: Skipping user doc sync (possibly offline).', err);
          }

          // TEMPORARILY DISABLED: Local uploads migration to prevent CORS errors
          // This migration was causing CORS issues with fetch calls
          
          try {
            if (typeof window !== 'undefined') {
              // Clear local storage without migration to prevent future issues
              const migrationFlagKey = `sharespace-migrated-${firebaseUser.uid}`;
              const raw = localStorage.getItem(UPLOADS_STORAGE_KEY);
              if (raw) {
                const localUploads = JSON.parse(raw) as Upload[];
                if (Array.isArray(localUploads) && localUploads.length > 0) {
                  localStorage.removeItem(UPLOADS_STORAGE_KEY);
                  localStorage.setItem(migrationFlagKey, '1');
                }
              }
            }
          } catch (e) {
            console.warn('Local storage cleanup failed:', e);
          }
        };
        runInBackground();
      }
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}


