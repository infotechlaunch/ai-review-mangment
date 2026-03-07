import React, { useState, useEffect, useCallback } from 'react'
import { apiRequest } from '../../utils/api'
import './common.css'

// Static plan definitions — prices and features shown in the UI
const PLANS = [
    {
        key: 'starter',
        name: 'Starter',
        price: 29,
        reviews: 500,
        features: ['Basic AI responses', 'Email support', '1 location', 'Basic analytics'],
        recommended: false,
    },
    {
        key: 'pro',
        name: 'Pro',
        price: 49,
        reviews: 1500,
        features: ['Advanced AI responses', 'Priority support', '3 locations', 'Advanced analytics', 'Custom tone settings'],
        recommended: true,
    },
    {
        key: 'agency',
        name: 'Agency',
        price: 99,
        reviews: 5000,
        features: ['Premium AI responses', '24/7 support', 'Unlimited locations', 'Premium analytics', 'Custom integrations', 'Dedicated account manager'],
        recommended: false,
    },
]

export default function Billing() {
    const [subscription, setSubscription] = useState(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(null)  // 'checkout-<key>' | 'cancel' | 'portal'
    const [error, setError] = useState(null)
    const [successMsg, setSuccessMsg] = useState(null)

    // ── Read ?status= query param written by Stripe redirect ─────────────────
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const status = params.get('status')
        if (status === 'success') {
            setSuccessMsg('🎉 Payment successful! Your subscription is now active.')
            // Remove param from URL without reload
            window.history.replaceState({}, '', window.location.pathname)
        } else if (status === 'canceled') {
            setError('Checkout was canceled. No charge was made.')
            window.history.replaceState({}, '', window.location.pathname)
        }
    }, [])

    // ── Fetch subscription status ─────────────────────────────────────────────
    const fetchSubscription = useCallback(async () => {
        try {
            setLoading(true)
            const data = await apiRequest('/api/payments/subscription-status')
            setSubscription(data.subscription)
        } catch (err) {
            setError(err.message || 'Failed to load subscription status')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchSubscription() }, [fetchSubscription])

    // ── Helpers ───────────────────────────────────────────────────────────────
    const getStatusColor = (status) => {
        switch ((status || '').toLowerCase()) {
            case 'active':    return '#10b981'
            case 'trialing':  return '#3b82f6'
            case 'past_due':  return '#f59e0b'
            case 'canceled':  return '#ef4444'
            case 'expired':   return '#ef4444'
            default:          return '#6b7280'
        }
    }

    const getStatusLabel = (status) => {
        switch ((status || '').toLowerCase()) {
            case 'active':    return 'Active'
            case 'trialing':  return 'Trial'
            case 'past_due':  return 'Past Due'
            case 'canceled':  return 'Canceled'
            case 'expired':   return 'Expired'
            case 'none':      return 'No Plan'
            default:          return status || 'Unknown'
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '—'
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
        })
    }

    const getDaysRemaining = () => {
        if (!subscription?.subscriptionEndDate) return null
        const diff = Math.ceil(
            (new Date(subscription.subscriptionEndDate) - new Date()) / (1000 * 60 * 60 * 24)
        )
        return diff > 0 ? diff : 0
    }

    const activePlanKey = subscription?.plan && subscription.plan !== 'none' ? subscription.plan : null

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleCheckout = async (planKey) => {
        setError(null)
        setSuccessMsg(null)
        setActionLoading(`checkout-${planKey}`)
        try {
            const data = await apiRequest('/api/payments/create-checkout-session', {
                method: 'POST',
                body: JSON.stringify({ plan: planKey }),
            })
            if (data.sessionUrl) {
                window.location.href = data.sessionUrl
            } else {
                setError('Could not start checkout. Please try again.')
            }
        } catch (err) {
            setError(err.message || 'Failed to start checkout')
        } finally {
            setActionLoading(null)
        }
    }

    const handleCancelSubscription = async () => {
        if (!window.confirm('Are you sure you want to cancel? You will keep access until the end of your current billing period.')) return
        setError(null)
        setSuccessMsg(null)
        setActionLoading('cancel')
        try {
            const data = await apiRequest('/api/payments/cancel-subscription', { method: 'POST' })
            setSuccessMsg(`Subscription canceled. Access continues until ${formatDate(data.subscriptionEndDate)}.`)
            await fetchSubscription()
        } catch (err) {
            setError(err.message || 'Failed to cancel subscription')
        } finally {
            setActionLoading(null)
        }
    }

    const handleManageBilling = async () => {
        setError(null)
        setActionLoading('portal')
        try {
            const data = await apiRequest('/api/payments/create-portal-session', { method: 'POST' })
            if (data.portalUrl) {
                window.location.href = data.portalUrl
            }
        } catch (err) {
            setError(err.message || 'Failed to open billing portal')
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Billing & Subscription</h1>
                <p className="page-subtitle">Manage your subscription, view usage, and upgrade your plan</p>
            </div>
            <div className="page-content">

                {/* ── Banner messages ───────────────────────────────────────── */}
                {successMsg && (
                    <div style={{
                        padding: '14px 20px',
                        backgroundColor: '#d1fae5',
                        color: '#065f46',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        fontSize: '14px',
                        fontWeight: '500',
                    }}>
                        {successMsg}
                    </div>
                )}
                {error && (
                    <div style={{
                        padding: '14px 20px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        fontSize: '14px',
                        fontWeight: '500',
                    }}>
                        {error}
                    </div>
                )}

                {/* ── Current Plan Overview ─────────────────────────────────── */}
                <div className="grid-container">
                    <div className="grid-col-8">
                        <div className="widget-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 className="widget-title">Current Subscription</h3>
                                {subscription?.isActive && (
                                    <button
                                        onClick={handleManageBilling}
                                        disabled={actionLoading === 'portal'}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {actionLoading === 'portal' ? 'Opening…' : 'Manage Billing'}
                                    </button>
                                )}
                            </div>

                            {loading ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                    Loading subscription…
                                </div>
                            ) : (
                                <div style={{ marginTop: '20px' }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: '24px',
                                    }}>
                                        <div>
                                            <div style={{
                                                fontSize: '28px',
                                                fontWeight: '700',
                                                color: 'var(--text-primary)',
                                                marginBottom: '8px',
                                                textTransform: 'capitalize',
                                            }}>
                                                {activePlanKey
                                                    ? `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan`
                                                    : 'No Active Plan'}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    backgroundColor: getStatusColor(subscription?.status) + '20',
                                                    color: getStatusColor(subscription?.status),
                                                }}>
                                                    {getStatusLabel(subscription?.status)}
                                                </span>
                                                {subscription?.isActive && (
                                                    <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                                                        Billed monthly
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {activePlanKey && (
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                    ${PLANS.find(p => p.key === activePlanKey)?.price ?? '—'}
                                                </div>
                                                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                                                    per month
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Billing detail grid */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: '16px',
                                        padding: '20px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: '8px',
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                                Subscription Start
                                            </div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                {formatDate(subscription?.subscriptionStartDate)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                                {subscription?.status === 'canceled' ? 'Access Ends' : 'Next Billing Date'}
                                            </div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                {formatDate(subscription?.subscriptionEndDate)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                                Status
                                            </div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: getStatusColor(subscription?.status) }}>
                                                {getStatusLabel(subscription?.status)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                                Days Remaining
                                            </div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b' }}>
                                                {getDaysRemaining() !== null ? `${getDaysRemaining()} days` : '—'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cancel button for active subscriptions */}
                                    {subscription?.isActive && subscription?.status !== 'canceled' && (
                                        <div style={{ marginTop: '16px', textAlign: 'right' }}>
                                            <button
                                                onClick={handleCancelSubscription}
                                                disabled={actionLoading === 'cancel'}
                                                style={{
                                                    padding: '8px 16px',
                                                    backgroundColor: 'transparent',
                                                    color: '#ef4444',
                                                    border: '1px solid #ef4444',
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {actionLoading === 'cancel' ? 'Canceling…' : 'Cancel Subscription'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Subscription status summary card */}
                    <div className="grid-col-4">
                        <div className="widget-card">
                            <h3 className="widget-title">Plan Details</h3>
                            <div style={{ marginTop: '20px' }}>
                                {loading ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                                        Loading…
                                    </div>
                                ) : activePlanKey ? (
                                    <>
                                        <div style={{
                                            textAlign: 'center',
                                            padding: '24px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: '12px',
                                            marginBottom: '16px',
                                        }}>
                                            <div style={{
                                                fontSize: '40px',
                                                fontWeight: '700',
                                                color: getStatusColor(subscription?.status),
                                                marginBottom: '8px',
                                                textTransform: 'capitalize',
                                            }}>
                                                {subscription.plan}
                                            </div>
                                            <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                                                {getStatusLabel(subscription?.status)}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                                            {PLANS.find(p => p.key === activePlanKey)?.features.map((f, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ color: '#10b981' }}>✓</span>
                                                    <span>{f}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '32px 16px',
                                        color: 'var(--text-tertiary)',
                                        fontSize: '14px',
                                    }}>
                                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>💳</div>
                                        No active subscription.<br />Choose a plan below to get started.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Available Plans ───────────────────────────────────────── */}
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
                                gap: '24px',
                            }}>
                                {PLANS.map((plan) => {
                                    const isCurrentPlan = activePlanKey === plan.key
                                    const isLoading = actionLoading === `checkout-${plan.key}`
                                    return (
                                        <div
                                            key={plan.key}
                                            style={{
                                                padding: '24px',
                                                backgroundColor: plan.recommended ? 'var(--primary-color)10' : 'var(--bg-secondary)',
                                                borderRadius: '12px',
                                                border: isCurrentPlan
                                                    ? '2px solid #10b981'
                                                    : plan.recommended
                                                        ? '2px solid var(--primary-color)'
                                                        : '1px solid var(--border-color)',
                                                position: 'relative',
                                                transition: 'transform 0.2s ease',
                                            }}
                                            onMouseEnter={(e) => !isCurrentPlan && (e.currentTarget.style.transform = 'translateY(-4px)')}
                                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                                        >
                                            {isCurrentPlan && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-12px',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    padding: '4px 16px',
                                                    backgroundColor: '#10b981',
                                                    color: 'white',
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                    borderRadius: '12px',
                                                    textTransform: 'uppercase',
                                                }}>
                                                    Current Plan
                                                </div>
                                            )}
                                            {!isCurrentPlan && plan.recommended && (
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
                                                    textTransform: 'uppercase',
                                                }}>
                                                    Recommended
                                                </div>
                                            )}

                                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                                <div style={{
                                                    fontSize: '24px',
                                                    fontWeight: '700',
                                                    color: 'var(--text-primary)',
                                                    marginBottom: '8px',
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
                                                            color: 'var(--text-secondary)',
                                                        }}
                                                    >
                                                        <span style={{ color: '#10b981', fontSize: '16px' }}>✓</span>
                                                        <span>{feature}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => !isCurrentPlan && handleCheckout(plan.key)}
                                                disabled={isCurrentPlan || !!actionLoading}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    backgroundColor: isCurrentPlan
                                                        ? 'var(--bg-tertiary)'
                                                        : plan.recommended
                                                            ? 'var(--primary-color)'
                                                            : 'var(--text-primary)',
                                                    color: isCurrentPlan ? 'var(--text-secondary)' : 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    cursor: isCurrentPlan || actionLoading ? 'default' : 'pointer',
                                                    opacity: isLoading ? 0.7 : 1,
                                                    transition: 'opacity 0.2s ease',
                                                }}
                                            >
                                                {isCurrentPlan
                                                    ? 'Current Plan'
                                                    : isLoading
                                                        ? 'Redirecting…'
                                                        : activePlanKey
                                                            ? 'Switch Plan'
                                                            : 'Get Started'}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Payment History placeholder ───────────────────────────── */}
                <div className="grid-container">
                    <div className="grid-col-12">
                        <div className="widget-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 className="widget-title">Payment History</h3>
                                {subscription?.isActive && (
                                    <button
                                        onClick={handleManageBilling}
                                        disabled={actionLoading === 'portal'}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: 'var(--primary-color)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {actionLoading === 'portal' ? 'Opening…' : 'View All Invoices'}
                                    </button>
                                )}
                            </div>
                            <div style={{ marginTop: '16px' }}>
                                {!subscription?.isActive ? (
                                    <div style={{
                                        padding: '40px',
                                        textAlign: 'center',
                                        color: 'var(--text-tertiary)',
                                        fontSize: '14px',
                                    }}>
                                        No payment history yet. Subscribe to a plan to get started.
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: '24px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: '8px',
                                        textAlign: 'center',
                                        fontSize: '14px',
                                        color: 'var(--text-secondary)',
                                    }}>
                                        <div style={{ marginBottom: '8px', fontSize: '24px' }}>🧾</div>
                                        Full invoice history is available in the Stripe Billing Portal.
                                        <br />
                                        <button
                                            onClick={handleManageBilling}
                                            disabled={actionLoading === 'portal'}
                                            style={{
                                                marginTop: '12px',
                                                padding: '8px 20px',
                                                backgroundColor: 'var(--primary-color)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {actionLoading === 'portal' ? 'Opening…' : 'Open Billing Portal'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
