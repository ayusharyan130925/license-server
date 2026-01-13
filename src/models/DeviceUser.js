module.exports = (sequelize, DataTypes) => {
  const DeviceUser = sequelize.define('DeviceUser', {
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
    device_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'devices',
        key: 'id'
      }
    }
  }, {
    tableName: 'device_users',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false // No updated_at for junction table
  });

  return DeviceUser;
};
