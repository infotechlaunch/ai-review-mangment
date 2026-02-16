import React, { useState } from 'react'
import './common.css'

export default function Billing() {
    // Mock billing data
    const [billingInfo, setBillingInfo] = useState({
        planName: 'Professional',
        subscriptionStatus: 'Active',
        trialStartDate: '2024-01-01',
        trialEndDate: '2024-01-15',
        reviewQuotaUsed: 847,
        reviewQuotaTotal: 1500,
        billingCycle: 'monthly',
        nextBillingDate: '2024-02-01',
        amount: 49.99
    })

    const plans = [
        {
            name: 'Starter',
            price: 29,
            reviews: 500,
            features: ['Basic AI responses', 'Email support', '1 location', 'Basic analytics'],
            recommended: false
        },
        {
            name: 'Professional',
            price: 49,
            reviews: 1500,
            features: ['Advanced AI responses', 'Priority support', '3 locations', 'Advanced analytics', 'Custom tone settings'],
            recommended: true
        },
        {
            name: 'Enterprise',
            price: 99,
            reviews: 5000,
            features: ['Premium AI responses', '24/7 support', 'Unlimited locations', 'Premium analytics', 'Custom integrations', 'Dedicated account manager'],
            recommended: false
        }
    ]

    const quotaPercentage = (billingInfo.reviewQuotaUsed / billingInfo.reviewQuotaTotal) * 100

    const getQuotaColor = () => {
        if (quotaPercentage >= 90) return '#ef4444'
        if (quotaPercentage >= 70) return '#f59e0b'
        return '#10b981'
    }

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'active':
                return '#10b981'
            case 'trial':
                return '#f59e0b'
            case 'expired':
                return '#ef4444'
            default:
                return '#6b7280'
        }
    }

    const getDaysRemaining = () => {
        const today = new Date()
        const endDate = new Date(billingInfo.trialEndDate)
        const diffTime = endDate - today
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays > 0 ? diffDays : 0
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Billing & Subscription</h1>
                <p className="page-subtitle">Manage your subscription, view usage, and upgrade your plan</p>
            </div>
            <div className="page-content">
                {/* Current Plan Overview */}
                <div className="grid-container">
                    <div className="grid-col-8">
                        <div className="widget-card">
                            <h3 className="widget-title">Current Subscription</h3>
                            <div style={{ marginTop: '20px' }}>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'flex-start',
                                    marginBottom: '24px'
                                }}>
                                    <div>
                                        <div style={{ 
                                            fontSize: '28px', 
                                            fontWeight: '700', 
                                            color: 'var(--text-primary)',
                                            marginBottom: '8px'
                                        }}>
                                            {billingInfo.planName} Plan
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                backgroundColor: getStatusColor(billingInfo.subscriptionStatus) + '20',
                                                color: getStatusColor(billingInfo.subscriptionStatus)
                                            }}>
                                                {billingInfo.subscriptionStatus}
                                            </span>
                                            <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                                                Billed {billingInfo.billingCycle}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                            ${billingInfo.amount}
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                                            per month
                                        </div>
                                    </div>
                                </div>

                                {/* Billing Details */}
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(2, 1fr)', 
                                    gap: '16px',
                                    padding: '20px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '8px'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                            Trial Started
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                            {new Date(billingInfo.trialStartDate).toLocaleDateString('en-US', { 
                                                year: 'numeric', 
                                                month: 'long', 
                                                day: 'numeric' 
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                            Trial Ends
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                            {new Date(billingInfo.trialEndDate).toLocaleDateString('en-US', { 
                                                year: 'numeric', 
                                                month: 'long', 
                                                day: 'numeric' 
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                            Next Billing Date
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                            {new Date(billingInfo.nextBillingDate).toLocaleDateString('en-US', { 
                                                year: 'numeric', 
                                                month: 'long', 
                                                day: 'numeric' 
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                            Days Remaining
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b' }}>
                                            {getDaysRemaining()} days left in trial
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Review Quota Usage */}
                    <div className="grid-col-4">
                        <div className="widget-card">
                            <h3 className="widget-title">Review Quota</h3>
                            <div style={{ marginTop: '20px' }}>
                                <div style={{ 
                                    textAlign: 'center',
                                    padding: '24px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '12px',
                                    marginBottom: '16px'
                                }}>
                                    <div style={{ 
                                        fontSize: '48px', 
                                        fontWeight: '700',
                                        color: getQuotaColor(),
                                        marginBottom: '8px'
                                    }}>
                                        {billingInfo.reviewQuotaUsed}
                                    </div>
                                    <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                                        of {billingInfo.reviewQuotaTotal} reviews used
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        marginBottom: '8px'
                                    }}>
                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            Usage
                                        </span>
                                        <span style={{ 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            color: getQuotaColor()
                                        }}>
                                            {quotaPercentage.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div style={{ 
                                        width: '100%',
                                        height: '12px',
                                        backgroundColor: 'var(--bg-tertiary)',
                                        borderRadius: '6px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${quotaPercentage}%`,
                                            height: '100%',
                                            backgroundColor: getQuotaColor(),
                                            transition: 'width 0.3s ease'
                                        }}></div>
                                    </div>
                                </div>

                                {quotaPercentage >= 80 && (
                                    <div style={{
                                        padding: '12px',
                                        backgroundColor: '#fef3c7',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        color: '#92400e',
                                        marginTop: '12px'
                                    }}>
                                        ⚠️ You're approaching your review quota limit. Consider upgrading your plan.
                                    </div>
                                )}

                                <div style={{ 
                                    fontSize: '12px', 
                                    color: 'var(--text-tertiary)',
                                    marginTop: '12px',
                                    textAlign: 'center'
                                }}>
                                    Quota resets on {new Date(billingInfo.nextBillingDate).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Available Plans */}
                <div className="grid-container">
                    <div className="grid-col-12">
                        <div className="widget-card">
                            <h3 className="widget-title">Available Plans</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '24px' }}>
                                Choose the plan that best fits your business needs
                            </p>

                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '24px'
                            }}>
                                {plans.map((plan, index) => (
                                    <div 
                                        key={index}
                                        style={{
                                            padding: '24px',
                                            backgroundColor: plan.recommended ? 'var(--primary-color)10' : 'var(--bg-secondary)',
                                            borderRadius: '12px',
                                            border: plan.recommended ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                            position: 'relative',
                                            transition: 'transform 0.2s ease',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        {plan.recommended && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '-12px',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                padding: '4px 16px',
                                                backgroundColor: 'var(--primary-color)',
                                                color: 'white',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                borderRadius: '12px',
                                                textTransform: 'uppercase'
                                            }}>
                                                Recommended
                                            </div>
                                        )}

                                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                            <div style={{ 
                                                fontSize: '24px', 
                                                fontWeight: '700',
                                                color: 'var(--text-primary)',
                                                marginBottom: '8px'
                                            }}>
                                                {plan.name}
                                            </div>
                                            <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
                                                Up to {plan.reviews} reviews/month
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                                                <span style={{ fontSize: '16px', color: 'var(--text-tertiary)' }}>$</span>
                                                <span style={{ fontSize: '48px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                    {plan.price}
                                                </span>
                                                <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>/mo</span>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '20px' }}>
                                            {plan.features.map((feature, idx) => (
                                                <div 
                                                    key={idx}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        padding: '8px 0',
                                                        fontSize: '13px',
                                                        color: 'var(--text-secondary)'
                                                    }}
                                                >
                                                    <span style={{ color: '#10b981', fontSize: '16px' }}>✓</span>
                                                    <span>{feature}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                backgroundColor: plan.name === billingInfo.planName 
                                                    ? 'var(--bg-tertiary)' 
                                                    : plan.recommended 
                                                        ? 'var(--primary-color)' 
                                                        : 'var(--text-primary)',
                                                color: plan.name === billingInfo.planName 
                                                    ? 'var(--text-secondary)' 
                                                    : 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                cursor: plan.name === billingInfo.planName ? 'default' : 'pointer',
                                                transition: 'opacity 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (plan.name !== billingInfo.planName) {
                                                    e.target.style.opacity = '0.9'
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.opacity = '1'
                                            }}
                                        >
                                            {plan.name === billingInfo.planName ? 'Current Plan' : 'Upgrade Plan'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment History */}
                <div className="grid-container">
                    <div className="grid-col-12">
                        <div className="widget-card">
                            <h3 className="widget-title">Payment History</h3>
                            <div style={{ overflowX: 'auto', marginTop: '16px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ 
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderBottom: '2px solid var(--border-color)'
                                        }}>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Date</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Description</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Amount</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Status</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Invoice</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-primary)' }}>
                                                Jan 1, 2024
                                            </td>
                                            <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                                Professional Plan - Trial Period
                                            </td>
                                            <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                $0.00
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    backgroundColor: '#10b98120',
                                                    color: '#10b981'
                                                }}>
                                                    Trial
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', fontSize: '14px' }}>
                                                <button style={{
                                                    padding: '6px 12px',
                                                    backgroundColor: 'var(--primary-color)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    cursor: 'pointer'
                                                }}>
                                                    Download
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
