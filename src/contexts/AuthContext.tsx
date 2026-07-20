/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useToast as useToastHook } from '../components/common/Toast';

interface User {
  id: string;
  username: string;
  email: string;
  profilePicUrl?: string | null;
  role?: string | null;
  isGuest?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: (beforeLogout?: () => Promise<void>) => Promise<void>;
  continueAsGuest: () => void;
  useToast: ReturnType<typeof useToastHook>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const toastContext = useToastHook();

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        // Migrate old guest IDs that aren't valid UUIDs
        if (parsed.id?.startsWith('guest-')) {
          // Replace with a proper UUID for guest users
          parsed.id = crypto.randomUUID();
          localStorage.setItem('user', JSON.stringify(parsed));
        }
        setUser(parsed);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async (beforeLogout?: () => Promise<void>) => {
    // Run beforeLogout callback if provided
    if (beforeLogout) {
      await beforeLogout();
    }
    
    setUser(null);
    localStorage.removeItem('user');
  };

  const continueAsGuest = () => {
    // Clear any existing user from localStorage to prevent stale IDs
    localStorage.removeItem('user');
    
    const guestUser: User & { isGuest: boolean } = {
      id: crypto.randomUUID(),
      username: 'Guest',
      email: '',
      role: 'GUEST',
      isGuest: true,
    };

    setUser(guestUser);
    localStorage.setItem('user', JSON.stringify(guestUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        continueAsGuest,
        useToast: toastContext,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Export useToast from AuthContext for convenience
export const useToast = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context.useToast;
};