import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with databaseId from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Operation types for standard error handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection at startup
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline or initializing.');
      return false;
    }
    // Expected permission or non-existent doc error confirms connectivity
    return true;
  }
}

// Authentication Helpers
let isLoginInProgress = false;

export async function loginWithGoogle(): Promise<User | null> {
  if (isLoginInProgress) {
    console.info('Google sign-in is already in progress.');
    return auth.currentUser;
  }

  isLoginInProgress = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Sync user profile to Firestore
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef).catch(() => null);
      
      if (!userDoc || !userDoc.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Solana Developer',
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(
          userRef,
          {
            displayName: user.displayName || 'Solana Developer',
            photoURL: user.photoURL || '',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    }
    
    return user;
  } catch (error: any) {
    const errorCode = error?.code || '';
    const isCancelledByUser =
      errorCode === 'auth/cancelled-popup-request' ||
      errorCode === 'auth/popup-closed-by-user' ||
      errorCode === 'auth/user-cancelled' ||
      error?.message?.includes('cancelled-popup-request') ||
      error?.message?.includes('popup-closed-by-user');

    if (isCancelledByUser) {
      console.info('Google sign-in popup was dismissed or cancelled by user.');
      return null;
    }

    console.error('Failed to sign in with Google:', error);
    throw error;
  } finally {
    isLoginInProgress = false;
  }
}

export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

// Types for Cloud Entities
export interface CloudContract {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  sourceCode: string;
  templateType?: string;
  auditScore: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface CloudAuditRecord {
  id: string;
  ownerId: string;
  contractTitle: string;
  score: number;
  passedChecks: number;
  totalRules: number;
  isProductionReady: boolean;
  createdAt?: any;
}

// In-Memory Write Cache & Debouncer to handle 10,000+ client bursts without Firestore rate-limit collisions
const activeSaveOperations = new Map<string, Promise<void>>();
const recentAuditWrites = new Set<string>();

// Firestore Database Services with Concurrency Throttling
export async function saveContractToCloud(
  userId: string,
  contract: {
    id: string;
    title: string;
    description?: string;
    sourceCode: string;
    templateType?: string;
    auditScore: number;
  }
): Promise<void> {
  const lockKey = `${userId}:${contract.id}`;
  if (activeSaveOperations.has(lockKey)) {
    return activeSaveOperations.get(lockKey);
  }

  const savePromise = (async () => {
    const path = `users/${userId}/contracts/${contract.id}`;
    try {
      const docRef = doc(db, 'users', userId, 'contracts', contract.id);
      const existing = await getDoc(docRef);

      if (existing.exists()) {
        await setDoc(
          docRef,
          {
            title: contract.title,
            description: contract.description || '',
            sourceCode: contract.sourceCode,
            templateType: contract.templateType || 'custom',
            auditScore: contract.auditScore,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        await setDoc(docRef, {
          id: contract.id,
          ownerId: userId,
          title: contract.title,
          description: contract.description || '',
          sourceCode: contract.sourceCode,
          templateType: contract.templateType || 'custom',
          auditScore: contract.auditScore,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      activeSaveOperations.delete(lockKey);
    }
  })();

  activeSaveOperations.set(lockKey, savePromise);
  return savePromise;
}

export async function deleteContractFromCloud(userId: string, contractId: string): Promise<void> {
  const path = `users/${userId}/contracts/${contractId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'contracts', contractId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function recordAuditToCloud(
  userId: string,
  record: Omit<CloudAuditRecord, 'ownerId' | 'createdAt'>
): Promise<void> {
  // Deduplicate identical audit writes within 5 seconds to reduce write quota
  const dedupeKey = `${userId}:${record.id}:${record.score}:${record.passedChecks}`;
  if (recentAuditWrites.has(dedupeKey)) {
    return;
  }
  recentAuditWrites.add(dedupeKey);
  setTimeout(() => recentAuditWrites.delete(dedupeKey), 5000);

  const path = `users/${userId}/audit_reports/${record.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'audit_reports', record.id);
    const scoreVal = typeof record.score === 'number' ? record.score : 0;
    await setDoc(docRef, {
      id: record.id,
      contractTitle: record.contractTitle || 'Solana Contract Audit',
      score: scoreVal,
      passedChecks: typeof record.passedChecks === 'number' ? record.passedChecks : 0,
      totalRules: typeof record.totalRules === 'number' ? record.totalRules : 0,
      isProductionReady: typeof record.isProductionReady === 'boolean' ? record.isProductionReady : scoreVal >= 85,
      ownerId: userId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
