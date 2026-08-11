import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Wallet, 
  AlertCircle, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  CreditCard
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { usersAPI, membersAPI, dashboardAPI } from '@/services/api';

export const Dashboard: React.FC = () => {
  const { t, user, dashboardStats, fetchDashboardStats, selectedOrganizationId } = useAppContext();
  const [isLoading, setIsLoading] = useState(true);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      if (user) {
        await fetchDashboardStats(selectedOrganizationId);
        // Fetch recent members with organization filter
        try {
          const params: any = { limit: 5 };
          if (selectedOrganizationId) {
            params.organization_id = selectedOrganizationId;
          }
          const response = await membersAPI.getAll(params);
          setRecentMembers(response.data.members);
        } catch (error) {
          console.error('Failed to fetch recent members:', error);
        }
      }
      setIsLoading(false);
    };
    loadData();
  }, [user, selectedOrganizationId]);
  
  const stats = [
    { 
      title: t('total_members'), 
      value: dashboardStats?.members?.total?.toLocaleString() || '0', 
      change: '+12%', 
      icon: Users, 
      color: 'text-primary', 
      bg: 'bg-primary/5' 
    },

    { 
      title: t('monthly_contributions'), 
      value: `ETB ${dashboardStats?.contributions?.this_month?.toLocaleString() || '0'}`, 
      change: '+5.4%', 
      icon: Wallet, 
      color: 'text-primary', 
      bg: 'bg-primary/5' 
    },
    { 
      title: t('pending_claims'), 
      value: dashboardStats?.claims?.reported?.toString() || '0', 
      change: dashboardStats?.claims?.high_priority ? `+${dashboardStats.claims.high_priority}` : '-2', 
      icon: AlertCircle, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50' 
    },
    { 
      title: t('reserve_fund'), 
      value: `ETB ${((dashboardStats?.contributions?.total || 0) - (dashboardStats?.claims?.total_paid_this_year || 0)).toLocaleString()}`, 
      change: '+8%', 
      icon: TrendingUp, 
      color: 'text-secondary', 
      bg: 'bg-secondary/10' 
    },
  ];

  // Prepare chart data from API
  const chartData = dashboardStats?.monthlyTrend || [
    { name: 'Jan', amount: 45000 },
    { name: 'Feb', amount: 52000 },
    { name: 'Mar', amount: 48000 },
    { name: 'Apr', amount: 61000 },
    { name: 'May', amount: 55000 },
    { name: 'Jun', amount: 67000 },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[450px] rounded-3xl" />
          <Skeleton className="h-[450px] rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">{t('dashboard')}</h2>
          <p className="text-muted-foreground font-medium">
            Welcome back, {user?.fullName?.split(' ')[0] || 'Administrator'}. Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-2xl border-2 font-bold h-11 border-primary/20 hover:border-primary/50 text-primary">
            Generate Report
          </Button>
          <Button className="rounded-2xl font-black h-11 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
            <Plus className="w-5 h-5 mr-2" /> {t('new_member')}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={cn("p-4 rounded-2xl", stat.bg)}>
                    <stat.icon className={cn("w-6 h-6", stat.color)} />
                  </div>
                  <Badge variant="secondary" className={cn("rounded-full px-2 py-0.5 border-none font-bold text-[10px]", 
                    stat.change.startsWith('+') ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700")}>
                    {stat.change.startsWith('+') ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {stat.change}
                  </Badge>
                </div>
                <div className="mt-6">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                  <h3 className="text-2xl font-black mt-1">{stat.value}</h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl overflow-hidden bg-card">
          <CardHeader className="border-b border-muted/50 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black">{t('monthly_contributions')}</CardTitle>
                <CardDescription className="font-medium">Overview of collection trends for 2024</CardDescription>
              </div>
              <Badge variant="outline" className="rounded-lg border-2 font-bold text-primary border-primary/20">Yearly</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000080" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#000080" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#888', fontSize: 12, fontWeight: 600}} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#888', fontSize: 12, fontWeight: 600}} 
                    tickFormatter={(val) => `${val/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '12px'}}
                    cursor={{stroke: '#000080', strokeWidth: 2, strokeDasharray: '4 4'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#000080" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorAmt)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Activity */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-black">{t('quick_actions')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-24 flex flex-col gap-2 rounded-2xl border-2 border-dashed border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all text-primary font-bold">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs font-bold">{t('new_member')}</span>
              </Button>
              <Button variant="outline" className="h-24 flex flex-col gap-2 rounded-2xl border-2 border-dashed border-secondary/40 hover:border-secondary/60 hover:bg-secondary/5 transition-all text-secondary font-bold">
                <div className="p-2 rounded-xl bg-secondary/10">
                  <CreditCard className="w-5 h-5 text-secondary" />
                </div>
                <span className="text-xs font-bold">{t('record_payment')}</span>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-black">{t('recent_activity')}</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary font-bold p-0 h-auto hover:bg-transparent">{t('view_all')}</Button>
            </CardHeader>
            <CardContent className="space-y-5">
              {recentMembers.map((member, i) => (
                <div key={i} className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-xs text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                    {member.full_name?.split(' ').map((n: string) => n[0]).join('') || 'M'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground font-medium">Joined {new Date(member.join_date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-blue-600">+ETB 500</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">New Member</p>
                  </div>
                </div>
              ))}
              {recentMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No recent activity
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};