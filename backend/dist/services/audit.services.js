"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = exports.createAuditLog = void 0;
const database_1 = require("../config/database");
const createAuditLog = async (data) => {
    try {
        await (0, database_1.query)(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, new_data, reason, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            data.userId,
            data.action,
            data.entityType,
            data.entityId || null,
            data.oldData ? JSON.stringify(data.oldData) : null,
            data.newData ? JSON.stringify(data.newData) : null,
            data.reason || null,
            data.ipAddress || null,
            data.userAgent || null
        ]);
    }
    catch (error) {
        console.error('Failed to create audit log:', error);
    }
};
exports.createAuditLog = createAuditLog;
const getAuditLogs = async (params) => {
    let queryText = `
    SELECT al.*, u.full_name as user_name
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE 1=1
  `;
    const values = [];
    let idx = 1;
    if (params.userId) {
        queryText += ` AND al.user_id = $${idx}`;
        values.push(params.userId);
        idx++;
    }
    if (params.entityType) {
        queryText += ` AND al.entity_type = $${idx}`;
        values.push(params.entityType);
        idx++;
    }
    if (params.entityId) {
        queryText += ` AND al.entity_id = $${idx}`;
        values.push(params.entityId);
        idx++;
    }
    if (params.startDate) {
        queryText += ` AND al.created_at >= $${idx}`;
        values.push(params.startDate);
        idx++;
    }
    if (params.endDate) {
        queryText += ` AND al.created_at <= $${idx}`;
        values.push(params.endDate);
        idx++;
    }
    queryText += ` ORDER BY al.created_at DESC`;
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
exports.getAuditLogs = getAuditLogs;
