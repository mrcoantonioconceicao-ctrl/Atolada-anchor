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
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isFirebaseConnected: boolean;
  cloudContracts: CloudContract[];
  auditHistory: CloudAuditRecord[];
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
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
    const contractsQuery = query(collection(db, 'users', user.uid, 'contracts'));
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
    const auditsQuery = query(collection(db, 'users', user.uid, 'audit_reports'));
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

  const login = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Login error:', err);
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
