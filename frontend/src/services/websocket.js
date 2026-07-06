import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8080/api/ws';

let stompClient = null;
let subscribers = {};

export const connectWS = (userId, onMessage, onLocation, onSos) => {
  stompClient = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    reconnectDelay: 5000,
    onConnect: () => {
      console.log('✅ WebSocket connected');

      // Subscribe to personal message queue
      stompClient.subscribe(`/user/${userId}/queue/messages`, (msg) => {
        const data = JSON.parse(msg.body);
        onMessage && onMessage(data);
      });
    },
    onDisconnect: () => console.log('❌ WebSocket disconnected'),
    onStompError:  frame => console.error('STOMP error:', frame),
  });

  stompClient.activate();
};

export const subscribeToRideTracking = (rideId, onLocation) => {
  if (!stompClient?.connected) return;
  const sub = stompClient.subscribe(`/topic/track/${rideId}`, msg => {
    onLocation && onLocation(JSON.parse(msg.body));
  });
  subscribers[`track_${rideId}`] = sub;
  return sub;
};

export const subscribeToSos = (rideId, onSos) => {
  if (!stompClient?.connected) return;
  const sub = stompClient.subscribe(`/topic/sos/${rideId}`, msg => {
    onSos && onSos(JSON.parse(msg.body));
  });
  subscribers[`sos_${rideId}`] = sub;
};

export const sendChatMessage = (senderId, receiverId, rideId, content, type = 'TEXT') => {
  if (!stompClient?.connected) return;
  stompClient.publish({
    destination: '/app/chat.send',
    body: JSON.stringify({ senderId, receiverId, rideId, content, type }),
  });
};

export const sendLocationUpdate = (rideId, driverId, lat, lng, speed = 0) => {
  if (!stompClient?.connected) return;
  stompClient.publish({
    destination: '/app/track.update',
    body: JSON.stringify({ rideId, driverId, lat, lng, speed, timestamp: Date.now() }),
  });
};

export const sendSosAlert = (rideId, userId, lat, lng, message = 'SOS! Need help!') => {
  if (!stompClient?.connected) return;
  stompClient.publish({
    destination: '/app/sos.alert',
    body: JSON.stringify({ rideId, userId, lat, lng, message }),
  });
};

export const disconnectWS = () => {
  Object.values(subscribers).forEach(sub => sub?.unsubscribe?.());
  subscribers = {};
  stompClient?.deactivate();
};

export const isConnected = () => stompClient?.connected || false;
