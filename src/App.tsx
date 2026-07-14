import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Trophy,
  Users,
  Award,
  Phone,
  User as UserIcon,
  MapPin,
  Flame,
  ArrowRight,
  Shield,
  Clock,
  Volume2,
  Gift,
  HelpCircle,
  ExternalLink,
  BookOpen
} from 'lucide-react';

import { GameStage, User, SessionRecord, RecipeState } from './types';
import { DISTRICTS } from './ingredientsData';
import { audioEngine } from './lib/audioEngine';

// Subcomponents imports
import { InteractiveKitchen } from './components/InteractiveKitchen';
import { TeaAnalysis } from './components/TeaAnalysis';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { TutorialScreen } from './components/TutorialScreen';
import { AdminPanel } from './components/AdminPanel';
import { AudioControl } from './components/AudioControl';
import { PouringStage } from './components/PouringStage';

export default function App() {
  const [stage, setStage] = useState<GameStage>(GameStage.LANDING);
  const [user, setUser] = useState<User | null>(null);
  
  // Registration and Login States
  const [loginForm, setLoginForm] = useState({
    name: '',
    phone: '',
    district: 'Dhaka',
    referral: ''
  });
  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [authError, setAuthError] = useState('');

  // Active game session
  const [activeSession, setActiveSession] = useState<SessionRecord | null>(null);

  // Intermediate brewed data for the pouring step
  const [brewedData, setBrewedData] = useState<{
    recipe: RecipeState;
    temperature: number;
    brewingTime: number;
    discount?: number;
  } | null>(null);

  // Check persistent login on startup
  useEffect(() => {
    const storedUser = localStorage.getItem('pushti_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUser(u);
      } catch (e) {
        console.error('Error parsing stored user data', e);
      }
    }
  }, []);

  // Handle simulated SMS OTP dispatch
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    if (!loginForm.name || !loginForm.phone) {
      setAuthError('দয়া করে আপনার নাম এবং মোবাইল নম্বর প্রবেশ করুন।');
      return;
    }

    try {
      let data;
      try {
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: loginForm.phone })
        });
        if (res.ok) {
          data = await res.json();
        } else {
          throw new Error('Not ok');
        }
      } catch (err) {
        // Fallback: Generate local OTP for offline/Vercel environments
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`[LOCAL FALLBACK OTP] Generated code: ${code}`);
        data = {
          success: true,
          code,
          message: 'Local OTP generated.'
        };
      }
      
      if (data && data.success) {
        setIsOtpSent(true);
        setOtpCode(data.code); // Store code
        audioEngine.playClick();
      } else {
        setAuthError(data?.error || 'ওটিপি পাঠাতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
      }
    } catch (err) {
      setAuthError('ওটিপি পাঠাতে সমস্যা হয়েছে।');
    }
  };

  // Handle Simulated OTP Code Verification and User Authentication
  const handleVerifyAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (otpInput !== otpCode) {
      setAuthError('ভুল ওটিপি কোড! দয়া করে সঠিক কোডটি প্রদান করুন।');
      return;
    }

    try {
      let data;
      try {
        const res = await fetch('/api/auth/login-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: loginForm.name,
            phone: loginForm.phone,
            district: loginForm.district,
            referralCode: loginForm.referral
          })
        });
        if (res.ok) {
          data = await res.json();
        } else {
          throw new Error('Not ok');
        }
      } catch (err) {
        // Fallback: Create or retrieve local user in localStorage for Vercel/offline mode
        const referralCode = 'PUSHTI-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const id = 'local-user-' + Math.random().toString(36).substring(2, 11);
        
        const localUsers = JSON.parse(localStorage.getItem('pushti_local_users') || '{}');
        let localUser = Object.values(localUsers).find((u: any) => u.phone === loginForm.phone) as any;
        
        if (!localUser) {
          localUser = {
            id,
            name: loginForm.name,
            phone: loginForm.phone,
            district: loginForm.district,
            xp: 100,
            level: 1,
            referralCode,
            createdAt: new Date().toISOString()
          };
          localUsers[id] = localUser;
          localStorage.setItem('pushti_local_users', JSON.stringify(localUsers));
        } else {
          localUser.name = loginForm.name;
          localUser.district = loginForm.district;
          localUsers[localUser.id] = localUser;
          localStorage.setItem('pushti_local_users', JSON.stringify(localUsers));
        }

        data = {
          success: true,
          user: localUser,
          message: 'Logged in successfully offline!'
        };
      }

      if (data && data.success) {
        audioEngine.playClick();
        setUser(data.user);
        localStorage.setItem('pushti_user', JSON.stringify(data.user));
        // Reset login states and progress
        setIsOtpSent(false);
        setOtpInput('');
        setStage(GameStage.TUTORIAL);
      } else {
        setAuthError(data?.error || 'লগইন ব্যর্থ হয়েছে।');
      }
    } catch (err) {
      setAuthError('লগইন প্রক্রিয়ায় সমস্যা হয়েছে।');
    }
  };

  // Log Out handler
  const handleLogout = () => {
    audioEngine.playClick();
    localStorage.removeItem('pushti_user');
    setUser(null);
    setStage(GameStage.LANDING);
  };

  // Submit recipe to backend scorer
  const handleRecipeScored = async (dataToScore: {
    recipe: RecipeState;
    temperature: number;
    brewingTime: number;
    discount?: number;
  }) => {
    if (!user) return;
    try {
      let data;
      try {
        const response = await fetch('/api/recipes/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            recipe: dataToScore.recipe,
            temperature: dataToScore.temperature,
            brewingTime: dataToScore.brewingTime,
            discount: dataToScore.discount
          })
        });
        if (response.ok) {
          data = await response.json();
        } else {
          throw new Error('Not ok');
        }
      } catch (err) {
        // Fallback: Local Offline Scorer (Perfect matching server-side rules)
        const { recipe, temperature, brewingTime, discount } = dataToScore;
        const { pushtiTea, milkPowder, sugar, lemon, mint, cardamom, cinnamon, ginger, honey, clove } = recipe;

        let taste = 100;
        const teaDiff = Math.abs(pushtiTea - 2.0);
        taste -= teaDiff * 25;

        if (milkPowder > 0 && lemon > 0) {
          taste -= 60;
        }

        const sweetness = sugar + (honey * 1.5);
        if (sweetness > 3) {
          taste -= (sweetness - 3) * 15;
        } else if (sweetness === 0 && milkPowder > 0) {
          taste -= 15;
        }

        let aroma = 40;
        if (temperature >= 80) aroma += 20;
        if (temperature >= 95) aroma += 10;
        
        const spiceCount = cardamom + cinnamon + ginger + clove;
        if (spiceCount > 0 && spiceCount <= 4) {
          aroma += spiceCount * 8;
        } else if (spiceCount > 4) {
          aroma += 20 - (spiceCount - 4) * 10;
        }
        if (mint > 0) aroma += Math.min(mint * 5, 10);

        let color = 50;
        if (brewingTime < 120) {
          color -= (120 - brewingTime) * 0.3;
        } else if (brewingTime > 240) {
          color -= (brewingTime - 240) * 0.2;
        }

        if (pushtiTea === 0) {
          color = 10;
        } else {
          const colorMultiplier = Math.min(pushtiTea / 2.0, 1.5);
          color = Math.round(color * colorMultiplier);
        }

        if (milkPowder > 0) {
          color = Math.min(color + 10, 95);
        }
        color = Math.min(Math.max(color, 10), 100);

        let balance = 100;
        const totalIngredients = Object.values(recipe).reduce((a, b) => a + b, 0);
        if (totalIngredients > 12) {
          balance -= (totalIngredients - 12) * 8;
        }
        if (pushtiTea === 0) {
          balance = 10;
        }

        const sanitize = (val: number) => Math.min(Math.max(Math.round(val), 20), 100);
        const finalTaste = sanitize(taste);
        const finalAroma = sanitize(aroma);
        const finalColor = sanitize(color);
        const finalBalance = sanitize(balance);

        const total = Math.round((finalTaste * 0.35) + (finalAroma * 0.25) + (finalColor * 0.20) + (finalBalance * 0.20));

        const breakdown = {
          taste: finalTaste,
          aroma: finalAroma,
          color: finalColor,
          balance: finalBalance,
          total
        };

        let personality;
        if (milkPowder >= 2 && sugar >= 1.5) {
          personality = {
            titleBn: 'দুধ চায়ের জাদুকর',
            titleEn: 'Milk Tea Artist',
            descriptionBn: 'আপনি ঘন দুধ আর মিষ্টি দিয়ে কড়া স্বাদের রাজকীয় চা বানাতে ভালোবাসেন! আপনার চা মনকে প্রশান্ত করে এবং সারাদিনের ক্লান্তি নিমেষেই দূর করে।',
            descriptionEn: 'You love crafting rich, creamy, and sweet milk tea! Your creation brings ultimate comfort and instantly washes away the day\'s fatigue.',
            badge: 'Milk Tea Artist Badge',
            tagline: 'রাজকীয় তৃপ্তি!'
          };
        } else if (ginger >= 1 || cardamom >= 1 || cinnamon >= 1) {
          personality = {
            titleBn: 'ঐতিহ্যবাহী মসলা চা বিশারদ',
            titleEn: 'Traditional Tea Expert',
            descriptionBn: 'দারুচিনি, এলাচ আর আদার সুগন্ধে ভরপুর খাঁটি মসলা চা আপনার প্রথম পছন্দ। আপনার তৈরি চায়ের প্রতিটি চুমুক রোগ প্রতিরোধ বাড়াতে সাহায্য করে।',
            descriptionEn: 'A authentic cup loaded with the goodness of cardamom, cinnamon, and ginger is your choice. Every sip of your tea boosts immunity and health.',
            badge: 'Traditional Tea Expert Badge',
            tagline: 'ঐতিহ্য ও সুস্থতা!'
          };
        } else if (pushtiTea >= 3 && milkPowder === 0) {
          personality = {
            titleBn: 'কড়া চায়ের ভক্ত',
            titleEn: 'Strong Tea Lover',
            descriptionBn: 'আপনি লাল লিকার চায়ের তীব্র স্বাদে বিশ্বাসী! কোনো আড়াল ছাড়া খাঁটি পুষ্টি চায়ের আসল লিকার আপনার শরীর ও মনকে চাঙ্গা করে তোলে।',
            descriptionEn: 'You believe in the fierce power of black, strong tea leaf liquor! Pure Pushti tea liquor wakes up your senses and fuels your drive.',
            badge: 'Strong Tea Lover Badge',
            tagline: 'তীব্র সতেজতা!'
          };
        } else if (total >= 85) {
          personality = {
            titleBn: 'চা মাস্টার',
            titleEn: 'Tea Master',
            descriptionBn: 'অসাধারণ! আপনার চা তৈরির অনুপাত, লিকারের রঙ এবং স্বাদ একেবারেই পারফেক্ট। আপনি চায়ের খাঁটি গুণাগুণ বোঝেন এবং পারফেকশনের চূড়ান্ত শিখরে পৌঁছেছেন।',
            descriptionEn: 'Outstanding! Your brewing ratios, liquor color, and infusion are in absolute harmony. You are a true connoisseur of Pushti Tea.',
            badge: 'Tea Master Badge',
            tagline: 'চায়ের চূড়ান্ত পারফেকশনিস্ট!'
          };
        } else {
          personality = {
            titleBn: 'সুষম চায়ের শিল্পী',
            titleEn: 'Balanced Brewer',
            descriptionBn: 'আপনি এক কাপ চায়ে পরিমিত মিষ্টি, হালকা সুবাস এবং সঠিক লিকারের এক সুষম ভারসাম্য পছন্দ করেন। আপনার চা সারাদিনের কাজের অনুপ্রেরণা যোগায়।',
            descriptionEn: 'You balance moderate sweetness, light aroma, and optimal liquor density perfectly. Your tea provides a reliable, steady energy flow.',
            badge: 'Balanced Brewer Badge',
            tagline: 'পরিমিত ও প্রাণবন্ত!'
          };
        }

        let aiCommentary = '';
        if (total >= 90) {
          aiCommentary = `চমৎকার চা বানিয়েছেন! পুষ্টি চায়ের সাথে আপনার এই নিখুঁত মেলবন্ধন প্রমাণ করে আপনি একজন প্রকৃত টি-মাস্টার। আপনার চা, আপনার পারফেকশন!`;
        } else if (total >= 75) {
          aiCommentary = `অসাধারণ স্বাদ ও সুগন্ধের এক অতুলনীয় কাপ! পুষ্টি চায়ের আসল লিকার আপনার চায়ের স্বাদকে করেছে অত্যন্ত লোভনীয় ও সতেজ।`;
        } else {
          aiCommentary = `আপনার চায়ের স্বাদ বেশ চমৎকার হয়েছে! পরবর্তী কাপে তাপমাত্রা আরেকটু বাড়িয়ে আরও বেশি পারফেকশন অর্জন করতে পারেন।`;
        }

        personality.descriptionBn = `${personality.descriptionBn}\n\n🤖 পিউরিফাইড এআই রেটিং (অফলাইন মোড):\n"${aiCommentary}"`;

        const id = 'local-session-' + Math.random().toString(36).substring(2, 11);
        const sanitizedName = user.name.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PERFECT';
        const finalDiscount = discount || 5;
        const couponCode = `PUSHTI-${sanitizedName}-${finalDiscount}PERCENT-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const record = {
          id,
          userId: user.id,
          userName: user.name,
          userDistrict: user.district,
          recipe,
          temperature,
          brewingTime,
          score: breakdown,
          personality,
          couponCode,
          discount: finalDiscount,
          createdAt: new Date().toISOString()
        };

        // Save session locally
        const localSessions = JSON.parse(localStorage.getItem('pushti_local_sessions') || '[]');
        localSessions.push(record);
        localStorage.setItem('pushti_local_sessions', JSON.stringify(localSessions));

        data = {
          success: true,
          session: record
        };
      }
      
      if (data && data.success) {
        setActiveSession(data.session);
        setStage(GameStage.ANALYSIS);
        
        // Update user XP locally as well
        const updatedUser = { ...user };
        updatedUser.xp += data.session.score.total * 3;
        const nextThreshold = updatedUser.level * 400;
        if (updatedUser.xp >= nextThreshold) {
          updatedUser.level += 1;
        }
        setUser(updatedUser);
        localStorage.setItem('pushti_user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Error analyzing recipe', err);
      alert('রেসিপি স্কোরিং করতে সংযোগ সমস্যা হয়েছে।');
    }
  };

  const handleBrewComplete = (data: {
    recipe: RecipeState;
    temperature: number;
    brewingTime: number;
    discount?: number;
  }) => {
    setBrewedData(data);
    setStage(GameStage.BREWING);
  };

  return (
    <div className="min-h-screen bg-royal-bg text-parchment relative overflow-hidden flex flex-col justify-between">
      
      {/* BACKGROUND DECORATIVE GLOWS & SUNLIGHT (Immersive cinematic morning kitchen ambience) */}
      <div className="sun-ray pointer-events-none" />
      <div className="morning-light pointer-events-none" />
      <div className="ambient-particles pointer-events-none animate-glow" />
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-crimson-800/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* HEADER BAR (Sticky responsive navbar) */}
      <header className="border-b border-crimson-800/15 bg-royal-bg/85 backdrop-blur-md sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Brand Logo and banner text */}
          <div
            onClick={() => { audioEngine.playClick(); setStage(GameStage.LANDING); }}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-600 to-amber-400 flex items-center justify-center font-display font-extrabold text-royal-bg shadow-[0_4px_15px_rgba(201,160,59,0.3)]">
              পুষ্টি
            </div>
            <div>
              <span className="text-sm font-display font-black text-parchment uppercase tracking-wide block">
                PUSHTI TEA
              </span>
              <span className="text-[10px] text-gold-500 font-bold -mt-1 block">
                Your Tea, Your Perfection
              </span>
            </div>
          </div>

          {/* Quick Stats & Controls panel */}
          <div className="flex items-center gap-3">
            
            {/* Show Level & XP if logged in */}
            {user && (
              <div className="hidden sm:flex items-center gap-2 bg-crimson-900/30 border border-crimson-800/20 px-3 py-1.5 rounded-xl text-xs font-mono">
                <Award className="w-4 h-4 text-gold-400" />
                <span>Level <strong className="text-gold-400">{user.level}</strong></span>
                <span className="text-gray-500 font-sans">|</span>
                <span className="text-gray-300">{user.xp} XP</span>
              </div>
            )}

            {/* Admin trigger button */}
            <button
              onClick={() => { audioEngine.playClick(); setStage(stage === GameStage.ADMIN ? GameStage.LANDING : GameStage.ADMIN); }}
              className={`px-3 py-1.5 border rounded-xl text-[10px] uppercase font-mono tracking-wider font-bold cursor-pointer transition-all ${
                stage === GameStage.ADMIN
                  ? 'bg-gold-500 text-royal-bg border-gold-400 shadow-md'
                  : 'bg-crimson-950/40 border-crimson-800/20 text-gray-400 hover:text-gold-400 hover:border-gold-500/20'
              }`}
            >
              Telemetry Logs
            </button>

            {/* Sound controllers */}
            <AudioControl />

            {/* Profile Action button */}
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { audioEngine.playClick(); setStage(GameStage.LEADERBOARD); }}
                  className="p-2 bg-crimson-900/30 border border-crimson-800/20 hover:border-gold-500/30 rounded-full cursor-pointer hover:text-gold-400 transition-all"
                  title="View Leaderboard"
                >
                  <Trophy className="w-4 h-4 text-gold-500" />
                </button>
                <button
                  id="nav-logout-btn"
                  onClick={handleLogout}
                  className="px-4 py-1.5 bg-crimson-950/40 border border-crimson-900 hover:border-gold-500/20 hover:text-gold-400 text-xs font-medium rounded-xl transition-all cursor-pointer"
                >
                  লগআউট
                </button>
              </div>
            ) : (
              <button
                id="nav-login-btn"
                onClick={() => { audioEngine.playClick(); setStage(GameStage.LOGIN); }}
                className="px-5 py-1.5 bg-gradient-to-r from-gold-600 to-gold-500 text-royal-bg font-display font-bold text-xs rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                লগইন / সাইন আপ
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN VIEWPORT BODY CONTAINER */}
      <main className="flex-grow flex flex-col justify-center py-6">
        <AnimatePresence mode="wait">
          
          {/* STAGE 1: LANDING VIEW (Atmospheric Cinematic Kitchen display) */}
          {stage === GameStage.LANDING && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto px-4 py-8 text-center flex flex-col items-center justify-center relative min-h-[75vh]"
            >
              {/* Floating morning particle overlays */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-10 left-10 w-2 h-2 bg-gold-400/30 rounded-full blur-xs animate-bounce" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-20 right-20 w-3 h-3 bg-gold-500/20 rounded-full blur-xs animate-bounce" style={{ animationDuration: '6s' }} />
              </div>

              {/* Tagline / Heading pair */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="space-y-4 mb-8"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-400 text-xs font-mono uppercase tracking-widest font-bold">
                  <Sparkles className="w-3.5 h-3.5" /> Brand Perfection Quest
                </div>
                
                <h1 className="text-4xl md:text-6xl font-display font-black text-parchment tracking-tight leading-none">
                  আপনার চা, <span className="text-gold-400 block sm:inline">আপনার পারফেকশন</span>
                </h1>
                
                <p className="text-gray-300 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                  নিজের পছন্দের স্বাদে বানিয়ে ফেলুন এক কাপ পারফেক্ট চা এবং জেনে নিন আপনি কতটা চা পারফেকশনিস্ট! একটি কাস্টম এআই রেটিং ও আকর্ষনীয় উপহার জিতে নিন।
                </p>
              </motion.div>

              {/* Graphic Mockup illustration (Tea Kettle on Gas stove with ambient details) */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="w-full max-w-md relative bg-gradient-to-b from-crimson-800/10 to-crimson-950/30 border border-crimson-800/10 p-6 rounded-3xl shadow-2xl mb-8 flex flex-col items-center group overflow-hidden"
              >
                {/* Sunlight flare overlays */}
                <div className="absolute -top-12 -left-12 w-40 h-40 bg-amber-500/10 rounded-full blur-xl animate-pulse pointer-events-none" />
                
                {/* Kettle rendering representation (Vector/CSS styled) */}
                <div className="w-36 h-36 bg-gradient-to-b from-amber-500/50 via-amber-600/60 to-red-900/40 border-4 border-parchment/30 rounded-t-full relative flex items-center justify-center animate-float">
                  <div className="absolute -top-3 w-16 h-4 bg-gray-900 rounded" />
                  <div className="absolute bottom-2 w-full h-8 bg-amber-500/20 blur-md rounded" />
                  <span className="text-[10px] font-mono font-bold text-amber-300 tracking-widest block uppercase animate-pulse">
                    Boiling...
                  </span>
                </div>
                
                <div className="w-48 h-2 bg-crimson-950 mt-4 rounded-full" />
                
                {/* Gas Stove blue fire sparklers representation */}
                <div className="flex gap-1.5 mt-1.5">
                  <span className="w-2.5 h-4 bg-blue-500 rounded-b-full animate-pulse" />
                  <span className="w-2.5 h-6 bg-blue-400 rounded-b-full animate-pulse" />
                  <span className="w-2.5 h-4 bg-blue-500 rounded-b-full animate-pulse" />
                </div>

                <div className="text-xs text-gold-400 font-display font-medium mt-4">
                  Morning Ambience - Steam & Bird Chirps Activated 🍂
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
              >
                <button
                  id="btn-enter-exp"
                  onClick={() => {
                    audioEngine.playClick();
                    audioEngine.startAmbience();
                    setStage(user ? GameStage.TUTORIAL : GameStage.LOGIN);
                  }}
                  className="px-10 py-4 bg-gradient-to-r from-gold-600 to-gold-500 text-royal-bg font-display font-bold text-base rounded-full cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-[0_4px_20px_rgba(201,160,59,0.25)] hover:shadow-[0_4px_30px_rgba(201,160,59,0.4)] flex items-center justify-center gap-2.5"
                >
                  চা প্রস্তুত যাত্রা শুরু করুন <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* STAGE 2: LOGIN & OTP SCREEN (Simulated SMS code routing) */}
          {stage === GameStage.LOGIN && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-md mx-auto px-4 py-8"
            >
              <div className="bg-[#140f0c]/85 border border-[#e5c9a7]/10 p-6 md:p-8 rounded-md shadow-2xl backdrop-blur-lg relative overflow-hidden">
                
                {/* Visual Header */}
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-[#e5c9a7]/10 border border-[#e5c9a7]/20 text-gold-400 flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6 text-gold-500" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-gold-500">খেলোয়াড় নিবন্ধন</h3>
                  <p className="text-xs text-gray-400 mt-1">প্রয়োজনীয় তথ্য দিয়ে ওটিপি ভেরিফাই করুন।</p>
                </div>

                {/* Error Banner */}
                {authError && (
                  <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-md text-xs text-red-400 mb-5 leading-normal">
                    {authError}
                  </div>
                )}

                {/* OTP code notifier for simulation convenience */}
                {isOtpSent && (
                  <div className="bg-green-500/10 border border-green-500/20 p-3.5 rounded-md text-xs text-green-400 mb-5 text-center font-mono">
                    📲 [সিমুলেটেড ওটিপি] আপনার মোবাইল নম্বরে কোড পাঠানো হয়েছে: <strong className="text-parchment bg-green-950/80 px-2 py-0.5 rounded-sm ml-1 text-sm tracking-widest">{otpCode}</strong>
                  </div>
                )}

                {/* FORM CONTROLS */}
                {!isOtpSent ? (
                  // Step A: Name, Phone, and District Form
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-300 font-medium flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-gold-500" /> নাম (Player Name)
                      </label>
                      <input
                        id="login-name-input"
                        type="text"
                        required
                        value={loginForm.name}
                        onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })}
                        placeholder="আপনার পুরো নাম লিখুন"
                        className="w-full px-4 py-3 bg-[#150d08]/80 border border-[#3d2b1f]/80 focus:border-[#e5c9a7]/40 rounded-sm text-xs text-parchment outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-300 font-medium flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gold-500" /> মোবাইল নম্বর (Phone Number)
                      </label>
                      <input
                        id="login-phone-input"
                        type="tel"
                        required
                        value={loginForm.phone}
                        onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })}
                        placeholder="01xxxxxxxxx"
                        className="w-full px-4 py-3 bg-[#150d08]/80 border border-[#3d2b1f]/80 focus:border-[#e5c9a7]/40 rounded-sm text-xs text-parchment outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-300 font-medium flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gold-500" /> জেলা (District)
                      </label>
                      <select
                        id="login-district-select"
                        value={loginForm.district}
                        onChange={(e) => setLoginForm({ ...loginForm, district: e.target.value })}
                        className="w-full px-4 py-3 bg-[#150d08]/80 border border-[#3d2b1f]/80 focus:border-[#e5c9a7]/40 rounded-sm text-xs text-parchment outline-none transition-all cursor-pointer"
                      >
                        {DISTRICTS.map((dist) => (
                          <option key={dist} value={dist} className="bg-royal-bg text-parchment">
                            {dist}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      id="btn-submit-login"
                      type="submit"
                      className="w-full py-3.5 bg-[#e5c9a7] text-[#1a0f08] font-mono font-bold text-xs uppercase tracking-[2px] rounded-sm cursor-pointer hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-md flex items-center justify-center gap-2"
                    >
                      ওটিপি পাঠান (Send OTP Code) <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  // Step B: OTP input Form
                  <form onSubmit={handleVerifyAndLogin} className="space-y-5">
                    <div className="space-y-1.5 text-center">
                      <label className="text-xs text-gray-300 font-medium">
                        ৬-ডিজিট ওটিপি কোডটি প্রদান করুন
                      </label>
                      <input
                        id="otp-verification-input"
                        type="text"
                        maxLength={6}
                        required
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        placeholder="XXXXXX"
                        className="w-full px-4 py-3.5 bg-[#150d08] border border-[#3d2b1f]/80 focus:border-[#e5c9a7]/40 rounded-sm text-center font-mono font-bold text-lg tracking-widest text-gold-400 outline-none transition-all"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => { audioEngine.playClick(); setIsOtpSent(false); }}
                        className="flex-1 py-3 bg-[#150d08] border border-[#3d2b1f]/60 text-xs text-gray-400 rounded-sm hover:text-parchment transition-all cursor-pointer"
                      >
                        ফিরে যান
                      </button>
                      <button
                        id="btn-submit-otp"
                        type="submit"
                        className="flex-1 py-3 bg-[#e5c9a7] text-[#1a0f08] font-mono font-bold text-xs uppercase tracking-[1px] rounded-sm cursor-pointer hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-md"
                      >
                        ভেরিফাই ও লগইন
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </motion.div>
          )}

          {/* STAGE 3: TUTORIAL CARD LIST */}
          {stage === GameStage.TUTORIAL && (
            <TutorialScreen onStart={() => setStage(GameStage.KITCHEN)} />
          )}

          {/* STAGE 4: MAIN ACTIVE BREWING GAME ENGINE */}
          {stage === GameStage.KITCHEN && user && (
            <InteractiveKitchen userId={user.id} onBrewComplete={handleBrewComplete} />
          )}

          {/* STAGE 4.5: INTERACTIVE TEA POURING ANIMATION */}
          {stage === GameStage.BREWING && brewedData && (
            <PouringStage
              recipe={brewedData.recipe}
              temperature={brewedData.temperature}
              brewingTime={brewedData.brewingTime}
              onComplete={() => handleRecipeScored(brewedData)}
            />
          )}

          {/* STAGE 5: BREW RATING ANALYSIS SUMMARY */}
          {stage === GameStage.ANALYSIS && activeSession && (
            <TeaAnalysis
              session={activeSession}
              onReplay={() => setStage(GameStage.KITCHEN)}
              onGoToLeaderboard={() => setStage(GameStage.LEADERBOARD)}
            />
          )}

          {/* STAGE 6: REGIONAL LEADERS LEADERBOARD */}
          {stage === GameStage.LEADERBOARD && user && (
            <LeaderboardPanel
              currentUserId={user.id}
              onBackToKitchen={() => setStage(GameStage.KITCHEN)}
            />
          )}

          {/* STAGE 7: INTEGRATED TELEMETRY ADMIN PANEL */}
          {stage === GameStage.ADMIN && (
            <AdminPanel />
          )}

        </AnimatePresence>
      </main>

      {/* FOOTER (Clean social sharing reference) */}
      <footer className="border-t border-crimson-800/15 py-4 text-center text-[11px] text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2.5">
          <span>&copy; ২০২৬ পুষ্টি চা (Pushti Tea). সর্বস্বত্ব সংরক্ষিত। আপনার চা, আপনার পারফেকশন।</span>
          <div className="flex gap-4">
            <span className="text-gold-500/50 uppercase tracking-widest font-mono text-[9px]">Lead Gen Engine v2.4</span>
            <span className="hover:text-gold-400 transition-colors cursor-pointer">Terms of Use</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
