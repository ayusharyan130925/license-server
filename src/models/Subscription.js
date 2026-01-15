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
    }
  }, {
    tableName: 'subscriptions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Subscription;
};
