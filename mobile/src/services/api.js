import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = 'https://kod-backend.onrender.com/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('kod_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
