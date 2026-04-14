import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, PlusCircle, Bell } from 'lucide-react';
// Correct type-only import
import { createPatient, type PatientCreate } from './api';

const DashboardHome = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-gray-800 mb-4">Family Dashboard</h2>
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <p className="text-gray-500">Welcome to MedRemind. Select an option from the menu.</p>
    </div>
  </div>
);

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
              id="first_name"
              name="first_name"
              type="text" 
              required
              className="w-full p-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
            />
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input 
              id="last_name"
              name="last_name"
              type="text" 
              required
              className="w-full p-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.last_name}
              onChange={(e) => setFormData({...formData, last_name: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label htmlFor="pin_code" className="block text-sm font-medium text-gray-700 mb-1">Patient PIN (4 Digits)</label>
          <input 
            id="pin_code"
            name="pin_code"
            type="text" 
            maxLength={4} 
            required
            className="w-full p-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 1234"
            value={formData.pin_code}
            onChange={(e) => setFormData({...formData, pin_code: e.target.value})}
          />
        </div>

        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">Preferred Language</label>
          <select 
            id="language"
            name="language"
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

const Sidebar = () => {
  const location = useLocation();
  const navItems = [
    { name: 'Overview', path: '/', icon: <Activity className="w-5 h-5" /> },
    { name: 'Add Patient', path: '/add-patient', icon: <PlusCircle className="w-5 h-5" /> },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
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
              location.pathname === item.path ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {item.icon}
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/add-patient" element={<AddPatient />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}