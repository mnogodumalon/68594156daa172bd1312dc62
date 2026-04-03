import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import { WorkflowPlaceholders } from '@/components/WorkflowPlaceholders';
import AdminPage from '@/pages/AdminPage';
import FachbuecherPage from '@/pages/FachbuecherPage';
import FachmagazinPage from '@/pages/FachmagazinPage';
import KongresszentrumPage from '@/pages/KongresszentrumPage';
import LeadairWebSoftwarePage from '@/pages/LeadairWebSoftwarePage';
import VeranstaltungenPage from '@/pages/VeranstaltungenPage';
import UnternehmensdatenPage from '@/pages/UnternehmensdatenPage';
import BeraterPage from '@/pages/BeraterPage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<><div className="mb-8"><WorkflowPlaceholders /></div><DashboardOverview /></>} />
              <Route path="fachbuecher" element={<FachbuecherPage />} />
              <Route path="fachmagazin" element={<FachmagazinPage />} />
              <Route path="kongresszentrum" element={<KongresszentrumPage />} />
              <Route path="leadair-web-software" element={<LeadairWebSoftwarePage />} />
              <Route path="veranstaltungen" element={<VeranstaltungenPage />} />
              <Route path="unternehmensdaten" element={<UnternehmensdatenPage />} />
              <Route path="berater" element={<BeraterPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
