import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';
import toast from 'react-hot-toast';

export const loginUser = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/login', data);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const registerUser = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/register', data);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed');
  }
});

export const verifyOtp = createAsyncThunk('auth/verifyOtp', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/verify-otp', data);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'OTP verification failed');
  }
});

export const fetchProfile = createAsyncThunk('auth/profile', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/users/profile');
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

const saved = localStorage.getItem('aviro_token');

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: saved || null,
    user: null,
    loading: false,
    error: null,
    pendingEmail: null,
  },
  reducers: {
    logout(state) {
      state.token = null;
      state.user  = null;
      localStorage.removeItem('aviro_token');
      localStorage.removeItem('aviro_refresh');
      toast.success('Logged out successfully');
    },
    setPendingEmail(state, action) {
      state.pendingEmail = action.payload;
    },
    clearError(state) { state.error = null; },
  },
  extraReducers: builder => {
    // Login
    builder.addCase(loginUser.pending,   s => { s.loading = true; s.error = null; });
    builder.addCase(loginUser.fulfilled, (s, a) => {
      s.loading = false;
      s.token   = a.payload.accessToken;
      s.user    = a.payload.user;
      localStorage.setItem('aviro_token',   a.payload.accessToken);
      localStorage.setItem('aviro_refresh', a.payload.refreshToken);
      toast.success(`Welcome back, ${a.payload.user.fullName}! 🚀`);
    });
    builder.addCase(loginUser.rejected,  (s, a) => { s.loading = false; s.error = a.payload; toast.error(a.payload); });

    // Register
    builder.addCase(registerUser.pending,   s => { s.loading = true; s.error = null; });
    builder.addCase(registerUser.fulfilled, (s, a) => {
      s.loading = false;
      s.token   = a.payload.accessToken;
      s.user    = a.payload.user;
      localStorage.setItem('aviro_token',   a.payload.accessToken);
      localStorage.setItem('aviro_refresh', a.payload.refreshToken);
      toast.success('Account created! Check your email for OTP 🎉');
    });
    builder.addCase(registerUser.rejected, (s, a) => { s.loading = false; s.error = a.payload; toast.error(a.payload); });

    // Profile
    builder.addCase(fetchProfile.fulfilled, (s, a) => { s.user = a.payload; });
  }
});

export const { logout, setPendingEmail, clearError } = authSlice.actions;
export default authSlice.reducer;
