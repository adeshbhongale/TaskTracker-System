import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { addNotification } from '../redux/slices/authSlice';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user) {
      const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
      
      // Establish connection
      const socket = io(SOCKET_URL);
      socketRef.current = socket;

      // Register current user on the backend mapping
      socket.emit('register', user.id);

      // Listen for incoming notifications
      socket.on('notification', (notif) => {
        dispatch(addNotification(notif));
      });

      return () => {
        if (socket) {
          socket.disconnect();
        }
      };
    }
  }, [isAuthenticated, user, dispatch]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};
