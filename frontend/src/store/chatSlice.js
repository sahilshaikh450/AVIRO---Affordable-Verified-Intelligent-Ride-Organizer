import { createSlice } from '@reduxjs/toolkit';

// ─── CHAT SLICE ──────────────────────────────────────────────────
export const chatSlice = createSlice({
  name: 'chat',
  initialState: { messages: [], activeChat: null, unread: 0 },
  reducers: {
    setActiveChat(state, action)    { state.activeChat = action.payload; state.messages = []; },
    addMessage(state, action)       { state.messages.push(action.payload); },
    setMessages(state, action)      { state.messages = action.payload; },
    setUnread(state, action)        { state.unread = action.payload; },
    incrementUnread(state)          { state.unread += 1; },
  }
});
export const { setActiveChat, addMessage, setMessages, setUnread, incrementUnread } = chatSlice.actions;
export const chatReducer = chatSlice.reducer;
export default chatSlice.reducer;
