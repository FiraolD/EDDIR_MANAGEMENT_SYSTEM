"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNotificationAsRead = exports.getNotifications = exports.notifyRole = exports.createNotification = void 0;
const database_1 = require("../config/database");
const createNotification = async (data) => {
    try {
        const result = await (0, database_1.query)(`INSERT INTO notifications (user_id, title, body, data)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [data.userId, data.title, data.body, data.data ? JSON.stringify(data.data) : null]);
        return result.rows[0];
    }
    catch (error) {
        console.error('Failed to create notification:', error);
        return null;
    }
};
exports.createNotification = createNotification;
const notifyRole = async (role, data) => {
    try {
        const users = await (0, database_1.query)('SELECT id FROM users WHERE role = $1 AND is_active = true', [role]);
        const notifications = [];
        for (const user of users.rows) {
            const notification = await (0, exports.createNotification)({
                userId: user.id,
                title: data.title,
                body: data.body,
                data: data.data
            });
            notifications.push(notification);
        }
        return notifications;
    }
    catch (error) {
        console.error('Failed to notify role:', error);
        return [];
    }
};
exports.notifyRole = notifyRole;
const getNotifications = async (userId, params) => {
    let queryText = `
    SELECT * FROM notifications
    WHERE user_id = $1
  `;
    const values = [userId];
    let idx = 2;
    if (params.unreadOnly) {
        queryText += ` AND is_read = false`;
    }
    queryText += ` ORDER BY created_at DESC`;
    if (params.limit) {
        queryText += ` LIMIT $${idx}`;
        values.push(params.limit);
        idx++;
    }
    if (params.offset) {
        queryText += ` OFFSET $${idx}`;
        values.push(params.offset);
    }
    const result = await (0, database_1.query)(queryText, values);
    return result.rows;
};
exports.getNotifications = getNotifications;
const markNotificationAsRead = async (notificationId, userId) => {
    const result = await (0, database_1.query)(`UPDATE notifications 
     SET is_read = true 
     WHERE id = $1 AND user_id = $2 
     RETURNING *`, [notificationId, userId]);
    return result.rows[0];
};
exports.markNotificationAsRead = markNotificationAsRead;
