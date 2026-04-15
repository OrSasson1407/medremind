import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Activity, 
  PlusCircle, 
  Bell, 
  User as UserIcon, 
  ChevronRight, 
  Languages, 
  Pill, 
  Clock, 
  Save,
  LogOut,
  Trash2,
  TrendingUp,
} from 'lucide-react';

import { 
  createPatient, 
  getPatients, 
  createMedication, 
  deletePatient,
  deleteMedication,
  getAdherence,
  type Patient, 
  type PatientCreate, 
  type MedicationCreate,
  type Medication,
} from './api';

import AuthPage from './AuthPage';

// --- Adherence Badge ---
const AdherenceBadge = ({ patientId }: { patientId: number }) => {
  const { data } = useQuery({
    queryKey: ['adherence', patientId],
    queryFn: () => getAdherence(patientId),
    staleTime: 60_000,
  });
  if (!data) return null;
  const color = data.adherence_pct >= 80 ? 'text-green-600 bg-green-50' : data.adherence_pct >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {data.adherence_pct}% adherence
    </span>
  );
};

// --- Dashboard Home (Patient List) ---
const DashboardHome = () => {
  const queryClient = useQueryClient();
  const { data: patients, isLoading, error } = useQuery({
    queryKey: ['patients'],
    queryFn: getPatients,
  });

  const deleteMutation = useMutation({
    mutationFn: deletePatient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patients'] }),
  });

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p>Loading your family members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-500 bg-red-50 rounded-lg m-6 border border-red-100">
        <h3 className="font-bold">Connection Error</h3>
        <p>Could not reach the backend. Please ensure Docker and FastAPI are running.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Family Overview</h2>
          <p className="text-gray-500">
            {patients?.length === 0 
              ? "No patients registered yet" 
              : `Monitoring ${patients?.length} family members`}
          </p>
        </div>
        <Link 
          to="/add-patient" 
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-shadow shadow-sm active:scale-95"
        >
          <PlusCircle className="w-4 h-4" /> Add Patient
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {patients?.map((patient: Patient) => (
          <div 
            key={patient.id} 
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
                <UserIcon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">
                  {patient.first_name} {patient.last_name}
                </h3>
                <div className="flex items-center gap-1 text-gray-400 mt-1">
                  <Languages className="w-3 h-3" />
                  <span className="text-xs uppercase font-semibold tracking-wider">
                    {patient.language === 'he' ? 'Hebrew' : patient.language === 'ar' ? 'Arabic' : 'English'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm(`Remove ${patient.first_name}?`)) deleteMutation.mutate(patient.id);
                }}
                className="text-gray-300 hover:text-red-500 transition-colors p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4">
              <AdherenceBadge patientId={patient.id} />
            </div>
            
            <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-1 text-gray-400 text-xs">
                <Pill className="w-3 h-3" />
                <span>{patient.medications.length} medication{patient.medications.length !== 1 ? 's' : ''}</span>
              </div>
              <Link 
                to={`/manage-meds/${patient.id}`}
                className="text-blue-600 font-semibold text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform"
              >
                Manage <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}

        {patients?.length === 0 && (
          <div className="col-span-full py-20 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
            <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-gray-900 font-medium">No one here yet</h3>
            <p className="text-gray-500 mb-6">Start by creating a profile for a family member.</p>
            <Link to="/add-patient" className="text-blue-600 font-bold hover:underline">
              Add your first patient →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Add Patient Component ---
const AddPatient = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<PatientCreate>({
    first_name: '',
    last_name: '',
    pin_code: '',
    language: 'he'
  });

  const mutation = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      alert('Patient added successfully!');
      setFormData({ first_name: '', last_name: '', pin_code: '', language: 'he' });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: () => {
      alert('Error connecting to backend. Ensure the server is running and CORS is configured.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Patient</h2>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input 
              id="first_name" name="first_name" type="text" required
              className="w-full p-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
            />
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input 
              id="last_name" name="last_name" type="text" required
              className="w-full p-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.last_name}
              onChange={(e) => setFormData({...formData, last_name: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label htmlFor="pin_code" className="block text-sm font-medium text-gray-700 mb-1">Patient PIN (4 Digits)</label>
          <input 
            id="pin_code" name="pin_code" type="text" maxLength={4} required
            className="w-full p-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 1234"
            value={formData.pin_code}
            onChange={(e) => setFormData({...formData, pin_code: e.target.value})}
          />
        </div>

        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">Preferred Language</label>
          <select 
            id="language" name="language"
            className="w-full p-2 border border-gray-300 rounded-md bg-white outline-none"
            value={formData.language}
            onChange={(e) => setFormData({...formData, language: e.target.value as 'he' | 'ar' | 'en'})}
          >
            <option value="he">Hebrew (עברית)</option>
            <option value="ar">Arabic (العربية)</option>
            <option value="en">English</option>
          </select>
        </div>

        <button 
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300"
        >
          {mutation.isPending ? 'Saving...' : 'Create Patient Profile'}
        </button>
      </form>
    </div>
  );
};

// --- Manage Medications Component ---
const ManageMeds = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: getPatients,
  });

  const currentPatient = patients?.find(p => p.id === parseInt(patientId || '0'));
  
  const [formData, setFormData] = useState<Omit<MedicationCreate, 'patient_id'>>({
    name: '',
    dosage: '',
    reminder_time: '08:00'
  });

  const mutation = useMutation({
    mutationFn: (newMed: MedicationCreate) => createMedication(newMed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setFormData({ name: '', dosage: '', reminder_time: '08:00' });
    },
    onError: () => {
      alert('Error scheduling medication. Ensure backend is active.');
    }
  });

  const deleteMedMutation = useMutation({
    mutationFn: deleteMedication,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patients'] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    mutation.mutate({ 
      ...formData, 
      patient_id: parseInt(patientId) 
    });
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-8 text-left">
        <button 
          onClick={() => navigate('/')} 
          className="text-blue-600 text-sm font-medium mb-2 hover:underline flex items-center gap-1"
        >
          ← Back to Overview
        </button>
        <h2 className="text-2xl font-bold text-gray-800">
          Schedule for {currentPatient ? `${currentPatient.first_name} ${currentPatient.last_name}` : 'Patient'}
        </h2>
        <p className="text-gray-500">Assign a new daily voice reminder.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="med_name" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Pill className="w-4 h-4" /> Medication Name
            </label>
            <input 
              id="med_name" name="name" type="text" required placeholder="e.g. Aspirin"
              className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label htmlFor="dosage" className="block text-sm font-medium text-gray-700 mb-1">Dosage Instruction</label>
            <input 
              id="dosage" name="dosage" type="text" required placeholder="e.g. 1 Tablet"
              className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.dosage}
              onChange={(e) => setFormData({...formData, dosage: e.target.value})}
            />
          </div>

          <div>
            <label htmlFor="reminder_time" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Reminder Time
            </label>
            <input 
              id="reminder_time" name="reminder_time" type="time" required
              className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.reminder_time}
              onChange={(e) => setFormData({...formData, reminder_time: e.target.value})}
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Save className="w-5 h-5" />
          {mutation.isPending ? 'Saving...' : 'Set Voice Reminder'}
        </button>
      </form>

      {/* --- Current Schedule Section --- */}
      <div className="mt-12">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" /> Current Schedule
        </h3>
        <div className="space-y-3">
          {(!currentPatient?.medications || currentPatient.medications.length === 0) ? (
            <div className="bg-gray-50 border border-dashed border-gray-200 p-8 rounded-xl text-center">
              <p className="text-gray-400 italic">No medications scheduled yet.</p>
            </div>
          ) : (
            currentPatient.medications.map((med: Medication) => (
              <div key={med.id} className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-blue-600 shadow-sm">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{med.name}</p>
                    <p className="text-sm text-gray-500">{med.dosage}</p>
                    {med.schedules.map(s => (
                      <p key={s.id} className="text-xs text-blue-600 font-mono mt-0.5">
                        🔔 {s.scheduled_time.slice(0, 5)} daily
                      </p>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Remove ${med.name}?`)) deleteMedMutation.mutate(med.id);
                  }}
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
  );
};

// --- Navigation Sidebar ---
const Sidebar = ({ onLogout }: { onLogout: () => void }) => {
  const location = useLocation();
  const navItems = [
    { name: 'Overview', path: '/', icon: <Activity className="w-5 h-5" /> },
    { name: 'Add Patient', path: '/add-patient', icon: <PlusCircle className="w-5 h-5" /> },
    { name: 'Adherence', path: '/adherence', icon: <TrendingUp className="w-5 h-5" /> },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col sticky top-0">
      <div className="p-6 flex items-center gap-3 border-b border-gray-100">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Bell className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">MedRemind</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              location.pathname === item.path ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {item.icon}
            {item.name}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={onLogout}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
};

// --- Adherence Overview Page ---
const AdherencePage = () => {
  const { data: patients } = useQuery({ queryKey: ['patients'], queryFn: getPatients });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Adherence Overview</h2>
      <p className="text-gray-500 mb-8">Track how consistently each patient takes their medications.</p>
      <div className="space-y-4">
        {patients?.map((p) => <AdherenceCard key={p.id} patient={p} />)}
        {patients?.length === 0 && (
          <p className="text-gray-400 text-center py-12">No patients yet.</p>
        )}
      </div>
    </div>
  );
};

const AdherenceCard = ({ patient }: { patient: Patient }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['adherence', patient.id],
    queryFn: () => getAdherence(patient.id),
  });

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">{patient.first_name} {patient.last_name}</h3>
        {data && (
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${
            data.adherence_pct >= 80 ? 'bg-green-100 text-green-700' :
            data.adherence_pct >= 50 ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {data.adherence_pct}%
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="h-2 bg-gray-100 rounded-full animate-pulse" />
      ) : data ? (
        <>
          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-3">
            <div
              className={`h-2.5 rounded-full transition-all ${
                data.adherence_pct >= 80 ? 'bg-green-500' :
                data.adherence_pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${data.adherence_pct}%` }}
            />
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <span>✅ {data.taken_doses} taken</span>
            <span>❌ {data.missed_doses} missed</span>
            <span>📋 {data.total_doses} total</span>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400">No dose history yet.</p>
      )}
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('medremind_token'));

  const handleLogout = () => {
    localStorage.removeItem('medremind_token');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <AuthPage onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-50 font-sans">
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/add-patient" element={<AddPatient />} />
            <Route path="/manage-meds/:patientId" element={<ManageMeds />} />
            <Route path="/adherence" element={<AdherencePage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}