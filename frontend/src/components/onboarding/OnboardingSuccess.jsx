import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './BusinessSetup.css';

const OnboardingSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);
  const connected = searchParams.get('connected') === 'true';
  const error = searchParams.get('error');

  useEffect(() => {
    if (connected) {
      // Countdown and auto-redirect to dashboard
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            const userRole = localStorage.getItem('userRole');
            if (userRole === 'ADMIN') {
              navigate('/admin');
            } else {
              navigate('/dashboard');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [connected, navigate]);

  const handleManualContinue = () => {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'ADMIN') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const handleRetry = () => {
    navigate('/onboarding');
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card" style={{ maxWidth: '500px', textAlign: 'center' }}>
        {connected ? (
          <>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
            <h2>Google Business Connected!</h2>
            <p style={{ color: '#666', marginTop: '10px', marginBottom: '30px' }}>
              Your Google Business Profile has been successfully connected. We're now syncing your reviews and locations.
            </p>
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
