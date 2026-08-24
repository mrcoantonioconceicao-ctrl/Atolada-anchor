import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  db,
  loginWithGoogle,
  logoutUser,
  testConnection,
  CloudContract,
  CloudAuditRecord,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoggingIn: boolean;
  isFirebaseConnected: boolean;
  cloudContracts: CloudContract[];
  auditHistory: CloudAuditRecord[];
  login: () => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
  const [cloudContracts, setCloudContracts] = useState<CloudContract[]>([]);
  const [auditHistory, setAuditHistory] = useState<CloudAuditRecord[]>([]);

  useEffect(() => {
    testConnection().then((connected) => setIsFirebaseConnected(connected));

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to user's saved contracts and audit records in Firestore
  useEffect(() => {
    if (!user) {
      setCloudContracts([]);
      setAuditHistory([]);
      return;
    }

    const contractsPath = `users/${user.uid}/contracts`;
    const contractsQuery = query(
      collection(db, 'users', user.uid, 'contracts'),
      limit(50)
    );
    const unsubscribeContracts = onSnapshot(
      contractsQuery,
      (snapshot) => {
        const contracts: CloudContract[] = [];
        snapshot.forEach((docSnap) => {
          contracts.push(docSnap.data() as CloudContract);
        });
        setCloudContracts(contracts);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, contractsPath);
      }
    );

    const auditsPath = `users/${user.uid}/audit_reports`;
    const auditsQuery = query(
      collection(db, 'users', user.uid, 'audit_reports'),
      limit(50)
    );
    const unsubscribeAudits = onSnapshot(
      auditsQuery,
      (snapshot) => {
        const audits: CloudAuditRecord[] = [];
        snapshot.forEach((docSnap) => {
          audits.push(docSnap.data() as CloudAuditRecord);
        });
        setAuditHistory(audits);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, auditsPath);
      }
    );

    return () => {
      unsubscribeContracts();
      unsubscribeAudits();
    };
  }, [user]);

  const login = async (): Promise<User | null> => {
    if (isLoggingIn) return user;
    setIsLoggingIn(true);
    try {
      const loggedUser = await loginWithGoogle();
      return loggedUser;
    } catch (err: any) {
      const code = err?.code || '';
      if (
        code !== 'auth/cancelled-popup-request' &&
        code !== 'auth/popup-closed-by-user' &&
        code !== 'auth/user-cancelled'
      ) {
        console.warn('Login attempt was not completed:', err?.message || err);
      }
      return null;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggingIn,
        isFirebaseConnected,
        cloudContracts,
        auditHistory,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
