import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { LayoutDashboard, UserPlus, LogOut, Bell, Activity } from 'lucide-react';

export default function DashboardLayout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Navigation aligns with the routes defined in App.tsx
  const navigation = [
    { name: 'Family Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Add Patient', href: '/add-patient', icon: UserPlus },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      
      {/* ── Sidebar ── */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen">
        
        {/* Brand Logo */}
        <div className="h-20 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">MedRemind</span>
          </div>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            // Determine active state based on current URL path
            const isActive = location.pathname.startsWith(item.href) && 
              (item.href !== '/dashboard' || location.pathname === '/dashboard');

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                }`}
              >
                <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors group"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-red-500 transition-colors" />
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-2xl font-bold text-gray-800 capitalize">
            {/* Dynamic Page Title */}
            {location.pathname === '/dashboard' ? 'Dashboard Overview' : 
             location.pathname === '/add-patient' ? 'Register Patient' : 
             location.pathname.includes('/patients/') ? 'Patient Management' : 'Dashboard'}
          </h1>
          
          <div className="flex items-center space-x-6">
            {/* Notification Bell */}
            <button className="text-gray-400 hover:text-gray-600 relative transition-colors">
              <Bell className="h-6 w-6" />
              <span className="absolute top-0 right-0.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
            
            {/* User Profile Snippet */}
            <div className="flex items-center space-x-3 border-l border-gray-200 pl-6">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200 shadow-sm">
                {user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-700 leading-none">
                  {user?.full_name || 'Caregiver'}
                </span>
                <span className="text-xs text-gray-500 mt-1 leading-none">
                  {user?.email || 'Caregiver Account'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Injected View Content (DashboardHome, AddPatient, PatientDetail) */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <Outlet />
        </main>
        
      </div>
    </div>
  );
}