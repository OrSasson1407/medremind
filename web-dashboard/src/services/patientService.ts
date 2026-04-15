import { api } from '../api';

// ── Types ───────────────────────────────────────────────────────────────────

export interface PatientCreate {
  first_name: string;
  last_name: string;
  pin_code: string;
  language?: 'he' | 'ar' | 'en';
}

export interface MedicationCreate {
  patient_id: number;
  name: string;
  dosage: string;
  form?: string;
  pill_count?: number;
  refill_threshold?: number;
  instructions?: string;
  reminder_time?: string; // "HH:MM"
}

export interface EscalationContactCreate {
  patient_id: number;
  name: string;
  phone: string;
  priority?: number;
  notify_after_missed?: number;
}

// ── Service Methods ─────────────────────────────────────────────────────────

export const patientService = {
  // Patients
  getPatients: async () => {
    const { data } = await api.get('/patients/');
    return data;
  },

  getPatient: async (id: number) => {
    const { data } = await api.get(`/patients/${id}`);
    return data;
  },

  createPatient: async (payload: PatientCreate) => {
    const { data } = await api.post('/patients/', payload);
    return data;
  },

  deletePatient: async (id: number) => {
    await api.delete(`/patients/${id}`);
  },

  // Medications
  createMedication: async (payload: MedicationCreate) => {
    const { data } = await api.post('/medications/', payload);
    return data;
  },

  updateMedicationRefill: async (id: number, pillCount: number) => {
    const { data } = await api.put(`/medications/${id}/refill`, { pill_count: pillCount });
    return data;
  },

  deleteMedication: async (id: number) => {
    await api.delete(`/medications/${id}`);
  },

  // Dose Logs
  getDoseLogs: async (patientId: number) => {
    const { data } = await api.get(`/dose-logs/${patientId}`);
    return data;
  },

  markDoseTaken: async (doseLogId: number, pinCode: string, status: string, skipReason?: string) => {
    const { data } = await api.post('/dose-logs/mark-taken', {
      dose_log_id: doseLogId,
      pin_code: pinCode,
      status: status, // 'taken' | 'skipped'
      skip_reason: skipReason
    });
    return data;
  },

  // Escalation Contacts
  createEscalationContact: async (patientId: number, payload: EscalationContactCreate) => {
    const { data } = await api.post(`/patients/${patientId}/escalation`, payload);
    return data;
  },

  // Analytics & Reporting
  getAdherenceStats: async (patientId: number) => {
    const { data } = await api.get(`/adherence/${patientId}`);
    return data;
  },

  getAdherenceHeatmap: async (patientId: number) => {
    const { data } = await api.get(`/patients/${patientId}/adherence/heatmap`);
    return data;
  },

  downloadDoctorReport: async (patientId: number, patientName: string) => {
    const response = await api.get(`/patients/${patientId}/report/pdf`, {
      responseType: 'blob', // Necessary for downloading files
    });
    
    // Create a temporary link element to trigger the browser download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `medremind_report_${patientName}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};