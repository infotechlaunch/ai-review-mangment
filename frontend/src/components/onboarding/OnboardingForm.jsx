import React, { useState } from 'react';
import './BusinessSetup.css'; 
import api from '../../utils/api';

const OnboardingForm = () => {
    const [formData, setFormData] = useState({
        businessName: '',
        ownerName: '',
        email: '',
        phone: '',
        address: '',
        planSelected: 'Basic'
    });
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            // Send data to Node.js backend
            const response = await fetch(`${api.API_BASE_URL}/api/onboarding/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                setMessage('Successfully submitted! Data recorded to Google Sheets.');
                // Handle redirect or next step here
            } else {
                setError(result.message || 'Failed to submit form.');
            }
        } catch (err) {
            console.error('Submission error:', err);
            setError('Server error during form submission.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="onboarding-container">
            <div className="onboarding-card">
                <div className="step-content fade-in">
                    <h2>Complete Your Onboarding</h2>
                    <p className="step-description">Tell us about your business to get started.</p>

                    {message && <div style={{ color: 'green', marginBottom: '10px' }}>{message}</div>}
                    {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

                    <form className="form-grid" onSubmit={handleSubmit}>
                        <div className="form-group full-width">
                            <label>Business Name *</label>
                            <input
                                type="text"
                                name="businessName"
                                value={formData.businessName}
                                onChange={handleChange}
                                placeholder="Your Restaurant / Business"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Owner Name *</label>
                            <input
                                type="text"
                                name="ownerName"
                                value={formData.ownerName}
                                onChange={handleChange}
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Email Address *</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="john@example.com"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Phone Number *</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+1 555-0199"
                                required
                            />
                        </div>

                        <div className="form-group full-width">
                            <label>Business Address</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="123 Main St, City, Country"
                            />
                        </div>

                        <div className="form-group full-width">
                            <label>Select Plan *</label>
                            <select 
                                name="planSelected" 
                                value={formData.planSelected} 
                                onChange={handleChange}
                                required
                            >
                                <option value="Basic">Basic Plan</option>
                                <option value="Pro">Pro Plan</option>
                                <option value="Enterprise">Enterprise Plan</option>
                            </select>
                        </div>
                        
                        <div className="form-group full-width" style={{ marginTop: '1rem' }}>
                            <button type="submit" className="btn-primary full-width" disabled={loading}>
                                {loading ? 'Submitting...' : 'Submit Onboarding Data'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default OnboardingForm;
