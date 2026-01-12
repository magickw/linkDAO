import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DashboardView = 'overview' | 'portfolio' | 'staking' | 'transactions' | 'governance';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface WalletSettings {
  autoRefresh: boolean;
  refreshInterval: number; // in milliseconds
  showTestnets: boolean;
  defaultChainId: number;
  enableNotifications: boolean;
}

interface WalletStore {
  // Dashboard state
  dashboardView: DashboardView;
  setDashboardView: (view: DashboardView) => void;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;

  // Settings
  settings: WalletSettings;
  updateSettings: (settings: Partial<WalletSettings>) => void;

  // UI State
  isSidebarOpen: boolean;
  toggleSidebar: () => void;

  // Quick Actions
  recentActions: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: Date;
  }>;
  addRecentAction: (action: Omit<WalletStore['recentActions'][0], 'id' | 'timestamp'>) => void;
  clearRecentActions: () => void;
}

const defaultSettings: WalletSettings = {
  autoRefresh: true,
  refreshInterval: 300000, // 5 minutes
  showTestnets: false,
  defaultChainId: 8453, // Base mainnet
  enableNotifications: true,
};

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      // Dashboard state
      dashboardView: 'overview',
      setDashboardView: (view) => set({ dashboardView: view }),

      // Notifications
      notifications: [],
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              ...notification,
              id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date(),
              read: false,
            },
            ...state.notifications,
          ].slice(0, 50), // Keep only last 50 notifications
        })),
      markNotificationAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      clearNotifications: () => set({ notifications: [] }),

      // Settings
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      // UI State
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      // Quick Actions
      recentActions: [],
      addRecentAction: (action) =>
        set((state) => ({
          recentActions: [
            {
              ...action,
              id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date(),
            },
            ...state.recentActions,
          ].slice(0, 20), // Keep only last 20 actions
        })),
      clearRecentActions: () => set({ recentActions: [] }),
    }),
    {
      name: 'linkdao-wallet-storage',
      partialize: (state) => ({
        settings: state.settings,
        isSidebarOpen: state.isSidebarOpen,
        recentActions: state.recentActions,
      }),
    }
  )
);