import React, { useState, useEffect } from 'react';
// Step 1: Import Chart.js components
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Step 2: Register the components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      // ... (fetchSummary logic remains the same)
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
              setError('No authentication token found. Please log in.');
              setLoading(false);
              return;
            }
            const response = await fetch('/api/analytics/summary', {
              headers: { 'x-auth-token': token },
            });
            if (!response.ok) throw new Error('Failed to fetch dashboard data');
            const data = await response.json();
            setSummary(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    fetchSummary();
  }, []);

  // Step 3: Prepare data for the chart
  const pipelineData = {
    labels: summary?.salesPipeline.map(item => item._id) || [], // e.g., ['Proposal', 'Closed Won']
    datasets: [
      {
        label: 'Total Value ($)',
        data: summary?.salesPipeline.map(item => item.totalValue) || [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)', // Blue bars
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: false,
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: { grid: { color: '#edf0f5' }, border: { display: false }, beginAtZero: true },
    },
  };

  if (loading) return <div className="loading-state">Preparing your workspace...</div>;
  if (error) return <p className="error-message">Error: {error}</p>;
  if (!summary) return <p>No summary data available.</p>;

  return (
    <div className="dashboard-page">
      <div className="page-intro">
        <div>
          <p className="page-eyebrow">YOUR BUSINESS AT A GLANCE</p>
          <h2>Good work starts with a clear view.</h2>
          <p>Here’s what’s happening across your customer relationships.</p>
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="stat-card">
          <span className="stat-label">Total customers</span>
          <p className="stat-number">{summary.totalCounts.customers}</p>
          <span className="stat-caption">In your workspace</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active leads</span>
          <p className="stat-number">{summary.totalCounts.leads}</p>
          <span className="stat-caption">Across all statuses</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Opportunities</span>
          <p className="stat-number">{summary.totalCounts.opportunities}</p>
          <span className="stat-caption">In your sales pipeline</span>
        </div>
      </div>

      {summary.salesPipeline.length > 0 ? (
        <div className="chart-container">
          <div className="section-heading">
            <div>
              <h3>Sales pipeline</h3>
              <p>Opportunity value by current stage</p>
            </div>
            <span className="section-chip">Pipeline</span>
          </div>
          <Bar options={chartOptions} data={pipelineData} />
        </div>
      ) : (
        <div className="chart-container empty-chart">
          <h3>Sales pipeline</h3>
          <p>Your opportunity stages will appear here once opportunities are added.</p>
        </div>
      )}

      <div className="recent-activity-card">
        <div className="section-heading">
          <div>
            <h3>Recently added customers</h3>
            <p>Your latest relationship updates</p>
          </div>
        </div>
        {summary.recentCustomers.length > 0 ? (
          <ul>
            {summary.recentCustomers.map(customer => (
              <li key={customer._id}>
                <span className="customer-avatar">{customer.name?.charAt(0)?.toUpperCase() || 'C'}</span>
                <span><strong>{customer.name}</strong><small>{customer.company || 'Independent customer'}</small></span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-copy">No customers yet. Add your first customer to get started.</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
