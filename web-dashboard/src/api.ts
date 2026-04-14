import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
});

// --- Medication Interfaces ---
// These must be defined before Patient so Patient can reference Medication
export interface MedicationCreate {
  patient_id: number;
  name: string;
  dosage: string;
  reminder_time: string; // Format: "HH:MM"
}

export interface Medication extends MedicationCreate {
  id: number;
}

// --- Patient Interfaces ---
export interface PatientCreate {
  first_name: string;
  last_name: string;
  pin_code: string;
  language: 'he' | 'ar' | 'en';
}

/**
 * Data as it exists in the database.
 * Includes the unique ID and the list of medications linked to this patient.
 */
export interface Patient extends PatientCreate {
  id: number;
  medications: Medication[]; // Fixes the property error
}

// --- API Calls ---

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
 * Returns the newly created Patient object.
 */
export const createPatient = async (patient: PatientCreate): Promise<Patient> => {
  const response = await api.post('/patients/', patient);
  return response.data;
};

/**
 * Sends a POST request to schedule a new medication for a patient.
 */
export const createMedication = async (medication: MedicationCreate): Promise<Medication> => {
  const response = await api.post('/medications/', medication);
  return response.data;
};

export default api;