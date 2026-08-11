import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  ChevronLeft,
  Phone
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

const BANNER_URL = "https://storage.googleapis.com/dala-prod-public-storage/generated-images/349ea826-6fc4-4126-8d42-f3f485a7604e/auth-banner-new-b9563fdf-1778755953451.webp";
const LOGO_URL = "https://storage.googleapis.com/dala-prod-public-storage/generated-images/349ea826-6fc4-4126-8d42-f3f485a7604e/brand-logo-new-db5d150c-1778755953630.webp";

export const Auth: React.FC = () => {
  const { login, loading, t } = useAppContext();
  const [view, setView] = useState<'login' | 'forgot' | 'otp'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (view === 'login') {
        await login(identifier, password);
      } else if (view === 'otp') {
        // For demo, just login after OTP
        await login(identifier, password);
      } else if (view === 'forgot') {
        // Implement forgot password API call
        // await forgotPassword(email);
        setView('login');
      }
    } catch (error) {
      // Error already handled in context
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side: Visual Banner (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img 
          src={BANNER_URL} 
          alt="Financial Services Banner" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white space-y-4">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Logo" className="w-12 h-12 rounded-2xl border-2 border-white/20 shadow-2xl bg-white p-1" />
            <h2 className="text-4xl font-black tracking-tight text-white">EddirConnect</h2>
          </div>
          <p className="text-xl font-medium opacity-90 max-w-md">
            Empowering communities through digital inclusion and sustainable support networks.
          </p>
          <div className="flex gap-4 pt-4">
            <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
              <p className="text-2xl font-black">1.2M+</p>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Members</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
              <p className="text-2xl font-black">ETB 84M</p>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Pooled Funds</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        <div className="lg:hidden absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="lg:hidden absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />

        <div className="w-full max-w-[420px] space-y-8 relative z-10">
          <div className="text-center lg:text-left space-y-2">
            <div className="lg:hidden inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary text-primary-foreground mb-4 shadow-xl shadow-primary/20">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-primary">
              {view === 'login' ? t('welcome_back') : view === 'forgot' ? t('reset_password') : t('verify_otp')}
            </h1>
            <p className="text-muted-foreground font-medium">
              {view === 'login' && 'Enter your credentials to access your account'}
              {view === 'forgot' && 'Enter your email to receive a reset link'}
              {view === 'otp' && 'Enter the 6-digit code sent to your phone'}
            </p>
          </div>

          <Card className="border-none shadow-2xl shadow-primary/5 rounded-[2rem] overflow-hidden">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={view}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {view === 'login' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="identifier" className="font-bold ml-1">{t('email_or_phone')}</Label>
                          <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input 
                              id="identifier" 
                              value={identifier}
                              onChange={(e) => setIdentifier(e.target.value)}
                              placeholder="name@example.com or +251..." 
                              className="pl-12 h-14 rounded-2xl border-muted bg-muted/30 focus:bg-background transition-all" 
                              required 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-1">
                            <Label htmlFor="password" className="font-bold">{t('password')}</Label>
                            <button 
                              type="button" 
                              onClick={() => setView('forgot')}
                              className="text-xs text-primary font-bold hover:underline"
                            >
                              {t('forgot_password')}
                            </button>
                          </div>
                          <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input 
                              id="password" 
                              type="password" 
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="pl-12 h-14 rounded-2xl border-muted bg-muted/30 focus:bg-background transition-all" 
                              required 
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {view === 'forgot' && (
                      <div className="space-y-2">
                        <Label htmlFor="reset-email" className="font-bold">Email Address</Label>
                        <Input 
                          id="reset-email" 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com" 
                          className="h-14 rounded-2xl border-muted bg-muted/30 focus:bg-background" 
                          required 
                        />
                      </div>
                    )}

                    {view === 'otp' && (
                      <div className="space-y-6">
                        <div className="flex justify-between gap-2 sm:gap-4">
                          {otp.map((digit, idx) => (
                            <Input 
                              key={idx} 
                              className="w-12 h-16 text-center text-2xl font-black rounded-2xl border-2 border-muted focus:border-primary transition-all"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => {
                                const newOtp = [...otp];
                                newOtp[idx] = e.target.value;
                                setOtp(newOtp);
                                if (e.target.value && idx < 5) {
                                  const nextInput = document.getElementById(`otp-${idx + 1}`);
                                  nextInput?.focus();
                                }
                              }}
                              id={`otp-${idx}`}
                            />
                          ))}
                        </div>
                        <p className="text-center text-sm font-medium text-muted-foreground">
                          Didn't receive code? <button type="button" className="text-primary font-bold hover:underline">Resend OTP</button>
                        </p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                <Button 
                  type="submit" 
                  className="w-full h-14 rounded-2xl text-base font-black shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90 transition-all" 
                  disabled={loading}
                >
                  {loading ? 'Processing...' : (
                    <span className="flex items-center gap-2 justify-center">
                      {view === 'login' ? t('sign_in') : view === 'forgot' ? 'Send Reset Link' : t('verify')}
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 border-t border-muted/50 bg-muted/10 py-6">
              {(view === 'forgot' || view === 'otp') && (
                <button onClick={() => setView('login')} className="flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors w-full">
                  <ChevronLeft className="w-4 h-4" />
                  {t('back_to_login')}
                </button>
              )}
              {/* Removed "Sign Up" link – account creation is admin-only */}
            </CardFooter>
          </Card>

          <div className="flex items-center justify-center gap-6 text-xs font-bold text-muted-foreground uppercase tracking-widest">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <div className="w-1 h-1 rounded-full bg-muted" />
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <div className="w-1 h-1 rounded-full bg-muted" />
            <a href="#" className="hover:text-primary transition-colors">Support</a>
          </div>
        </div>
      </div>
    </div>
  );
};