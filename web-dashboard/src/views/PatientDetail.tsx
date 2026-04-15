import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// FIX: Added PlusCircle to the import list below
import { Pill, Clock, Save, Trash2, Activity, FileText, Calendar as CalendarIcon, Loader2, PlusCircle } from 'lucide-react'; 
// FIX: Added 'type' keyword before MedicationCreate
import { patientService, type MedicationCreate } from '../services/patientService';

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const patientId = Number(id);

  // --- Data Fetching ---
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientService.getPatient(patientId),
  });

  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryKey: ['heatmap', patientId],
    queryFn: () => patientService.getAdherenceHeatmap(patientId),
  });

  // --- Mutations ---
  const [formData, setFormData] = useState<Omit<MedicationCreate, 'patient_id'>>({
    name: '',
    dosage: '',
    reminder_time: '08:00'
  });

  const addMedMutation = useMutation({
    mutationFn: (newMed: MedicationCreate) => patientService.createMedication(newMed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      setFormData({ name: '', dosage: '', reminder_time: '08:00' });
    },
  });

  const deleteMedMutation = useMutation({
    mutationFn: patientService.deleteMedication,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient', patientId] }),
  });

  // --- Handlers ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMedMutation.mutate({ ...formData, patient_id: patientId });
  };

  const handleDownloadPDF = async () => {
    if (patient) await patientService.downloadDoctorReport(patientId, patient.first_name);
  };

  if (patientLoading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;
  if (!patient) return <div className="p-10 text-red-500">Patient not found.</div>;

  const heatmapDays = heatmapData?.heatmap ? Object.entries(heatmapData.heatmap).map(([date, stats]: any) => ({
    date, ...stats
  })) : [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <button onClick={() => navigate(-1)} className="text-blue-600 text-sm font-medium mb-2 hover:underline flex items-center gap-1">
            ← Back to Overview
          </button>
          <h2 className="text-2xl font-bold text-gray-800">
            {patient.first_name} {patient.last_name}
          </h2>
          <p className="text-gray-500">Mobile PIN: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{patient.pin_code}</span></p>
        </div>
        <button 
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-shadow shadow-sm active:scale-95"
        >
          <FileText className="w-4 h-4 text-blue-600" /> Download PDF Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Scheduling & Current Meds */}
        <div className="space-y-8">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><PlusCircle className="w-5 h-5 text-blue-600"/> Add Medication</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Pill className="w-4 h-4" /> Name</label>
              <input 
                type="text" required placeholder="e.g. Aspirin"
                className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
              <input 
                type="text" required placeholder="e.g. 1 Tablet"
                className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.dosage} onChange={(e) => setFormData({...formData, dosage: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Clock className="w-4 h-4" /> Time</label>
              <input 
                type="time" required
                className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.reminder_time} onChange={(e) => setFormData({...formData, reminder_time: e.target.value})}
              />
            </div>
            <button 
              type="submit" disabled={addMedMutation.isPending}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" /> {addMedMutation.isPending ? 'Saving...' : 'Set Reminder'}
            </button>
          </form>

          {/* Current Schedule */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-blue-600" /> Current Schedule</h3>
            <div className="space-y-3">
              {patient.medications?.length === 0 ? (
                <p className="text-gray-400 italic text-center py-4">No medications scheduled.</p>
              ) : (
                patient.medications.map((med: any) => (
                  <div key={med.id} className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg text-blue-600 shadow-sm"><Pill className="w-5 h-5" /></div>
                      <div>
                        <p className="font-bold text-gray-900">{med.name}</p>
                        <p className="text-sm text-gray-500">{med.dosage}</p>
                        {med.schedules.map((s: any) => (
                          <p key={s.id} className="text-xs text-blue-600 font-mono mt-0.5">🔔 {s.scheduled_time.slice(0, 5)} daily</p>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => { if (confirm(`Remove ${med.name}?`)) deleteMedMutation.mutate(med.id); }}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: 30-Day Heatmap */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" /> 30-Day Adherence Trend
          </h3>
          
          {heatmapLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin h-6 w-6 text-blue-600" /></div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {heatmapDays.map((day: any) => {
                  let blockColor = 'bg-gray-100'; // No data
                  if (day.total > 0) {
                    const ratio = day.taken / day.total;
                    if (ratio === 1) blockColor = 'bg-green-500';
                    else if (ratio >= 0.5) blockColor = 'bg-amber-400';
                    else blockColor = 'bg-red-500';
                  }
                  return (
                    <div 
                      key={day.date} title={`${day.date}: ${day.taken} taken, ${day.missed} missed`}
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-md ${blockColor} transition-transform hover:scale-105 cursor-help border border-black/5`}
                    />
                  );
                })}
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200" /> No Alarms</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-red-500" /> Missed</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-amber-400" /> Partial</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-500" /> Perfect</span>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}