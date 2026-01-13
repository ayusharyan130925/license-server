module.exports = (sequelize, DataTypes) => {
  const Device = sequelize.define('Device', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    device_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    first_seen_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    trial_started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    trial_ended_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    trial_consumed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    last_seen_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time this device was seen (updated on license checks)'
    }
  }, {
    tableName: 'devices',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Device;
};
