import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './BusinessSetup.css';
import { apiRequest } from '../../utils/api';

// CRITICAL: Shared cooldown key (same as Settings.jsx)
const COOLDOWN_STORAGE_KEY = 'google_api_cooldown_until';

const OnboardingSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(8); // Increased from 5 to give time to read
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error
  const [syncMessage, setSyncMessage] = useState('');
  const connected = searchParams.get('connected') === 'true';
  const error = searchParams.get('error');
  
  // Shared cooldown state - check localStorage on mount
  const [cooldownSeconds, setCooldownSeconds] = useState(() => {
    const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    if (stored) {
      const cooldownUntil = parseInt(stored, 10);
      const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });
  
  // Cooldown timer countdown
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setInterval(() => {
        setCooldownSeconds(prev => {
          const next = prev - 1;
          if (next <= 0) {
            localStorage.removeItem(COOLDOWN_STORAGE_KEY);
            return 0;
          }
          return next;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [cooldownSeconds]);
  
  // Manual sync function (called by button click)
  const handleManualSync = async () => {
    // CRITICAL: Check cooldown FIRST - prevent any API calls during cooldown
    if (cooldownSeconds > 0) {
      setSyncStatus('error');
      const minutes = Math.ceil(cooldownSeconds / 60);
      setSyncMessage(`⏰ Google API quota cooldown active. Please wait ${minutes} minute(s) before trying again.`);
      return;
    }
    
    // Check if already synced this session
    const syncKey = 'google_sync_completed_this_session';
    const alreadySynced = sessionStorage.getItem(syncKey);
    
    if (alreadySynced) {
      setSyncStatus('error');
      setSyncMessage('Already synced this session! Go to Settings to sync again.');
      return;
    }

    try {
      setSyncStatus('syncing');
      setSyncMessage('Syncing your business locations...');

      const locationsResult = await apiRequest('/api/google-oauth/sync-locations', {
        method: 'POST'
      });

      if (locationsResult.success) {
        // Mark as synced this session
        sessionStorage.setItem(syncKey, 'true');
        setSyncStatus('success');
        setSyncMessage(`Successfully synced ${locationsResult.locationsSaved || 0} locations!`);
      } else {
        // Check for quota error
        if (locationsResult.error === 'QUOTA_EXCEEDED' || 
            locationsResult.message?.toLowerCase().includes('quota') ||
            locationsResult.message?.toLowerCase().includes('cooldown')) {
          const cooldownTime = locationsResult.retryAfter || 600;
          setCooldownSeconds(cooldownTime);
          // Persist to localStorage
          const cooldownUntil = Date.now() + (cooldownTime * 1000);
          localStorage.setItem(COOLDOWN_STORAGE_KEY, cooldownUntil.toString());
          
          setSyncStatus('error');
          setSyncMessage(`⏰ Google API quota exceeded. Please wait ${Math.ceil(cooldownTime / 60)} minutes and try again from Settings.`);
        } else {
          setSyncStatus('error');
          setSyncMessage(locationsResult.message || 'Sync failed. You can try again from Settings.');
        }
      }
    } catch (err) {
      console.error('Sync error:', err);
      
      // Check if it's a 429 error
      if (err.message?.includes('quota') || err.message?.includes('429') || err.status === 429) {
        const cooldownTime = 600; // 10 minutes default
        setCooldownSeconds(cooldownTime);
        const cooldownUntil = Date.now() + (cooldownTime * 1000);
        localStorage.setItem(COOLDOWN_STORAGE_KEY, cooldownUntil.toString());
        
        setSyncStatus('error');
        setSyncMessage('⏰ Google API quota exceeded. Please wait 10 minutes and use Settings to sync.');
      } else {
        setSyncStatus('error');
        setSyncMessage('Sync failed. You can sync your data from Settings.');
      }
    }
  };

  useEffect(() => {
    // NO AUTO-SYNC - just start countdown
    if (!connected) return;

    // Just start countdown timer - NO AUTO-SYNC
    const timer = setInterval(() => {
      setCountdown(prev => {
        const newCount = prev - 1;
        if (newCount <= 0) {
          clearInterval(timer);
        }
        return newCount;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [connected]);

  // Separate effect for navigation to avoid rendering issues
  useEffect(() => {
    if (countdown === 0 && connected) {
      const userRole = localStorage.getItem('userRole');
      if (userRole === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [countdown, connected, navigate]);

  const handleManualContinue = () => {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'ADMIN') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const handleRetry = () => {
    navigate('/');
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card" style={{ maxWidth: '500px', textAlign: 'center' }}>
        {connected ? (
          <>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
            <h2>Google Business Connected!</h2>
            <p style={{ color: '#666', marginTop: '10px', marginBottom: '30px' }}>
              Your Google Business Profile has been successfully connected.
            </p>
            
            {/* Manual Sync Button - Only show if not syncing */}
            {syncStatus === 'idle' && (
              <div style={{ marginBottom: '20px' }}>
                <button 
                  className="btn-primary"
                  onClick={handleManualSync}
                  disabled={cooldownSeconds > 0}
                  style={{ 
                    width: '100%',
                    padding: '15px',
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '10px',
                    opacity: cooldownSeconds > 0 ? 0.6 : 1,
                    cursor: cooldownSeconds > 0 ? 'not-allowed' : 'pointer',
                    backgroundColor: cooldownSeconds > 0 ? '#94a3b8' : undefined
                  }}
                >
                  {cooldownSeconds > 0 
                    ? `⏰ Retry in ${Math.ceil(cooldownSeconds / 60)}m` 
                    : '🔄 Sync Locations Now'}
                </button>
                {cooldownSeconds > 0 && (
                  <p style={{ 
                    fontSize: '13px', 
                    color: '#f59e0b', 
                    margin: '0 0 10px 0',
                    textAlign: 'center',
                    fontWeight: '500'
                  }}>
                    ⚠️ Google API quota cooldown active
                  </p>
                )}
                <p style={{ 
                  fontSize: '13px', 
                  color: '#666', 
                  margin: '0',
                  textAlign: 'center'
                }}>
                  {cooldownSeconds > 0 
                    ? 'Go to Settings after cooldown expires'
                    : 'Or skip and sync later from Settings'}
                </p>
              </div>
            )}
            
            {/* Show disabled button when syncing */}
            {syncStatus === 'syncing' && (
              <div style={{ marginBottom: '20px' }}>
                <button 
                  className="btn-primary"
                  disabled
                  style={{ 
                    width: '100%',
                    padding: '15px',
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '10px',
                    opacity: 0.6,
                    cursor: 'not-allowed'
                  }}
                >
                  ⏳ Syncing...
                </button>
              </div>
            )}
            
            {/* Sync Status */}
            {syncStatus === 'syncing' && (
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#fff3cd', 
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #ffc107'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <div className="spinner" style={{
                    width: '20px',
                    height: '20px',
                    border: '3px solid #f3f3f3',
                    borderTop: '3px solid #ffc107',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <p style={{ margin: '0', color: '#856404', fontWeight: '500' }}>
                    {syncMessage}
                  </p>
                </div>
              </div>
            )}

            {syncStatus === 'success' && (
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#d4edda', 
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #28a745'
              }}>
                <p style={{ margin: '0', color: '#155724', fontWeight: '500' }}>
                  ✓ {syncMessage}
                </p>
              </div>
            )}

            {syncStatus === 'error' && (
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#f8d7da', 
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #dc3545'
              }}>
                <p style={{ margin: '0', color: '#721c24', fontWeight: '500' }}>
                  ⚠️ {syncMessage}
                </p>
              </div>
            )}

            <div style={{ 
              padding: '20px', 
              backgroundColor: '#f0f9ff', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: '0', color: '#0066cc', fontWeight: '500' }}>
                Redirecting to your dashboard in {countdown} seconds...
              </p>
            </div>
            <button 
              className="btn-primary"
              onClick={handleManualContinue}
              style={{ width: '100%' }}
            >
              Go to Dashboard Now
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
            <h2>Connection Failed</h2>
            <p style={{ color: '#666', marginTop: '10px', marginBottom: '20px' }}>
              {error || 'Failed to connect your Google Business account. Please try again.'}
            </p>
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#fff3cd', 
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: '500' }}>Common issues:</p>
              <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#666' }}>
                <li>Make sure you have a Google Business Profile</li>
                <li>Grant all requested permissions</li>
                <li>Use the correct Google account</li>
              </ul>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn-secondary"
                onClick={handleManualContinue}
                style={{ flex: 1 }}
              >
                Skip for Now
              </button>
              <button 
                className="btn-primary"
                onClick={handleRetry}
                style={{ flex: 1 }}
              >
                Try Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingSuccess;
