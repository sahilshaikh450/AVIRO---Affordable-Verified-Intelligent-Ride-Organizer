import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createBooking } from '../store/bookingSlice';

const currentPosition = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });

export default function useBookRide() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [bookingRideId, setBookingRideId] = useState(null);

  const bookRide = async (ride) => {
    if (bookingRideId) return;
    setBookingRideId(ride.id);
    const pos = await currentPosition();
    const res = await dispatch(
      createBooking({
        rideId: ride.id,
        seatsBooked: 1,
        ...(pos && {
          pickupLat: pos.lat,
          pickupLng: pos.lng,
          pickupPoint: 'Rider location when booking',
        }),
      })
    );
    setBookingRideId(null);
    if (!res.error) navigate(`/tracking/${res.payload.id}`);
  };

  return { bookRide, bookingRideId };
}
