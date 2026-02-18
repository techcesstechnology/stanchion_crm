import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import {
  Dashboard,
  Contacts,
  ContactDetails,
  Leads,
  LeadDetails,
  Invoices,
  Quotes,
  Tasks,
  Settings,
  Catalog,
  HowToGuide,
  Inquiries,
  JobCards,
  Finance,
  Inventory,
  SuperAdmin,
  Login
} from '@/pages';
import Layout from '@/components/Layout';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { ReloadPrompt } from '@/components/pwa/ReloadPrompt';

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { role, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (role !== 'ADMIN') return <Navigate to="/" />;
  return <>{children}</>;
};

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return user ? <Layout><Outlet /></Layout> : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/contacts/:id" element={<ContactDetails />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/leads/:id" element={<LeadDetails />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/quotes" element={<Quotes />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/how-to" element={<HowToGuide />} />
              <Route path="/inquiries" element={<Inquiries />} /> {/* Added Inquiries route */}
              <Route path="/job-cards" element={<JobCards />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/super-admin" element={
                <AdminRoute>
                  <SuperAdmin />
                </AdminRoute>
              } />
            </Route>
          </Routes>
          <Toaster />
          <PWAInstallPrompt />
          <ReloadPrompt />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  )
}

export default App
