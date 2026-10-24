
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';
import { disablePush } from '../services/push';
import toast from 'react-hot-toast';

// =========================================================
// STORAGE HELPERS
// =========================================================

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

// Turn an axios error into a message the user can act on
export const getErrorMessage = (err, fallback) => {
  if (err.code === 'ECONNABORTED') {
    return 'Server is waking up. Please wait a few seconds and try again.';
  }
  if (!err.response) {
    return 'Cannot reach the server. Check your internet and try again.';
  }
  const { message, data } = err.response.data || {};
  // Validation errors come back as { field: message }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const firstFieldError = Object.values(data)[0];
    if (typeof firstFieldError === 'string') return firstFieldError;
  }
  return message || fallback;
};

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
        getErrorMessage(err, 'Login failed')
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
        getErrorMessage(err, 'Registration failed')
      );
    }
  }
);

// =========================================================
// REGISTRATION OTP
// =========================================================

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/verify-otp', data);
      return res.data;
    } catch (err) {
      return rejectWithValue(
        getErrorMessage(err, 'OTP verification failed')
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
        getErrorMessage(err, 'Failed to fetch profile')
      );
    }
  }
);

// =========================================================
// LOGOUT — revoke tokens on the server, then clear locally
// =========================================================

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { dispatch }) => {
    const token = localStorage.getItem('aviro_token');
    const refreshToken = localStorage.getItem('aviro_refresh');
    // Log out on screen at once, so nothing (like the push prompt) runs as this user meanwhile
    dispatch(authSlice.actions.logout());

    const auth = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    // Stop phone notifications for this account on this device
    await disablePush(auth);
    try {
      await api.post('/auth/logout', { refreshToken }, auth);
    } catch {
      // Already logged out locally even if the server call fails
    }
  }
);

// =========================================================
// INITIAL STATE
// =========================================================

const savedToken = localStorage.getItem('aviro_token');
const savedUser = getStoredUser();

const authSlice = createSlice({
  name: 'auth',

  initialState: {
    token: savedToken || null,
    user: savedUser,
    loading: false,
    error: null,
    pendingEmail: null,
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
    },

    clearError(state) {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    // LOGIN
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;

        try {
          saveAuthData(action.payload);

          state.token = action.payload.accessToken;
          state.user = action.payload.user;

          toast.success(
            `Welcome back, ${action.payload.user.fullName || 'User'}! 🚀`
          );
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

    // REGISTER
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;

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

    // PROFILE
    builder.addCase(fetchProfile.fulfilled, (state, action) => {
      state.user = action.payload;
      localStorage.setItem(
        'aviro_user',
        JSON.stringify(action.payload)
      );
    });

    builder.addCase(fetchProfile.rejected, (state, action) => {
      state.error = action.payload || null;
    });
  },
});

export const {
  logout,
  setPendingEmail,
  clearError,
} = authSlice.actions;

export default authSlice.reducer;
