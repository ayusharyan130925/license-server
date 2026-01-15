const { RiskEvent, DeviceCreationLimit, DeviceUser, User } = require('../models');
const { Op } = require('sequelize');
const db = require('../models');

/**
 * Abuse Metrics Service
 * 
 * Provides analytics and metrics for abuse detection:
 * - Risk event statistics
 * - Device creation patterns
 * - Rate limit violations
 * - Suspicious activity trends
 */
class AbuseMetricsService {
  /**
   * Get risk event statistics
   * 
   * @param {Object} filters - Filter options
   * @param {Date} filters.startDate - Start date (default: 7 days ago)
   * @param {Date} filters.endDate - End date (default: now)
   * @param {string} filters.eventType - Filter by event type
   * @returns {Promise<Object>} - Risk event statistics
   */
  static async getRiskEventStats(filters = {}) {
    const {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      eventType = null
    } = filters;

    const where = {
      created_at: {
        [Op.between]: [startDate, endDate]
      }
    };

    if (eventType) {
      where.event_type = eventType;
    }

    // Get total count
    const total = await RiskEvent.count({ where });

    // Get counts by event type
    const byType = await RiskEvent.findAll({
      where,
      attributes: [
        'event_type',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['event_type'],
      raw: true
    });

    // Get top IPs by risk events
    const topIPs = await RiskEvent.findAll({
      where: {
        ...where,
        ip_address: { [Op.ne]: null }
      },
      attributes: [
        'ip_address',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['ip_address'],
      order: [[db.sequelize.literal('count'), 'DESC']],
      limit: 10,
      raw: true
    });

    // Get top users by risk events (using raw query for better performance with GROUP BY)
    const [topUsersRaw] = await db.sequelize.query(`
      SELECT 
        r.user_id,
        COUNT(r.id) as count
      FROM risk_events r
      WHERE r.user_id IS NOT NULL
        AND r.created_at BETWEEN :startDate AND :endDate
      GROUP BY r.user_id
      ORDER BY count DESC
      LIMIT 10
    `, {
      replacements: { startDate, endDate },
      type: db.sequelize.QueryTypes.SELECT
    });

    // Handle empty results
    let topUsers = [];
    if (topUsersRaw && Array.isArray(topUsersRaw) && topUsersRaw.length > 0) {
      // Get user emails for the top users
      const userIds = topUsersRaw.map(item => item.user_id).filter(Boolean);
      
      if (userIds.length > 0) {
        const users = await User.findAll({
          where: { id: { [Op.in]: userIds } },
          attributes: ['id', 'email']
        });

        const userMap = new Map(users.map(u => [u.id, u.email]));
        topUsers = topUsersRaw.map(item => ({
          user_id: item.user_id,
          user_email: userMap.get(item.user_id) || null,
          count: parseInt(item.count, 10)
        }));
      } else {
        topUsers = topUsersRaw.map(item => ({
          user_id: item.user_id,
          user_email: null,
          count: parseInt(item.count, 10)
        }));
      }
    }

    return {
      total,
      byType: (byType || []).map(item => ({
        event_type: item.event_type,
        count: parseInt(item.count, 10)
      })),
      topIPs: (topIPs || []).map(item => ({
        ip_address: item.ip_address,
        count: parseInt(item.count, 10)
      })),
      topUsers: topUsers, // Already formatted above
      period: {
        start: startDate,
        end: endDate
      }
    };
  }

  /**
   * Get device creation rate limit statistics
   * 
   * @param {Object} filters - Filter options
   * @param {Date} filters.startDate - Start date (default: 7 days ago)
   * @param {Date} filters.endDate - End date (default: now)
   * @returns {Promise<Object>} - Rate limit statistics
   */
  static async getRateLimitStats(filters = {}) {
    const {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = filters;

    const where = {
      window_start: {
        [Op.between]: [startDate, endDate]
      }
    };

    // Get total device creations
    const totalCreations = await DeviceCreationLimit.sum('device_count', { where });

    // Get by identifier type
    const byType = await DeviceCreationLimit.findAll({
      where,
      attributes: [
        'identifier_type',
        [db.sequelize.fn('SUM', db.sequelize.col('device_count')), 'total'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'windows']
      ],
      group: ['identifier_type'],
      raw: true
    });

    // Get top IPs by device creation
    const topIPs = await DeviceCreationLimit.findAll({
      where: {
        ...where,
        identifier_type: 'ip'
      },
      attributes: [
        'identifier',
        [db.sequelize.fn('SUM', db.sequelize.col('device_count')), 'total']
      ],
      group: ['identifier'],
      order: [[db.sequelize.literal('total'), 'DESC']],
      limit: 10,
      raw: true
    });

    // Get top users by device creation
    const topUsers = await DeviceCreationLimit.findAll({
      where: {
        ...where,
        identifier_type: 'user'
      },
      attributes: [
        'identifier',
        [db.sequelize.fn('SUM', db.sequelize.col('device_count')), 'total']
      ],
      group: ['identifier'],
      order: [[db.sequelize.literal('total'), 'DESC']],
      limit: 10,
      raw: true
    });

    return {
      totalCreations: totalCreations || 0,
      byType: byType.map(item => ({
        identifier_type: item.identifier_type,
        total: parseInt(item.total || 0, 10),
        windows: parseInt(item.windows || 0, 10)
      })),
      topIPs: topIPs.map(item => ({
        ip_address: item.identifier,
        total: parseInt(item.total || 0, 10)
      })),
      topUsers: topUsers.map(item => ({
        user_id: parseInt(item.identifier, 10),
        total: parseInt(item.total || 0, 10)
      })),
      period: {
        start: startDate,
        end: endDate
      }
    };
  }

  /**
   * Get abuse detection summary
   * 
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} - Summary statistics
   */
  static async getAbuseSummary(filters = {}) {
    const [riskStats, rateLimitStats] = await Promise.all([
      this.getRiskEventStats(filters),
      this.getRateLimitStats(filters)
    ]);

    return {
      riskEvents: riskStats,
      rateLimits: rateLimitStats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get recent risk events
   * 
   * @param {number} limit - Number of events to return (default: 50)
   * @returns {Promise<Array>} - Recent risk events
   */
  static async getRecentRiskEvents(limit = 50) {
    const events = await RiskEvent.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit
    });

    return events.map(event => ({
      id: event.id,
      event_type: event.event_type,
      user_id: event.user_id,
      user_email: event.user?.email,
      device_id: event.device_id,
      ip_address: event.ip_address,
      metadata: event.metadata,
      created_at: event.created_at
    }));
  }
}

module.exports = AbuseMetricsService;
