const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Tenant = sequelize.define('Tenant', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            isLowercase: true
        }
    },
    businessName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    // Business Profile Fields
    industry: {
        type: DataTypes.STRING,
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    website: {
        type: DataTypes.STRING,
        allowNull: true
    },
    address: {
        type: DataTypes.STRING,
        allowNull: true
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true
    },
    country: {
        type: DataTypes.STRING,
        allowNull: true
    },
    googleSearchName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Search name used to auto-fetch placeId via SearchApi (e.g. "Joy Biryani Raigarh")'
    },
    timezone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    logoUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    
    // Communication Settings (WhatsApp, etc.)
    communication_settings: {
        type: DataTypes.JSONB,
        defaultValue: {
            whatsappNumber: '',
            whatsappLink: '',
            sendRequestsViaWhatsapp: true,
            sendFollowupsViaWhatsapp: true
        }
    },

    // Social Profiles
    social_profiles: {
        type: DataTypes.JSONB,
        defaultValue: {
            facebookPage: '',
            instagramHandle: '',
            googleReviewLink: ''
        }
    },
    // Google Business Profile configuration
    gbp_accountId: DataTypes.STRING,
    gbp_locationId: DataTypes.STRING,
    gbp_accessToken: DataTypes.TEXT,
    gbp_refreshToken: DataTypes.TEXT,
    gbp_tokenExpiry: DataTypes.DATE,
    gbp_initialSyncDone: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    gbp_lastSyncAt: DataTypes.DATE,

    // Application Settings (stored as JSONB)
    settings: {
        type: DataTypes.JSONB,
        defaultValue: {
            autoApproval: {
                positive: true,
                neutral: false,
                negative: false,
                minRating: 4
            },
            tone: {
                style: 'professional',
                keywords: '',
                maxLength: 150
            },
            automation: {
                enabled: false,
                channels: [],
                daysAfterVisit: 2,
                monthlyLimit: 1
            }
        }
    }
}, {
    timestamps: true,
    indexes: [
        { unique: true, fields: ['slug'] },
        { fields: ['isActive'] }
    ]
});

module.exports = Tenant;
