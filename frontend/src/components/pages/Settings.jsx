import React, { useState } from 'react'
import { useGoogleConnection } from '../../hooks/useGoogleConnection'
import ConnectionStatusBanner from '../common/ConnectionStatusBanner'

export default function Settings() {
    const [activeTab, setActiveTab] = useState('connections')
    const { isConnected, checkConnection } = useGoogleConnection()
    
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

    const handleConnectGoogle = async () => {
        try {
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

    const handleDisconnectGoogle = async () => {
        if (!confirm('Are you sure you want to disconnect your Google Business Profile? You will lose access to review data.')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:4000/api/google-oauth/disconnect', {
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

                                <div style={{
                                    padding: '16px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    color: 'var(--text-secondary)'
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
                    </div>
                )}

                {/* Reply Settings Tab */}
                {activeTab === 'reply-settings' && (
                    <>
                        {/* AI Reply Preview Section */}
                        <div className="grid-container">
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
                    <div className="grid-container">
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
                                                                padding: '12px 24px',
                                                                backgroundColor: reviewRequest.channels.includes(channel) 
                                                                    ? 'var(--primary-color)' 
                                                                    : 'var(--bg-secondary)',
                                                                color: reviewRequest.channels.includes(channel) 
                                                                    ? 'white' 
                                                                    : 'var(--text-secondary)',
                                                                border: '1px solid var(--border-color)',
                                                                borderRadius: '8px',
                                                                fontSize: '14px',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease',
                                                                textTransform: 'capitalize'
                                                            }}
                                                        >
                                                            {channel === 'email' && '📧'}
                                                            {channel === 'sms' && '💬'}
                                                            {channel === 'whatsapp' && '📱'}
                                                            {' '}{channel}
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
                                                    Days After Visit
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
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
                                                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                                    Number of days to wait before sending a review request
                                                </div>
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
                                                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                                    Maximum number of review requests to send per customer each month
                                                </div>
                                            </div>

                                            <button
                                                style={{
                                                    width: '100%',
                                                    padding: '14px',
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
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
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
        </div>
    )
}
