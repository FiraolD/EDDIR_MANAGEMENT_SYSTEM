// src/context/AppContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, dashboardAPI, membersAPI } from '@/services/api';
import { toast } from 'sonner';

type Language = 'en' | 'am' | 'ao';
type Theme = 'light' | 'dark';

interface User {
    id: string;
    email: string;
    phone: string;
    fullName: string;
    role: string;
    organizationId?: string;
    organizationName?: string;
}

interface DashboardStats {
  members: {
    total: number;
    active: number;
    inactive: number;
    pending: number;
    total_contributions: number;
  };
  contributions: {
    total: number;
    this_month: number;
    this_year: number;
  };
  claims: {
    total: number;
    reported: number;
    leader_approved: number;
    admin_approved: number;
    processing: number;
    paid: number;
    high_priority: number;
    total_paid_this_year: number;
  };
  recentContributions: any[];
  monthlyTrend: any[];
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  dashboardStats: DashboardStats | null;
  setDashboardStats: (stats: DashboardStats | null) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  t: (key: string) => string;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: any) => Promise<void>;
  //fetchDashboardStats: () => Promise<void>;
  fetchDashboardStats: (organizationId?: string | null) => Promise<void>;
  loading: boolean;
  selectedOrganizationId: string | null;
  setSelectedOrganizationId: (id: string | null) => void;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    members: 'Members',
    contributions: 'Contributions',
    claims: 'Claims',
    transactions: 'Ledger',
    settings: 'Settings',
    notifications: 'Notifications',
    total_members: 'Total Members',
    monthly_contributions: 'Monthly Contributions',
    pending_claims: 'Pending Claims',
    recent_activity: 'Recent Activity',
    add_member: 'Add Member',
    record_contribution: 'Record Contribution',
    report_claim: 'Report Claim',
    logout: 'Log Out',
    finance: 'Finance',
    claims_review: 'Claims Review',
    welcome: 'Welcome back',
    search: 'Search...',
    language: 'Language',
    theme: 'Theme',
    save: 'Save Changes',
    cancel: 'Cancel',
    phone_error: 'Invalid Ethiopian phone number (+251...)',
    name: 'Name',
    phone: 'Phone',
    status: 'Status',
    actions: 'Actions',
    active: 'Active',
    inactive: 'Inactive',
    amount: 'Amount',
    date: 'Date',
    type: 'Type',
    confirmed: 'Confirmed',
    pending: 'Pending',
    history: 'History',
    payout: 'Payout',
    approval: 'Approval',
    edit: 'Edit',
    delete: 'Delete',
    showing: 'Showing',
    of: 'of',
    members_count: 'members',
    joined_date: 'Joined Date',
    last_payment: 'Last Payment',
    filter: 'Filter',
    save_changes: 'Save Changes',
    appearance_language: 'Appearance & Language',
    dark_mode: 'Dark Mode',
    display_language: 'Display Language',
    danger_zone: 'Danger Zone',
    logout_account: 'Log out of Account',
    transaction_ledger: 'Transaction Ledger',
    audit_trail: 'Audit Trail',
    export_csv: 'Export CSV',
    welcome_back: 'Welcome Back',
    create_account: 'Create Account',
    verify_otp: 'Verify OTP',
    reset_password: 'Reset Password',
    email_or_phone: 'Email or Phone',
    full_name: 'Full Name',
    password: 'Password',
    forgot_password: 'Forgot Password?',
    sign_in: 'Sign In',
    sign_up: 'Sign Up',
    continue: 'Continue',
    back_to_login: 'Back to Login',
    dont_have_account: "Don't have an account?",
    already_have_account: 'Already have an account?',
    claim_queue: 'Claim Queue',
    report_death: 'Report Death',
    beneficiary_for: 'Beneficiary for',
    reported_on: 'Reported on',
    advance: 'Advance',
    claim_guidelines: 'Claim Guidelines',
    financial_overview: 'Financial Overview',
    manage_contributions: 'Manage Contributions',
    record_payment: 'Record Payment',
    this_month: 'This Month',
    outstanding: 'Outstanding',
    reserve_fund: 'Reserve Fund',
    recent_history: 'Recent History',
    analytics: 'Analytics',
    method: 'Method',
    action: 'Action',
    quick_actions: 'Quick Actions',
    view_all: 'View All',
    new_member: 'New Member',
  },
  am: {
    dashboard: 'ዳሽቦርድ',
    members: 'አባላት',
    contributions: 'መዋጮዎች',
    claims: 'የይገባኛል ጥያቄዎች',
    transactions: 'መዝገብ',
    settings: 'ቅንብሮች',
    notifications: 'ማሳወቂያዎች',
    total_members: 'ጠቅላላ አባላት',
    monthly_contributions: 'ወርሃዊ መዋጮ',
    pending_claims: 'በጥበቃ ላይ ያሉ ጥያቄዎች',
    recent_activity: 'የቅርብ ጊዜ እንቅስቃሴ',
    add_member: 'አባል ጨምር',
    record_contribution: 'መዋጮ መዝግብ',
    report_claim: 'ጥያቄ አቅርብ',
    logout: 'ውጣ',
    welcome: 'እንኳን ደህና መጡ',
    search: 'ፈልግ...',
    language: 'ቋንቋ',
    theme: 'ገጽታ',
    save: 'ለውጦችን አስቀምጥ',
    cancel: 'ሰርዝ',
    phone_error: 'ትክክለኛ የኢትዮጵያ ስልክ ቁጥር አይደለም (+251...)',
    name: 'ስም',
    phone: 'ስልክ',
    status: 'ሁኔታ',
    actions: 'ተግባራት',
    active: 'ገባሪ',
    inactive: 'ያልነቃ',
    amount: 'መጠን',
    date: 'ቀን',
    type: 'ዓይነት',
    confirmed: 'ተረጋግጧል',
    pending: 'በጥበቃ ላይ',
    history: 'ታሪክ',
    payout: 'ክፍያ',
    approval: 'ማጽደቅ',
    edit: 'አርትዕ',
    delete: 'ሰርዝ',
    showing: 'እያሳየ',
    of: 'ከ',
    members_count: 'አባላት',
    joined_date: 'የተቀላቀለበት ቀን',
    last_payment: 'የመጨረሻ ክፍያ',
    filter: 'አጣራ',
    save_changes: 'ለውጦችን አስቀምጥ',
    appearance_language: 'መልክ እና ቋንቋ',
    dark_mode: 'ጨለማ ሁነታ',
    display_language: 'የማሳያ ቋንቋ',
    danger_zone: 'አደገኛ ዞን',
    logout_account: 'ከመለያ ውጣ',
    transaction_ledger: 'የግብይት መዝገብ',
    audit_trail: 'የኦዲት ዱካ',
    export_csv: 'CSV ላክ',
    welcome_back: 'እንኳን ደህና መጡ',
    create_account: 'መለያ ፍጠር',
    verify_otp: 'OTP አረጋግጥ',
    reset_password: 'የይለፍ ቃል ዳግም አስጀምር',
    email_or_phone: 'ኢሜል ወይም ስልክ',
    full_name: 'ሙሉ ስም',
    password: 'የይለፍ ቃል',
    forgot_password: 'የይለፍ ቃል ረሳሁ?',
    sign_in: 'ግባ',
    sign_up: 'ተመዝገብ',
    continue: 'ቀጥል',
    back_to_login: 'ወደ መግቢያ ተመለስ',
    dont_have_account: 'መለያ የለዎትም?',
    already_have_account: 'አካውንት አለዎት?',
    claim_queue: 'የይገባኛል ጥያቄ ወረፋ',
    report_death: 'ሞት ሪፖርት አድርግ',
    beneficiary_for: 'ተጠቃሚ ለ',
    reported_on: 'ሪፖርት የተደረገው በ',
    advance: 'አራመድ',
    claim_guidelines: 'የይገባኛል ጥያቄ መመሪያዎች',
    financial_overview: 'የፋይናንስ አጠቃላይ እይታ',
    manage_contributions: 'መዋጮዎችን ያስተዳድሩ',
    record_payment: 'ክፍያ መዝግብ',
    this_month: 'በዚህ ወር',
    outstanding: 'ያልተከፈለ',
    reserve_fund: 'የመጠባበቂያ ፈንድ',
    recent_history: 'የቅርብ ጊዜ ታሪክ',
    analytics: 'ትንተና',
    method: 'ዘዴ',
    action: 'ድርጊት',
    quick_actions: 'ፈጣን ድርጊቶች',
    view_all: 'ሁሉንም ተመልከት',
    new_member: 'አዲስ አባል',
  },
  ao: {
    dashboard: 'Dashboard',
    members: 'Miseensota',
    contributions: 'Buusii',
    claims: 'Gaaffii',
    transactions: 'Galmee',
    settings: 'Sajoo',
    notifications: 'Beeksisa',
    total_members: 'Walumaagal Miseensota',
    monthly_contributions: 'Buusii Jiʼaa',
    pending_claims: 'Gaaffii Eeggannoo',
    recent_activity: 'Sochii Dhihoo',
    add_member: 'Miseensa Dabaluu',
    record_contribution: 'Buusii Galmeessu',
    report_claim: 'Gaaffii Dhiyeessuu',
    logout: 'Baʼuu',
    welcome: 'Baga nagaan dhuftan',
    search: 'Barbaaduu...',
    language: 'Afaan',
    theme: 'Bif-dhaaba',
    save: 'Olkaaʼi',
    cancel: 'Haqi',
    phone_error: 'Lakk. bilbilaa Itiyoophiyaa sirrii miti (+251...)',
    name: 'Maqaa',
    phone: 'Bilbila',
    status: 'Haala',
    actions: 'Gocha',
    active: 'Hojjataa',
    inactive: 'Hin hojjatu',
    amount: 'Hamma',
    date: 'Guyyaa',
    type: 'Gosa',
    confirmed: 'Mirkanaaʼee',
    pending: 'Eeggannoo',
    history: 'Seenaa',
    payout: 'Kaffaltii',
    approval: 'Mirkaneessuu',
    edit: 'Gulaali',
    delete: 'Haqi',
    showing: 'Agnisaa',
    of: 'keessaa',
    members_count: 'miseensota',
    joined_date: 'Guyyaa Miseensummaa',
    last_payment: 'Kaffaltii Dhuma',
    filter: 'Shaluu',
    save_changes: 'Jijjiirraa Olkaaʼi',
    appearance_language: 'Bifaa & Afaan',
    dark_mode: 'Haala Duwwaa',
    display_language: 'Afaan agarsisaa',
    danger_zone: 'Naannoo Balaa',
    logout_account: 'Akaakuu irraa Baʼi',
    transaction_ledger: 'Galmee Daddarbinsa',
    audit_trail: 'Daandii Toʼannoo',
    export_csv: 'CSV Ergi',
    welcome_back: 'Baga nagaan deebiʼtan',
    create_account: 'Akaakuu Uumi',
    verify_otp: 'OTP Mirkaneessi',
    reset_password: 'Jecha Darbii Irra Deebiʼi',
    email_or_phone: 'Iimelii ykn Bilbila',
    full_name: 'Maqaa Guutuu',
    password: 'Jecha Darbii',
    forgot_password: 'Jecha Darbii Kan dagatte?',
    sign_in: 'Seeni',
    sign_up: 'Galmeessi',
    continue: 'Itti fufi',
    back_to_login: 'Garammaa seenaatti',
    dont_have_account: 'Akaakuu hin qabduu?',
    already_have_account: 'Akaakuu qabdaa?',
    claim_queue: 'Sarara Gaaffii',
    report_death: 'Duʼa Gabaasi',
    beneficiary_for: 'Fayyadeessaa',
    reported_on: 'Guyyaa gabaaʼe',
    advance: 'Dabarsi',
    claim_guidelines: 'Qajeelcha Gaaffii',
    financial_overview: 'Ilaalcha Firmaansaa',
    manage_contributions: 'Buusii Bulchuu',
    record_payment: 'Kaffaltii Galmeessuu',
    this_month: 'Jiʼa kana',
    outstanding: 'Kan hin kaffalamne',
    reserve_fund: 'Fandii Kuusaa',
    recent_history: 'Seenaa Dhihoo',
    analytics: 'Xiinxalawwan',
    method: 'Maltaa',
    action: 'Gocha',
    quick_actions: 'Gocha Addatti',
    view_all: 'Hunda Ilaali',
    new_member: 'Miseensa Haaraa',
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('iddir_lang') as Language) || 'en';
  });

  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('iddir_theme') as Theme) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('iddir_lang', language);
  }, [language]);

  // Organization switcher state
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(() => {
    return localStorage.getItem('selectedOrganizationId') || null;
  });

  useEffect(() => {
    localStorage.setItem('iddir_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('iddir_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (selectedOrganizationId) {
      localStorage.setItem('selectedOrganizationId', selectedOrganizationId);
    } else {
      localStorage.removeItem('selectedOrganizationId');
    }
  }, [selectedOrganizationId]);

  useEffect(() => {
    localStorage.setItem('iddir_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  const login = async (identifier: string, password: string) => {
    setLoading(true);
    try {
      const response = await authAPI.login(identifier, password);
      const { accessToken, refreshToken, user: userData } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      toast.success(`Welcome back, ${userData.fullName}!`);
      
      // Fetch dashboard stats after login
      await fetchDashboardStats();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('selectedOrganizationId');
      setUser(null);
      setDashboardStats(null);
      toast.success('Logged out successfully');
    }
  };

  const register = async (data: any) => {
    setLoading(true);
    try {
      const response = await authAPI.register(data);
      const { accessToken, refreshToken, user: userData } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      toast.success('Account created successfully!');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async (organizationId?: string | null) => {
    if (!user) return;
    try {
      const response = await dashboardAPI.getStats(organizationId ?? selectedOrganizationId);
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const handleSetSelectedOrg = (id: string | null) => {
    setSelectedOrganizationId(id);
    // Optionally refresh dashboard when switching
    if (user) {
      fetchDashboardStats(id);
    }
  };
  return (
    <AppContext.Provider value={{ 
      user, 
      setUser, 
      dashboardStats, 
      setDashboardStats,
      language, 
      setLanguage, 
      theme, 
      toggleTheme, 
      t,
      login,
      logout,
      register,
      fetchDashboardStats,
      selectedOrganizationId,
      setSelectedOrganizationId: handleSetSelectedOrg,
      loading,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};