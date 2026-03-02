import React, { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiRequest } from '../../utils/api'
import './SocialShare.css'

// Simple SVG Icons for platforms
const GoogleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" />
    </svg>
)

const FacebookIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
)

export default function SocialShare() {
    const location = useLocation()
    const navigate = useNavigate()
    const previewRef = useRef(null)

    // State Declarations
    const [review, setReview] = useState(location.state?.review || null)
    const [autoPostEnabled, setAutoPostEnabled] = useState(false)
    const [savedSettings, setSavedSettings] = useState(false)
    const [platform, setPlatform] = useState('instagram')
    const [bgColor, setBgColor] = useState('#ffffff')
    const [textColor, setTextColor] = useState('#1f2937')
    const [aspectRatio, setAspectRatio] = useState('square')
    const [logo, setLogo] = useState(null)
    const [customCaption, setCustomCaption] = useState('')
    const [isPosting, setIsPosting] = useState(false)
    const [postSuccess, setPostSuccess] = useState(false)

    // Colors palette
    const colors = [
        '#ffffff', // White
        '#f3f4f6', // Gray
        '#ebf5ff', // Blue tint
        '#ecfdf5', // Green tint
        '#fff1f2', // Red tint
        '#111827', // Dark
    ]

    useEffect(() => {
        // Fetch current settings
        apiRequest('/api/social/settings').then(res => {
            if (res.success) {
                setAutoPostEnabled(res.settings?.enabled || false)
            }
        })
    }, [])

    useEffect(() => {
        if (!review) {
            // navigate('/reviews')
        }
    }, [review, navigate])

    const toggleAutoPost = async () => {
        const newState = !autoPostEnabled
        setAutoPostEnabled(newState)
        
        try {
            await apiRequest('/api/social/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enabled: newState,
                    minRating: 5,
                    platforms: ['facebook', 'instagram']
                })
            })
            setSavedSettings(true)
            setTimeout(() => setSavedSettings(false), 3000)
        } catch (err) {
            console.error('Failed to save settings:', err)
            setAutoPostEnabled(!newState)
            alert('Failed to save auto-post preference.')
        }
    }

    const handleAutoPost = async () => {
        if (isPosting) return;
        setIsPosting(true);
        
        try {
            const result = await apiRequest('/api/social/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reviewData: review,
                    platform: 'facebook',
                    imageData: null
                })
            });

            if (result.success) {
                setPostSuccess(true);
                setTimeout(() => {
                    setPostSuccess(false);
                    setIsPosting(false);
                }, 3000);
            } else {
                throw new Error(result.message || 'Post failed');
            }
            
        } catch (error) {
            console.error("Posting failed:", error);
            alert("Failed to post: " + error.message);
            setIsPosting(false);
        }
    }

    const handleLogoUpload = (e) => {
        const file = e.target.files[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setLogo(reader.result)
            }
            reader.readAsDataURL(file)
        }
    }

    const downloadImage = async () => {
        alert("Image generation logic would be implemented here using html2canvas. Since this dependency isn't installed, this is a placeholder.")
    }

    const getPlatformIcon = (platformName) => {
        switch (platformName?.toLowerCase()) {
            case 'google': return <GoogleIcon />
            case 'facebook': return <FacebookIcon />
            default: return <span>★</span>
        }
    }

    if (!review) {
        return (
            <div className="page-container">
                <div className="social-share-container">
                    <div className="no-review-placeholder">
                        <h2>No Review Selected</h2>
                        <p>Please select a review from the Reviews page to share.</p>
                        <button 
                            className="btn-download" 
                            style={{marginTop: '1rem'}}
                            onClick={() => navigate('/reviews')}
                        >
                            Go to Reviews
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="social-share-container">
                <div className="social-share-header">
                    <button 
                        onClick={() => navigate('/reviews')} 
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', marginBottom: '1rem', padding: 0 }}
                    >
                        ← Back to Reviews
                    </button>
                    <h1 className="social-share-title">Share Review</h1>
                    <p className="social-share-subtitle">Customize and share your best reviews on social media</p>
                </div>

                <div className="social-share-content">
                    {/* Left: Controls */}
                    <div className="share-controls">
                        <div className="control-group">
                            <label className="control-label">Platform Format</label>
                            <div className="platform-toggle">
                                <button 
                                    className={`platform-btn ${aspectRatio === 'square' ? 'active' : ''}`}
                                    onClick={() => setAspectRatio('square')}
                                >
                                    Instagram Post (1:1)
                                </button>
                                <button 
                                    className={`platform-btn ${aspectRatio === 'portrait' ? 'active' : ''}`}
                                    onClick={() => setAspectRatio('portrait')}
                                >
                                    Story (9:16)
                                </button>
                                <button 
                                    className={`platform-btn ${aspectRatio === 'landscape' ? 'active' : ''}`}
                                    onClick={() => setAspectRatio('landscape')}
                                >
                                    Facebook (1.91:1)
                                </button>
                            </div>
                        </div>

                        <div className="control-group">
                            <label className="control-label">Auto-Post Settings</label>
                            <div className="auto-post-config" style={{ 
                                padding: '12px', 
                                backgroundColor: 'var(--bg-tertiary)', 
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '500' }}>Auto-post 5★ Reviews</span>
                                    <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '24px' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={autoPostEnabled}
                                            onChange={toggleAutoPost}
                                            style={{ opacity: 0, width: 0, height: 0 }}
                                        />
                                        <span className="slider round" style={{
                                            position: 'absolute',
                                            cursor: 'pointer',
                                            top: 0, left: 0, right: 0, bottom: 0,
                                            backgroundColor: autoPostEnabled ? 'var(--primary-color)' : '#ccc',
                                            borderRadius: '34px',
                                            transition: '.4s'
                                        }}>
                                            <span style={{
                                                position: 'absolute',
                                                content: "",
                                                height: '16px',
                                                width: '16px',
                                                left: autoPostEnabled ? '20px' : '4px',
                                                bottom: '4px',
                                                backgroundColor: 'white',
                                                borderRadius: '50%',
                                                transition: '.4s'
                                            }}></span>
                                        </span>
                                    </label>
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                                    Automatically create and post stories for new 5-star reviews.
                                </p>
                                {savedSettings && (
                                    <p style={{ fontSize: '12px', color: '#10b981', marginTop: '8px', fontWeight: '600' }}>
                                        ✓ Settings saved
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="control-group">
                            <label className="control-label">Background Color</label>
                            <div className="color-options">
                                {colors.map(c => (
                                    <div 
                                        key={c}
                                        className={`color-option ${bgColor === c ? 'active' : ''}`}
                                        style={{ backgroundColor: c }}
                                        onClick={() => {
                                            setBgColor(c)
                                            setTextColor(c === '#111827' ? '#ffffff' : '#1f2937')
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="control-group">
                            <label className="control-label">Client Logo</label>
                            <div className="logo-upload-area" onClick={() => document.getElementById('logo-upload').click()}>
                                <input 
                                    type="file" 
                                    id="logo-upload" 
                                    className="logo-input" 
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                />
                                {logo ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
                                        <img src={logo} alt="Logo" style={{ height: '32px', objectFit: 'contain' }} />
                                        <span style={{ fontSize: '12px', color: 'green' }}>Change Logo</span>
                                    </div>
                                ) : (
                                    <span>Click to upload logo</span>
                                )}
                            </div>
                        </div>

                        <div className="control-group">
                            <label className="control-label">Caption Text (Optional)</label>
                            <textarea 
                                style={{ 
                                    width: '100%', 
                                    padding: '0.75rem', 
                                    borderRadius: '8px', 
                                    border: '1px solid var(--border-color)',
                                    minHeight: '80px',
                                    fontFamily: 'inherit'
                                }}
                                placeholder="Add a caption for your post..."
                                value={customCaption}
                                onChange={(e) => setCustomCaption(e.target.value)}
                            />
                        </div>

                        <div className="action-buttons">
                            <button className="btn-download" onClick={downloadImage}>
                                <span>📥</span> {aspectRatio === 'portrait' ? 'Download Story' : 'Download Image'}
                            </button>
                            <button 
                                className="btn-download" 
                                onClick={handleAutoPost}
                                disabled={isPosting || postSuccess}
                                style={{ 
                                    backgroundColor: postSuccess ? '#10b981' : 'var(--primary-color)',
                                    opacity: isPosting ? 0.7 : 1
                                }}
                            >
                                {isPosting ? (
                                    <span>⏳ Posting...</span>
                                ) : postSuccess ? (
                                    <span>✓ Posted!</span>
                                ) : (
                                    <span>🚀 Post Now</span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right: Preview */}
                    <div className="preview-container">
                        <div 
                            ref={previewRef}
                            className={`post-preview ${aspectRatio}`}
                            style={{ 
                                backgroundColor: bgColor,
                                color: textColor
                            }}
                        >
                            {/* Logo Section */}
                            {logo && <img src={logo} alt="Business Logo" className="preview-logo" />}

                            {/* Rating */}
                            <div className="preview-stars">
                                {'⭐'.repeat(review.rating)}
                            </div>

                            {/* Review Text */}
                            <div className="preview-text" style={{ fontStyle: 'italic' }}>
                                "{review.comment}"
                            </div>

                            {/* Author & Source */}
                            <div className="preview-author">
                                <span>- {review.reviewer}</span>
                                <span style={{ opacity: 0.6, fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    on {getPlatformIcon(review.platform)} {review.platform}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
