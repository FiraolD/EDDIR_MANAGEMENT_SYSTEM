import React from 'react';
import { 
  User, 
  Shield, 
  Building, 
  ChevronRight,
  LogOut,
  CreditCard,
  Sun,
  Moon,
  Bell,
  Mail,
  Camera
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const Settings: React.FC = () => {
  const { t, theme, toggleTheme, language, setLanguage, setUser } = useAppContext();

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in slide-in-from-bottom-6 duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center gap-8 bg-card p-10 rounded-[3rem] shadow-xl border border-border/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="relative shrink-0">
          <div className="w-32 h-32 rounded-[2.5rem] bg-primary flex items-center justify-center text-5xl font-black text-primary-foreground shadow-2xl shadow-primary/20">
            JD
          </div>
          <button className="absolute -bottom-2 -right-2 w-12 h-12 bg-white dark:bg-zinc-800 border-4 border-card rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
            <Camera className="w-5 h-5 text-primary" />
          </button>
        </div>
        <div className="space-y-4 relative z-10">
          <div>
            <h2 className="text-4xl font-black tracking-tight text-foreground">John Doe</h2>
            <p className="text-muted-foreground font-semibold text-lg">Awash Iddir Principal Administrator</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 bg-primary/10 text-primary border-primary/20">System Admin</div>
            <div className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 bg-blue-50 text-blue-600 border-blue-100">Tier 1 Support</div>
            <div className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 bg-muted/50 text-muted-foreground border-border">ID: AD-99201</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-4">
          <nav className="flex flex-col gap-2 bg-card p-4 rounded-[2.5rem] shadow-sm border border-border/50">
            {[ 
              { icon: User, label: 'Profile Settings', active: true },
              { icon: Building, label: 'Organization' },
              { icon: CreditCard, label: 'Payout Accounts' },
              { icon: Shield, label: 'Security & Privacy' },
              { icon: Bell, label: 'Notification Settings' },
              { icon: Mail, label: 'Email Preferences' }
            ].map((item, idx) => (
              <button 
                key={idx}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-2xl font-black transition-all group",
                  item.active 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-3 text-sm">
                  <item.icon className={cn("w-5 h-5", item.active ? "text-white" : "text-muted-foreground group-hover:text-primary")} /> 
                  {item.label}
                </span>
                <ChevronRight className={cn("w-4 h-4 transition-transform group-hover:translate-x-1", item.active ? "text-white/50" : "text-muted-foreground/30")} />
              </button>
            ))}
          </nav>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-card border border-border/50">
            <CardHeader className="p-8 border-b border-muted/50">
              <CardTitle className="text-2xl font-black tracking-tight text-foreground">{t('appearance_language')}</CardTitle>
              <CardDescription className="font-medium">Personalize how Awash Connect looks and sounds to you.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-lg font-black text-foreground">{t('dark_mode')}</Label>
                  <p className="text-sm font-medium text-muted-foreground">Reduce eye strain by switching to a darker theme.</p>
                </div>
                <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-2xl">
                  <div className={cn("p-2 rounded-xl transition-all", theme === 'light' ? "bg-white shadow-sm text-amber-500" : "text-muted-foreground")}>
                    <Sun className="w-5 h-5" />
                  </div>
                  <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} className="data-[state=checked]:bg-primary" />
                  <div className={cn("p-2 rounded-xl transition-all", theme === 'dark' ? "bg-zinc-800 shadow-sm text-blue-400" : "text-muted-foreground")}>
                    <Moon className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <Separator className="bg-muted/50" />

              <div className="space-y-6">
                <div className="space-y-1">
                  <Label className="text-lg font-black text-foreground">{t('display_language')}</Label>
                  <p className="text-sm font-medium text-muted-foreground">Choose your preferred language for the interface across the entire app.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'en', label: 'English', native: 'English' },
                    { id: 'am', label: 'አማርኛ', native: 'Amharic' },
                    { id: 'or', label: 'Afaan Oromoo', native: 'Oromo' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setLanguage(lang.id as any)}
                      className={cn(
                        "flex flex-col items-center justify-center p-6 rounded-3xl border-4 transition-all duration-300",
                        language === lang.id 
                          ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/5 scale-105" 
                          : "border-muted hover:border-primary/30 text-muted-foreground hover:bg-muted/30"
                      )}
                    >
                      <span className="text-xl font-black">{lang.label}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-50 mt-1">{lang.native}</span>
                      {language === lang.id && (
                        <div className="mt-3 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-card border border-border/50">
            <CardHeader className="p-8 border-b border-muted/50">
              <CardTitle className="text-2xl font-black tracking-tight text-foreground">Contact Details</CardTitle>
              <CardDescription className="font-medium">How we can reach you for urgent system updates.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-bold ml-1 text-foreground">Email Address</Label>
                  <Input defaultValue="john.doe@awash.com" className="h-12 rounded-xl bg-muted/30 border-none font-bold text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold ml-1 text-foreground">Phone Number</Label>
                  <Input defaultValue="+251 911 000 000" className="h-12 rounded-xl bg-muted/30 border-none font-bold text-foreground" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button className="rounded-2xl h-12 px-10 font-black shadow-lg shadow-primary/20 transition-all active:scale-95 bg-primary text-white">Update Profile</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-destructive/5 border-2 border-destructive/20">
            <CardHeader className="p-8">
              <CardTitle className="text-2xl font-black text-destructive">{t('danger_zone')}</CardTitle>
              <CardDescription className="font-bold text-destructive/70">Actions here are permanent and require administrative confirmation.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <Button 
                variant="destructive" 
                className="w-full h-14 rounded-2xl font-black shadow-xl shadow-destructive/20 group"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                {t('logout_account')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};