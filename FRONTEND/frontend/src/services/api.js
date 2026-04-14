// src/services/api.js
import axios from 'axios';

// Hada howa Lien dyal Laravel API dyalek
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api', 
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Hada kiy-zid Token auto f kol request bach Backend y3rfek
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('user_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;