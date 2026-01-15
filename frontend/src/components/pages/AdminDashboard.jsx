import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [sheetData, setSheetData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Backend API URL
  const API_URL = 'http://localhost:4000';

  useEffect(() => {
    fetchSheetData();
  }, []);

  const fetchSheetData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get JWT token from localStorage
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      // Fetch data from backend API
      const response = await fetch(`${API_URL}/api/admin/dashboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }
        throw new Error('Failed to fetch data from backend');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setSheetData(result.data);
      } else {
        throw new Error(result.message || 'Failed to load data');
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    // Sample data structure - for demonstration
    const sampleData = [
      {
        businessName: 'Sample Restaurant',
        email: 'sample@example.com',
        slug: 'sample-restaurant',
        status: 'Active',
        createdAt: new Date().toISOString()
      },
      {
        businessName: 'Demo Store',
        email: 'demo@example.com',
        slug: 'demo-store',
        status: 'Active',
        createdAt: new Date().toISOString()
      }
    ];

    setSheetData(sampleData);
    setLoading(false);
  };

  const refreshData = () => {
    fetchSheetData();
  };

  const exportToCSV = () => {
    if (sheetData.length === 0) return;

    const headers = Object.keys(sheetData[0]);
    const csvContent = [
      headers.join(','),
      ...sheetData.map(row =>
        headers.map(header => `"${row[header]}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading data from backend...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="error-container">
          <h2>Error Loading Data</h2>
          <p>{error}</p>
          <p className="error-note">
            Note: Make sure to:
            <ul>
              <li>Login with valid admin credentials</li>
              <li>Backend server is running on port 4000</li>
              <li>You have a valid authentication token</li>
            </ul>
          </p>
          <button onClick={loadSampleData} className="btn-primary">
            Load Sample Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="header-left">
          <h1>Admin Dashboard</h1>
          <p>Viewing client data from backend</p>
        </div>
        <div className="header-actions">
          <button onClick={refreshData} className="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Refresh
          </button>
          <button onClick={exportToCSV} className="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <div className="stat-content">
            <h3>Total Records</h3>
            <p className="stat-value">{sheetData.length}</p>
          </div>
        </div>
      </div>

      <div className="data-table-container">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {sheetData.length > 0 && Object.keys(sheetData[0]).map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheetData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {Object.values(row).map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
