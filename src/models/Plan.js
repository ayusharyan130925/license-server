module.exports = (sequelize, DataTypes) => {
  const Plan = sequelize.define('Plan', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: {
      type: DataTypes.ENUM('trial', 'basic', 'pro'),
      allowNull: false,
      unique: true
    },
    max_cameras: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    pdf_export: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    fps_limit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30
    },
    cloud_backup: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'plans',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Plan;
};
