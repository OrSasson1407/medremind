import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
});

// Data required to create a new patient
export interface PatientCreate {
  first_name: string;
  last_name: string;
  pin_code: string;
  language: 'he' | 'ar' | 'en';
}

// Data as it exists in the database (includes the unique ID)
export interface Patient extends PatientCreate {
  id: number;
}

/**
 * Fetches the full list of patients from the backend.
 * Returns a Promise that resolves to an array of Patients.
 */
export const getPatients = async (): Promise<Patient[]> => {
  const response = await api.get('/patients/');
  return response.data;
};

/**
 * Sends a POST request to create a new elderly patient profile.
 * Returns the newly created Patient object (including its new ID).
 */
export const createPatient = async (patient: PatientCreate): Promise<Patient> => {
  const response = await api.post('/patients/', patient);
  return response.data;
};

// --- Medication Interfaces ---
export interface MedicationCreate {
  patient_id: number;
  name: string;
  dosage: string;
  reminder_time: string; // Format: "HH:MM"
}

export interface Medication extends MedicationCreate {
  id: number;
}

// --- Medication API Calls ---
export const createMedication = async (medication: MedicationCreate): Promise<Medication> => {
  const response = await api.post('/medications/', medication);
  return response.data;
};
export default api;