import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './BusinessSetup.css';
import { apiRequest } from '../../utils/api';

const TOTAL_STEPS = 4;

const BusinessSetup = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [businessData, setBusinessData] = useState({
        // -- Step 1: Business Info (user-visible) --
        businessName: '',
        industry: '',
        address: '',
        city: '',
        country: '',
        phone: '',
        website: '',

        // -- Step 2: Google Search Name (user-visible) --
        googleSearchName: '',

        // -- Step 3: Social Links (user-visible) --
        facebookPage: '',
        instagramHandle: '',

        // -- Hidden / Backend-managed technical fields --
        // These are fetched/saved automatically. Never shown to user.
        placeId: '',
        googleReviewLink: '',
        account_resource: '',
        locationId: '',
        ReviewKey: '',
        gid: '',
        ScreenshotOneHTML: '',
        rating: null,
        reviewsCount: 0,

        // WhatsApp (carry-over, kept internal)
        whatsappNumber: '',
        whatsappLink: '',

        // Permissions
        permissions: {
            allowAiResponse: true,
            allowReviewRequests: true,
            allowWhatsappFollowups: true,
            allowPosting: true
        }
    });

    const [isSearching, setIsSearching] = useState(false);
    const [searchStatus, setSearchStatus] = useState(null); // null | 'success' | 'error'
    const [searchMessage, setSearchMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showManualEntry, setShowManualEntry] = useState(false);

    // Dropdown suggestion state
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedResult, setSelectedResult] = useState(null);
    const debounceRef = useRef(null);
    const dropdownRef = useRef(null);

    const navigate = useNavigate();

    // --- Close dropdown when clicking outside ---------------------------------
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- Load existing profile from backend on mount ---------------------------
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await apiRequest('/api/tenant/profile', { method: 'GET' });
                if (response.success && response.data) {
                    const t = response.data;
                    const sp = t.social_profiles || {};
                    const comm = t.communication_settings || {};

                    setBusinessData(prev => ({
                        ...prev,
                        businessName: t.businessName || '',
                        industry: t.industry || '',
                        address: t.address || '',
                        city: t.city || '',
                        country: t.country || '',
                        phone: t.phone || '',
                        website: t.website || '',
                        googleSearchName: t.googleSearchName || '',

                        facebookPage: sp.facebookPage || t.facebookPage || '',
                        instagramHandle: sp.instagramHandle || t.instagramHandle || '',

                        // Restore technical fields silently
                        placeId: sp.placeId || t.placeId || '',
                        googleReviewLink: sp.googleReviewLink || t.googleReviewLink || '',
                        account_resource: sp.account_resource || t.account_resource || '',
                        locationId: sp.locationId || t.locationId || '',
                        ReviewKey: sp.ReviewKey || t.ReviewKey || '',
                        gid: sp.gid || t.gid || '',
                        ScreenshotOneHTML: sp.ScreenshotOneHTML || t.ScreenshotOneHTML || '',
                        rating: sp.rating || null,
                        reviewsCount: sp.reviewsCount || 0,

                        whatsappNumber: comm.whatsappNumber || '',
                        whatsappLink: comm.whatsappLink || '',
                    }));

                    // If placeId is already saved, show success status
                    if (sp.placeId || t.placeId) {
                        setSearchStatus('success');
                        setSearchMessage(`Google Business connected (Place ID: ${sp.placeId || t.placeId})`);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch business profile:', error);
                const saved = localStorage.getItem('businessName');
                if (saved) setBusinessData(prev => ({ ...prev, businessName: saved }));
            }
        };
        fetchProfile();
    }, []);

    // --- Input handlers --------------------------------------------------------
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setBusinessData(prev => ({ ...prev, [name]: value }));
    };

    // --- Live suggestions as user types (debounced 400ms) ---------------------
    const handleGoogleSearchInput = (e) => {
        const value = e.target.value;
        setBusinessData(prev => ({ ...prev, googleSearchName: value }));
        setSearchStatus(null);
        setSearchMessage('');
        setSuggestions([]);
        setShowDropdown(false);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (value.trim().length < 2) return;

        debounceRef.current = setTimeout(async () => {
            try {
                const res = await apiRequest(
                    `/api/onboarding/search-suggestions?q=${encodeURIComponent(value.trim())}`,
                    { method: 'GET' }
                );
                if (res.success && res.results?.length > 0) {
                    setSuggestions(res.results);
                    setShowDropdown(true);
                }
            } catch {
                // silently ignore suggestion errors
            }
        }, 400);
    };

    // --- Select a suggestion from the dropdown --------------------------------
    const handleSelectSuggestion = async (result) => {
        setSuggestions([]);
        setShowDropdown(false);
        setBusinessData(prev => ({ ...prev, googleSearchName: result.title }));

        try {
            setIsSearching(true);
            setSearchStatus(null);
            setSearchMessage('');

            const response = await apiRequest('/api/onboarding/search-place', {
                method: 'POST',
                body: JSON.stringify({ googleSearchName: result.title })
            });

            if (response.success && response.data) {
                const { placeId, googleReviewLink, gid, rating, reviewsCount, businessTitle, address } = response.data;
                setBusinessData(prev => ({
                    ...prev,
                    placeId,
                    googleReviewLink,
                    gid: gid || prev.gid,
                    rating,
                    reviewsCount,
                    address: prev.address || address || prev.address
                }));
                setSearchStatus('success');
                setSearchMessage(`Found "${businessTitle}" - Place ID saved automatically ✅`);
            } else {
                setSearchStatus('error');
                setSearchMessage(response.message || 'Business not found. Try a more specific search name.');
            }
        } catch (error) {
            console.error('Select suggestion error:', error);
            setSearchStatus('error');
            setSearchMessage('Failed to connect. Please check your connection and try again.');
        } finally {
            setIsSearching(false);
        }
    };

    // --- SearchApi: auto-fetch placeId ----------------------------------------
    const handleSearchPlace = async () => {
        if (!businessData.googleSearchName.trim()) {
            setSearchStatus('error');
            setSearchMessage('Please enter a search name first.');
            return;
        }

        try {
            setIsSearching(true);
            setSearchStatus(null);
            setSearchMessage('');

            const response = await apiRequest('/api/onboarding/search-place', {
                method: 'POST',
                body: JSON.stringify({ googleSearchName: businessData.googleSearchName.trim() })
            });

            if (response.success && response.data) {
                const { placeId, googleReviewLink, gid, rating, reviewsCount, businessTitle, address } = response.data;

                setBusinessData(prev => ({
                    ...prev,
                    placeId,
                    googleReviewLink,
                    gid: gid || prev.gid,
                    rating,
                    reviewsCount,
                    // Pre-fill address from Google result if user left it blank
                    address: prev.address || address || prev.address
                }));

                setSearchStatus('success');
                setSearchMessage(`Found "${businessTitle}" - Place ID saved automatically ✅`);
            } else {
                setSearchStatus('error');
                setSearchMessage(response.message || 'Business not found. Try a more specific search name.');
            }
        } catch (error) {
            console.error('Search place error:', error);
            setSearchStatus('error');
            setSearchMessage('Failed to search. Please check your connection and try again.');
        } finally {
            setIsSearching(false);
        }
    };

    // --- Step navigation -------------------------------------------------------
    const handleNext = () => {
        if (currentStep < TOTAL_STEPS) {
            setCurrentStep(s => s + 1);
            window.scrollTo(0, 0);
        } else {
            completeOnboarding();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(s => s - 1);
            window.scrollTo(0, 0);
        }
    };

    const canProceed = () => {
        if (currentStep === 1) {
            return businessData.businessName.trim() !== '' &&
                   businessData.city.trim() !== '' &&
                   businessData.country.trim() !== '';
        }
        return true; // Steps 2-4 are optional or handled by their own actions
    };

    // --- Final save ------------------------------------------------------------
    const completeOnboarding = async () => {
        try {
            setIsSaving(true);
            const payload = {
                businessName: businessData.businessName,
                industry: businessData.industry,
                address: businessData.address,
                city: businessData.city,
                country: businessData.country,
                phone: businessData.phone,
                website: businessData.website,
                googleSearchName: businessData.googleSearchName,
                facebookPage: businessData.facebookPage,
                instagramHandle: businessData.instagramHandle,
                googleReviewLink: businessData.googleReviewLink,
                // Technical fields (hidden from user but synced to DB + Sheets)
                placeId: businessData.placeId,
                account_resource: businessData.account_resource,
                locationId: businessData.locationId,
                ReviewKey: businessData.ReviewKey,
                gid: businessData.gid,
                ScreenshotOneHTML: businessData.ScreenshotOneHTML,
                permissions: businessData.permissions
            };

            const response = await apiRequest('/api/tenant/profile', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            if (response.success) {
                localStorage.setItem('businessName', businessData.businessName);
                if (businessData.placeId) localStorage.setItem('placeId', businessData.placeId);

                const userRole = localStorage.getItem('userRole');
                if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
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
        } finally {
            setIsSaving(false);
        }
    };

    // --- Progress bar ----------------------------------------------------------
    const stepLabels = ['Business', 'Google', 'Social', 'Finish'];

    const renderProgressBar = () => (
        <div className="progress-section">
            <div className="progress-steps">
                {stepLabels.map((label, idx) => {
                    const step = idx + 1;
                    return (
                        <div
                            key={step}
                            className={`progress-step ${currentStep >= step ? 'active' : ''}`}
                        >
                            <div className="step-circle">
                                {currentStep > step ? '✓' : step}
                            </div>
                            <div className="step-label">{label}</div>
                        </div>
                    );
                })}
            </div>
            <div className="progress-bar">
                <div
                    className="progress-fill"
                    style={{ width: `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
                />
            </div>
        </div>
    );

    // --- Render ----------------------------------------------------------------
    return (
        <div className="onboarding-container">
            <div className="onboarding-card">
                {renderProgressBar()}

                <div className="step-content">

                    {/* =======================================================
                        STEP 1 - Business Info
                    ======================================================= */}
                    {currentStep === 1 && (
                        <div className="step-1 fade-in">
                            <h2>Tell us about your business</h2>
                            <p className="step-description">We'll use this to set up your review profile.</p>

                            <div className="form-grid">
                                <div className="form-group full-width">
                                    <label>Business Name <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="businessName"
                                        value={businessData.businessName}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Joy's Biryani N Kababs"
                                        autoFocus
                                    />
                                    <small>The name customers see on your Google reviews</small>
                                </div>

                                <div className="form-group full-width">
                                    <label>Business Address <span className="optional">(optional)</span></label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={businessData.address}
                                        onChange={handleInputChange}
                                        placeholder="Street address"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>City <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={businessData.city}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Raigarh"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Country <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="country"
                                        value={businessData.country}
                                        onChange={handleInputChange}
                                        placeholder="e.g. India"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Industry / Category</label>
                                    <select name="industry" value={businessData.industry} onChange={handleInputChange}>
                                        <option value="">Select Category (optional)</option>
                                        <option value="restaurant">Restaurant & Food</option>
                                        <option value="retail">Retail</option>
                                        <option value="healthcare">Healthcare</option>
                                        <option value="services">Professional Services</option>
                                        <option value="beauty">Beauty & Wellness</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={businessData.phone}
                                        onChange={handleInputChange}
                                        placeholder="+91 98765 43210"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* =======================================================
                        STEP 2 - Google Business Connect (SearchApi)
                    ======================================================= */}
                    {currentStep === 2 && (
                        <div className="step-2 fade-in">
                            <h2>Connect Google Business</h2>
                            <p className="step-description">
                                Enter your business search name so we can automatically find your Google listing,
                                fetch your Place ID, and generate your review link - no manual entry needed.
                            </p>

                            <div className="connect-box google-connect-box">
                                <div className="platform-icon google">G</div>
                                <div className="connect-info">
                                    <h3>Google Business <span className="badge-auto">Auto-Connect</span></h3>
                                    <p>Enter a search name and we'll look up your business on Google Maps.</p>
                                </div>
                            </div>

                            <div className="form-group search-group" style={{ marginTop: '24px' }}>
                                <label>
                                    Business Search Name <span className="required">*</span>
                                </label>
                                <small style={{ display: 'block', marginBottom: '8px', color: '#6b7280' }}>
                                    Use: <strong>Business Name + City</strong> for best results.
                                    e.g. <em>"Joy's Biryani Raigarh"</em>
                                </small>
                                <div className="search-input-row" ref={dropdownRef} style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        name="googleSearchName"
                                        value={businessData.googleSearchName}
                                        onChange={handleGoogleSearchInput}
                                        placeholder={`${businessData.businessName || 'Your Business'} ${businessData.city || 'City'}`}
                                        disabled={isSearching}
                                        autoComplete="off"
                                    />
                                    <button
                                        className="btn-search-connect"
                                        onClick={handleSearchPlace}
                                        disabled={isSearching || !businessData.googleSearchName.trim()}
                                    >
                                        {isSearching ? (
                                            <span>Searching<span className="dots-anim">...</span></span>
                                        ) : (
                                            'Search & Connect'
                                        )}
                                    </button>

                                    {/* Live suggestions dropdown */}
                                    {showDropdown && suggestions.length > 0 && (
                                        <ul className="search-dropdown">
                                            {suggestions.map((result, idx) => (
                                                <li
                                                    key={result.placeId || idx}
                                                    className="search-dropdown-item"
                                                    onMouseDown={() => handleSelectSuggestion(result)}
                                                >
                                                    <span className="dropdown-pin">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                                            <circle cx="12" cy="10" r="3"/>
                                                        </svg>
                                                    </span>
                                                    <span className="dropdown-text">
                                                        <span className="dropdown-title">{result.title}</span>
                                                        <span className="dropdown-address">{result.address}</span>
                                                    </span>
                                                    {result.rating && (
                                                        <span className="dropdown-rating">⭐ {result.rating}</span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* Status feedback */}
                            {searchStatus === 'success' && (
                                <div className="status-banner status-success">
                                    <span className="status-icon">✅</span>
                                    <div>
                                        <strong>Connected!</strong>
                                        <p>{searchMessage}</p>
                                        {businessData.googleReviewLink && (
                                            <a
                                                href={businessData.googleReviewLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="review-link-preview"
                                            >
                                                View Google Listing →
                                            </a>
                                        )}
                                        {businessData.rating && (
                                            <p className="google-stats">
                                                ⭐ {businessData.rating} · {businessData.reviewsCount} reviews on Google
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {searchStatus === 'error' && (
                                <div className="status-banner status-error">
                                    <span className="status-icon">❌</span>
                                    <div>
                                        <strong>Not found</strong>
                                        <p>{searchMessage}</p>
                                        <button
                                            className="btn-manual-entry-link"
                                            onClick={() => setShowManualEntry(true)}
                                        >
                                            Can't find your business? Enter details manually →
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Manual entry form */}
                            {showManualEntry && (
                                <div className="manual-entry-box">
                                    <div className="manual-entry-header">
                                        <h4>Enter Business Details Manually</h4>
                                        <button
                                            className="btn-close-manual"
                                            onClick={() => setShowManualEntry(false)}
                                            aria-label="Close"
                                        >✕</button>
                                    </div>
                                    <p className="manual-entry-hint">
                                        We'll save these details so you can connect Google Business later from your dashboard.
                                    </p>
                                    <div className="manual-entry-fields">
                                        <div className="form-group">
                                            <label>Business Name <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                name="businessName"
                                                value={businessData.businessName}
                                                onChange={handleInputChange}
                                                placeholder="e.g. Joy's Biryani N Kababs"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>City <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                name="city"
                                                value={businessData.city}
                                                onChange={handleInputChange}
                                                placeholder="e.g. Raigarh"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Full Address <span className="optional">(optional)</span></label>
                                            <input
                                                type="text"
                                                name="address"
                                                value={businessData.address}
                                                onChange={handleInputChange}
                                                placeholder="Street address"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Google Review Link <span className="optional">(optional)</span></label>
                                            <input
                                                type="url"
                                                name="googleReviewLink"
                                                value={businessData.googleReviewLink}
                                                onChange={handleInputChange}
                                                placeholder="https://g.page/r/..."
                                            />
                                            <small>Paste your Google Maps review link if you have it.</small>
                                        </div>
                                    </div>
                                    <button
                                        className="btn-save-manual"
                                        onClick={() => {
                                            setShowManualEntry(false);
                                            setSearchStatus('success');
                                            setSearchMessage(`"${businessData.businessName}" saved manually. Connect Google Business anytime from settings.`);
                                        }}
                                        disabled={!businessData.businessName.trim() || !businessData.city.trim()}
                                    >
                                        Save & Continue
                                    </button>
                                </div>
                            )}

                            <p className="skip-hint">
                                You can skip this step and connect later from your dashboard settings.
                            </p>
                        </div>
                    )}

                    {/* =======================================================
                        STEP 3 - Social Links
                    ======================================================= */}
                    {currentStep === 3 && (
                        <div className="step-3 fade-in">
                            <h2>Social Media Links</h2>
                            <p className="step-description">
                                Add your social profiles so customers can find you. Both fields are optional.
                            </p>

                            <div className="form-group social-group">
                                <label>
                                    <span className="social-icon facebook-icon">f</span>
                                    Facebook Page URL
                                </label>
                                <input
                                    type="url"
                                    name="facebookPage"
                                    value={businessData.facebookPage}
                                    onChange={handleInputChange}
                                    placeholder="https://facebook.com/yourpage"
                                />
                            </div>

                            <div className="form-group social-group">
                                <label>
                                    <span className="social-icon instagram-icon">in</span>
                                    Instagram Handle
                                </label>
                                <input
                                    type="text"
                                    name="instagramHandle"
                                    value={businessData.instagramHandle}
                                    onChange={handleInputChange}
                                    placeholder="@yourbusiness"
                                />
                            </div>
                        </div>
                    )}

                    {/* =======================================================
                        STEP 4 - Preview & Finish
                    ======================================================= */}
                    {currentStep === 4 && (
                        <div className="step-4 fade-in center-text">
                            {/* <div className="success-icon">🎉</div> */}
                            <h2>Your Review System is Ready!</h2>
                            <p className="step-description">Here's a summary of your business profile.</p>

                            <div className="business-preview-card">
                                <div className="preview-header">
                                    <div className="preview-avatar">
                                        {businessData.businessName.charAt(0).toUpperCase() || 'B'}
                                    </div>
                                    <div className="preview-info">
                                        <h3>{businessData.businessName || 'Your Business'}</h3>
                                        <p>
                                            {[businessData.address, businessData.city, businessData.country]
                                                .filter(Boolean)
                                                .join(', ') || 'Location not set'}
                                        </p>
                                        {businessData.rating && (
                                            <div className="preview-rating">
                                                {/* <span className="stars">⭐</span> */}
                                                <span className="rating-text">
                                                    {businessData.rating} ({businessData.reviewsCount} Google reviews)
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="setup-summary">
                                    <div className="summary-item">
                                        <span className="label">Google Business:</span>
                                        <span className={`value ${businessData.placeId ? 'connected' : 'not-set'}`}>
                                            {businessData.placeId ? 'Connected ' : 'Not connected '}
                                        </span>
                                    </div>
                                    {businessData.googleReviewLink && (
                                        <div className="summary-item">
                                            <span className="label">Review Link:</span>
                                            <a
                                                href={businessData.googleReviewLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="value review-link-small"
                                            >
                                                Open ↗
                                            </a>
                                        </div>
                                    )}
                                    <div className="summary-item">
                                        <span className="label">Facebook:</span>
                                        <span className="value">
                                            {businessData.facebookPage ? 'Added ' : 'Not set'}
                                        </span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="label">Instagram:</span>
                                        <span className="value">
                                            {businessData.instagramHandle ? `${businessData.instagramHandle}` : 'Not set'}
                                        </span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="label">AI Automation:</span>
                                        <span className="value">Active </span>
                                    </div>
                                </div>
                            </div>

                            <div className="final-actions">
                                <button
                                    className="btn-primary full-width"
                                    onClick={completeOnboarding}
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Saving...' : 'Go to Dashboard '}
                                </button>
                                {!businessData.placeId && (
                                    <p className="finish-note">
                                        Tip: Go back to Step 2 to connect Google Business and unlock review monitoring.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* --- Footer Navigation --- */}
                <div className="navigation-buttons">
                    {currentStep > 1 && currentStep < TOTAL_STEPS && (
                        <button className="btn-secondary" onClick={handleBack}>
                             Back
                        </button>
                    )}
                    {currentStep === TOTAL_STEPS ? null : (
                        <button
                            className="btn-primary"
                            onClick={handleNext}
                            disabled={!canProceed()}
                        >
                            {currentStep === TOTAL_STEPS - 1 ? 'Preview ' : 'Next '}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BusinessSetup;
