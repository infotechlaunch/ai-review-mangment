import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './BusinessSetup.css';
import { apiRequest } from '../../utils/api';

const BusinessSetup = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [businessData, setBusinessData] = useState({
    businessName: '',
    industry: '',
    website: '',
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState(['google']);
  const [isConnecting, setIsConnecting] = useState(false);
  const navigate = useNavigate();

  // Load existing business data from localStorage on component mount
  useEffect(() => {
    const existingBusinessName = localStorage.getItem('businessName');
    const userEmail = localStorage.getItem('userEmail');
    
    if (existingBusinessName) {
      setBusinessData(prev => ({
        ...prev,
        businessName: existingBusinessName
      }));
    }

    // Note: No token check - allow onboarding without login
  }, [navigate]);

  const platforms = [
    { id: 'google', name: 'Google Business', icon: '🔍', color: '#4285F4' },
    
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBusinessData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Save business data to localStorage
      if (businessData.businessName) {
        localStorage.setItem('businessName', businessData.businessName);
      }
      if (businessData.industry) {
        localStorage.setItem('businessIndustry', businessData.industry);
      }
      if (businessData.website) {
        localStorage.setItem('businessWebsite', businessData.website);
      }
      
      // Complete onboarding
      console.log('Onboarding complete:', { businessData, selectedPlatforms });
      
      // Navigate to dashboard
      const userRole = localStorage.getItem('userRole');
      if (userRole === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) {
      return businessData.businessName && businessData.industry;
    }
    if (currentStep === 2) {
      return selectedPlatforms.length > 0;
    }
    return true;
  };

  const handleGoogleConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Get tenantId from localStorage (stored during registration)
      const tenantId = localStorage.getItem('tenantId');
      
      if (!tenantId) {
        alert('Session expired. Please register again.');
        navigate('/login');
        return;
      }

      // Use onboarding endpoint (no authentication required)
      const response = await fetch(`http://localhost:4000/api/google-oauth/connect-onboarding/${tenantId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success && data.authUrl) {
        // Redirect to Google OAuth consent screen
        window.location.href = data.authUrl;
      } else {
        alert('Failed to initiate Google connection. Please try again.');
      }
    } catch (error) {
      console.error('Google connect error:', error);
      alert(error.message || 'Failed to connect to Google. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        {/* Progress Bar */}
        <div className="progress-section">
          <div className="progress-steps">
            {[1, 2, 3].map((step) => (
              <div 
                key={step} 
                className={`progress-step ${currentStep >= step ? 'active' : ''}`}
              >
                <div className="step-circle">{step}</div>
                <div className="step-label">
                  {step === 1 && 'Business Info'}
                  {step === 2 && 'Select Platforms'}
                  {step === 3 && 'Connect Accounts'}
                </div>
              </div>
            ))}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="step-content">
          {currentStep === 1 && (
            <div className="step-1">
              <h2>Tell us about your business</h2>
              <p className="step-description">
                Let's complete your business profile setup
              </p>

              <div className="form-group">
                <label htmlFor="businessName">Business Name *</label>
                <input
                  type="text"
                  id="businessName"
                  name="businessName"
                  value={businessData.businessName}
                  onChange={handleInputChange}
                  placeholder="Enter your business name"
                  required
                />
                <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  This is the name customers will see on your reviews
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="industry">Industry *</label>
                <select
                  id="industry"
                  name="industry"
                  value={businessData.industry}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select your industry</option>
                  <option value="restaurant">Restaurant & Food</option>
                  <option value="retail">Retail</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="hospitality">Hospitality</option>
                  <option value="automotive">Automotive</option>
                  <option value="beauty">Beauty & Spa</option>
                  <option value="fitness">Fitness & Wellness</option>
                  <option value="professional">Professional Services</option>
                  <option value="real-estate">Real Estate</option>
                  <option value="education">Education</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="website">Website (Optional)</label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={businessData.website}
                  onChange={handleInputChange}
                  placeholder="https://yourbusiness.com"
                />
                <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Help customers find you online
                </small>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="step-2">
              <h2>Select Review Platforms</h2>
              <p className="step-description">
                Choose the platforms where your business receives reviews
              </p>

              <div className="platforms-grid">
                {platforms.map((platform) => (
                  <div
                    key={platform.id}
                    className={`platform-card ${selectedPlatforms.includes(platform.id) ? 'selected' : ''}`}
                    onClick={() => togglePlatform(platform.id)}
                  >
                    <div className="platform-icon" style={{ background: platform.color }}>
                      {platform.icon}
                    </div>
                    <div className="platform-name">{platform.name}</div>
                    <div className="platform-check">
                      {selectedPlatforms.includes(platform.id) && '✓'}
                    </div>
                  </div>
                ))}
              </div>

              {selectedPlatforms.length > 0 && (
                <div className="selected-info">
                  <p>✓ {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} selected</p>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="step-3">
              <h2>Connect Your Google Business Account</h2>
              <p className="step-description">
                Connect your Google Business Profile to start managing reviews with AI
              </p>

              <div className="connection-guide">
                {selectedPlatforms.map((platformId, index) => {
                  const platform = platforms.find(p => p.id === platformId);
                  return (
                    <div key={platformId} className="platform-connection">
                      <div className="connection-header">
                        <div className="connection-icon" style={{ background: platform.color }}>
                          {platform.icon}
                        </div>
                        <h3>{platform.name}</h3>
                      </div>

                      <div className="connection-steps">
                        <div className="connection-step">
                          <span className="step-number">1</span>
                          <p>Click the "Connect {platform.name}" button below</p>
                        </div>
                        <div className="connection-step">
                          <span className="step-number">2</span>
                          <p>Sign in with your Google account that manages your business</p>
                        </div>
                        <div className="connection-step">
                          <span className="step-number">3</span>
                          <p>Grant access permissions to manage your business reviews</p>
                        </div>
                        <div className="connection-step">
                          <span className="step-number">4</span>
                          <p>Select your business location to sync reviews</p>
                        </div>
                      </div>

                      <button 
                        className="btn-connect"
                        style={{ borderColor: platform.color, color: platform.color }}
                        onClick={handleGoogleConnect}
                        disabled={isConnecting}
                      >
                        <span style={{ fontSize: '20px', marginRight: '8px' }}>{platform.icon}</span>
                        {isConnecting ? 'Connecting...' : `Connect ${platform.name}`}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="skip-notice">
                <p>💡 You can also skip this step and connect your account later from dashboard settings.</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="navigation-buttons">
          {currentStep > 1 && (
            <button className="btn-secondary" onClick={handleBack}>
              Back
            </button>
          )}
          <button 
            className="btn-primary"
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {currentStep === 3 ? 'Complete Setup' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessSetup;
