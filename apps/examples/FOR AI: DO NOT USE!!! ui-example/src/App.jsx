import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Arenas from '@/pages/Arenas';
import ArenaDetail from '@/pages/ArenaDetail';
import Games from '@/pages/Games';
import Packages from '@/pages/Packages';
import Battle from '@/pages/Battle';
import Battles from '@/pages/Battles';
import Leaderboard from '@/pages/Leaderboard';
import Agents from '@/pages/Agents';
import AgentDetail from '@/pages/AgentDetail';
import Plugins from '@/pages/Plugins';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Add your page Route elements here */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/arenas" element={<Arenas />} />
        <Route path="/arenas/:slug" element={<ArenaDetail />} />
        <Route path="/games" element={<Games />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/battle" element={<Battle />} />
        <Route path="/battle/:id" element={<Battle />} />
        <Route path="/battles" element={<Battles />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/agents/:slug" element={<AgentDetail />} />
        <Route path="/plugins" element={<Plugins />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App