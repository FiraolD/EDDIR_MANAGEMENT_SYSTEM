import React, { useState, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { Auth } from './pages/Auth';
import { ResetPassword } from './pages/ResetPage';  // <-- Import
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
import { Contributions } from './pages/Contributions';
import { Claims } from './pages/Claims';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { OrganizationManagement } from './pages/OrganizationManagement';
import { Reports } from './pages/Reports';
import { Toaster } from './components/ui/sonner';
import { Skeleton } from './components/ui/skeleton';
import { Button } from './components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { Finance } from './pages/Finance';
import { ClaimReview } from './pages/ClaimsReview';
import { usePermissions } from './hooks/usePermissions';

// Add cases in the activeTab switch:


// The main app content – renders Auth or AppLayout based on user
const AppContent: React.FC = () => {
  const { user, t } = useAppContext();
  const { canAccessTab } = usePermissions();
  const [activeTab, setActiveTab] = useState('dashboard');

  const visibleTab = canAccessTab(activeTab) ? activeTab : 'dashboard';

  React.useEffect(() => {
    if (activeTab !== visibleTab) setActiveTab(visibleTab);
  }, [activeTab, visibleTab]);

  if (!user) {
    return <Auth />;
  }

  return (
    <AppLayout activeTab={visibleTab} setActiveTab={setActiveTab}>
      <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="wait">
          <motion.div
            key={visibleTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full"
          >
            {visibleTab === 'dashboard' && <Dashboard />}
            {visibleTab === 'members' && <Members />}
            {visibleTab === 'contributions' && <Contributions />}
            {visibleTab === 'claims' && <Claims />}
            {visibleTab === 'finance' && <Finance />}
            {visibleTab === 'claims-review' && <ClaimReview />}
            {visibleTab === 'transactions' && <Transactions />}
            {visibleTab === 'reports' && <Reports />}
            {visibleTab === 'organizations' && <OrganizationManagement />}
            {visibleTab === 'settings' && <Settings />}
            {visibleTab === 'notifications' && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Skeleton className="w-12 h-12 rounded-full" />
                  </motion.div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">{t('notifications')}</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto">
                    You're all caught up! We'll notify you when something important happens.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setActiveTab('dashboard')} className="rounded-xl">
                  Back to Dashboard
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </Suspense>
    </AppLayout>
  );
};

const PageLoader = () => (
  <div className="space-y-6">
    <Skeleton className="h-10 w-48 rounded-lg" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-32 rounded-3xl" />
    </div>
    <Skeleton className="h-[400px] rounded-3xl w-full" />
  </div>
);

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" expand={true} richColors closeButton />
    </AppProvider>
  );
}

export default App;