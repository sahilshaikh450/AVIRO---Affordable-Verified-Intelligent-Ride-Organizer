import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from './authSlice';

export const searchRides = createAsyncThunk('rides/search', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/rides/search', data);
    return res.data.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const createRide = createAsyncThunk('rides/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/rides', data);
    return res.data.data;
  } catch (err) {
    // Shows the field message for validation errors and a clear one when the server is asleep
    const msg = getErrorMessage(err, 'Could not post the ride. Please try again.');
    toast.error(msg);
    return rejectWithValue(msg);
  }
});

export const fetchMyRides = createAsyncThunk('rides/myRides', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/rides/my');
    return res.data.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const fetchNearbyRides = createAsyncThunk('rides/nearby', async ({ lat, lng, seats }, { rejectWithValue }) => {
  try {
    const res = await api.get(`/rides/nearby?lat=${lat}&lng=${lng}&seats=${seats}`);
    return res.data.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const cancelRide = createAsyncThunk('rides/cancel', async (rideId, { rejectWithValue }) => {
  try {
    await api.delete(`/rides/${rideId}`);
    toast.success('Ride cancelled');
    return rideId;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

const rideSlice = createSlice({
  name: 'rides',
  initialState: { list: [], myRides: [], nearby: [], loading: false, error: null, selected: null },
  reducers: {
    setSelected(state, action) { state.selected = action.payload; },
  },
  extraReducers: builder => {
    builder.addCase(searchRides.pending,       s => { s.loading = true; });
    builder.addCase(searchRides.fulfilled,     (s, a) => { s.loading = false; s.list = a.payload || []; });
    builder.addCase(searchRides.rejected,      s => { s.loading = false; });
    builder.addCase(createRide.pending,        s => { s.loading = true; });
    builder.addCase(createRide.fulfilled,      (s, a) => { s.loading = false; s.myRides.unshift(a.payload); });
    builder.addCase(createRide.rejected,       s => { s.loading = false; });
    builder.addCase(fetchMyRides.fulfilled,    (s, a) => { s.myRides = a.payload || []; });
    builder.addCase(fetchNearbyRides.fulfilled,(s, a) => { s.nearby  = a.payload || []; });
    builder.addCase(cancelRide.fulfilled,      (s, a) => { s.myRides = s.myRides.filter(r => r.id !== a.payload); });
  }
});
export const { setSelected } = rideSlice.actions;
export default rideSlice.reducer;
