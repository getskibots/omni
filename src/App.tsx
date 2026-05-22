import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardShell from './components/DashboardShell';
import Knowledge from './pages/Knowledge';
import Placeholder from './pages/Placeholder';
import SettingsChannels from './pages/SettingsChannels';

export default function App() {
  return (
    <DashboardShell>
      <Routes>
        <Route path="/" element={<Navigate to="/knowledge" replace />} />
        <Route path="/knowledge" element={<Knowledge />} />
        <Route path="/analytics" element={<Placeholder title="Analytics" />} />
        <Route path="/support" element={<Placeholder title="Support" />} />
        <Route path="/ai-edits" element={<Placeholder title="AI Edits" />} />
        <Route path="/flows" element={<Placeholder title="Flows" />} />
        <Route path="/actions" element={<Placeholder title="Actions" />} />
        <Route path="/triggers" element={<Placeholder title="Triggers" />} />
        <Route path="/settings" element={<Navigate to="/settings/channels" replace />} />
        <Route path="/settings/channels" element={<SettingsChannels />} />
        <Route path="/help" element={<Placeholder title="Help" />} />
        <Route path="*" element={<Navigate to="/knowledge" replace />} />
      </Routes>
    </DashboardShell>
  );
}
