import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './storage';
import { api } from '../services/api';

export interface Schedule {
  id: number;
  scheduled_time: string;
}

export interface Medication {
  id: number;
  name: string;
  dosage: string;
  instructions?: string;
  schedules: Schedule[];
}

export interface PendingLog {
  dose_log_id: number;
  pin_code: string;
  status: 'taken' | 'skipped';
  skip_reason: string | null;
  timestamp: number;
}

export interface PatientState {
  patientId: number | null;
  pinCode: string | null;
  medications: Medication[];
  pendingLogs: PendingLog[];
  
  // Actions
  setAuth: (id: number, pin: string) => void;
  syncData: () => Promise<void>;
  markDose: (logId: number, status: 'taken' | 'skipped', reason?: string) => Promise<void>;
}

export const usePatientStore = create<PatientState>()(
  persist(
    (set, get) => ({
      // Explicitly cast null to satisfy the union types in PatientState
      patientId: null as number | null,
      pinCode: null as string | null,
      medications: [],
      pendingLogs: [],

      setAuth: (id: number, pin: string) => set({ patientId: id, pinCode: pin }),

      syncData: async () => {
        const { patientId, pendingLogs } = get();
        if (!patientId) return;

        try {
          // 1. Process the offline queue
          if (pendingLogs.length > 0) {
            for (const log of pendingLogs) {
              await api.post('/dose-logs/mark-taken', {
                dose_log_id: log.dose_log_id,
                pin_code: log.pin_code,
                status: log.status,
                skip_reason: log.skip_reason
              });
            }
            set({ pendingLogs: [] });
          }

          // 2. Fetch fresh medications schedule
          const { data } = await api.get(`/patients/${patientId}`);
          if (data && data.medications) {
            set({ medications: data.medications });
          }
          
        } catch (error) {
          console.log('[SYNC] Network unavailable, maintaining offline cache.');
        }
      },

      markDose: async (logId: number, status: 'taken' | 'skipped', reason?: string) => {
        const { pinCode, pendingLogs } = get();
        if (!pinCode) return;
        
        const payload: PendingLog = {
          dose_log_id: logId,
          pin_code: pinCode,
          status,
          skip_reason: reason || null,
          timestamp: Date.now()
        };

        // Instantly save to local queue
        set({ pendingLogs: [...pendingLogs, payload] });

        // Attempt background sync
        get().syncData();
      }
    }),
    {
      name: 'medremind-patient-store',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);