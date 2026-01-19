import React from 'react';
import { useNavigate } from 'react-router-dom';

const ConnectPlatformPrompt = ({ onConnect }) => {
  const navigate = useNavigate();

  const handleConnect = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId');
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:4000/api/google-oauth/connect', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        alert('Failed to initiate Google connection. Please try again.');
      }
    } catch (error) {
      console.error('Google connect error:', error);
      alert('Failed to connect to Google. Please try again.');
    }
  };

  return (
    <div style={{
      padding: '30px',
      backgroundColor: '#fff',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      textAlign: 'center',
      maxWidth: '600px',
      margin: '50px auto'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔗</div>
      <h2 style={{ marginBottom: '10px', color: '#333' }}>Connect Your Google Business Profile</h2>
      <p style={{ color: '#666', marginBottom: '30px', fontSize: '15px' }}>
        To view your reviews and business insights, you need to connect your Google Business Profile first.
      </p>
      
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '25px',
        textAlign: 'left'
      }}>
        <p style={{ fontWeight: '500', marginBottom: '10px', color: '#333' }}>You'll be able to:</p>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#666', lineHeight: '1.8' }}>
          <li>View and manage all your Google reviews</li>
          <li>Generate AI-powered responses</li>
          <li>Track sentiment and analytics</li>
          <li>Monitor your business performance</li>
        </ul>
      </div>

      <button
        onClick={handleConnect}
        style={{
          backgroundColor: '#4285F4',
          color: 'white',
          border: 'none',
          padding: '14px 32px',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          transition: 'all 0.2s'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = '#3367D6'}
        onMouseOut={(e) => e.target.style.backgroundColor = '#4285F4'}
      >
        <span style={{ fontSize: '20px' }}>🔍</span>
        Connect Google Business
      </button>
    </div>
  );
};

export default ConnectPlatformPrompt;
