import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Hub } from '../types';
import { StorageService } from '../services/storage';
import { AuthService } from '../services/authService';

interface AuthContextType {
  currentUser: User;
  currentRole: UserRole;
  currentHub: Hub | null;
  allHubs: Hub[];
  selectHub: (hubId: string) => void;
  switchRole: (role: UserRole) => Promise<void>;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  resetDemoData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => StorageService.getState().currentUser);
  const [allHubs, setAllHubs] = useState<Hub[]>(() => StorageService.getState().hubs);
  const [selectedHubId, setSelectedHubId] = useState<string | null>(
    () => StorageService.getState().currentUser.assignedHubId || StorageService.getState().hubs[0]?.id || null
  );

  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      const state = StorageService.getState();
      setCurrentUser(state.currentUser);
      setAllHubs(state.hubs);
    });
    return unsubscribe;
  }, []);

  const switchRole = async (role: UserRole) => {
    const updatedUser = await AuthService.switchRole(role);
    setCurrentUser(updatedUser);
    if (updatedUser.assignedHubId) {
      setSelectedHubId(updatedUser.assignedHubId);
    }
  };

  const selectHub = (hubId: string) => {
    setSelectedHubId(hubId);
  };

  const login = async (email: string, password?: string) => {
    const user = await AuthService.login(email, password);
    setCurrentUser(user);
    if (user.assignedHubId) {
      setSelectedHubId(user.assignedHubId);
    }
  };

  const logout = () => {
    AuthService.logout();
  };

  const hasRole = (roles: UserRole[]): boolean => {
    return roles.includes(currentUser.role);
  };

  const resetDemoData = () => {
    const fresh = StorageService.resetToDefaults();
    setCurrentUser(fresh.currentUser);
    setAllHubs(fresh.hubs);
    setSelectedHubId(fresh.currentUser.assignedHubId || fresh.hubs[0]?.id || null);
  };

  const currentHub = allHubs.find(h => h.id === selectedHubId) || allHubs[0] || null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: currentUser.role,
        currentHub,
        allHubs,
        selectHub,
        switchRole,
        login,
        logout,
        hasRole,
        resetDemoData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
