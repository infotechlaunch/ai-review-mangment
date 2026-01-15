const mongoose = require('mongoose');

/**
 * Tenant Schema
 * Represents a client namespace for multi-tenant data isolation
 */

const tenantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    businessName: {
        type: String,
        required: true,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    // Google Business Profile configuration
    googleBusinessProfile: {
        accountId: String,
        locationId: String,
        accessToken: String,
        refreshToken: String,
        tokenExpiry: Date,
    },
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

// Index for faster queries
tenantSchema.index({ slug: 1 });
tenantSchema.index({ isActive: 1 });

const Tenant = mongoose.model('Tenant', tenantSchema);

module.exports = Tenant;
