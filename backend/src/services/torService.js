const torRepository = require("../repositories/torRepository");

/**
 * Service class for TOR (Terms of Reference) operations.
 * Handles the business logic for creating, retrieving, updating, and deleting TORs,
 * acting as an intermediary between the controller and the repository.
 */
class TorService {
  /**
   * Creates a new TOR record.
   * @param {Object} data - The TOR data payload.
   * @returns {Object} The created TOR document.
   */
  async createTor(data) {
    return await torRepository.create(data);
  }

  /**
   * Retrieves all TOR records.
   * @returns {Array} Array of TOR documents.
   */
  async getAllTors() {
    return await torRepository.findAll();
  }

  /**
   * Retrieves a single TOR by its MongoDB ID.
   * @param {String} id - The MongoDB ObjectID string.
   * @returns {Object|null} The TOR document, or null if not found.
   */
  async getTorById(id) {
    return await torRepository.findById(id);
  }

  /**
   * Updates an existing TOR by its MongoDB ID.
   * @param {String} id - The MongoDB ObjectID string.
   * @param {Object} data - The update payload.
   * @returns {Object|null} The updated TOR document, or null if not found.
   */
  async updateTor(id, data) {
    return await torRepository.update(id, data);
  }

  /**
   * Deletes a TOR by its MongoDB ID.
   * @param {String} id - The MongoDB ObjectID string.
   * @returns {Object|null} The deleted TOR document, or null if not found.
   */
  async deleteTor(id) {
    return await torRepository.delete(id);
  }

  /**
   * Upserts a TOR using its external Reference ID (refId).
   * Useful for syncing data from external APIs without creating duplicates.
   * @param {String} refId - The external Reference ID.
   * @param {Object} data - The TOR data payload.
   * @returns {Object} The upserted TOR document.
   */
  async upsertTorByRefId(refId, data) {
    return await torRepository.upsertByRefId(refId, data);
  }
}

module.exports = new TorService();
