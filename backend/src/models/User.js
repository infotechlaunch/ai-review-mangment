const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const Tenant = require('./Tenant');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
            notEmpty: true
        },
        set(value) {
            this.setDataValue('email', value.toLowerCase());
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('SUPER_ADMIN', 'ADMIN', 'CLIENT_OWNER', 'STAFF'),
        allowNull: false,
    },
    tenantId: {
        type: DataTypes.UUID,
        references: {
            model: Tenant,
            key: 'id'
        },
        allowNull: true // Only client-facing roles need this
    },
    firstName: {
        type: DataTypes.STRING,
    },
    lastName: {
        type: DataTypes.STRING,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },

    // ── Stripe / Billing Fields ──────────────────────────────────────────────
    stripeCustomerId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    stripeSubscriptionId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    plan: {
        type: DataTypes.ENUM('none', 'starter', 'pro', 'growth', 'agency'),
        defaultValue: 'none',
        allowNull: false,
    },
    subscriptionStatus: {
        type: DataTypes.ENUM('none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'),
        defaultValue: 'none',
        allowNull: false,
    },
    subscriptionStartDate: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    subscriptionEndDate: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    timestamps: true,
    hooks: {
        beforeSave: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

User.prototype.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Association
User.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Tenant.hasMany(User, { foreignKey: 'tenantId' });

module.exports = User;
