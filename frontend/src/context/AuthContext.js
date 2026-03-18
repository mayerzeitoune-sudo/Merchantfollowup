import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  
  // Impersonation state
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalToken, setOriginalToken] = useState(localStorage.getItem('original_token'));
  const [impersonator, setImpersonator] = useState(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Check for impersonation on load
  useEffect(() => {
    const storedOriginalToken = localStorage.getItem('original_token');
    const storedImpersonator = localStorage.getItem('impersonator');
    if (storedOriginalToken && storedImpersonator) {
      setOriginalToken(storedOriginalToken);
      setImpersonator(JSON.parse(storedImpersonator));
      setIsImpersonating(true);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
    return response.data;
  };

  const register = async (name, email, password, phone, business, smsOptIn) => {
    const response = await axios.post(`${API}/auth/register`, { 
      name, 
      email, 
      password, 
      phone,
      business,
      sms_opt_in: smsOptIn
    });
    // If registration returns a token, auto-login
    if (response.data.token) {
      const { token: newToken, user: userData } = response.data;
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(userData);
    }
    return response.data;
  };

  const verifyOTP = async (email, otp) => {
    const response = await axios.post(`${API}/auth/verify`, { email, otp });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
    return response.data;
  };

  const forgotPassword = async (email) => {
    const response = await axios.post(`${API}/auth/forgot-password`, { email });
    return response.data;
  };

  const resetPassword = async (email, otp, newPassword) => {
    const response = await axios.post(`${API}/auth/reset-password`, { 
      email, 
      otp, 
      new_password: newPassword 
    });
    return response.data;
  };

  const logout = () => {
    // Clear impersonation data too
    localStorage.removeItem('token');
    localStorage.removeItem('original_token');
    localStorage.removeItem('impersonator');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setIsImpersonating(false);
    setOriginalToken(null);
    setImpersonator(null);
  };

  // Impersonation: Start viewing as another user
  const startImpersonation = (impersonationData) => {
    // Save current token as original
    const currentToken = localStorage.getItem('token');
    localStorage.setItem('original_token', currentToken);
    localStorage.setItem('impersonator', JSON.stringify(impersonationData.impersonator));
    
    // Set new impersonation token
    const newToken = impersonationData.token;
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    
    setOriginalToken(currentToken);
    setImpersonator(impersonationData.impersonator);
    setToken(newToken);
    setUser({
      ...impersonationData.user,
      is_impersonation: true
    });
    setIsImpersonating(true);
  };

  // Impersonation: Stop and return to org_admin
  const stopImpersonation = async () => {
    const storedOriginalToken = localStorage.getItem('original_token');
    if (storedOriginalToken) {
      // Restore original token
      localStorage.setItem('token', storedOriginalToken);
      localStorage.removeItem('original_token');
      localStorage.removeItem('impersonator');
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedOriginalToken}`;
      
      setToken(storedOriginalToken);
      setIsImpersonating(false);
      setOriginalToken(null);
      setImpersonator(null);
      
      // Fetch original user data
      try {
        const response = await axios.get(`${API}/auth/me`);
        setUser(response.data);
      } catch (error) {
        console.error('Error fetching user after stopping impersonation:', error);
        logout();
      }
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    verifyOTP,
    forgotPassword,
    resetPassword,
    logout,
    isAuthenticated: !!token && !!user,
    // Impersonation
    isImpersonating,
    impersonator,
    startImpersonation,
    stopImpersonation
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
