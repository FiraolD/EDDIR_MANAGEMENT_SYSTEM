// backend/src/utils/validation.ts

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
  return emailRegex.test(email);
};

// Ethiopian phone number validation (+251XXXXXXXXX)
export const isValidPhone = (phone: string): boolean => {
  // Remove spaces and special characters
  const cleanPhone = phone.replace(/\s/g, '').replace(/-/g, '');
  const phoneRegex = /^\+251[0-9]{9}$/;
  return phoneRegex.test(cleanPhone);
};

// Password validation (min 6 characters)
export const isValidPassword = (password: string): boolean => {
  return password && password.length >= 6;
};

// Amount validation (positive number)
export const isValidAmount = (amount: number): boolean => {
  return amount && amount > 0 && !isNaN(amount);
};

// Date validation (YYYY-MM-DD)
export const isValidDate = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
};

// Member number validation
export const isValidMemberNumber = (memberNumber: string): boolean => {
  const memberRegex = /^MEM\d{13,}$/;
  return memberRegex.test(memberNumber);
};

// Claim number validation
export const isValidClaimNumber = (claimNumber: string): boolean => {
  const claimRegex = /^CLM-\d{13,}-\d{1,4}$/;
  return claimRegex.test(claimNumber);
};

// Transaction number validation
export const isValidTransactionNumber = (txnNumber: string): boolean => {
  const txnRegex = /^TXN-\d{13,}-\d{1,4}$/;
  return txnRegex.test(txnNumber);
};

// Validate required fields
export const validateRequired = (data: Record<string, any>, requiredFields: string[]): string[] => {
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      missingFields.push(field);
    }
  }
  
  return missingFields;
};

// Sanitize input (prevent XSS)
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Validate pagination parameters
export const validatePagination = (page: number, limit: number): { page: number; limit: number } => {
  const validPage = Math.max(1, page || 1);
  const validLimit = Math.min(100, Math.max(1, limit || 20));
  return { page: validPage, limit: validLimit };
};

// Validate status values
export const isValidMemberStatus = (status: string): boolean => {
  return ['active', 'inactive', 'pending'].includes(status);
};

export const isValidClaimStatus = (status: string): boolean => {
  return ['reported', 'leader_approved', 'admin_approved', 'processing', 'paid'].includes(status);
};

export const isValidContributionStatus = (status: string): boolean => {
  return ['pending', 'confirmed', 'failed'].includes(status);
};

export const isValidPaymentMethod = (method: string): boolean => {
  return ['telebirr', 'cbe_birr', 'cash', 'bank_transfer', 'automatic'].includes(method);
};

// Validate UUID format
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Validate relationship types
export const isValidRelationship = (relationship: string): boolean => {
  return ['self', 'spouse', 'parent', 'child', 'other'].includes(relationship);
};

// Validate priority levels
export const isValidPriority = (priority: string): boolean => {
  return ['high', 'normal', 'low'].includes(priority);
};