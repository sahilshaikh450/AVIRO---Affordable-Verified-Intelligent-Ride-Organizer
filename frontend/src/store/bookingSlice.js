import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from './authSlice';

// ─── BOOKING SLICE ───────────────────────────────────────────────
export const createBooking = createAsyncThunk('booking/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/bookings', data);
    toast.success('Booking request sent! ✅');
    return res.data.data;
  } catch (err) {
    const msg = getErrorMessage(err, 'Booking failed');
    toast.error(msg);
    return rejectWithValue(msg);
  }
});

export const fetchMyBookings = createAsyncThunk('booking/myBookings', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/bookings/my');
    return res.data.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const updateBookingStatus = createAsyncThunk('booking/updateStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    const res = await api.patch(`/bookings/${id}/status`, { status });
    return res.data.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const cancelBooking = createAsyncThunk('booking/cancel', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/bookings/${id}`);
    toast.success('Booking cancelled');
    return id;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const bookingSlice = createSlice({
  name: 'booking',
  initialState: { list: [], loading: false, error: null },
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchMyBookings.fulfilled,   (s, a) => { s.list = a.payload || []; });
    builder.addCase(createBooking.fulfilled,     (s, a) => { s.list.unshift(a.payload); });
    builder.addCase(cancelBooking.fulfilled,     (s, a) => { s.list = s.list.filter(b => b.id !== a.payload); });
    builder.addCase(updateBookingStatus.fulfilled,(s,a) => {
      const idx = s.list.findIndex(b => b.id === a.payload.id);
      if (idx !== -1) s.list[idx] = a.payload;
    });
  }
});
export default bookingSlice.reducer;
