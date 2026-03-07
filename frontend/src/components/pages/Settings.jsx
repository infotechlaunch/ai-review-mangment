import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useGoogleConnection } from '../../hooks/useGoogleConnection'
import ConnectionStatusBanner from '../common/ConnectionStatusBanner'
import './common.css'
import api from '../../utils/api'

// CRITICAL: Cooldown persistence key
const COOLDOWN_STORAGE_KEY = 'google_api_cooldown_until';
const VERIFIED_SESSION_KEY = 'google_verified_this_session';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('connections')
    const { isConnected, checkConnection } = useGoogleConnection()
    
    // CRITICAL: Prevent multiple verification calls - use both ref AND session storage
    const hasVerifiedRef = useRef(false)
    
    // Initialize cooldown from localStorage (persists across refreshes)
    const [quotaExceeded, setQuotaExceeded] = useState(() => {
        const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
        if (stored) {
            const cooldownUntil = parseInt(stored, 10);
            return Date.now() < cooldownUntil;
        }
        return false;
    });
    
    const [cooldownSeconds, setCooldownSeconds] = useState(() => {
        const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
        if (stored) {
            const cooldownUntil = parseInt(stored, 10);
            const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
            return remaining > 0 ? remaining : 0;
        }
        return 0;
    });
    
    // State for No Business Account Popup
    const [showNoBusinessAccountPopup, setShowNoBusinessAccountPopup] = useState(false)
    const [businessAccountMessage, setBusinessAccountMessage] = useState('')
    const [isVerifyingAccount, setIsVerifyingAccount] = useState(false)
    const [popupType, setPopupType] = useState('no-business-account') // 'no-business-account', 'quota-error', 'error'
    
    // State for Business Profile
    const [businessProfile, setBusinessProfile] = useState({
        businessName: '',
        industry: '',
        address: '',
        city: '',
        country: '',
        phone: '',
        website: '',
        googleSearchName: '',
        facebookPage: '',
        instagramHandle: '',
        googleReviewLink: '',
        placeId: '',
        rating: null,
        reviewsCount: 0,
    });
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editedProfile, setEditedProfile] = useState({});
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileSaveMsg, setProfileSaveMsg] = useState(null); // { type: 'success'|'error', text }

    // State for Auto-Approval Settings
    const [autoApproval, setAutoApproval] = useState({
        autoApprovePositive: true,
        autoApproveNeutral: false,
        autoApproveNegative: false,
        autoApproveMinRating: 4
    })

    // State for Tone Settings
    const [toneSettings, setToneSettings] = useState({
        toneStyle: 'professional',
        toneKeywords: 'thank you, appreciate, valued customer',
        maxReplyLength: 150
    })

    // State for Review Request Automation
    const [reviewRequest, setReviewRequest] = useState({
        enabled: true,
        channels: ['email'],
        daysAfterVisit: 2,
        monthlyLimitPerCustomer: 1
    })

    // State for Auto-Post Settings
    const [autoPostSettings, setAutoPostSettings] = useState({
        enabled: false,
        minRating: 5,
        platforms: ['facebook', 'instagram']
    })

    // State for Auto-Reply Schedule
    const [autoReplySchedule, setAutoReplySchedule] = useState({
        enabled: false,
        delayMinutes: 30,
        startTime: '09:00',
        endTime: '18:00',
        timezone: 'UTC',
        activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    })
    const [scheduleSettingMsg, setScheduleSettingMsg] = useState(null)

    // State for AI Reply Preview
    const [aiReply, setAiReply] = useState({
        preview: 'Thank you for your wonderful feedback! We appreciate your kind words and are delighted to hear you enjoyed your experience with us.',
        isEditing: false,
        editedText: ''
    })

    const tabs = [
        { id: 'connections', label: 'Connections', icon: '🔗' },
        { id: 'reply-settings', label: 'Reply Settings', icon: '💬' },
        { id: 'automation', label: 'Automation', icon: '🤖' },
        { id: 'notifications', label: 'Notifications', icon: '🔔' }
    ]

    // Sync locations after verifying business account (DEFINED FIRST - used by verifyGoogleBusinessAccount)
    const syncLocations = useCallback(async () => {
        // CRITICAL: Check cooldown before making the call
        if (quotaExceeded || cooldownSeconds > 0) {
            console.log('⛔ Quota cooldown active - skipping sync call');
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${api.API_BASE_URL}/api/google-oauth/sync-locations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            
            // CRITICAL: Handle 429 quota exceeded
            if (response.status === 429) {
                console.error('❌ Sync quota exceeded (429) - activating cooldown timer');
                setQuotaExceeded(true);
                const cooldownTime = data.retryAfter || 600;
                setCooldownSeconds(cooldownTime);
                
                // Persist cooldown to localStorage
                const cooldownUntil = Date.now() + (cooldownTime * 1000);
                localStorage.setItem(COOLDOWN_STORAGE_KEY, cooldownUntil.toString());
                
                setBusinessAccountMessage(data.message || 'Google API quota exceeded during sync. Please try again later.');
                setPopupType('quota-error');
                setShowNoBusinessAccountPopup(true);
                return;
            }
            
            if (data.success) {
                alert('Google Business Profile connected and locations synced successfully!');
                checkConnection();
            } else if (data.error === 'QUOTA_EXCEEDED') {
                // Handle quota error from response body
                setQuotaExceeded(true);
                const cooldownTime = data.retryAfter || 600;
                setCooldownSeconds(cooldownTime);
                const cooldownUntil = Date.now() + (cooldownTime * 1000);
                localStorage.setItem(COOLDOWN_STORAGE_KEY, cooldownUntil.toString());
                
                setBusinessAccountMessage(data.message || 'Google API quota exceeded. Please try again later.');
                setPopupType('quota-error');
                setShowNoBusinessAccountPopup(true);
            }
        } catch (error) {
            console.error('Sync locations error:', error);
        }
    }, [checkConnection, quotaExceeded, cooldownSeconds]);

    // Verify if user has a Google Business account after connection
    const verifyGoogleBusinessAccount = useCallback(async () => {
        // CRITICAL: If quota is exceeded or cooldown active, don't call
        if (quotaExceeded || cooldownSeconds > 0) {
            console.log('⛔ Quota cooldown active - skipping verification call');
            const minutes = Math.ceil(cooldownSeconds / 60);
            setBusinessAccountMessage(`Google API quota cooldown active. Please retry in ${minutes} minute(s).`);
            setPopupType('quota-error');
            setShowNoBusinessAccountPopup(true);
            return;
        }

        try {
            setIsVerifyingAccount(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${api.API_BASE_URL}/api/google-oauth/verify-business-account`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            // CRITICAL: Handle 429 quota exceeded
            if (response.status === 429) {
                console.error('❌ Quota exceeded (429) - activating cooldown timer');
                setQuotaExceeded(true);
                
                // Set cooldown timer from backend response (default 10 minutes)
                const cooldownTime = data.retryAfter || 600; // seconds
                setCooldownSeconds(cooldownTime);
                
                // CRITICAL: Persist cooldown to localStorage
                const cooldownUntil = Date.now() + (cooldownTime * 1000);
                localStorage.setItem(COOLDOWN_STORAGE_KEY, cooldownUntil.toString());
                console.log(`💾 Cooldown persisted to localStorage until: ${new Date(cooldownUntil).toISOString()}`);
                
                setBusinessAccountMessage(data.message || 'Google API quota exceeded. Please try again later.');
                setPopupType('quota-error');
                setShowNoBusinessAccountPopup(true);
                return;
            }

            if (data.success) {
                if (!data.hasBusinessAccount) {
                    // User doesn't have a Google Business account
                    setBusinessAccountMessage(data.message || "You don't have a Google Business account. Please create a Google Business Profile first to use this feature.");
                    setPopupType('no-business-account');
                    setShowNoBusinessAccountPopup(true);
                } else {
                    // User has a business account, sync locations
                    await syncLocations();
                }
            } else {
                // Check if it's a quota error
                const isQuotaError = data.message?.toLowerCase().includes('quota') || 
                                     data.message?.toLowerCase().includes('rate limit') ||
                                     data.message?.toLowerCase().includes('cooldown') ||
                                     data.error === 'QUOTA_EXCEEDED';
                
                if (isQuotaError) {
                    setQuotaExceeded(true);
                    const cooldownTime = data.retryAfter || 600;
                    setCooldownSeconds(cooldownTime);
                    
                    // CRITICAL: Persist cooldown to localStorage
                    const cooldownUntil = Date.now() + (cooldownTime * 1000);
                    localStorage.setItem(COOLDOWN_STORAGE_KEY, cooldownUntil.toString());
                    
                    setBusinessAccountMessage(data.message || 'Google API quota exceeded. Please try again later.');
                    setPopupType('quota-error');
                } else {
                    setBusinessAccountMessage(data.message || 'Failed to verify Google Business account.');
                    setPopupType('error');
                }
                setShowNoBusinessAccountPopup(true);
            }
        } catch (error) {
            console.error('Verify business account error:', error);
            setBusinessAccountMessage('Failed to verify your Google Business account. Please try again.');
            setPopupType('error');
            setShowNoBusinessAccountPopup(true);
        } finally {
            setIsVerifyingAccount(false);
        }
    }, [quotaExceeded, cooldownSeconds, syncLocations]); // Dependencies

    // ✅ CRITICAL FIX: Clean URL FIRST, then check if we should verify
    // NO automatic Google API calls - user must click button
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const connected = urlParams.get('connected');
        
        // ALWAYS clean the URL immediately to prevent re-triggers
        if (connected) {
            console.log('🧹 Cleaning OAuth callback URL params...');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        // Check if already verified this session (prevents loops)
        const alreadyVerifiedThisSession = sessionStorage.getItem(VERIFIED_SESSION_KEY);
        
        // ONLY show a notification that OAuth succeeded, but DON'T auto-call verify
        // User must click "Verify & Sync" button manually
        if (connected === 'true' && !alreadyVerifiedThisSession) {
            console.log('✅ OAuth callback detected - user should click Verify & Sync button');
            // Mark as seen so we don't show this message again
            sessionStorage.setItem(VERIFIED_SESSION_KEY, 'true');
            // DON'T call verifyGoogleBusinessAccount() automatically!
            // Instead, show a helpful message
            setBusinessAccountMessage('Google account connected! Click "Verify & Sync" to complete setup.');
            setPopupType('no-business-account');
            setShowNoBusinessAccountPopup(true);
        }
    }, []); // ✅ Run ONCE on mount, NOT on isConnected changes

    // Cooldown timer countdown with localStorage persistence
    useEffect(() => {
        if (cooldownSeconds > 0) {
            const timer = setInterval(() => {
                setCooldownSeconds(prev => {
                    const next = prev - 1;
                    if (next <= 0) {
                        setQuotaExceeded(false);
                        localStorage.removeItem(COOLDOWN_STORAGE_KEY);
                        console.log('✅ Cooldown expired - API calls enabled');
                        return 0;
                    }
                    return next;
                });
            }, 1000); // Update every second
            
            return () => clearInterval(timer);
        }
    }, [cooldownSeconds]);

    const handleConnectGoogle = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${api.API_BASE_URL}/api/google-oauth/connect`, {
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

    const handleDisconnectGoogle = async () => {
        if (!confirm('Are you sure you want to disconnect your Google Business Profile? You will lose access to review data.')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${api.API_BASE_URL}/api/google-oauth/disconnect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                alert('Google Business Profile disconnected successfully');
                checkConnection();
            } else {
                alert('Failed to disconnect. Please try again.');
            }
        } catch (error) {
            console.error('Disconnect error:', error);
            alert('Failed to disconnect. Please try again.');
        }
    };

    const handleRegenerateReply = () => {
        const newReplies = [
            'Thank you for your wonderful feedback! We appreciate your kind words and are delighted to hear you enjoyed your experience with us.',
            'We\'re thrilled to hear about your positive experience! Your satisfaction is our top priority, and we look forward to serving you again.',
            'Your feedback means the world to us! Thank you for taking the time to share your experience. We hope to see you again soon!'
        ]
        const randomReply = newReplies[Math.floor(Math.random() * newReplies.length)]
        setAiReply({ ...aiReply, preview: randomReply })
    }

    // Load Business Profile
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${api.API_BASE_URL}/api/tenant/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success && data.data) {
                    const t = data.data;
                    const sp = t.social_profiles || {};
                    setBusinessProfile({
                        businessName:     t.businessName || '',
                        industry:         t.industry || '',
                        address:          t.address || '',
                        city:             t.city || '',
                        country:          t.country || '',
                        phone:            t.phone || '',
                        website:          t.website || '',
                        googleSearchName: t.googleSearchName || '',
                        facebookPage:     sp.facebookPage || t.facebookPage || '',
                        instagramHandle:  sp.instagramHandle || t.instagramHandle || '',
                        googleReviewLink: sp.googleReviewLink || t.googleReviewLink || '',
                        placeId:          sp.placeId || t.placeId || '',
                        rating:           sp.rating || null,
                        reviewsCount:     sp.reviewsCount || 0,
                    });
                }
            } catch (err) {
                console.error('Failed to load business profile:', err);
            }
        };
        fetchProfile();
    }, []);

    const handleSaveProfile = async () => {
        try {
            setIsSavingProfile(true);
            setProfileSaveMsg(null);
            const token = localStorage.getItem('token');
            const res = await fetch(`${api.API_BASE_URL}/api/tenant/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(editedProfile)
            });
            const data = await res.json();
            if (data.success) {
                setBusinessProfile({ ...businessProfile, ...editedProfile });
                setIsEditingProfile(false);
                setProfileSaveMsg({ type: 'success', text: 'Business profile updated successfully.' });
            } else {
                setProfileSaveMsg({ type: 'error', text: data.message || 'Failed to save profile.' });
            }
        } catch (err) {
            setProfileSaveMsg({ type: 'error', text: 'Error saving profile. Please try again.' });
        } finally {
            setIsSavingProfile(false);
        }
    };

    // Load Settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${api.API_BASE_URL}/api/client/settings`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                if (data.success) {
                    const s = data.settings;
                    if (s) {
                        if (s.autoApproval) {
                            const a = s.autoApproval;
                            setAutoApproval({
                                autoApprovePositive: a.autoApprovePositive ?? a.positive ?? true,
                                autoApproveNeutral: a.autoApproveNeutral ?? a.neutral ?? false,
                                autoApproveNegative: a.autoApproveNegative ?? a.negative ?? false,
                                autoApproveMinRating: a.autoApproveMinRating ?? a.minRating ?? 4,
                            });
                        }
                        if (s.tone) {
                        setToneSettings({
                            toneStyle: s.tone.style,
                            toneKeywords: s.tone.keywords,
                            maxReplyLength: s.tone.maxLength
                        });
                    }
                    if (s.automation) {
                        setReviewRequest({
                            enabled: s.automation.enabled,
                            channels: s.automation.channels,
                            daysAfterVisit: s.automation.daysAfterVisit,
                            monthlyLimitPerCustomer: s.automation.monthlyLimit
                        });
                    }
                    if (s.autoPost) {
                        setAutoPostSettings({
                            enabled: s.autoPost.enabled,
                            minRating: s.autoPost.minRating || 5,
                            platforms: s.autoPost.platforms || ['facebook', 'instagram']
                        });
                    }
                    if (s.autoReplySchedule) setAutoReplySchedule(s.autoReplySchedule);
                } // End of if (s)
            } // End of if (data.success)
        } catch (error) {
                console.error('Error fetching settings:', error);
            }
        };
        fetchSettings();
    }, []);

    const handleSaveSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const updates = {
                autoApproval: autoApproval,
                tone: {
                    style: toneSettings.toneStyle,
                    keywords: toneSettings.toneKeywords,
                    maxLength: toneSettings.maxReplyLength
                },
                automation: {
                    enabled: reviewRequest.enabled,
                    channels: reviewRequest.channels,
                    daysAfterVisit: reviewRequest.daysAfterVisit,
                    monthlyLimit: reviewRequest.monthlyLimitPerCustomer
                },
                autoPost: {
                    enabled: autoPostSettings.enabled,
                    minRating: autoPostSettings.minRating,
                    platforms: autoPostSettings.platforms
                },
                autoReplySchedule: autoReplySchedule
            };

            const response = await fetch(`${api.API_BASE_URL}/api/client/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });

            const data = await response.json();
            if (data.success) {
                alert('Settings saved successfully!');
            } else {
                alert('Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Error saving settings');
        }
    };

    const handleSaveScheduleSettings = async () => {
        try {
            setScheduleSettingMsg(null);
            const token = localStorage.getItem('token');
            const response = await fetch(`${api.API_BASE_URL}/api/client/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ autoReplySchedule })
            });
            const data = await response.json();
            if (data.success) {
                setScheduleSettingMsg({ type: 'success', text: 'Auto-reply schedule saved successfully.' });
            } else {
                setScheduleSettingMsg({ type: 'error', text: data.message || 'Failed to save schedule settings.' });
            }
        } catch (error) {
            console.error('Error saving schedule settings:', error);
            setScheduleSettingMsg({ type: 'error', text: 'Error saving schedule settings. Please try again.' });
        }
    };

    const handleToggleChannel = (channel) => {
        setReviewRequest({
            ...reviewRequest,
            channels: reviewRequest.channels.includes(channel)
                ? reviewRequest.channels.filter(c => c !== channel)
                : [...reviewRequest.channels, channel]
        })
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">Configure your AI review management preferences and automation rules</p>
            </div>
            <div className="page-content">
                {/* Tab Navigation */}
                <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    marginBottom: '24px',
                    borderBottom: '2px solid var(--border-color)'
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: activeTab === tab.id ? 'var(--primary-color)' : 'transparent',
                                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                                border: 'none',
                                borderRadius: '8px 8px 0 0',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Connections Tab */}
                {activeTab === 'connections' && (
                    <div className="grid-container">
                        <div className="grid-col-12">
                            <div className="widget-card">
                                <h3 className="widget-title">Platform Connections</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
                                    Manage your connected review platforms
                                </p>

                                <ConnectionStatusBanner />

                                <div style={{
                                    padding: '20px',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    marginBottom: '16px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '12px',
                                            backgroundColor: '#4285F4',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '24px'
                                        }}>
                                            🔍
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                Google Business Profile
                                            </h4>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-tertiary)' }}>
                                                {isConnected 
                                                    ? 'Connected and syncing reviews automatically' 
                                                    : 'Connect to manage your Google reviews and respond with AI'}
                                            </p>
                                        </div>
                                        {isConnected ? (
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <button
                                                    onClick={verifyGoogleBusinessAccount}
                                                    disabled={isVerifyingAccount || cooldownSeconds > 0}
                                                    style={{
                                                        padding: '10px 20px',
                                                        backgroundColor: cooldownSeconds > 0 ? '#94a3b8' : '#10b981',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        fontWeight: '500',
                                                        cursor: (isVerifyingAccount || cooldownSeconds > 0) ? 'not-allowed' : 'pointer',
                                                        opacity: (isVerifyingAccount || cooldownSeconds > 0) ? 0.7 : 1,
                                                        minWidth: '140px'
                                                    }}
                                                >
                                                    {isVerifyingAccount 
                                                        ? 'Verifying...' 
                                                        : cooldownSeconds > 0 
                                                        ? `Retry in ${Math.ceil(cooldownSeconds / 60)}m` 
                                                        : 'Verify & Sync'}
                                                </button>
                                                {cooldownSeconds > 0 && (
                                                    <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '500' }}>
                                                        ⏰ Quota cooldown active
                                                    </span>
                                                )}
                                                <button
                                                    onClick={handleDisconnectGoogle}
                                                    style={{
                                                        padding: '10px 20px',
                                                        backgroundColor: '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        fontWeight: '500',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Disconnect
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={handleConnectGoogle}
                                                style={{
                                                    padding: '10px 20px',
                                                    backgroundColor: '#4285F4',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Connect
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Manual Place ID Configuration (Option B - Dev Mode)
                                <div className="widget-card" style={{ marginTop: '24px' }}>
                                    <h3 className="widget-title">Development Mode (Option B)</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
                                        Use Google Places API to fetch reviews without full GBP verification. 
                                        Requires a Google Maps API Key in the server .env.
                                    </p>

                                    <div style={{
                                        padding: '20px',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        backgroundColor: '#f8fafc'
                                    }}>
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                                                Google Place ID
                                            </label>
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <input
                                                    type="text"
                                                    placeholder="ChIJa0fSREpYToYRwS..."
                                                    defaultValue={localStorage.getItem('googlePlaceId') || ''}
                                                    id="google-place-id-input"
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px 12px',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '6px',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                                <button
                                                    onClick={async () => {
                                                        const placeId = document.getElementById('google-place-id-input').value;
                                                        if (!placeId) return alert('Please enter a Place ID');
                                                        
                                                        try {
                                                            const token = localStorage.getItem('token');
                                                            const response = await fetch(`${api.API_BASE_URL}/api/onboarding/update-place-id`, {
                                                                method: 'POST',
                                                                headers: {
                                                                    'Content-Type': 'application/json',
                                                                    'Authorization': `Bearer ${token}`
                                                                },
                                                                body: JSON.stringify({ googlePlaceId: placeId })
                                                            });
                                                            const data = await response.json();
                                                            if (data.success) {
                                                                localStorage.setItem('googlePlaceId', placeId);
                                                                alert('Place ID updated successfully!');
                                                            } else {
                                                                alert('Failed to update Place ID: ' + data.message);
                                                            }
                                                        } catch (err) {
                                                            alert('Error updating Place ID: ' + err.message);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '10px 20px',
                                                        backgroundColor: 'var(--primary-color)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Save ID
                                                </button>
                                            </div>
                                            <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                                Find your Place ID using the <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)' }}>Google Place ID Finder</a>.
                                            </p>
                                        </div>
                                    </div>
                                </div> */}

                            </div>

                            {/* ── Business Profile Card ──
                            <div className="widget-card" style={{ marginTop: '24px', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                    <div>
                                        <h3 className="widget-title" style={{ margin: 0 }}>Business Profile</h3>
                                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-tertiary)' }}>Your business details used for review management</p>
                                    </div>
                                    {!isEditingProfile && (
                                        <button
                                            onClick={() => { setEditedProfile({ ...businessProfile }); setIsEditingProfile(true); setProfileSaveMsg(null); }}
                                            style={{ padding: '8px 18px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            ✏️ Edit
                                        </button>
                                    )}
                                </div>

                                {profileSaveMsg && (
                                    <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
                                        background: profileSaveMsg.type === 'success' ? '#d1fae5' : '#fee2e2',
                                        color: profileSaveMsg.type === 'success' ? '#065f46' : '#991b1b' }}>
                                        {profileSaveMsg.type === 'success' ? '✅ ' : '❌ '}{profileSaveMsg.text}
                                    </div>
                                )}

                                {isEditingProfile ? (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            {[
                                                { label: 'Business Name', key: 'businessName', required: true },
                                                { label: 'Industry / Category', key: 'industry', type: 'select', options: ['','restaurant','retail','healthcare','services','beauty','other'], optionLabels: ['Select Category','Restaurant & Food','Retail','Healthcare','Professional Services','Beauty & Wellness','Other'] },
                                                { label: 'Address', key: 'address', span: true },
                                                { label: 'City', key: 'city', required: true },
                                                { label: 'Country', key: 'country', required: true },
                                                { label: 'Phone', key: 'phone', type: 'tel' },
                                                { label: 'Website', key: 'website', type: 'url' },
                                                { label: 'Facebook Page URL', key: 'facebookPage', type: 'url' },
                                                { label: 'Instagram Handle', key: 'instagramHandle' },
                                                { label: 'Google Review Link', key: 'googleReviewLink', type: 'url', span: true },
                                            ].map(({ label, key, type = 'text', required, span, options, optionLabels }) => (
                                                <div key={key} style={{ gridColumn: span ? '1 / -1' : undefined }}>
                                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                                        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
                                                    </label>
                                                    {options ? (
                                                        <select
                                                            value={editedProfile[key] || ''}
                                                            onChange={e => setEditedProfile(p => ({ ...p, [key]: e.target.value }))}
                                                            style={{ width: '100%', padding: '9px 10px', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', color: 'var(--text-primary)', background: 'var(--card-bg)' }}
                                                        >
                                                            {options.map((o, i) => <option key={o} value={o}>{optionLabels[i]}</option>)}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type={type}
                                                            value={editedProfile[key] || ''}
                                                            onChange={e => setEditedProfile(p => ({ ...p, [key]: e.target.value }))}
                                                            style={{ width: '100%', padding: '9px 10px', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', color: 'var(--text-primary)', background: 'var(--card-bg)', boxSizing: 'border-box' }}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                            <button
                                                onClick={handleSaveProfile}
                                                disabled={isSavingProfile || !editedProfile.businessName?.trim() || !editedProfile.city?.trim() || !editedProfile.country?.trim()}
                                                style={{ padding: '10px 24px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: isSavingProfile ? 0.7 : 1 }}
                                            >
                                                {isSavingProfile ? 'Saving...' : '💾 Save Profile'}
                                            </button>
                                            <button
                                                onClick={() => { setIsEditingProfile(false); setProfileSaveMsg(null); }}
                                                style={{ padding: '10px 20px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        {[
                                            { label: 'Business Name', value: businessProfile.businessName },
                                            { label: 'Industry', value: businessProfile.industry },
                                            { label: 'Address', value: [businessProfile.address, businessProfile.city, businessProfile.country].filter(Boolean).join(', '), span: true },
                                            { label: 'Phone', value: businessProfile.phone },
                                            { label: 'Website', value: businessProfile.website, link: true },
                                            { label: 'Facebook', value: businessProfile.facebookPage, link: true },
                                            { label: 'Instagram', value: businessProfile.instagramHandle },
                                            { label: 'Google Review Link', value: businessProfile.googleReviewLink, link: true, span: true },
                                            { label: 'Google Rating', value: businessProfile.rating ? `⭐ ${businessProfile.rating} (${businessProfile.reviewsCount} reviews)` : null },
                                            { label: 'Place ID', value: businessProfile.placeId, mono: true },
                                        ].map(({ label, value, link, span, mono }) => (
                                            <div key={label} style={{ gridColumn: span ? '1 / -1' : undefined, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{label}</div>
                                                {value ? (
                                                    link ? (
                                                        <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer"
                                                            style={{ fontSize: '14px', color: 'var(--primary-color)', wordBreak: 'break-all' }}>{value}</a>
                                                    ) : (
                                                        <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</span>
                                                    )
                                                ) : (
                                                    <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Not set</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div> */}

                            {/* ── About Platform Connections ── */}
                            <div style={{
                                    padding: '16px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    color: 'var(--text-secondary)',
                                    marginTop: '24px'
                                }}>
                                    <p style={{ margin: 0, fontWeight: '600', marginBottom: '8px' }}>
                                        💡 About Platform Connections
                                    </p>
                                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                        <li>Reviews are synced automatically every hour</li>
                                        <li>AI-generated responses can be posted directly to Google</li>
                                        <li>You can disconnect at any time from this page</li>
                                        <li>Your review data remains in the system after disconnecting</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                )}

                {/* Reply Settings Tab */}
                {activeTab === 'reply-settings' && (
                    <>
                        {/* AI Reply Preview Section */}
                        {/* <div className="grid-container">
                            <div className="grid-col-12">
                                <div className="widget-card">
                                    <h3 className="widget-title">AI Reply Preview</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
                                        Preview and customize AI-generated responses
                                    </p>

                                    <div style={{ 
                                        padding: '20px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: '8px',
                                        marginBottom: '16px',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        {aiReply.isEditing ? (
                                            <textarea
                                                value={aiReply.editedText || aiReply.preview}
                                                onChange={(e) => setAiReply({ ...aiReply, editedText: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    minHeight: '120px',
                                                    padding: '12px',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    color: 'var(--text-primary)',
                                                    backgroundColor: 'var(--card-bg)',
                                                    fontFamily: 'inherit',
                                                    resize: 'vertical'
                                                }}
                                            />
                                        ) : (
                                            <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                                                {aiReply.preview}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button
                                            onClick={handleRegenerateReply}
                                            style={{
                                                padding: '10px 20px',
                                                backgroundColor: 'var(--bg-tertiary)',
                                                color: 'var(--text-primary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            🔄 Regenerate Reply
                                        </button>
                                        {aiReply.isEditing ? (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setAiReply({ 
                                                            ...aiReply, 
                                                            preview: aiReply.editedText || aiReply.preview,
                                                            isEditing: false 
                                                        })
                                                    }}
                                                    style={{
                                                        padding: '10px 20px',
                                                        backgroundColor: '#10b981',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ✓ Save Changes
                                                </button>
                                                <button
                                                    onClick={() => setAiReply({ ...aiReply, isEditing: false, editedText: '' })}
                                                    style={{
                                                        padding: '10px 20px',
                                                        backgroundColor: 'var(--bg-tertiary)',
                                                        color: 'var(--text-secondary)',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setAiReply({ ...aiReply, isEditing: true })}
                                                    style={{
                                                        padding: '10px 20px',
                                                        backgroundColor: 'var(--primary-color)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ✏️ Edit & Approve
                                                </button>
                                                <button
                                                    style={{
                                                        padding: '10px 20px',
                                                        backgroundColor: '#10b981',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ✓ Approve
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div> */}

                        {/* Auto-Reply Schedule */}
                        <div className="grid-container" style={{ marginTop: '24px' }}>
                            <div className="grid-col-12">
                                <div className="widget-card">
                                    <h3 className="widget-title">⏰ Auto-Reply Schedule</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
                                        Control <strong>when</strong> the AI sends auto-replies — set a delay, an active time window, and which days of the week it operates
                                    </p>

                                    {scheduleSettingMsg && (
                                        <div style={{
                                            marginBottom: '16px', padding: '10px 14px', borderRadius: '8px',
                                            background: scheduleSettingMsg.type === 'success' ? '#d1fae5' : '#fee2e2',
                                            color: scheduleSettingMsg.type === 'success' ? '#065f46' : '#991b1b',
                                            fontSize: '13px', fontWeight: '500'
                                        }}>
                                            {scheduleSettingMsg.type === 'success' ? '✅ ' : '❌ '}{scheduleSettingMsg.text}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {/* Enable Toggle */}
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px',
                                            border: `2px solid ${autoReplySchedule.enabled ? 'var(--primary-color)' : 'var(--border-color)'}`
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '16px', color: 'var(--text-primary)' }}>
                                                    Enable Auto-Reply Scheduling
                                                </div>
                                                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                                    AI will only send auto-replies within the configured time window and days
                                                </div>
                                            </div>
                                            <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '30px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={autoReplySchedule.enabled}
                                                    onChange={(e) => setAutoReplySchedule({ ...autoReplySchedule, enabled: e.target.checked })}
                                                    style={{ opacity: 0, width: 0, height: 0 }}
                                                />
                                                <span style={{
                                                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                                    backgroundColor: autoReplySchedule.enabled ? '#10b981' : '#ccc',
                                                    transition: '0.4s', borderRadius: '30px'
                                                }}>
                                                    <span style={{
                                                        position: 'absolute', height: '24px', width: '24px',
                                                        left: autoReplySchedule.enabled ? '33px' : '3px', bottom: '3px',
                                                        backgroundColor: 'white', transition: '0.4s', borderRadius: '50%'
                                                    }}></span>
                                                </span>
                                            </label>
                                        </div>

                                        {autoReplySchedule.enabled && (
                                            <>
                                                {/* Reply Delay */}
                                                <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                                    <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '12px' }}>
                                                        ⏱️ Reply Delay After Review Received
                                                    </label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="120"
                                                            step="5"
                                                            value={autoReplySchedule.delayMinutes}
                                                            onChange={(e) => setAutoReplySchedule({ ...autoReplySchedule, delayMinutes: parseInt(e.target.value) })}
                                                            style={{ flex: 1, accentColor: 'var(--primary-color)', height: '6px', cursor: 'pointer' }}
                                                        />
                                                        <div style={{
                                                            minWidth: '90px', padding: '8px 12px',
                                                            backgroundColor: 'var(--primary-color)', color: 'white',
                                                            borderRadius: '8px', textAlign: 'center',
                                                            fontSize: '14px', fontWeight: '700'
                                                        }}>
                                                            {autoReplySchedule.delayMinutes === 0 ? '⚡ Instant' : `${autoReplySchedule.delayMinutes} min`}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>0 (Instant)</span>
                                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>30 min</span>
                                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>60 min</span>
                                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>2 hours</span>
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                                        Wait this long after a review is received before sending the auto-reply
                                                    </div>
                                                </div>

                                                {/* Time Window + Timezone */}
                                                <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                                    <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '12px' }}>
                                                        🕐 Active Reply Time Window
                                                    </label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                                From
                                                            </label>
                                                            <input
                                                                type="time"
                                                                value={autoReplySchedule.startTime}
                                                                onChange={(e) => setAutoReplySchedule({ ...autoReplySchedule, startTime: e.target.value })}
                                                                style={{
                                                                    width: '100%', padding: '10px', border: '1px solid var(--border-color)',
                                                                    borderRadius: '6px', fontSize: '14px', color: 'var(--text-primary)',
                                                                    backgroundColor: 'var(--card-bg)', boxSizing: 'border-box'
                                                                }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                                To
                                                            </label>
                                                            <input
                                                                type="time"
                                                                value={autoReplySchedule.endTime}
                                                                onChange={(e) => setAutoReplySchedule({ ...autoReplySchedule, endTime: e.target.value })}
                                                                style={{
                                                                    width: '100%', padding: '10px', border: '1px solid var(--border-color)',
                                                                    borderRadius: '6px', fontSize: '14px', color: 'var(--text-primary)',
                                                                    backgroundColor: 'var(--card-bg)', boxSizing: 'border-box'
                                                                }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                                Timezone
                                                            </label>
                                                            <select
                                                                value={autoReplySchedule.timezone}
                                                                onChange={(e) => setAutoReplySchedule({ ...autoReplySchedule, timezone: e.target.value })}
                                                                style={{
                                                                    width: '100%', padding: '10px', border: '1px solid var(--border-color)',
                                                                    borderRadius: '6px', fontSize: '14px', color: 'var(--text-primary)',
                                                                    backgroundColor: 'var(--card-bg)'
                                                                }}
                                                            >
                                                                <option value="UTC">UTC</option>
                                                                <option value="America/New_York">Eastern (ET)</option>
                                                                <option value="America/Chicago">Central (CT)</option>
                                                                <option value="America/Denver">Mountain (MT)</option>
                                                                <option value="America/Los_Angeles">Pacific (PT)</option>
                                                                <option value="Europe/London">London (GMT)</option>
                                                                <option value="Europe/Paris">Central Europe (CET)</option>
                                                                <option value="Asia/Dubai">Dubai (GST)</option>
                                                                <option value="Asia/Kolkata">India (IST)</option>
                                                                <option value="Asia/Singapore">Singapore (SGT)</option>
                                                                <option value="Asia/Tokyo">Japan (JST)</option>
                                                                <option value="Australia/Sydney">Sydney (AEST)</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                                                        Reviews received outside this window will be queued and replied when the window opens
                                                    </div>
                                                </div>

                                                {/* Active Days */}
                                                <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                                    <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '12px' }}>
                                                        📅 Active Days
                                                    </label>
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                                        {[
                                                            { key: 'monday', short: 'Mon' },
                                                            { key: 'tuesday', short: 'Tue' },
                                                            { key: 'wednesday', short: 'Wed' },
                                                            { key: 'thursday', short: 'Thu' },
                                                            { key: 'friday', short: 'Fri' },
                                                            { key: 'saturday', short: 'Sat' },
                                                            { key: 'sunday', short: 'Sun' },
                                                        ].map(({ key, short }) => {
                                                            const isActive = autoReplySchedule.activeDays.includes(key);
                                                            return (
                                                                <button
                                                                    key={key}
                                                                    onClick={() => {
                                                                        const days = autoReplySchedule.activeDays;
                                                                        setAutoReplySchedule({
                                                                            ...autoReplySchedule,
                                                                            activeDays: isActive
                                                                                ? days.filter(d => d !== key)
                                                                                : [...days, key]
                                                                        });
                                                                    }}
                                                                    style={{
                                                                        padding: '8px 16px',
                                                                        borderRadius: '20px',
                                                                        border: `2px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                                                        backgroundColor: isActive ? 'var(--primary-color)' : 'transparent',
                                                                        color: isActive ? 'white' : 'var(--text-secondary)',
                                                                        cursor: 'pointer',
                                                                        fontSize: '13px',
                                                                        fontWeight: '600',
                                                                        transition: 'all 0.2s ease'
                                                                    }}
                                                                >
                                                                    {short}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        <button
                                                            onClick={() => setAutoReplySchedule({ ...autoReplySchedule, activeDays: ['monday','tuesday','wednesday','thursday','friday'] })}
                                                            style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '500' }}
                                                        >
                                                            Weekdays only
                                                        </button>
                                                        <button
                                                            onClick={() => setAutoReplySchedule({ ...autoReplySchedule, activeDays: ['saturday','sunday'] })}
                                                            style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '500' }}
                                                        >
                                                            Weekends only
                                                        </button>
                                                        <button
                                                            onClick={() => setAutoReplySchedule({ ...autoReplySchedule, activeDays: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] })}
                                                            style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '500' }}
                                                        >
                                                            Every day
                                                        </button>
                                                        <button
                                                            onClick={() => setAutoReplySchedule({ ...autoReplySchedule, activeDays: [] })}
                                                            style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid #ef4444', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: '500' }}
                                                        >
                                                            Clear all
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Live Summary */}
                                                <div style={{
                                                    padding: '16px', borderRadius: '8px',
                                                    backgroundColor: 'rgba(99,102,241,0.08)',
                                                    border: '1px solid rgba(99,102,241,0.25)'
                                                }}>
                                                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                                                        <span style={{ fontWeight: '700', color: 'var(--primary-color)' }}>📋 Schedule Summary: </span>
                                                        Auto-replies will be sent{' '}
                                                        <strong>{autoReplySchedule.delayMinutes === 0 ? 'immediately' : `after a ${autoReplySchedule.delayMinutes}-minute delay`}</strong>,
                                                        between <strong>{autoReplySchedule.startTime}</strong> and <strong>{autoReplySchedule.endTime}</strong>{' '}
                                                        ({autoReplySchedule.timezone}), on{' '}
                                                        <strong>
                                                            {autoReplySchedule.activeDays.length === 0
                                                                ? '⚠️ no days selected'
                                                                : autoReplySchedule.activeDays.length === 7
                                                                ? 'every day'
                                                                : autoReplySchedule.activeDays.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
                                                        </strong>.
                                                    </p>
                                                </div>
                                            </>
                                        )}

                                        <button
                                            onClick={handleSaveScheduleSettings}
                                            style={{
                                                width: '100%', padding: '12px',
                                                backgroundColor: 'var(--primary-color)', color: 'white',
                                                border: 'none', borderRadius: '6px',
                                                fontSize: '14px', fontWeight: '600', cursor: 'pointer'
                                            }}
                                        >
                                            💾 Save Schedule Settings
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Auto-Approval Settings */}
                        <div className="grid-container">
                            <div className="grid-col-6">
                                <div className="widget-card">
                                    <h3 className="widget-title">Auto-Approval Settings</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
                                        Configure automatic approval rules for AI-generated replies
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {/* Auto Approve Positive */}
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            padding: '16px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: '8px'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>
                                                    Auto-approve Positive Reviews
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                                    Automatically approve replies for positive sentiment
                                                </div>
                                            </div>
                                            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={autoApproval.autoApprovePositive}
                                                    onChange={(e) => setAutoApproval({ ...autoApproval, autoApprovePositive: e.target.checked })}
                                                    style={{ opacity: 0, width: 0, height: 0 }}
                                                />
                                                <span style={{
                                                    position: 'absolute',
                                                    cursor: 'pointer',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    backgroundColor: autoApproval.autoApprovePositive ? '#10b981' : '#ccc',
                                                    transition: '0.4s',
                                                    borderRadius: '24px'
                                                }}>
                                                    <span style={{
                                                        position: 'absolute',
                                                        content: '',
                                                        height: '18px',
                                                        width: '18px',
                                                        left: autoApproval.autoApprovePositive ? '29px' : '3px',
                                                        bottom: '3px',
                                                        backgroundColor: 'white',
                                                        transition: '0.4s',
                                                        borderRadius: '50%'
                                                    }}></span>
                                                </span>
                                            </label>
                                        </div>

                                        {/* Auto Approve Neutral */}
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            padding: '16px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: '8px'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>
                                                    Auto-approve Neutral Reviews
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                                    Automatically approve replies for neutral sentiment
                                                </div>
                                            </div>
                                            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={autoApproval.autoApproveNeutral}
                                                    onChange={(e) => setAutoApproval({ ...autoApproval, autoApproveNeutral: e.target.checked })}
                                                    style={{ opacity: 0, width: 0, height: 0 }}
                                                />
                                                <span style={{
                                                    position: 'absolute',
                                                    cursor: 'pointer',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    backgroundColor: autoApproval.autoApproveNeutral ? '#10b981' : '#ccc',
                                                    transition: '0.4s',
                                                    borderRadius: '24px'
                                                }}>
                                                    <span style={{
                                                        position: 'absolute',
                                                        content: '',
                                                        height: '18px',
                                                        width: '18px',
                                                        left: autoApproval.autoApproveNeutral ? '29px' : '3px',
                                                        bottom: '3px',
                                                        backgroundColor: 'white',
                                                        transition: '0.4s',
                                                        borderRadius: '50%'
                                                    }}></span>
                                                </span>
                                            </label>
                                        </div>

                                        {/* Auto Approve Negative */}
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            padding: '16px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: '8px'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>
                                                    Auto-approve Negative Reviews
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                                    Automatically approve replies for negative sentiment
                                                </div>
                                            </div>
                                            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={autoApproval.autoApproveNegative}
                                                    onChange={(e) => setAutoApproval({ ...autoApproval, autoApproveNegative: e.target.checked })}
                                                    style={{ opacity: 0, width: 0, height: 0 }}
                                                />
                                                <span style={{
                                                    position: 'absolute',
                                                    cursor: 'pointer',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    backgroundColor: autoApproval.autoApproveNegative ? '#10b981' : '#ccc',
                                                    transition: '0.4s',
                                                    borderRadius: '24px'
                                                }}>
                                                    <span style={{
                                                        position: 'absolute',
                                                        content: '',
                                                        height: '18px',
                                                        width: '18px',
                                                        left: autoApproval.autoApproveNegative ? '29px' : '3px',
                                                        bottom: '3px',
                                                        backgroundColor: 'white',
                                                        transition: '0.4s',
                                                        borderRadius: '50%'
                                                    }}></span>
                                                </span>
                                            </label>
                                        </div>

                                        {/* Minimum Rating */}
                                        <div style={{ 
                                            padding: '16px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: '8px'
                                        }}>
                                            <label style={{ 
                                                display: 'block',
                                                fontWeight: '600',
                                                fontSize: '14px',
                                                color: 'var(--text-primary)',
                                                marginBottom: '8px'
                                            }}>
                                                Minimum Rating for Auto-Approval
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="5"
                                                value={autoApproval.autoApproveMinRating}
                                                onChange={(e) => setAutoApproval({ ...autoApproval, autoApproveMinRating: parseInt(e.target.value) })}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    color: 'var(--text-primary)',
                                                    backgroundColor: 'var(--card-bg)'
                                                }}
                                            />
                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                                Only auto-approve reviews with this rating or higher (1-5 stars)
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSaveSettings}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            backgroundColor: 'var(--primary-color)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            marginTop: '16px'
                                        }}
                                    >
                                        Save Auto-Approval Settings
                                    </button>
                                </div>
                            </div>

                            {/* Tone Settings */}
                            <div className="grid-col-6">
                                <div className="widget-card">
                                    <h3 className="widget-title">Tone & Style Settings</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
                                        Customize the tone and style of AI-generated replies
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {/* Tone Style Dropdown */}
                                        <div>
                                            <label style={{ 
                                                display: 'block',
                                                fontWeight: '600',
                                                fontSize: '14px',
                                                color: 'var(--text-primary)',
                                                marginBottom: '8px'
                                            }}>
                                                Reply Tone Style
                                            </label>
                                            <select
                                                value={toneSettings.toneStyle}
                                                onChange={(e) => setToneSettings({ ...toneSettings, toneStyle: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    color: 'var(--text-primary)',
                                                    backgroundColor: 'var(--card-bg)'
                                                }}
                                            >
                                                <option value="professional">Professional</option>
                                                <option value="friendly">Friendly</option>
                                                <option value="casual">Casual</option>
                                                <option value="formal">Formal</option>
                                                <option value="empathetic">Empathetic</option>
                                            </select>
                                        </div>

                                        {/* Tone Keywords */}
                                        <div>
                                            <label style={{ 
                                                display: 'block',
                                                fontWeight: '600',
                                                fontSize: '14px',
                                                color: 'var(--text-primary)',
                                                marginBottom: '8px'
                                            }}>
                                                Preferred Keywords/Phrases
                                            </label>
                                            <textarea
                                                value={toneSettings.toneKeywords}
                                                onChange={(e) => setToneSettings({ ...toneSettings, toneKeywords: e.target.value })}
                                                placeholder="e.g., thank you, appreciate, valued customer"
                                                style={{
                                                    width: '100%',
                                                    minHeight: '100px',
                                                    padding: '10px',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    color: 'var(--text-primary)',
                                                    backgroundColor: 'var(--card-bg)',
                                                    fontFamily: 'inherit',
                                                    resize: 'vertical'
                                                }}
                                            />
                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                                Separate multiple keywords with commas
                                            </div>
                                        </div>

                                        {/* Max Reply Length */}
                                        <div>
                                            <label style={{ 
                                                display: 'block',
                                                fontWeight: '600',
                                                fontSize: '14px',
                                                color: 'var(--text-primary)',
                                                marginBottom: '8px'
                                            }}>
                                                Maximum Reply Length (characters)
                                            </label>
                                            <input
                                                type="number"
                                                min="50"
                                                max="500"
                                                value={toneSettings.maxReplyLength}
                                                onChange={(e) => setToneSettings({ ...toneSettings, maxReplyLength: parseInt(e.target.value) })}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    color: 'var(--text-primary)',
                                                    backgroundColor: 'var(--card-bg)'
                                                }}
                                            />
                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                                Keep replies concise (50-500 characters recommended)
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleSaveSettings}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                backgroundColor: 'var(--primary-color)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                marginTop: '8px'
                                            }}
                                        >
                                            Save Tone Settings
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Automation Tab */}
                {activeTab === 'automation' && (
                    <>
                        {/* Social Auto-Share */}
                        <div className="grid-container">
                            <div className="grid-col-12">
                                <div className="widget-card">
                                    <h3 className="widget-title">Social Auto-Share</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
                                        Automatically create social posts for top-rated reviews
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '16px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: '8px'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>
                                                    Auto-post 5★ Reviews
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                                    Create stories/posts for new 5-star reviews
                                                </div>
                                            </div>
                                            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={autoPostSettings.enabled}
                                                    onChange={(e) => setAutoPostSettings({ ...autoPostSettings, enabled: e.target.checked })}
                                                    style={{ opacity: 0, width: 0, height: 0 }}
                                                />
                                                <span style={{
                                                    position: 'absolute',
                                                    cursor: 'pointer',
                                                    top: 0, left: 0, right: 0, bottom: 0,
                                                    backgroundColor: autoPostSettings.enabled ? '#10b981' : '#ccc',
                                                    borderRadius: '34px',
                                                    transition: '.4s'
                                                }}>
                                                    <span style={{
                                                        position: 'absolute',
                                                        content: "",
                                                        height: '18px',
                                                        width: '18px',
                                                        left: autoPostSettings.enabled ? '29px' : '3px',
                                                        bottom: '3px',
                                                        backgroundColor: 'white',
                                                        borderRadius: '50%',
                                                        transition: '.4s'
                                                    }}></span>
                                                </span>
                                            </label>
                                        </div>

                                        {autoPostSettings.enabled && (
                                            <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                                    Target Platforms
                                                </label>
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    {['facebook', 'instagram'].map(platform => (
                                                        <label key={platform} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={autoPostSettings.platforms.includes(platform)}
                                                                onChange={(e) => {
                                                                    const current = autoPostSettings.platforms;
                                                                    const updated = e.target.checked
                                                                        ? [...current, platform]
                                                                        : current.filter(p => p !== platform);
                                                                    setAutoPostSettings({ ...autoPostSettings, platforms: updated });
                                                                }}
                                                            />
                                                            <span style={{ textTransform: 'capitalize', fontSize: '14px' }}>{platform}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={handleSaveSettings}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                backgroundColor: 'var(--primary-color)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                marginTop: '8px'
                                            }}
                                        >
                                            Save Social Auto-Share Settings
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Review Request Automation */}
                        <div className="grid-container" style={{ marginTop: '24px' }}>
                            <div className="grid-col-12">
                                <div className="widget-card">
                                    <h3 className="widget-title">Review Request Automation</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
                                        Automatically send review requests to customers after their visit
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {/* Enable/Disable */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '20px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: '8px',
                                            border: '2px solid var(--border-color)'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '16px', color: 'var(--text-primary)' }}>
                                                    Enable Review Request Automation
                                                </div>
                                                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                                    Automatically send requests to customers via selected channels
                                                </div>
                                            </div>
                                            <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '30px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={reviewRequest.enabled}
                                                    onChange={(e) => setReviewRequest({ ...reviewRequest, enabled: e.target.checked })}
                                                    style={{ opacity: 0, width: 0, height: 0 }}
                                                />
                                                <span style={{
                                                    position: 'absolute',
                                                    cursor: 'pointer',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    backgroundColor: reviewRequest.enabled ? '#10b981' : '#ccc',
                                                    transition: '0.4s',
                                                    borderRadius: '30px'
                                                }}>
                                                    <span style={{
                                                        position: 'absolute',
                                                        content: '',
                                                        height: '24px',
                                                        width: '24px',
                                                        left: reviewRequest.enabled ? '33px' : '3px',
                                                        bottom: '3px',
                                                        backgroundColor: 'white',
                                                        transition: '0.4s',
                                                        borderRadius: '50%'
                                                    }}></span>
                                                </span>
                                            </label>
                                        </div>

                                        {reviewRequest.enabled && (
                                            <>
                                                {/* Channel Selector */}
                                                <div>
                                                    <label style={{
                                                        display: 'block',
                                                        fontWeight: '600',
                                                        fontSize: '14px',
                                                        color: 'var(--text-primary)',
                                                        marginBottom: '12px'
                                                    }}>
                                                        Communication Channels
                                                    </label>
                                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                        {['email', 'sms', 'whatsapp'].map(channel => (
                                                            <button
                                                                key={channel}
                                                                onClick={() => handleToggleChannel(channel)}
                                                                style={{
                                                                    padding: '8px 16px',
                                                                    borderRadius: '20px',
                                                                    border: `1px solid ${reviewRequest.channels.includes(channel) ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                                                    backgroundColor: reviewRequest.channels.includes(channel) ? 'var(--primary-color-light)' : 'transparent',
                                                                    color: reviewRequest.channels.includes(channel) ? 'var(--primary-color)' : 'var(--text-secondary)',
                                                                    cursor: 'pointer',
                                                                    fontSize: '14px',
                                                                    textTransform: 'capitalize'
                                                                }}
                                                            >
                                                                {channel === 'sms' ? 'SMS' : channel.charAt(0).toUpperCase() + channel.slice(1)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Days After Visit */}
                                                <div>
                                                    <label style={{
                                                        display: 'block',
                                                        fontWeight: '600',
                                                        fontSize: '14px',
                                                        color: 'var(--text-primary)',
                                                        marginBottom: '8px'
                                                    }}>
                                                        Send Request After (Days)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="30"
                                                        value={reviewRequest.daysAfterVisit}
                                                        onChange={(e) => setReviewRequest({ ...reviewRequest, daysAfterVisit: parseInt(e.target.value) })}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px',
                                                            border: '1px solid var(--border-color)',
                                                            borderRadius: '6px',
                                                            fontSize: '14px',
                                                            color: 'var(--text-primary)',
                                                            backgroundColor: 'var(--card-bg)'
                                                        }}
                                                    />
                                                </div>

                                                {/* Monthly Limit */}
                                                <div>
                                                    <label style={{
                                                        display: 'block',
                                                        fontWeight: '600',
                                                        fontSize: '14px',
                                                        color: 'var(--text-primary)',
                                                        marginBottom: '8px'
                                                    }}>
                                                        Monthly Limit Per Customer
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="10"
                                                        value={reviewRequest.monthlyLimitPerCustomer}
                                                        onChange={(e) => setReviewRequest({ ...reviewRequest, monthlyLimitPerCustomer: parseInt(e.target.value) })}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px',
                                                            border: '1px solid var(--border-color)',
                                                            borderRadius: '6px',
                                                            fontSize: '14px',
                                                            color: 'var(--text-primary)',
                                                            backgroundColor: 'var(--card-bg)'
                                                        }}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <button
                                            onClick={handleSaveSettings}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                backgroundColor: 'var(--primary-color)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                marginTop: '8px'
                                            }}
                                        >
                                            Save Automation Settings
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                    <div className="grid-container">
                        <div className="grid-col-12">
                            <div className="widget-card">
                                <h3 className="widget-title">Notification Preferences</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
                                    Manage how you receive notifications about reviews and responses
                                </p>
                                <div style={{ 
                                    padding: '40px', 
                                    textAlign: 'center', 
                                    color: 'var(--text-tertiary)' 
                                }}>
                                    Notification settings coming soon...
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Error/Warning Popup Modal */}
            {showNoBusinessAccountPopup && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        backgroundColor: 'var(--card-bg, #1a1a2e)',
                        borderRadius: '16px',
                        padding: '32px',
                        maxWidth: '480px',
                        width: '90%',
                        textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        border: '1px solid var(--border-color, #333)',
                        animation: 'fadeIn 0.3s ease'
                    }}>
                        {/* Dynamic Icon based on error type */}
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            backgroundColor: popupType === 'quota-error' ? '#f59e0b' : '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px auto',
                            fontSize: '40px'
                        }}>
                            {popupType === 'quota-error' ? '⏱️' : '⚠️'}
                        </div>

                        {/* Dynamic Title */}
                        <h2 style={{
                            margin: '0 0 16px 0',
                            fontSize: '24px',
                            fontWeight: '700',
                            color: 'var(--text-primary, #fff)'
                        }}>
                            {popupType === 'quota-error' 
                                ? 'Google API Quota Exceeded' 
                                : popupType === 'no-business-account' 
                                    ? 'No Google Business Account Found'
                                    : 'Connection Error'}
                        </h2>

                        {/* Message */}
                        <p style={{
                            margin: '0 0 24px 0',
                            fontSize: '15px',
                            lineHeight: '1.6',
                            color: 'var(--text-secondary, #a0a0a0)'
                        }}>
                            {businessAccountMessage}
                        </p>

                        {/* Dynamic Info Box based on error type */}
                        {popupType === 'quota-error' ? (
                            <div style={{
                                padding: '16px',
                                backgroundColor: 'var(--bg-secondary, #252542)',
                                borderRadius: '8px',
                                marginBottom: '24px',
                                textAlign: 'left'
                            }}>
                                <p style={{ 
                                    margin: '0 0 8px 0', 
                                    fontSize: '14px', 
                                    fontWeight: '600', 
                                    color: 'var(--text-primary, #fff)' 
                                }}>
                                    💡 What you can do:
                                </p>
                                <ul style={{ 
                                    margin: 0, 
                                    paddingLeft: '20px', 
                                    fontSize: '13px', 
                                    color: 'var(--text-tertiary, #888)',
                                    lineHeight: '1.8'
                                }}>
                                    <li><strong style={{color: '#10b981'}}>Skip & Sync</strong> - Try syncing your locations directly (recommended)</li>
                                    <li><strong style={{color: '#f59e0b'}}>Try Again</strong> - Retry the verification (may fail if quota still exceeded)</li>
                                    <li>Wait 1-2 minutes for Google's rate limit to reset</li>
                                    <li>Your account is connected - this is just a temporary limit</li>
                                </ul>
                            </div>
                        ) : popupType === 'no-business-account' ? (
                            <div style={{
                                padding: '16px',
                                backgroundColor: 'var(--bg-secondary, #252542)',
                                borderRadius: '8px',
                                marginBottom: '24px',
                                textAlign: 'left'
                            }}>
                                <p style={{ 
                                    margin: '0 0 8px 0', 
                                    fontSize: '14px', 
                                    fontWeight: '600', 
                                    color: 'var(--text-primary, #fff)' 
                                }}>
                                    💡 How to create a Google Business Profile:
                                </p>
                                <ol style={{ 
                                    margin: 0, 
                                    paddingLeft: '20px', 
                                    fontSize: '13px', 
                                    color: 'var(--text-tertiary, #888)',
                                    lineHeight: '1.8'
                                }}>
                                    <li>Go to <a href="https://business.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#4285F4' }}>business.google.com</a></li>
                                    <li>Click "Manage now" and sign in</li>
                                    <li>Follow the steps to add your business</li>
                                    <li>Verify your business ownership</li>
                                    <li>Come back here and connect again</li>
                                </ol>
                            </div>
                        ) : (
                            <div style={{
                                padding: '16px',
                                backgroundColor: 'var(--bg-secondary, #252542)',
                                borderRadius: '8px',
                                marginBottom: '24px',
                                textAlign: 'left'
                            }}>
                                <p style={{ 
                                    margin: '0', 
                                    fontSize: '13px', 
                                    color: 'var(--text-tertiary, #888)'
                                }}>
                                    Please try reconnecting your Google account or contact support if the issue persists.
                                </p>
                            </div>
                        )}

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setShowNoBusinessAccountPopup(false)}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: 'var(--bg-tertiary, #333)',
                                    color: 'var(--text-primary, #fff)',
                                    border: '1px solid var(--border-color, #444)',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Close
                            </button>
                            {popupType === 'quota-error' ? (
                                <>
                                    {/* During cooldown, only show informational text - NO buttons that call API */}
                                    <div style={{
                                        padding: '12px 20px',
                                        backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}>
                                        <span style={{ fontSize: '20px' }}>⏰</span>
                                        <div>
                                            <div style={{ 
                                                fontSize: '14px', 
                                                fontWeight: '600', 
                                                color: '#f59e0b',
                                                marginBottom: '4px'
                                            }}>
                                                {cooldownSeconds > 0 
                                                    ? `Cooldown: ${Math.ceil(cooldownSeconds / 60)} minute(s) remaining`
                                                    : 'Cooldown expired - you can try again'}
                                            </div>
                                            <div style={{ 
                                                fontSize: '12px', 
                                                color: 'var(--text-tertiary, #888)' 
                                            }}>
                                                {cooldownSeconds > 0 
                                                    ? 'Please wait before making another request'
                                                    : 'Click "Verify & Sync" button when ready'}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : popupType === 'no-business-account' ? (
                                <a
                                    href="https://business.google.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        padding: '12px 24px',
                                        backgroundColor: '#4285F4',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        textDecoration: 'none',
                                        display: 'inline-block',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    Create Business Profile
                                </a>
                            ) : (
                                <button
                                    onClick={() => {
                                        setShowNoBusinessAccountPopup(false);
                                        handleConnectGoogle();
                                    }}
                                    style={{
                                        padding: '12px 24px',
                                        backgroundColor: '#4285F4',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    Reconnect
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Verifying Account Loading Overlay */}
            {isVerifyingAccount && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        backgroundColor: 'var(--card-bg, #1a1a2e)',
                        borderRadius: '16px',
                        padding: '32px',
                        textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        border: '1px solid var(--border-color, #333)'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            border: '4px solid var(--border-color, #333)',
                            borderTopColor: '#4285F4',
                            borderRadius: '50%',
                            margin: '0 auto 16px auto',
                            animation: 'spin 1s linear infinite'
                        }}></div>
                        <p style={{
                            margin: 0,
                            fontSize: '16px',
                            color: 'var(--text-primary, #fff)'
                        }}>
                            Verifying Google Business Account...
                        </p>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}
