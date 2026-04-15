import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// FIX: Added 'type' keyword before PatientCreate
import { patientService, type PatientCreate } from '../services/patientService';
import { UserPlus, Loader2, ArrowLeft } from 'lucide-react';

export default function AddPatient() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<PatientCreate>({
    first_name: '',
    last_name: '',
    pin_code: '',
    language: 'he'
  });

  const mutation = useMutation({
    mutationFn: patientService.createPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      navigate('/dashboard');
    },
    onError: () => {
      alert('Error connecting to backend. Ensure the server is running.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="text-blue-600 text-sm font-medium hover:underline mb-2">
          ← Back to Overview
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Add New Patient</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input 
              id="first_name" type="text" required
              className="w-full p-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
            />
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input 
              id="last_name" type="text" required
              className="w-full p-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.last_name}
              onChange={(e) => setFormData({...formData, last_name: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label htmlFor="pin_code" className="block text-sm font-medium text-gray-700 mb-1">Patient PIN (4 Digits)</label>
          <input 
            id="pin_code" type="text" maxLength={4} required
            className="w-full p-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 1234"
            value={formData.pin_code}
            onChange={(e) => setFormData({...formData, pin_code: e.target.value})}
          />
        </div>

        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">Preferred Voice Language</label>
          <select 
            id="language"
            className="w-full p-2 border border-gray-300 rounded-md bg-white outline-none focus:ring-2 focus:ring-blue-500"
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
          className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300"
        >
          {mutation.isPending ? 'Saving...' : 'Create Patient Profile'}
        </button>
      </form>
    </div>
  );
}