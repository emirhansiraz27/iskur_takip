import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (window.location.origin + '/api')
});

// Request interceptor: Her isteğe Token ekle
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor: Standart formatı (success, data, error) işle
api.interceptors.response.use((response) => {
  // Sunucudan gelen standart format: { success, data, error }
  const { success, data, error } = response.data;
  
  if (success) {
    return data; // Doğrudan veriyi dön
  } else {
    return Promise.reject(error || 'Bilinmeyen bir hata oluştu.');
  }
}, (error) => {
  // HTTP hata kodlarını (401, 403 vb.) işle
  if (error.response && (error.response.status === 401 || error.response.status === 403)) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload(); // Oturumu sonlandır
  }
  
  const errorMessage = error.response?.data?.error || error.message || 'Sunucu hatası.';
  return Promise.reject(errorMessage);
});

export default api;
