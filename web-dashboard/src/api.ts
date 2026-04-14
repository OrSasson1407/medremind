import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
});

// Using 'string' instead of 'str'
export interface PatientCreate {
  first_name: string;
  last_name: string;
  pin_code: string;
  language: 'he' | 'ar' | 'en';
}

export const getPatients = async () => {
  const response = await api.get('/patients/');
  return response.data;
};

export const createPatient = async (patient: PatientCreate) => {
  const response = await api.post('/patients/', patient);
  return response.data;
};

export default api;