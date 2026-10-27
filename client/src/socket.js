import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  autoConnect: false,
});

export const prepareSocketAuth = () => {
  const token = localStorage.getItem('token');

  let user = null;

  try {
    user = JSON.parse(
      localStorage.getItem('user') || 'null'
    );
  } catch (error) {
    console.error(
      '❌ Failed to read user from localStorage'
    );
  }

  const userId =
    user?._id ||
    user?.id ||
    user?.userId ||
    socket.auth?.userId ||
    null;

  const fullName =
    user?.fullName ||
    socket.auth?.fullName ||
    'Player';

  console.log('👤 Preparing socket user:', {
    userId,
    fullName,
    email: user?.email,
  });

  socket.auth = {
    token,
    userId,
    fullName,
  };

  console.log('🔐 Final socket auth:', socket.auth);
};

export default socket;