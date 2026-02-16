const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Tenant = require('./Tenant');
const Location = require('./Location');
const User = require('./User');

const Review = sequelize.define('Review', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tenantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Tenant,
            key: 'id'
        }
    },
    locationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Location,
            key: 'id'
        }
    },
    // Unique Review Key (matches ReviewKey in Google Sheets)
    review_key: {
        type: DataTypes.STRING,
        unique: true,
    },
    // Google Review Details
    google_review_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    reviewer_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        }
    },
    review_text: {
        type: DataTypes.TEXT,
        defaultValue: '',
    },
    sentiment: {
        type: DataTypes.ENUM('Positive', 'Negative', 'Neutral', 'Mixed'),
        defaultValue: 'Neutral',
    },
    review_created_at: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    has_reply: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    // AI Reply Generation
    ai_generated_reply: {
        type: DataTypes.TEXT,
    },
    ai_reply_generated_at: {
        type: DataTypes.DATE,
    },
    // Manual Approval & Editing
    edited_reply: {
        type: DataTypes.TEXT,
    },
    final_caption: {
        type: DataTypes.TEXT,
    },
    approved_by: {
        type: DataTypes.UUID,
        references: {
            model: User,
            key: 'id'
        },
        allowNull: true
    },
    approved_at: {
        type: DataTypes.DATE,
    },
    approval_status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'posted'),
        defaultValue: 'pending',
    },
    // Google Posting
    posted_to_google: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    posted_at: {
        type: DataTypes.DATE,
    },
    google_reply_id: {
        type: DataTypes.STRING,
    },
}, {
    timestamps: true,
    indexes: [
        { fields: ['tenantId', 'has_reply'] },
        { fields: ['tenantId', 'rating'] },
        { fields: ['tenantId', 'approval_status'] }
    ]
});

// Associations
Review.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Review.belongsTo(Location, { foreignKey: 'locationId', as: 'location' });
Review.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

// Associations for potential eager loading from parents
Tenant.hasMany(Review, { foreignKey: 'tenantId' });
Location.hasMany(Review, { foreignKey: 'locationId' });

module.exports = Review;
