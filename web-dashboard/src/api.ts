import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000', // Changed from 127.0.0.1
});

// ── Auth token injection ────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medremind_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ────────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginPayload {
  username: string; // FastAPI OAuth2 form uses "username"
  password: string;
}

export interface User {
  id: number;
  email: string;
  full_name?: string;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export const register = async (payload: RegisterPayload): Promise<User> => {
  const { data } = await api.post('/auth/register', payload);
  return data;
};

export const login = async (payload: LoginPayload): Promise<Token> => {
  const form = new URLSearchParams();
  form.append('username', payload.username);
  form.append('password', payload.password);
  const { data } = await api.post('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
};

export const getMe = async (): Promise<User> => {
  const { data } = await api.get('/auth/me');
  return data;
};


// ── Types ────────────────────────────────────────────────────────────────────

export interface DoseLog {
  id: number;
  schedule_id: number;
  scheduled_at: string;
  is_taken: boolean;
  taken_at: string | null;
  created_at: string;
}

export interface Schedule {
  id: number;
  medication_id: number;
  scheduled_time: string; // "HH:MM:SS"
  dose_logs: DoseLog[];
}

export interface Medication {
  id: number;
  patient_id: number;
  name: string;
  dosage: string;
  form?: string;
  inventory_count: number;
  instructions?: string;
  created_at: string;
  schedules: Schedule[];
}

export interface MedicationCreate {
  patient_id: number;
  name: string;
  dosage: string;
  form?: string;
  inventory_count?: number;
  instructions?: string;
  reminder_time?: string; // "HH:MM" — auto-creates a Schedule
}

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  pin_code: string;
  language: 'he' | 'ar' | 'en';
  caregiver_id?: number;
  created_at: string;
  medications: Medication[];
}

export interface PatientCreate {
  first_name: string;
  last_name: string;
  pin_code: string;
  language: 'he' | 'ar' | 'en';
}

export interface AdherenceStats {
  patient_id: number;
  patient_name: string;
  total_doses: number;
  taken_doses: number;
  missed_doses: number;
  adherence_pct: number;
}


// ── API calls ─────────────────────────────────────────────────────────────────

export const getPatients = async (): Promise<Patient[]> => {
  const { data } = await api.get('/patients/');
  return data;
};

export const getPatient = async (id: number): Promise<Patient> => {
  const { data } = await api.get(`/patients/${id}`);
  return data;
};

export const createPatient = async (payload: PatientCreate): Promise<Patient> => {
  const { data } = await api.post('/patients/', payload);
  return data;
};

export const deletePatient = async (id: number): Promise<void> => {
  await api.delete(`/patients/${id}`);
};

export const createMedication = async (payload: MedicationCreate): Promise<Medication> => {
  const { data } = await api.post('/medications/', payload);
  return data;
};

export const deleteMedication = async (id: number): Promise<void> => {
  await api.delete(`/medications/${id}`);
};

export const getDoseLogs = async (patientId: number): Promise<DoseLog[]> => {
  const { data } = await api.get(`/dose-logs/${patientId}`);
  return data;
};

export const markDoseTaken = async (doseLogId: number, pinCode: string): Promise<DoseLog> => {
  const { data } = await api.post('/dose-logs/mark-taken', { dose_log_id: doseLogId, pin_code: pinCode });
  return data;
};

export const getAdherence = async (patientId: number): Promise<AdherenceStats> => {
  const { data } = await api.get(`/adherence/${patientId}`);
  return data;
};

export default api;