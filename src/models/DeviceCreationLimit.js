module.exports = (sequelize, DataTypes) => {
  const DeviceCreationLimit = sequelize.define('DeviceCreationLimit', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    identifier: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    identifier_type: {
      type: DataTypes.ENUM('ip', 'user'),
      allowNull: false
    },
    window_start: {
      type: DataTypes.DATE,
      allowNull: false
    },
    device_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'device_creation_limits',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return DeviceCreationLimit;
};
