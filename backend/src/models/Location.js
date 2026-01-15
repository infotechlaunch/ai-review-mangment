const mongoose = require('mongoose');

/**
 * Location Schema
 * Represents a business location (slug) within a tenant
 */

const locationSchema = new mongoose.Schema({
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    },
    slug: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    address: {
        type: String,
        trim: true,
    },
    // Google Business Profile location details
    googleLocationId: {
        type: String,
        unique: true,
        sparse: true,
    },
    googleAccountId: {
        type: String,
    },
    isActive: {
        type: Boolean,
        default: true,
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

// Compound index for tenant + slug uniqueness
locationSchema.index({ tenant: 1, slug: 1 }, { unique: true });
locationSchema.index({ googleLocationId: 1 });

const Location = mongoose.model('Location', locationSchema);

module.exports = Location;
