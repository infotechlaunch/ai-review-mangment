const mongoose = require('mongoose');

/**
 * Review Schema
 * Represents a Google review with AI-generated reply and approval workflow
 */

const reviewSchema = new mongoose.Schema({
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
    },
    location: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        required: true,
        index: true,
    },
    // Unique Review Key (matches ReviewKey in Google Sheets)
    review_key: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
    },
    // Google Review Details
    google_review_id: {
        type: String,
        required: true,
        unique: true,
    },
    reviewer_name: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    review_text: {
        type: String,
        default: '',
    },
    sentiment: {
        type: String,
        enum: ['Positive', 'Negative', 'Neutral', 'Mixed'],
        default: 'Neutral',
    },
    review_created_at: {
        type: Date,
        required: true,
    },
    has_reply: {
        type: Boolean,
        default: false,
    },
    // AI Reply Generation
    ai_generated_reply: {
        type: String,
        default: null,
    },
    ai_reply_generated_at: {
        type: Date,
        default: null,
    },
    // Manual Approval & Editing
    edited_reply: {
        type: String,
        default: null,
    },
    final_caption: {
        type: String,
        default: null,
    },
    approved_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    approved_at: {
        type: Date,
        default: null,
    },
    approval_status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'posted'],
        default: 'pending',
    },
    // Google Posting
    posted_to_google: {
        type: Boolean,
        default: false,
    },
    posted_at: {
        type: Date,
        default: null,
    },
    google_reply_id: {
        type: String,
        default: null,
    },
    // Metadata
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// Indexes for efficient queries
reviewSchema.index({ tenant: 1, has_reply: 1 });
reviewSchema.index({ tenant: 1, rating: 1 });
reviewSchema.index({ tenant: 1, approval_status: 1 });
reviewSchema.index({ google_review_id: 1 });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
