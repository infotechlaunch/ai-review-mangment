import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './BusinessSetup.css';
import { apiRequest } from '../../utils/api';

const BusinessSetup = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [businessData, setBusinessData] = useState({
        // Step 1: Business Info
        businessName: '',
        industry: '',
        phone: '',
        website: '',
        address: '',
        timezone: '',
        logo: null,

        // Step 2: Location & Connect
        googleLocation: null,

        // Step 3: Communication
        whatsappNumber: '',
        whatsappLink: '',
        sendRequestsViaWhatsapp: true,
        sendFollowupsViaWhatsapp: true,

        // Step 4: Social & Review Presence
        facebookPage: '',
        instagramHandle: '',
        googleReviewLink: '',
        gmbConnName: '',
        fbConnName: '',
        igConnName: '',
        placeId: '',
        account_resource: '',
        locationId: '',
        ReviewKey: '',
        gid: '',
        ScreenshotOneHTML: '',

        // Step 5: Permissions
        permissions: {
            allowAiResponse: true,
            allowReviewRequests: true,
            allowWhatsappFollowups: true,
            allowMonitoring: true,
            allowPosting: true
        }
    });

    const [isConnecting, setIsConnecting] = useState(false);
    const navigate = useNavigate();

    // Load existing business data from backend on component mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await apiRequest('/api/tenant/profile', { method: 'GET' });
                if (response.success && response.data) {
                    const tenant = response.data;
                    setBusinessData(prev => ({
                        ...prev,
                        businessName: tenant.businessName || '',
                        industry: tenant.industry || '',
                        phone: tenant.phone || '',
                        website: tenant.website || '',
                        address: tenant.address || '',
                        timezone: tenant.timezone || '',
                        // Map nested fields
                        whatsappNumber: tenant.communication_settings?.whatsappNumber || '',
                        whatsappLink: tenant.communication_settings?.whatsappLink || '',
                        sendRequestsViaWhatsapp: tenant.communication_settings?.sendRequestsViaWhatsapp ?? true,
                        sendFollowupsViaWhatsapp: tenant.communication_settings?.sendFollowupsViaWhatsapp ?? true,
                        facebookPage: tenant.social_profiles?.facebookPage || '',
                        instagramHandle: tenant.social_profiles?.instagramHandle || '',
                        googleReviewLink: tenant.social_profiles?.googleReviewLink || '',
                        gmbConnName: tenant.social_profiles?.gmbConnName || '',
                        fbConnName: tenant.social_profiles?.fbConnName || '',
                        igConnName: tenant.social_profiles?.igConnName || '',
                        placeId: tenant.social_profiles?.placeId || '',
                        account_resource: tenant.social_profiles?.account_resource || '',
                        locationId: tenant.social_profiles?.locationId || '',
                        ReviewKey: tenant.social_profiles?.ReviewKey || '',
                        gid: tenant.social_profiles?.gid || '',
                        ScreenshotOneHTML: tenant.social_profiles?.ScreenshotOneHTML || '',
                        // Map permissions
                        permissions: {
                            ...prev.permissions,
                            ...(tenant.settings?.permissions || {})
                        }
                    }));
                }
            } catch (error) {
                console.error('Failed to fetch business profile:', error);
                // Fallback to local storage if needed
                const existingBusinessName = localStorage.getItem('businessName');
                if (existingBusinessName) {
                    setBusinessData(prev => ({ ...prev, businessName: existingBusinessName }));
                }
            }
        };

        fetchProfile();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setBusinessData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target;
        setBusinessData(prev => ({
            ...prev,
            [name]: checked
        }));
    };

    const handlePermissionChange = (e) => {
        const { name, checked } = e.target;
        setBusinessData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [name]: checked
            }
        }));
    };

    const handleNext = () => {
        if (currentStep < 5) {
            setCurrentStep(currentStep + 1);
            window.scrollTo(0, 0);
        } else {
            completeOnboarding();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            window.scrollTo(0, 0);
        }
    };

    const completeOnboarding = async () => {
        try {
            // Save to backend
            const response = await apiRequest('/api/tenant/profile', {
                method: 'PUT',
                body: JSON.stringify(businessData)
            });

            if (response.success) {
                console.log('Profile updated successfully');
                
                // Save basic info to localStorage as backup/cache
                localStorage.setItem('businessName', businessData.businessName);
                if (businessData.industry) localStorage.setItem('businessIndustry', businessData.industry);
                
                // Navigate to dashboard
                const userRole = localStorage.getItem('userRole');
                if (userRole === 'ADMIN') {
                    navigate('/admin');
                } else {
                    navigate('/');
                }
            } else {
                alert('Failed to save profile. Please try again.');
            }
        } catch (error) {
            console.error('Error completing onboarding:', error);
            alert('An error occurred while saving your profile.');
        }
    };

    const canProceed = () => {
        if (currentStep === 1) {
            return businessData.businessName && businessData.industry;
        }
        // Add validation for other steps if needed
        return true;
    };

    const handleGoogleConnect = async () => {
        try {
            setIsConnecting(true);
            const tenantId = localStorage.getItem('tenantId');

            if (!tenantId) {
                alert('Session expired. Please register again.');
                navigate('/login');
                return;
            }

            // existing logic
            const response = await fetch(`http://localhost:4000/api/google-oauth/connect-onboarding/${tenantId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
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
        } finally {
            setIsConnecting(false);
        }
    };

    const renderProgressBar = () => (
        <div className="progress-section">
            <div className="progress-steps">
                {[1, 2, 3, 4, 5].map((step) => (
                    <div
                        key={step}
                        className={`progress-step ${currentStep >= step ? 'active' : ''}`}
                    >
                        <div className="step-circle">{step}</div>
                        <div className="step-label">
                            {step === 1 && 'Info'}
                            {step === 2 && 'Comms'}
                            {step === 3 && 'Social'}
                            {step === 4 && 'Perms'}
                            {step === 5 && 'Finish'}
                        </div>
                    </div>
                ))}
            </div>
            <div className="progress-bar">
                <div
                    className="progress-fill"
                    style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
                />
            </div>
        </div>
    );

    return (
        <div className="onboarding-container">
            <div className="onboarding-card">
                {renderProgressBar()}

                <div className="step-content">
                    {/* STEP 1: BUSINESS INFO */}
                    {currentStep === 1 && (
                        <div className="step-1 fade-in">
                            <h2>Let's get to know your business</h2>
                            <p className="step-description">We'll need a few details to set up your profile.</p>

                            <div className="form-grid">
                                <div className="form-group full-width">
                                    <label>Business Name *</label>
                                    <input
                                        type="text"
                                        name="businessName"
                                        value={businessData.businessName}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Joy's Biryani House"
                                    />
                                    <small>This is the name customers will see on your reviews</small>
                                </div>

                                <div className="form-group">
                  <label>Industry / Category *</label>
                  <select name="industry" value={businessData.industry} onChange={handleInputChange}>
                    <option value="">Select Category</option>
                    <option value="restaurant">Restaurant & Food</option>
                    <option value="retail">Retail</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="services">Professional Services</option>
                    <option value="beauty">Beauty & Wellness</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Logo (Optional)</label>
                  <div className="file-input-wrapper">
                    <input
                      type="file"
                      id="logo-upload"
                      name="logo"
                      accept="image/*"
                      onChange={(e) => setBusinessData(prev => ({ ...prev, logo: e.target.files[0] }))}
                      className="file-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={businessData.phone}
                                        onChange={handleInputChange}
                                        placeholder="+1 (555) 000-0000"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Website</label>
                                    <input
                                        type="url"
                                        name="website"
                                        value={businessData.website}
                                        onChange={handleInputChange}
                                        placeholder="https://example.com"
                                    />
                                </div>

                                <div className="form-group full-width">
                                    <label>Business Address</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={businessData.address}
                                        onChange={handleInputChange}
                                        placeholder="123 Main St, City, Country"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Time Zone</label>
                                    <select name="timezone" value={businessData.timezone} onChange={handleInputChange}>
                                        <option value="">Select Timezone</option>
                                        <option value="UTC-5">EST (New York)</option>
                                        <option value="UTC-8">PST (Los Angeles)</option>
                                        <option value="UTC+0">GMT (London)</option>
                                        <option value="UTC+5:30">IST (India)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

            {/* STEP 2: CONNECT & LOCATION - HIDDEN 
                    {currentStep === 2 && (
                        <div className="step-2 fade-in">
                            <h2>Connect & Confirm Location</h2>
                            <p className="step-description">Link your Google Business Profile to manage reviews.</p>

                            <div className="connect-box">
                                <div className="platform-icon google">G</div>
                                <div className="connect-info">
                                    <h3>Google Business Profile</h3>
                                    <p>Fetch reviews, reply automatically, and manage your reputation.</p>
                                </div>
                                <button
                                    className="btn-connect"
                                    onClick={handleGoogleConnect}
                                    disabled={isConnecting}
                                >
                                    {isConnecting ? 'Connecting...' : 'Connect Google'}
                                </button>
                            </div>

                        </div>
                    )}
            */ }

                    {/* STEP 2: COMMUNICATION SETUP */}
                    {currentStep === 2 && (
                        <div className="step-3 fade-in">
                            <h2>WhatsApp Communication</h2>
                            <p className="step-description">Engage your customers where they are active.</p>

                            <div className="form-group">
                                <label>WhatsApp Business Number</label>
                                <input
                                    type="text"
                                    name="whatsappNumber"
                                    value={businessData.whatsappNumber}
                                    onChange={handleInputChange}
                                    placeholder="+1 555 000 0000"
                                />
                            </div>

                            <div className="form-group">
                                <label>WhatsApp Chat Link (Optional)</label>
                                <input
                                    type="text"
                                    name="whatsappLink"
                                    value={businessData.whatsappLink}
                                    onChange={handleInputChange}
                                    placeholder="https://wa.me/..."
                                />
                            </div>

                            <div className="toggles-section">
                                <label className="toggle-row">
                                    <div className="toggle-info">
                                        <span className="toggle-title">Send review requests via WhatsApp</span>
                                        <span className="toggle-desc">Automatically ask customers for reviews</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        name="sendRequestsViaWhatsapp"
                                        checked={businessData.sendRequestsViaWhatsapp}
                                        onChange={handleCheckboxChange}
                                    />
                                    <div className="toggle-switch"></div>
                                </label>

                                <label className="toggle-row">
                                    <div className="toggle-info">
                                        <span className="toggle-title">Send follow-up reminders</span>
                                        <span className="toggle-desc">Remind customers who haven't reviewed</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        name="sendFollowupsViaWhatsapp"
                                        checked={businessData.sendFollowupsViaWhatsapp}
                                        onChange={handleCheckboxChange}
                                    />
                                    <div className="toggle-switch"></div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: SOCIAL & REVIEW PRESENCE */}
                    {currentStep === 3 && (
                        <div className="step-4 fade-in">
                            <h2>Social & Review Presence</h2>
                            <p className="step-description">Where should customers find you?</p>

                            <div className="form-group">
                                <label>Facebook Page URL</label>
                                <input
                                    type="url"
                                    name="facebookPage"
                                    value={businessData.facebookPage}
                                    onChange={handleInputChange}
                                    placeholder="https://facebook.com/yourpage"
                                />
                            </div>

                            <div className="form-group">
                                <label>Instagram Handle</label>
                                <input
                                    type="text"
                                    name="instagramHandle"
                                    value={businessData.instagramHandle}
                                    onChange={handleInputChange}
                                    placeholder="@yourbusiness"
                                />
                            </div>

                            <div className="form-group">
                                <label>Google Review Link</label>
                                <input
                                    type="url"
                                    name="googleReviewLink"
                                    value={businessData.googleReviewLink}
                                    onChange={handleInputChange}
                                    placeholder="https://g.page/..."
                                />
                                {/* <small>Auto-fetched if you connected Google in Step 2</small> */}
                            </div>

                            <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e0e0e0' }} />
                            <h3>Integration Details (Advanced)</h3>
                            
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>GMB Connection Name</label>
                                    <input type="text" name="gmbConnName" value={businessData.gmbConnName} onChange={handleInputChange} placeholder="e.g. GMB-Joys"/>
                                </div>
                                <div className="form-group">
                                    <label>FB Connection Name</label>
                                    <input type="text" name="fbConnName" value={businessData.fbConnName} onChange={handleInputChange} placeholder="e.g. FB-Joys"/>
                                </div>
                                <div className="form-group">
                                    <label>IG Connection Name</label>
                                    <input type="text" name="igConnName" value={businessData.igConnName} onChange={handleInputChange}/>
                                </div>
                                <div className="form-group full-width">
                                    <label>Account Resource</label>
                                    <input type="text" name="account_resource" value={businessData.account_resource} onChange={handleInputChange} placeholder="accounts/..."/>
                                </div>
                                <div className="form-group">
                                    <label>Location ID</label>
                                    <input type="text" name="locationId" value={businessData.locationId} onChange={handleInputChange}/>
                                </div>
                                <div className="form-group">
                                    <label>Place ID</label>
                                    <input type="text" name="placeId" value={businessData.placeId} onChange={handleInputChange}/>
                                </div>
                                <div className="form-group">
                                    <label>Review Key</label>
                                    <input type="text" name="ReviewKey" value={businessData.ReviewKey} onChange={handleInputChange}/>
                                </div>
                                <div className="form-group">
                                    <label>GID</label>
                                    <input type="text" name="gid" value={businessData.gid} onChange={handleInputChange}/>
                                </div>
                                <div className="form-group full-width">
                                    <label>ScreenshotOne HTML</label>
                                    <input type="text" name="ScreenshotOneHTML" value={businessData.ScreenshotOneHTML} onChange={handleInputChange}/>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: AUTOMATION PERMISSIONS */}
                    {currentStep === 4 && (
                        <div className="step-5 fade-in">
                            <h2>Permissions & Automation</h2>
                            <p className="step-description">Control what our AI agents can do for you.</p>

                            <div className="permissions-list">
                                <label className="permission-item">
                                    <input
                                        type="checkbox"
                                        name="allowAiResponse"
                                        checked={businessData.permissions.allowAiResponse}
                                        onChange={handlePermissionChange}
                                    />
                                    <div className="perm-content">
                                        <span className="perm-title">Allow AI to reply to reviews</span>
                                        <span className="perm-desc">AI will draft and post professional responses to customer reviews.</span>
                                    </div>
                                </label>

                                <label className="permission-item">
                                    <input
                                        type="checkbox"
                                        name="allowReviewRequests"
                                        checked={businessData.permissions.allowReviewRequests}
                                        onChange={handlePermissionChange}
                                    />
                                    <div className="perm-content">
                                        <span className="perm-title">Allow sending review requests</span>
                                        <span className="perm-desc">Automatically send SMS/WhatsApp requests to recent customers.</span>
                                    </div>
                                </label>

                                <label className="permission-item">
                                    <input
                                        type="checkbox"
                                        name="allowWhatsappFollowups"
                                        checked={businessData.permissions.allowWhatsappFollowups}
                                        onChange={handlePermissionChange}
                                    />
                                    <div className="perm-content">
                                        <span className="perm-title">Allow WhatsApp follow-ups</span>
                                        <span className="perm-desc">Send gentle reminders if customers haven't reviewed yet.</span>
                                    </div>
                                </label>

                                <label className="permission-item">
                                    <input
                                        type="checkbox"
                                        name="allowPosting"
                                        checked={businessData.permissions.allowPosting}
                                        onChange={handlePermissionChange}
                                    />
                                    <div className="perm-content">
                                        <span className="perm-title">Auto-post replies on your behalf</span>
                                        <span className="perm-desc">If unchecked, AI will only draft replies for approval.</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* STEP 5: PREVIEW & FINISH */}
                    {currentStep === 5 && (
                        <div className="step-6 fade-in center-text">
                            <div className="success-icon">🎉</div>
                            <h2>Your Review System is Ready!</h2>
                            <p className="step-description">Here's a preview of your business profile.</p>

                            <div className="business-preview-card">
                                <div className="preview-header">
                                    <div className="preview-avatar">
                                       {businessData.businessName.charAt(0) || "B"}
                                    </div>
                                    <div className="preview-info">
                                        <h3>{businessData.businessName || "Your Business"}</h3>
                                        <p>{businessData.address || "Location not set"}</p>
                                        <div className="preview-rating">
                                            <span className="stars">⭐⭐⭐⭐⭐</span>
                                            <span className="rating-text">5.0 (0 reviews)</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="preview-actions">
                                    <button className="preview-btn">Write a Review</button>
                                    <button className="preview-btn secondary">Website</button>
                                </div>

                                <div className="setup-summary">
                                    {/* <div className="summary-item">
                                        <span className="label">Google Profile:</span>
                                        <span className="value connected">Connected ✅</span>
                                    </div> */}
                                    <div className="summary-item">
                                        <span className="label">Automation:</span>
                                        <span className="value">
                                            {businessData.permissions.allowAiResponse ? "Active ⚡" : "Paused ⏸️"}
                                        </span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="label">WhatsApp:</span>
                                        <span className="value">
                                            {businessData.whatsappNumber ? "Configured 📱" : "Not set"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="final-actions">
                                <button className="btn-primary full-width" onClick={completeOnboarding}>
                                    Go to Dashboard
                                </button>
                                <button className="btn-secondary full-width" style={{ marginTop: '12px' }} onClick={completeOnboarding}>
                                    Send First Review Request
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER NAV */}
                <div className="navigation-buttons">
                    {currentStep > 1 && currentStep < 5 && (
                        <button className="btn-secondary" onClick={handleBack}>
                            Back
                        </button>
                    )}
                    {currentStep < 5 && (
                        <button
                            className="btn-primary"
                            onClick={handleNext}
                            disabled={!canProceed()}
                        >
                            Next
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BusinessSetup;
