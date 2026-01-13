module.exports = (sequelize, DataTypes) => {
  const WebhookEvent = sequelize.define('WebhookEvent', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    stripe_event_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    event_type: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'webhook_events',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false // Webhook events are immutable once created
  });

  return WebhookEvent;
};
