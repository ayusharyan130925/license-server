module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    stripe_customer_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    stripe_subscription_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('trial', 'active', 'expired'),
      allowNull: false,
      defaultValue: 'trial'
    },
    plan_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'plans',
        key: 'id'
      }
    },
    current_period_start: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Start of current billing period (from Stripe)'
    },
    current_period_end: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'End of current billing period (from Stripe) - determines license expiration'
    },
    cancel_at_period_end: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether subscription will cancel at period end'
    },
    canceled_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When subscription was canceled (if applicable)'
    },
    trial_end: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'End of trial period (if applicable)'
    }
  }, {
    tableName: 'subscriptions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Subscription.associate = (models) => {
    Subscription.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    Subscription.belongsTo(models.Plan, { foreignKey: 'plan_id', as: 'plan' });
    Subscription.hasMany(models.Payment, { foreignKey: 'subscription_id', as: 'payments' });
  };

  return Subscription;
};
