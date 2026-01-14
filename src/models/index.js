const { Sequelize } = require('sequelize');
const config = require('../config/database');
const env = process.env.NODE_ENV || 'development';
// Use test config if in test environment, otherwise use specified env
const dbConfig = env === 'test' ? (config.test || config.development) : config[env];

// Initialize Sequelize connection
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool
  }
);

// Import models
const User = require('./User')(sequelize, Sequelize.DataTypes);
const Device = require('./Device')(sequelize, Sequelize.DataTypes);
const Subscription = require('./Subscription')(sequelize, Sequelize.DataTypes);
const DeviceUser = require('./DeviceUser')(sequelize, Sequelize.DataTypes);
const WebhookEvent = require('./WebhookEvent')(sequelize, Sequelize.DataTypes);
const DeviceCreationLimit = require('./DeviceCreationLimit')(sequelize, Sequelize.DataTypes);
const RiskEvent = require('./RiskEvent')(sequelize, Sequelize.DataTypes);
const AppVersion = require('./AppVersion')(sequelize, Sequelize.DataTypes);

// Define associations
// User has many Subscriptions
User.hasMany(Subscription, { foreignKey: 'user_id', as: 'subscriptions' });
Subscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User has many Devices through DeviceUser (many-to-many)
User.belongsToMany(Device, { 
  through: DeviceUser, 
  foreignKey: 'user_id', 
  otherKey: 'device_id',
  as: 'devices'
});
Device.belongsToMany(User, { 
  through: DeviceUser, 
  foreignKey: 'device_id', 
  otherKey: 'user_id',
  as: 'users'
});

// Device has many DeviceUser
Device.hasMany(DeviceUser, { foreignKey: 'device_id', as: 'deviceUsers' });
DeviceUser.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });
DeviceUser.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// RiskEvent associations
RiskEvent.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
RiskEvent.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });

const db = {
  sequelize,
  Sequelize,
  User,
  Device,
  Subscription,
  DeviceUser,
  WebhookEvent,
  DeviceCreationLimit,
  RiskEvent,
  AppVersion
};

module.exports = db;
