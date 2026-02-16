const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Tenant = require('./Tenant');

const Location = sequelize.define('Location', {
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
    slug: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            isLowercase: true
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    address: {
        type: DataTypes.STRING,
    },
    // Google Business Profile location details
    googleLocationId: {
        type: DataTypes.STRING,
        unique: true,
    },
    googleAccountId: {
        type: DataTypes.STRING,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    }
}, {
    timestamps: true,
    indexes: [
        { unique: true, fields: ['tenantId', 'slug'] },
        { fields: ['googleLocationId'] }
    ]
});

// Association
Location.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Tenant.hasMany(Location, { foreignKey: 'tenantId' });

module.exports = Location;
