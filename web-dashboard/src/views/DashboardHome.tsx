import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, User as UserIcon, Languages, Trash2, Pill, ChevronRight } from 'lucide-react';
import { patientService } from '../services/patientService';

// --- Adherence Badge Component ---
const AdherenceBadge = ({ patientId }: { patientId: number }) => {
  const { data } = useQuery({
    queryKey: ['adherence', patientId],
    queryFn: () => patientService.getAdherenceStats(patientId),
    staleTime: 60_000,
  });

  if (!data) return null;
  const color = data.adherence_pct >= 80 ? 'text-green-600 bg-green-50' : data.adherence_pct >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
  
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
        {data.adherence_pct}% adherence
      </span>
      <span className="text-xs text-gray-500">
        ({data.taken_doses}/{data.total_doses} taken)
      </span>
    </div>
  );
};

// --- Main Dashboard View ---
export default function DashboardHome() {
  const queryClient = useQueryClient();
  
  const { data: patients, isLoading, error } = useQuery({
    queryKey: ['patients'],
    queryFn: patientService.getPatients,
  });

  const deleteMutation = useMutation({
    mutationFn: patientService.deletePatient,
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
        <p>Could not reach the backend. Please ensure the server is running.</p>
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
        {patients?.map((patient: any) => (
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
              {/* Note: This now routes to the unified PatientDetail component */}
              <Link 
                to={`/patients/${patient.id}`}
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
}