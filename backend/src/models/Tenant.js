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
