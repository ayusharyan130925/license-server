module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    subscription_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'subscriptions',
        key: 'id'
      }
    },
    stripe_invoice_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    stripe_payment_intent_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    stripe_charge_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'usd'
    },
    status: {
      type: DataTypes.ENUM('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded'),
      allowNull: false,
      defaultValue: 'pending'
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    billing_period_start: {
      type: DataTypes.DATE,
      allowNull: true
    },
    billing_period_end: {
      type: DataTypes.DATE,
      allowNull: true
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failure_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'payments',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    Payment.belongsTo(models.Subscription, { foreignKey: 'subscription_id', as: 'subscription' });
  };

  return Payment;
};
