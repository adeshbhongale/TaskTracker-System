import { createSlice } from '@reduxjs/toolkit';

const storedUser = localStorage.getItem('user');
const initialState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  loading: false,
  error: null,
  notifications: []
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.loading = true;
      state.error = null;
    },
    loginSuccess(state, action) {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload;
      state.error = null;
    },
    loginFailure(state, action) {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.error = action.payload;
    },
    logoutSuccess(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.notifications = [];
      state.error = null;
    },
    setNotifications(state, action) {
      state.notifications = action.payload;
    },
    addNotification(state, action) {
      state.notifications = [action.payload, ...state.notifications];
    },
    markNotificationRead(state, action) {
      state.notifications = state.notifications.map(n => 
        n._id === action.payload ? { ...n, isRead: true } : n
      );
    },
    clearError(state) {
      state.error = null;
    }
  }
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logoutSuccess,
  setNotifications,
  addNotification,
  markNotificationRead,
  clearError
} = authSlice.actions;

export default authSlice.reducer;
