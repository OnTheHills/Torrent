const emailAlertService = require("@/services/email/emailAlertService");

async function getPreferences(req, res) {
  try {
    const preferences = await emailAlertService.getPreferences(req.user.sub);
    return res.json(preferences);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
}

async function savePreferences(req, res) {
  try {
    const preferences = await emailAlertService.savePreferences(req.user.sub, req.body);
    return res.json(preferences);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
}

module.exports = { getPreferences, savePreferences };
