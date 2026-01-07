import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './BusinessSetup.css';

const BusinessSetup = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [businessData, setBusinessData] = useState({
    businessName: '',
    industry: '',
    website: '',
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const navigate = useNavigate();

  const platforms = [
    { id: 'google', name: 'Google Business', icon: '🔍', color: '#4285F4' },
    { id: 'yelp', name: 'Yelp', icon: '⭐', color: '#D32323' },
    { id: 'facebook', name: 'Facebook', icon: '👤', color: '#1877F2' },
    { id: 'tripadvisor', name: 'TripAdvisor', icon: '🦉', color: '#00AF87' },
    { id: 'trustpilot', name: 'Trustpilot', icon: '⭐', color: '#00B67A' },
    { id: 'amazon', name: 'Amazon', icon: '📦', color: '#FF9900' },
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
      // Complete onboarding
      console.log('Onboarding complete:', { businessData, selectedPlatforms });
      navigate('/');
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
                Let's start by setting up your business profile
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
              <h2>Connect Your Accounts</h2>
              <p className="step-description">
                Follow these simple steps to connect your review platforms
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
                          <p>Sign in to your {platform.name} account</p>
                        </div>
                        <div className="connection-step">
                          <span className="step-number">3</span>
                          <p>Grant access permissions to manage reviews</p>
                        </div>
                      </div>

                      <button 
                        className="btn-connect"
                        style={{ borderColor: platform.color, color: platform.color }}
                        onClick={() => console.log(`Connecting to ${platform.name}`)}
                      >
                        Connect {platform.name}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="skip-notice">
                <p>You can also connect these platforms later from your dashboard settings.</p>
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
