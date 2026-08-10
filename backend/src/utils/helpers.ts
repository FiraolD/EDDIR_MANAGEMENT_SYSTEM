// backend/src/utils/helpers.ts

// Generate random ID
export const generateRandomId = (prefix: string = ''): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}${timestamp}${random}`;
};

// Format currency
export const formatCurrency = (amount: number, currency: string = 'ETB'): string => {
  return `${currency} ${amount.toLocaleString()}`;
};

// Format date
export const formatDate = (date: Date | string, format: string = 'YYYY-MM-DD'): string => {
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

// Calculate age from date of birth
export const calculateAge = (dateOfBirth: Date | string): number => {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Generate member number
export const generateMemberNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000);
  return `MEM${year}${random.toString().padStart(4, '0')}`;
};

// Generate claim number
export const generateClaimNumber = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `CLM-${timestamp}-${random}`;
};

// Generate transaction number
export const generateTransactionNumber = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `TXN-${timestamp}-${random}`;
};

// Generate payment reference
export const generatePaymentReference = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `PAY-${timestamp}-${random}`;
};

// Sleep/delay function
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Deep clone object
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// Truncate string
export const truncateString = (str: string, maxLength: number, suffix: string = '...'): string => {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength) + suffix;
};

// Capitalize first letter
export const capitalizeFirstLetter = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Convert to title case
export const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Check if string is empty or whitespace
export const isEmptyOrWhitespace = (str: string): boolean => {
  return !str || str.trim().length === 0;
};

// Parse query parameters
export const parseQueryParams = (query: any): Record<string, any> => {
  const params: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(query)) {
    if (value === 'true') {
      params[key] = true;
    } else if (value === 'false') {
      params[key] = false;
    } else if (!isNaN(Number(value)) && value !== '') {
      params[key] = Number(value);
    } else {
      params[key] = value;
    }
  }
  
  return params;
};

// Get date range for filtering
export const getDateRange = (period: string): { startDate: Date; endDate: Date } => {
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

// Group array by key
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

// Calculate percentage
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return (value / total) * 100;
};