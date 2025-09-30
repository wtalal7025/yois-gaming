import { create } from 'zustand'
import type { 
  ModalState, 
  ToastNotification, 
  LoadingState 
} from '../types'

interface UIStore {
  // Modal state
  modal: ModalState
  openModal: (type: ModalState['type'], data?: any) => void
  closeModal: () => void
  
  // Toast notifications
  toasts: ToastNotification[]
  addToast: (toast: Omit<ToastNotification, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
  
  // Loading states
  loading: LoadingState
  setLoading: (loading: boolean, message?: string, progress?: number) => void
  
  // Mobile menu
  isMobileMenuOpen: boolean
  toggleMobileMenu: () => void
  closeMobileMenu: () => void
  
  // Sidebar (for user dashboard)
  isSidebarOpen: boolean
  toggleSidebar: () => void
  closeSidebar: () => void
  
  // Theme preference (dark/light)
  theme: 'dark' | 'light'
  toggleTheme: () => void
  setTheme: (theme: 'dark' | 'light') => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  // Initial state
  modal: {
    isOpen: false
  },
  toasts: [],
  loading: {
    isLoading: false
  },
  isMobileMenuOpen: false,
  isSidebarOpen: false,
  theme: 'dark',

  // Modal actions
  openModal: (type, data) => {
    set({
      modal: {
        isOpen: true,
        type,
        data
      }
    })
  },

  closeModal: () => {
    set({
      modal: {
        isOpen: false
      }
    })
  },

  // Toast actions
  addToast: (toast) => {
    const id = Date.now().toString()
    const newToast: ToastNotification = {
      ...toast,
      id,
      duration: toast.duration || 5000
    }

    set(state => ({
      toasts: [...state.toasts, newToast]
    }))

    // Auto-remove toast after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, newToast.duration)
    }
  },

  removeToast: (id) => {
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }))
  },

  clearToasts: () => {
    set({ toasts: [] })
  },

  // Loading actions
  setLoading: (loading, message, progress) => {
    set({
      loading: {
        isLoading: loading,
        message,
        progress
      }
    })
  },

  // Mobile menu actions
  toggleMobileMenu: () => {
    set(state => ({
      isMobileMenuOpen: !state.isMobileMenuOpen
    }))
  },

  closeMobileMenu: () => {
    set({ isMobileMenuOpen: false })
  },

  // Sidebar actions
  toggleSidebar: () => {
    set(state => ({
      isSidebarOpen: !state.isSidebarOpen
    }))
  },

  closeSidebar: () => {
    set({ isSidebarOpen: false })
  },

  // Theme actions
  toggleTheme: () => {
    const currentTheme = get().theme
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
    
    set({ theme: newTheme })
    
    // Update HTML class for theme switching
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', newTheme === 'dark')
    }
  },

  setTheme: (theme) => {
    set({ theme })
    
    // Update HTML class for theme switching
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
  }
}))

// Utility hooks for specific UI state
export const useModal = () => useUIStore(state => state.modal)
export const useToasts = () => useUIStore(state => state.toasts)
export const useLoading = () => useUIStore(state => state.loading)
export const useMobileMenu = () => useUIStore(state => state.isMobileMenuOpen)
export const useSidebar = () => useUIStore(state => state.isSidebarOpen)
export const useTheme = () => useUIStore(state => state.theme)

// Action hooks
export const useModalActions = () => useUIStore(state => ({
  openModal: state.openModal,
  closeModal: state.closeModal
}))

export const useToastActions = () => useUIStore(state => ({
  addToast: state.addToast,
  removeToast: state.removeToast,
  clearToasts: state.clearToasts
}))

export const useLoadingActions = () => useUIStore(state => ({
  setLoading: state.setLoading
}))

export const useThemeActions = () => useUIStore(state => ({
  toggleTheme: state.toggleTheme,
  setTheme: state.setTheme
}))

// Helper function to show different types of toasts
export const showToast = {
  success: (title: string, message?: string) => {
    useUIStore.getState().addToast({
      type: 'success',
      title,
      message
    })
  },
  error: (title: string, message?: string) => {
    useUIStore.getState().addToast({
      type: 'error',
      title,
      message,
      duration: 8000 // Longer duration for errors
    })
  },
  warning: (title: string, message?: string) => {
    useUIStore.getState().addToast({
      type: 'warning',
      title,
      message
    })
  },
  info: (title: string, message?: string) => {
    useUIStore.getState().addToast({
      type: 'info',
      title,
      message
    })
  }
}