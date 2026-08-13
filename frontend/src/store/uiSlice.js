import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarOpen: true, theme: 'dark', notifications: [] },
  reducers: {
    toggleSidebar(state)              { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen(state, action)     { state.sidebarOpen = action.payload; },
    addNotification(state, action)    { state.notifications.unshift(action.payload); },
    clearNotifications(state)         { state.notifications = []; },
  }
});
export const { toggleSidebar, setSidebarOpen, addNotification, clearNotifications } = uiSlice.actions;
export default uiSlice.reducer;
