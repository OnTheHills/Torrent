const notificationService = require("@/services/notificationService");

async function getMine(request, response) {
  try {
    const notifications = await notificationService.getMine(request.user.sub);
    return response.json(notifications);
  } catch (error) {
    return response.status(error.status || 500).json({ message: error.message });
  }
}

async function updateMine(request, response) {
  try {
    const notification = await notificationService.updateMine(request.params.id, request.user.sub, request.body);
    if (!notification) return response.status(404).json({ message: "Notification not found." });
    return response.json(notification);
  } catch (error) {
    return response.status(error.status || 500).json({ message: error.message });
  }
}

async function markAllRead(request, response) {
  try {
    await notificationService.markAllRead(request.user.sub);
    return response.json({ ok: true });
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

module.exports = { getMine, markAllRead, updateMine };
