import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';
import { disablePush } from '../services/push';
import toast from 'react-hot-toast';

const getStoredUser = () => {
  try {
    const savedUser = localStorage.getItem('aviro_user');
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    localStorage.removeItem('aviro_user');
    return null;
  }
};

const saveAuthData = (data) => {
  if (!data) {
    throw new Error('Invalid authentication response');
  }

  const { accessToken, refreshToken, user } = data;

  if (!accessToken || !user) {
    throw new Error('Access token or user missing from response');
  }

  localStorage.setItem('aviro_token', accessToken);

  if (refreshToken) {
    localStorage.setItem('aviro_refresh', refreshToken);
  } else {
    localStorage.removeItem('aviro_refresh');
  }

  localStorage.setItem('aviro_user', JSON.stringify(user));
};

const PENDING_KEY = 'aviro_pending_email';
const needsCode = (payload) => payload && !payload.accessToken;
const rememberPending = (email) => {
  try {
    email ? sessionStorage.setItem(PENDING_KEY, email) : sessionStorage.removeItem(PENDING_KEY);
  } catch {}
};
const storedPending = () => {
  try {
    return sessionStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
};

export const getErrorMessage = (err, fallback) => {
  if (err.code === 'ECONNABORTED') {
    return 'Server is waking up. Please wait a few seconds and try again.';
  }
  if (!err.response) {
    return 'Cannot reach the server. Check your internet and try again.';
  }
  const { message, data } = err.response.data || {};
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const firstFieldError = Object.values(data)[0];
    if (typeof firstFieldError === 'string') return firstFieldError;
  }
  return message || fallback;
};

export const loginUser = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/login', data);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(getErrorMessage(err, 'Login failed'));
  }
});

export const registerUser = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/register', data);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(getErrorMessage(err, 'Registration failed'));
  }
});

export const verifyOtp = createAsyncThunk('auth/verifyOtp', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/verify-otp', data);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(getErrorMessage(err, 'OTP verification failed'));
  }
});

export const fetchProfile = createAsyncThunk('auth/profile', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/users/profile');
    return res.data.data;
  } catch (err) {
    return rejectWithValue(getErrorMessage(err, 'Failed to fetch profile'));
  }
});

export const logoutUser = createAsyncThunk('auth/logoutUser', async (_, { dispatch }) => {
  const token = localStorage.getItem('aviro_token');
  const refreshToken = localStorage.getItem('aviro_refresh');
  dispatch(authSlice.actions.logout());

  const auth = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  await disablePush(auth);
  try {
    await api.post('/auth/logout', { refreshToken }, auth);
  } catch {}
});

const savedToken = localStorage.getItem('aviro_token');
const savedUser = getStoredUser();

const authSlice = createSlice({
  name: 'auth',

  initialState: {
    token: savedToken || null,
    user: savedUser,
    loading: false,
    error: null,
    pendingEmail: storedPending(),
  },

  reducers: {
    logout(state) {
      state.token = null;
      state.user = null;
      state.pendingEmail = null;
      state.error = null;

      localStorage.removeItem('aviro_token');
      localStorage.removeItem('aviro_refresh');
      localStorage.removeItem('aviro_refresh_token');
      localStorage.removeItem('aviro_user');

      toast.success('Logged out successfully');
    },

    setPendingEmail(state, action) {
      state.pendingEmail = action.payload;
      rememberPending(action.payload);
    },

    clearError(state) {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;

        if (needsCode(action.payload)) {
          state.pendingEmail = action.payload?.user?.email || null;
          rememberPending(state.pendingEmail);
          toast('Verify your email first. We sent you a new code.', { icon: '✉️' });
          return;
        }

        try {
          saveAuthData(action.payload);

          state.token = action.payload.accessToken;
          state.user = action.payload.user;

          toast.success(`Welcome back, ${action.payload.user.fullName || 'User'}! 🚀`);
        } catch (err) {
          state.error = err.message;
          toast.error('Login response is missing authentication data');
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login failed';
        toast.error(state.error);
      });

    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;

        if (needsCode(action.payload)) {
          state.pendingEmail = action.payload?.user?.email || null;
          rememberPending(state.pendingEmail);
          toast.success('Account created. Check your email for the 6-digit code.');
          return;
        }

        try {
          saveAuthData(action.payload);

          state.token = action.payload.accessToken;
          state.user = action.payload.user;

          toast.success('Account created successfully! 🎉');
        } catch (err) {
          state.error = err.message;
          toast.error('Registration response is missing authentication data');
        }
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Registration failed';
        toast.error(state.error);
      });

    builder
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false;
        try {
          saveAuthData(action.payload);
          state.token = action.payload.accessToken;
          state.user = action.payload.user;
          state.pendingEmail = null;
          rememberPending(null);
          toast.success('Email verified. Welcome to AVIRO!');
        } catch (err) {
          state.error = err.message;
          toast.error('Verification response is missing sign-in data');
        }
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Verification failed';
        toast.error(state.error);
      });

    builder.addCase(fetchProfile.fulfilled, (state, action) => {
      state.user = action.payload;
      localStorage.setItem('aviro_user', JSON.stringify(action.payload));
    });

    builder.addCase(fetchProfile.rejected, (state, action) => {
      state.error = action.payload || null;
    });
  },
});

export const { logout, setPendingEmail, clearError } = authSlice.actions;

export default authSlice.reducer;
