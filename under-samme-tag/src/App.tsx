import type { ReactNode } from 'react';
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AgreementPage } from './pages/Agreement';
import { MeetingPage } from './pages/Meeting';
import { EditProfile, MyProfile } from './pages/MyProfile';
import { ChooseProfile, CreateProfile, Start } from './pages/Start';
import { Suggestions } from './pages/Suggestions';
import { TestLeader } from './pages/TestLeader';
import { BlockPage } from './pages/Block';
import { SafetyPage } from './pages/Safety';
import { TrialPage } from './pages/Trial';
import { MessagesPage } from './pages/Messages';
import { AppProvider, useApp } from './state/AppContext';

/** Pages that need a chosen profile send everyone else to the front page. */
function NeedsProfile({ children }: { children: ReactNode }) {
  const { me } = useApp();
  return me ? <>{children}</> : <Navigate to="/" replace />;
}

function NotFound() {
  const { t } = useApp();
  return (
    <div className="narrow">
      <h1 tabIndex={-1}>{t.notFound.title}</h1>
      <p className="lead">{t.notFound.text}</p>
      <div className="actions"><Link to="/" className="btn btn--primary">{t.notFound.home}</Link></div>
    </div>
  );
}

// HashRouter is used so the built site works from any folder or static host
// without server setup.
export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Start />} />
            <Route path="/start/:role" element={<ChooseProfile />} />
            <Route path="/opret/:role" element={<CreateProfile />} />
            <Route path="/forslag" element={<NeedsProfile><Suggestions /></NeedsProfile>} />
            <Route path="/forloeb/:id/moede" element={<NeedsProfile><MeetingPage /></NeedsProfile>} />
            <Route path="/forloeb/:id/aftale" element={<NeedsProfile><AgreementPage /></NeedsProfile>} />
            <Route path="/profil" element={<NeedsProfile><MyProfile /></NeedsProfile>} />
            <Route path="/profil/ret" element={<NeedsProfile><EditProfile /></NeedsProfile>} />
            <Route path="/forloeb/:id/proeve" element={<NeedsProfile><TrialPage /></NeedsProfile>} />
            <Route path="/forloeb/:id/beskeder" element={<NeedsProfile><MessagesPage /></NeedsProfile>} />
            <Route path="/bloker/:id" element={<NeedsProfile><BlockPage /></NeedsProfile>} />
            <Route path="/tryghed" element={<SafetyPage />} />
            <Route path="/test" element={<TestLeader />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppProvider>
  );
}
