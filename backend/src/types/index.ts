// backend/src/types/index.ts

// User types
export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: 'admin' | 'leader' | 'member';
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Member types
export interface Member {
  id: string;
  userId: string;
  memberNumber: string;
  status: 'active' | 'inactive' | 'pending';
  joinDate: Date;
  totalContributions: number;
  lastContributionDate?: Date;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Contribution types
export interface Contribution {
  id: string;
  memberId: string;
  amount: number;
  paymentMethod: 'telebirr' | 'cbe_birr' | 'cash' | 'bank_transfer';
  transactionRef: string;
  status: 'pending' | 'confirmed' | 'failed';
  recordedBy: string;
  contributionDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Claim types
export interface Claim {
  id: string;
  memberId: string;
  claimNumber: string;
  deceasedName: string;
  relationship: 'self' | 'spouse' | 'parent' | 'child' | 'other';
  dateOfDeath: Date;
  dateReported: Date;
  amount: number;
  status: 'reported' | 'leader_approved' | 'admin_approved' | 'processing' | 'paid';
  priority: 'high' | 'normal' | 'low';
  documents: string[];
  approvedBy?: string;
  approvedAt?: Date;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Transaction types
export interface Transaction {
  id: string;
  transactionNumber: string;
  type: 'credit' | 'debit';
  category: 'contribution' | 'claim_payout' | 'registration' | 'service_fee' | 'utility';
  amount: number;
  memberId?: string;
  claimId?: string;
  contributionId?: string;
  paymentMethod?: string;
  status: 'pending' | 'completed' | 'failed';
  reference?: string;
  description?: string;
  transactionDate: Date;
  createdAt: Date;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

// Audit log types
export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Dashboard stats types
export interface DashboardStats {
  members: {
    total: number;
    active: number;
    inactive: number;
    pending: number;
    totalContributions: number;
  };
  contributions: {
    total: number;
    thisMonth: number;
    thisYear: number;
  };
  claims: {
    total: number;
    reported: number;
    leaderApproved: number;
    adminApproved: number;
    processing: number;
    paid: number;
    highPriority: number;
    totalPaidThisYear: number;
  };
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Auth types
export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    phone: string;
    fullName: string;
    role: string;
  };
}

export interface RegisterRequest {
  email: string;
  phone: string;
  fullName: string;
  password: string;
}

// Request with user context
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    phone: string;
    role: string;
  };
}
// Update the UserRole type
export type UserRole = 
  | 'super_admin' 
  | 'org_admin' 
  | 'claims_manager' 
  | 'finance_processor' 
  | 'finance_approver' 
  | 'finance_recon' 
  | 'finance_auditor' 
  | 'edir_leader' 
  | 'member';
// Chart data types
export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
}

export interface MonthlyTrend {
  month: string;
  total: number;
  count: number;
}

// Export types
export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  startDate?: Date;
  endDate?: Date;
  filters?: Record<string, any>;
}

// Settings types
export interface Setting {
  key: string;
  value: any;
  updatedBy?: string;
  updatedAt: Date;
}

export interface MonthlyContributionSetting {
  amount: number;
  currency: string;
}

export interface ClaimLimitSetting {
  maxAmount: number;
  processingDays: number;
}