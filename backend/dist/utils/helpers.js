"use strict";
// backend/src/utils/helpers.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePercentage = exports.groupBy = exports.getDateRange = exports.parseQueryParams = exports.isEmptyOrWhitespace = exports.toTitleCase = exports.capitalizeFirstLetter = exports.truncateString = exports.deepClone = exports.sleep = exports.generatePaymentReference = exports.generateTransactionNumber = exports.generateClaimNumber = exports.generateMemberNumber = exports.calculateAge = exports.formatDate = exports.formatCurrency = exports.generateRandomId = void 0;
// Generate random ID
const generateRandomId = (prefix = '') => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}${timestamp}${random}`;
};
exports.generateRandomId = generateRandomId;
// Format currency
const formatCurrency = (amount, currency = 'ETB') => {
    return `${currency} ${amount.toLocaleString()}`;
};
exports.formatCurrency = formatCurrency;
// Format date
const formatDate = (date, format = 'YYYY-MM-DD') => {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        return '';
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    switch (format) {
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
        case 'DD/MM/YYYY':
            return `${day}/${month}/${year}`;
        case 'MM/DD/YYYY':
            return `${month}/${day}/${year}`;
        case 'YYYY-MM-DD HH:MM:SS':
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        default:
            return `${year}-${month}-${day}`;
    }
};
exports.formatDate = formatDate;
// Calculate age from date of birth
const calculateAge = (dateOfBirth) => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};
exports.calculateAge = calculateAge;
// Generate member number
const generateMemberNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000);
    return `MEM${year}${random.toString().padStart(4, '0')}`;
};
exports.generateMemberNumber = generateMemberNumber;
// Generate claim number
const generateClaimNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `CLM-${timestamp}-${random}`;
};
exports.generateClaimNumber = generateClaimNumber;
// Generate transaction number
const generateTransactionNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `TXN-${timestamp}-${random}`;
};
exports.generateTransactionNumber = generateTransactionNumber;
// Generate payment reference
const generatePaymentReference = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `PAY-${timestamp}-${random}`;
};
exports.generatePaymentReference = generatePaymentReference;
// Sleep/delay function
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.sleep = sleep;
// Deep clone object
const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};
exports.deepClone = deepClone;
// Truncate string
const truncateString = (str, maxLength, suffix = '...') => {
    if (!str || str.length <= maxLength)
        return str;
    return str.substring(0, maxLength) + suffix;
};
exports.truncateString = truncateString;
// Capitalize first letter
const capitalizeFirstLetter = (str) => {
    if (!str)
        return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
exports.capitalizeFirstLetter = capitalizeFirstLetter;
// Convert to title case
const toTitleCase = (str) => {
    if (!str)
        return '';
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};
exports.toTitleCase = toTitleCase;
// Check if string is empty or whitespace
const isEmptyOrWhitespace = (str) => {
    return !str || str.trim().length === 0;
};
exports.isEmptyOrWhitespace = isEmptyOrWhitespace;
// Parse query parameters
const parseQueryParams = (query) => {
    const params = {};
    for (const [key, value] of Object.entries(query)) {
        if (value === 'true') {
            params[key] = true;
        }
        else if (value === 'false') {
            params[key] = false;
        }
        else if (!isNaN(Number(value)) && value !== '') {
            params[key] = Number(value);
        }
        else {
            params[key] = value;
        }
    }
    return params;
};
exports.parseQueryParams = parseQueryParams;
// Get date range for filtering
const getDateRange = (period) => {
    const endDate = new Date();
    let startDate = new Date();
    switch (period) {
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'week':
            startDate.setDate(endDate.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(endDate.getMonth() - 1);
            break;
        case 'quarter':
            startDate.setMonth(endDate.getMonth() - 3);
            break;
        case 'year':
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
        default:
            startDate.setMonth(endDate.getMonth() - 1);
    }
    return { startDate, endDate };
};
exports.getDateRange = getDateRange;
// Group array by key
const groupBy = (array, key) => {
    return array.reduce((result, item) => {
        const groupKey = String(item[key]);
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
    }, {});
};
exports.groupBy = groupBy;
// Calculate percentage
const calculatePercentage = (value, total) => {
    if (total === 0)
        return 0;
    return (value / total) * 100;
};
exports.calculatePercentage = calculatePercentage;
