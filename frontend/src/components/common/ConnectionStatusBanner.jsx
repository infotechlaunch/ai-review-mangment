import React from 'react';
import { useGoogleConnection } from '../../hooks/useGoogleConnection';

const ConnectionStatusBanner = () => {
  const { isConnected, isLoading, connectionData } = useGoogleConnection();

  if (isLoading) {
    return null;
  }

  if (isConnected) {
    return (
      <div style={{
        padding: '16px 20px',
        backgroundColor: '#d1fae5',
        border: '1px solid #6ee7b7',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <span style={{ fontSize: '24px' }}>✅</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: '600', color: '#065f46', fontSize: '14px' }}>
            Google Business Profile Connected
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#047857' }}>
            {connectionData?.locationsCount || 0} location(s) synced • Reviews are being monitored
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px 20px',
      backgroundColor: '#fef3c7',
      border: '1px solid #fde047',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '20px'
    }}>
      <span style={{ fontSize: '24px' }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: '600', color: '#92400e', fontSize: '14px' }}>
          Google Business Profile Not Connected
        </p>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#b45309' }}>
          Connect your account to start managing reviews
        </p>
      </div>
    </div>
  );
};

export default ConnectionStatusBanner;
