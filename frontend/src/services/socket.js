import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

let socket = null;

export const connectSocket = (token) => {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export const joinOrderRoom = (orderId) => {
  if (socket) socket.emit('joinOrderRoom', orderId);
};

export const leaveOrderRoom = (orderId) => {
  if (socket) socket.emit('leaveOrderRoom', orderId);
};

export const emitLocationUpdate = (data) => {
  if (socket) socket.emit('agent:locationUpdate', data);
};

export const emitAgentStatus = (status) => {
  if (socket) socket.emit('agent:statusUpdate', { status });
};
