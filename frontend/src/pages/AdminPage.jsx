import React, { useCallback, useEffect, useMemo, useState, useContext } from 'react';
import AuthContext from '../context/AuthContextValue';

function AdminPage() {
  const { token, user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [savingId, setSavingId] = useState('');

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { 'x-auth-token': token };
      const [usersResponse, summaryResponse] = await Promise.all([
        fetch('/api/users', { headers }),
        fetch('/api/analytics/summary', { headers }),
      ]);
      const [userData, summaryData] = await Promise.all([
        usersResponse.json(),
        summaryResponse.json(),
      ]);
      if (!usersResponse.ok) throw new Error(userData.msg || 'Could not load user accounts');
      if (!summaryResponse.ok) throw new Error(summaryData.msg || 'Could not load CRM metrics');
      setUsers(userData);
      setSummary(summaryData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((account) =>
      `${account.name} ${account.email} ${account.role}`.toLowerCase().includes(term)
    );
  }, [search, users]);

  const updateAccount = async (account, field, value) => {
    setSavingId(account._id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/users/${account._id}/${field}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({ [field === 'role' ? 'role' : 'active']: value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || `Could not update ${field}`);

      setUsers((current) => current.map((item) => item._id === account._id
        ? { ...item, [field === 'status' ? 'active' : field]: value }
        : item));
      setNotice(`${account.name}'s ${field === 'role' ? 'role' : 'account status'} was updated.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingId('');
    }
  };

  const stats = [
    { label: 'Team members', value: summary?.totalUsers ?? users.length, note: 'Registered accounts' },
    { label: 'Customers', value: summary?.totalCounts.customers ?? '—', note: 'Across all workspaces' },
    { label: 'Leads', value: summary?.totalCounts.leads ?? '—', note: 'Across all workspaces' },
    { label: 'Opportunities', value: summary?.totalCounts.opportunities ?? '—', note: 'Across all workspaces' },
  ];

  return (
    <section className="admin-page">
      <div className="admin-intro">
        <div>
          <p className="page-eyebrow">ADMINISTRATION</p>
          <h2>Workspace control center</h2>
          <p>Manage account access and review CRM activity across every team member.</p>
        </div>
        <span className="admin-badge">Administrator access</span>
      </div>

      {error && <p className="error-message" role="alert">{error}</p>}
      {notice && <p className="success-message" role="status">{notice}</p>}

      <div className="admin-stats">
        {stats.map((stat) => (
          <article className="admin-stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{loading ? '…' : stat.value}</strong>
            <small>{stat.note}</small>
          </article>
        ))}
      </div>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h3>People and access</h3>
            <p>Assign administrator privileges and enable or suspend accounts.</p>
          </div>
          <label className="admin-search">
            <span className="sr-only">Search users</span>
            <input
              type="search"
              placeholder="Search name, email or role"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        {loading ? (
          <div className="admin-empty">Loading account directory…</div>
        ) : visibleUsers.length === 0 ? (
          <div className="admin-empty">{search ? 'No matching accounts.' : 'No user accounts found.'}</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="table-styled admin-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>CRM records</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((account) => {
                  const active = account.active !== false;
                  return (
                    <tr key={account._id}>
                      <td>
                        <div className="admin-member">
                          <span className="customer-avatar">{account.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                          <span><strong>{account.name}</strong><small>{account.email}</small></span>
                        </div>
                      </td>
                      <td>
                        <div className="record-counts">
                          <span>{account.counts.customers} customers</span>
                          <span>{account.counts.leads} leads</span>
                          <span>{account.counts.opportunities} opportunities</span>
                        </div>
                      </td>
                      <td>
                        <select
                          className="role-select"
                          aria-label={`Role for ${account.name}`}
                          value={account.role || 'user'}
                          disabled={savingId === account._id || account._id === user?.id}
                          onChange={(event) => updateAccount(account, 'role', event.target.value)}
                        >
                          <option value="user">Member</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>
                      <td>
                        <span className={`account-status ${active ? 'is-active' : 'is-suspended'}`}>
                          <i />
                          {active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td>{account.createdAt ? new Date(account.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="admin-action-cell">
                        <button
                          className={`btn ${active ? 'btn-danger' : 'btn-secondary'}`}
                          disabled={savingId === account._id || account._id === user?.id}
                          onClick={() => updateAccount(account, 'status', !active)}
                        >
                          {active ? 'Suspend' : 'Restore'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="admin-footnote">
        Administrator permissions are checked on the server. Your own role and account cannot be changed here.
      </p>
    </section>
  );
}

export default AdminPage;
