import React, { useContext } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
} from 'react-router-dom';
import AuthContext from './context/AuthContextValue';
import Dashboard from './pages/Dashboard';
import CustomerList from './components/CustomerList';
import LeadList from './components/LeadList';
import OpportunityList from './components/OpportunityList';
import AdminPage from './pages/AdminPage';
import AdminSetup from './pages/AdminSetup';
import Login from './Login';
import Register from './components/Register';
import './App.css';

const navigation = [
  { to: '/dashboard', label: 'Overview', icon: 'OV' },
  { to: '/customers', label: 'Customers', icon: 'CU' },
  { to: '/leads', label: 'Leads', icon: 'LE' },
  { to: '/opportunities', label: 'Opportunities', icon: 'OP' },
];

function AuthenticatedApp() {
  const { user, logout } = useContext(AuthContext);
  const { pathname } = useLocation();
  const page = [...navigation, ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: 'AD' }] : [])]
    .find((item) => item.to === pathname);
  const visibleNavigation = user?.role === 'admin'
    ? [...navigation, { to: '/admin', label: 'Admin', icon: 'AD' }]
    : navigation;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/dashboard">
          <span className="brand-mark">P</span>
          <span>
            <strong>Pathway</strong>
            <small>CRM workspace</small>
          </span>
        </NavLink>

        <p className="sidebar-label">WORKSPACE</p>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {visibleNavigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
          <div className="user-summary">
            <strong>{user?.name || 'Workspace user'}</strong>
            <span>{user?.role || 'CRM member'}</span>
          </div>
          <button className="logout-button" onClick={logout} aria-label="Log out" title="Log out">
            ↗
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace /</span>
            <h1>{page?.label || 'Workspace'}</h1>
          </div>
          <div className="topbar-user">
            <span className="status-dot" />
            <span>{user?.name || 'Welcome back'}</span>
          </div>
        </header>
        <main className="main-content">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/customers" element={<CustomerList />} />
            <Route path="/leads" element={<LeadList />} />
            <Route path="/opportunities" element={<OpportunityList />} />
            <Route
              path="/admin"
              element={user?.role === 'admin' ? <AdminPage /> : <Navigate to="/dashboard" replace />}
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  const { token } = useContext(AuthContext);

  return (
    <Router>
      <Routes>
        {token ? (
          <Route path="/*" element={<AuthenticatedApp />} />
        ) : (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/setup-admin" element={<AdminSetup />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
