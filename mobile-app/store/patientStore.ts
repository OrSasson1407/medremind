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
  type?: 'pill' | 'capsule' | 'liquid' | 'syringe';
  color?: string;
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
  caregiverPhone: string | null;
  medications: Medication[];
  pendingLogs: PendingLog[];
  isAccessibilityMode: boolean;
  currentStreak: number;          // ✅ Step 11: Tracking Gamification Streak
  lastActionDate: string | null;  // ✅ Step 11: Date of last action to calculate streak

  setAuth: (id: number, pin: string) => void;
  logout: () => void;
  syncData: () => Promise<void>;
  markDose: (logId: number, status: 'taken' | 'skipped', reason?: string) => void;
  undoDose: (logId: number) => void;
  toggleAccessibility: (value: boolean) => void;
}

export const usePatientStore = create<PatientState>()(
  persist(
    (set, get) => ({
      patientId: null as number | null,
      pinCode: null as string | null,
      caregiverPhone: null,
      medications: [],
      pendingLogs: [],
      isAccessibilityMode: false,
      currentStreak: 0,
      lastActionDate: null,

      setAuth: (id: number, pin: string) => set({ patientId: id, pinCode: pin }),

      logout: () => set({ 
        patientId: null, pinCode: null, caregiverPhone: null, 
        medications: [], pendingLogs: [], currentStreak: 0, lastActionDate: null 
      }),

      toggleAccessibility: (value: boolean) => set({ isAccessibilityMode: value }),

      syncData: async () => {
        const { patientId, pendingLogs } = get();
        if (!patientId) return;

        try {
          if (pendingLogs.length > 0) {
            for (const log of pendingLogs) {
              await api.post('/dose-logs/mark-taken', {
                dose_log_id: log.dose_log_id,
                pin_code: log.pin_code,
                status: log.status,
                skip_reason: log.skip_reason,
              });
            }
            set({ pendingLogs: [] });
          }

          const { data } = await api.get(`/patients/${patientId}`);
          if (data) {
            set({ 
              medications: data.medications || [],
              caregiverPhone: data.caregiver_phone || '1234567890'
            });
          }
        } catch (error) {
          console.log('[SYNC] Network unavailable, maintaining offline cache.');
        }
      },

      markDose: (logId: number, status: 'taken' | 'skipped', reason?: string) => {
        const { pinCode, pendingLogs, currentStreak, lastActionDate } = get();
        if (!pinCode) return;

        // ✅ Step 11: Calculate Streak Logic
        const today = new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        let newStreak = currentStreak;
        let newLastActionDate = lastActionDate;

        if (status === 'taken') {
          if (lastActionDate === yesterdayStr) {
            newStreak += 1; // Continued from yesterday
          } else if (lastActionDate !== today) {
            newStreak = 1;  // Started a new streak today
          }
          newLastActionDate = today;
        } else if (status === 'skipped') {
          newStreak = 0; // Broken streak
          newLastActionDate = today;
        }

        const payload: PendingLog = {
          dose_log_id: logId,
          pin_code: pinCode,
          status,
          skip_reason: reason || null,
          timestamp: Date.now(),
        };

        const updatedLogs = pendingLogs.filter(log => log.dose_log_id !== logId);
        
        set({ 
          pendingLogs: [...updatedLogs, payload],
          currentStreak: newStreak,
          lastActionDate: newLastActionDate
        });
      },

      undoDose: (logId: number) => {
        const { pendingLogs } = get();
        set({ pendingLogs: pendingLogs.filter((log) => log.dose_log_id !== logId) });
      },
    }),
    {
      name: 'medremind-patient-store',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);