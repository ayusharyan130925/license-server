const { Subscription } = require('../models');
const { Op } = require('sequelize');
const db = require('../models');

/**
 * License Expiration Service
 * 
 * Handles automatic expiration of licenses based on subscription periods
 * Should be run as a scheduled job (cron) to expire licenses when their period ends
 */
class LicenseExpirationService {
  /**
   * Expire subscriptions that have passed their current_period_end
   * This should be run periodically (e.g., every hour) to keep licenses in sync
   * 
   * @returns {Promise<{expired: number, errors: number}>} - Results of expiration job
   */
  static async expireLicenses() {
    const now = new Date();
    let expiredCount = 0;
    let errorCount = 0;

    try {
      // Find all active subscriptions that have passed their period_end
      const expiredSubscriptions = await Subscription.findAll({
        where: {
          status: 'active',
          current_period_end: {
            [Op.lt]: now
          }
        }
      });

      // Expire each subscription
      for (const subscription of expiredSubscriptions) {
        try {
          await subscription.update({
            status: 'expired'
          });
          expiredCount++;
        } catch (error) {
          console.error(`Error expiring subscription ${subscription.id}:`, error);
          errorCount++;
        }
      }

      return {
        expired: expiredCount,
        errors: errorCount,
        timestamp: now
      };
    } catch (error) {
      console.error('Error in expireLicenses job:', error);
      throw error;
    }
  }

  /**
   * Get subscriptions expiring soon (within specified days)
   * Useful for sending renewal reminders
   * 
   * @param {number} daysAhead - Number of days ahead to check (default: 7)
   * @returns {Promise<Array<Subscription>>} - Subscriptions expiring soon
   */
  static async getExpiringSoon(daysAhead = 7) {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return await Subscription.findAll({
      where: {
        status: 'active',
        current_period_end: {
          [Op.between]: [now, futureDate]
        }
      },
      include: [
        {
          model: require('../models').User,
          as: 'user',
          attributes: ['id', 'email']
        }
      ]
    });
  }

  /**
   * Schedule expiration job to run periodically
   * @param {number} intervalMinutes - How often to run the job (default: 60 minutes)
   */
  static scheduleExpirationJob(intervalMinutes = 60) {
    const intervalMs = intervalMinutes * 60 * 1000;
    console.log(`LicenseExpirationService: Scheduling expiration job to run every ${intervalMinutes} minutes.`);

    // Run immediately on startup
    this.expireLicenses().catch(console.error);

    // Schedule periodic runs
    setInterval(() => {
      this.expireLicenses()
        .then((result) => {
          if (result.expired > 0) {
            console.log(`LicenseExpirationService: Expired ${result.expired} licenses.`);
          }
        })
        .catch(console.error);
    }, intervalMs);
  }
}

module.exports = LicenseExpirationService;
