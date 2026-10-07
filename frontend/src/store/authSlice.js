import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';
import toast from 'react-hot-toast';

// =========================================================
// LOGIN
// =========================================================

export const loginUser = createAsyncThunk(
  'auth/login',
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/login', data);

      return res.data.data;

    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Login failed'
      );
    }
  }
);

// =========================================================
// REGISTER
// =========================================================

export const registerUser = createAsyncThunk(
  'auth/register',
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/register', data);

      return res.data.data;

    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Registration failed'
      );
    }
  }
);

// =========================================================
// REGISTRATION OTP
// Keep for later OTP feature
// =========================================================

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/verify-otp', data);

      return res.data;

    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message ||
        'OTP verification failed'
      );
    }
  }
);

// =========================================================
// PROFILE
// =========================================================

export const fetchProfile = createAsyncThunk(
  'auth/profile',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/users/profile');

      return res.data.data;

    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message
      );
    }
  }
);

const saved = localStorage.getItem('aviro_token');

const savedUser = localStorage.getItem('aviro_user');

const authSlice = createSlice({

  name: 'auth',

  initialState: {
    token: saved || null,

    user: savedUser
      ? JSON.parse(savedUser)
      : null,

    loading: false,

    error: null,

    pendingEmail: null,
  },

  reducers: {

    logout(state) {

      state.token = null;

      state.user = null;

      state.pendingEmail = null;

      localStorage.removeItem('aviro_token');
      localStorage.removeItem('aviro_refresh');
      localStorage.removeItem('aviro_refresh_token');
      localStorage.removeItem('aviro_user');

      toast.success('Logged out successfully');
    },

    setPendingEmail(state, action) {

      state.pendingEmail = action.payload;
    },

    clearError(state) {

      state.error = null;
    },
  },

  extraReducers: builder => {

    // =====================================================
    // LOGIN
    // =====================================================

    builder.addCase(
      loginUser.pending,
      state => {

        state.loading = true;
        state.error = null;
      }
    );

    builder.addCase(
      loginUser.fulfilled,
      (state, action) => {

        state.loading = false;

        state.token =
          action.payload.accessToken;

        state.user =
          action.payload.user;

        localStorage.setItem(
          'aviro_token',
          action.payload.accessToken
        );

        localStorage.setItem(
          'aviro_refresh',
          action.payload.refreshToken
        );

        localStorage.setItem(
          'aviro_user',
          JSON.stringify(
            action.payload.user
          )
        );

        toast.success(
          `Welcome back, ${action.payload.user.fullName}! 🚀`
        );
      }
    );

    builder.addCase(
      loginUser.rejected,
      (state, action) => {

        state.loading = false;

        state.error = action.payload;

        toast.error(action.payload);
      }
    );

    // =====================================================
    // REGISTER
    // =====================================================

    builder.addCase(
      registerUser.pending,
      state => {

        state.loading = true;
        state.error = null;
      }
    );

    builder.addCase(
      registerUser.fulfilled,
      (state, action) => {

        state.loading = false;

        state.token =
          action.payload.accessToken;

        state.user =
          action.payload.user;

        localStorage.setItem(
          'aviro_token',
          action.payload.accessToken
        );

        localStorage.setItem(
          'aviro_refresh',
          action.payload.refreshToken
        );

        localStorage.setItem(
          'aviro_user',
          JSON.stringify(
            action.payload.user
          )
        );

        toast.success(
          'Account created successfully! 🎉'
        );
      }
    );

    builder.addCase(
      registerUser.rejected,
      (state, action) => {

        state.loading = false;

        state.error = action.payload;

        toast.error(action.payload);
      }
    );

    // =====================================================
    // PROFILE
    // =====================================================

    builder.addCase(
      fetchProfile.fulfilled,
      (state, action) => {

        state.user = action.payload;

        localStorage.setItem(
          'aviro_user',
          JSON.stringify(action.payload)
        );
      }
    );
  }
});

export const {
  logout,
  setPendingEmail,
  clearError
} = authSlice.actions;

export default authSlice.reducer;
