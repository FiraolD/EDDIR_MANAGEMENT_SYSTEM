import { query } from '../config/database';

export const createNotification = async (data: {
  userId: string;
  title: string;
  body: string;
  data?: any;
}) => {
  try {
    const result = await query(
      `INSERT INTO notifications (user_id, title, body, data)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.userId, data.title, data.body, data.data ? JSON.stringify(data.data) : null]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
};

export const notifyRole = async (role: string, data: {
  title: string;
  body: string;
  data?: any;
}) => {
  try {
    const users = await query(
      'SELECT id FROM users WHERE role = $1 AND is_active = true',
      [role]
    );

    const notifications = [];
    for (const user of users.rows) {
      const notification = await createNotification({
        userId: user.id,
        title: data.title,
        body: data.body,
        data: data.data
      });
      notifications.push(notification);
    }
    return notifications;
  } catch (error) {
    console.error('Failed to notify role:', error);
    return [];
  }
};

export const getNotifications = async (userId: string, params: {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}) => {
  let queryText = `
    SELECT * FROM notifications
    WHERE user_id = $1
  `;
  
  const values: any[] = [userId];
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

  const result = await query(queryText, values);
  return result.rows;
};

export const markNotificationAsRead = async (notificationId: string, userId: string) => {
  const result = await query(
    `UPDATE notifications 
     SET is_read = true 
     WHERE id = $1 AND user_id = $2 
     RETURNING *`,
    [notificationId, userId]
  );
  return result.rows[0];
};