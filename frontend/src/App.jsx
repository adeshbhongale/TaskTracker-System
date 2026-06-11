import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';

import store from './redux/store';
import { SocketProvider } from './contexts/SocketContext';
import AppRoutes from './routes/AppRoutes';
// index.css is now imported in main.jsx

function App() {
  return (
    <Provider store={store}>
      <SocketProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </SocketProvider>
    </Provider>
  );
}

export default App;
