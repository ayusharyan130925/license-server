module.exports = (sequelize, DataTypes) => {
  const RiskEvent = sequelize.define('RiskEvent', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    device_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'devices',
        key: 'id'
      }
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    event_type: {
      type: DataTypes.ENUM(
        'DEVICE_CAP_EXCEEDED',
        'DEVICE_CREATION_RATE_LIMIT',
        'DEVICE_CHURN_DETECTED',
        'RAPID_DEVICE_CREATION',
        'RECONCILIATION_PERFORMED',
        'SUSPICIOUS_PATTERN'
      ),
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'risk_events',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false // Risk events are immutable once created
  });

  return RiskEvent;
};
