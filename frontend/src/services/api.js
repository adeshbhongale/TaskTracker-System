const apiService = async (url, options = {}) => {
  const headers = new Headers(options.headers || {});
  const token = localStorage.getItem('accessToken');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const config = {
    ...options,
    headers
  };

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const fullUrl = `${API_URL}${url}`;

  try {
    let response = await fetch(fullUrl, config);
    
    // Handle Token Expiry
    if (response.status === 401 && !options._retry) {
      options._retry = true;
      const rfToken = localStorage.getItem('refreshToken');
      if (rfToken) {
        // Attempt to Refresh Token
        const refreshResponse = await fetch(`${API_URL}/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: rfToken })
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          
          // Retry the original request
          headers.set('Authorization', `Bearer ${data.accessToken}`);
          const retryConfig = { ...options, headers };
          response = await fetch(fullUrl, retryConfig);
        } else {
          // Refresh failed - clean up and redirect to login
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }

    // Parse Response
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    return data;
  } catch (err) {
    console.error('API Request Error:', err);
    throw err;
  }
};

export default apiService;
