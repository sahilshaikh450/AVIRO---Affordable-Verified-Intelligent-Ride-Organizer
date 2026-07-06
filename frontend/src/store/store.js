import { configureStore } from '@reduxjs/toolkit';
import authReducer    from './authSlice';
import rideReducer    from './rideSlice';
import bookingReducer from './bookingSlice';
import chatReducer    from './chatSlice';
import uiReducer      from './uiSlice';

export const store = configureStore({
  reducer: {
    auth:    authReducer,
    rides:   rideReducer,
    booking: bookingReducer,
    chat:    chatReducer,
    ui:      uiReducer,
  },
});
