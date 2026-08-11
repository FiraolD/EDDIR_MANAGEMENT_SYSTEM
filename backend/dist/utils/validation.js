"use strict";
// backend/src/utils/validation.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidPriority = exports.isValidRelationship = exports.isValidUUID = exports.isValidPaymentMethod = exports.isValidContributionStatus = exports.isValidClaimStatus = exports.isValidMemberStatus = exports.validatePagination = exports.sanitizeInput = exports.validateRequired = exports.isValidTransactionNumber = exports.isValidClaimNumber = exports.isValidMemberNumber = exports.isValidDate = exports.isValidAmount = exports.isValidPassword = exports.isValidPhone = exports.isValidEmail = void 0;
// Email validation
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    return emailRegex.test(email);
};
exports.isValidEmail = isValidEmail;
// Ethiopian phone number validation (+251XXXXXXXXX)
const isValidPhone = (phone) => {
    // Remove spaces and special characters
    const cleanPhone = phone.replace(/\s/g, '').replace(/-/g, '');
    const phoneRegex = /^\+251[0-9]{9}$/;
    return phoneRegex.test(cleanPhone);
};
exports.isValidPhone = isValidPhone;
// Password validation (min 6 characters)
const isValidPassword = (password) => {
    return typeof password === 'string' && password.length >= 6;
};
exports.isValidPassword = isValidPassword;
// Amount validation (positive number)
const isValidAmount = (amount) => {
    return typeof amount === 'number' && amount > 0 && !isNaN(amount);
};
exports.isValidAmount = isValidAmount;
// Date validation (YYYY-MM-DD)
const isValidDate = (date) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date))
        return false;
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
};
exports.isValidDate = isValidDate;
// Member number validation
const isValidMemberNumber = (memberNumber) => {
    const memberRegex = /^MEM\d{13,}$/;
    return memberRegex.test(memberNumber);
};
exports.isValidMemberNumber = isValidMemberNumber;
// Claim number validation
const isValidClaimNumber = (claimNumber) => {
    const claimRegex = /^CLM-\d{13,}-\d{1,4}$/;
    return claimRegex.test(claimNumber);
};
exports.isValidClaimNumber = isValidClaimNumber;
// Transaction number validation
const isValidTransactionNumber = (txnNumber) => {
    const txnRegex = /^TXN-\d{13,}-\d{1,4}$/;
    return txnRegex.test(txnNumber);
};
exports.isValidTransactionNumber = isValidTransactionNumber;
// Validate required fields
const validateRequired = (data, requiredFields) => {
    const missingFields = [];
    for (const field of requiredFields) {
        if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
            missingFields.push(field);
        }
    }
    return missingFields;
};
exports.validateRequired = validateRequired;
// Sanitize input (prevent XSS)
const sanitizeInput = (input) => {
    if (!input)
        return '';
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};
exports.sanitizeInput = sanitizeInput;
// Validate pagination parameters
const validatePagination = (page, limit) => {
    const validPage = Math.max(1, page || 1);
    const validLimit = Math.min(100, Math.max(1, limit || 20));
    return { page: validPage, limit: validLimit };
};
exports.validatePagination = validatePagination;
// Validate status values
const isValidMemberStatus = (status) => {
    return ['active', 'inactive', 'pending'].includes(status);
};
exports.isValidMemberStatus = isValidMemberStatus;
const isValidClaimStatus = (status) => {
    return ['reported', 'leader_approved', 'admin_approved', 'processing', 'paid'].includes(status);
};
exports.isValidClaimStatus = isValidClaimStatus;
const isValidContributionStatus = (status) => {
    return ['pending', 'confirmed', 'failed'].includes(status);
};
exports.isValidContributionStatus = isValidContributionStatus;
const isValidPaymentMethod = (method) => {
    return ['telebirr', 'cbe_birr', 'cash', 'bank_transfer', 'automatic'].includes(method);
};
exports.isValidPaymentMethod = isValidPaymentMethod;
// Validate UUID format
const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};
exports.isValidUUID = isValidUUID;
// Validate relationship types
const isValidRelationship = (relationship) => {
    return ['self', 'spouse', 'parent', 'child', 'other'].includes(relationship);
};
exports.isValidRelationship = isValidRelationship;
// Validate priority levels
const isValidPriority = (priority) => {
    return ['high', 'normal', 'low'].includes(priority);
};
exports.isValidPriority = isValidPriority;
