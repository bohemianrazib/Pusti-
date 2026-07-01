import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Award, Share2, RotateCcw, Copy, Check, ShieldCheck, Trophy } from 'lucide-react';
import { SessionRecord } from '../types';
import { audioEngine } from '../lib/audioEngine';

interface TeaAnalysisProps {
  session: SessionRecord;
  onReplay: () => void;
  onGoToLeaderboard: () => void;
}

export const TeaAnalysis: React.FC<TeaAnalysisProps> = ({ session, onReplay, onGoToLeaderboard }) => {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const handleCopyCoupon = () => {
    audioEngine.playClick();
    navigator.clipboard.writeText(session.couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    audioEngine.playClick();
    setShared(true);
    setTimeout(() => setShared(false), 3000);
  };

  const handleReplayClick = () => {
    audioEngine.playClick();
    onReplay();
  };

  const score = session.score;
  const personality = session.personality;

  // Render score comments
  const getScoreSummary = (tot: number) => {
    if (tot >= 90) return 'নিখুঁত চা! আপনার চায়ের স্বাদ ও সুগন্ধ অনন্যসাধারণ!';
    if (tot >= 80) return 'দারুণ হয়েছে! আপনার চায়ের ব্যালেন্স প্রায় পারফেক্ট!';
    if (tot >= 60) return 'ভালো প্রচেষ্টা! সামান্য কিছু উপাদানের সমন্বয়ে এটি আরও সেরা হতে পারে!';
    return 'বেশ ভালো! পুষ্টি চায়ের সাথে আপনার রেসিপিটি আরও একবার চেষ্টা করুন!';
  };

  return (
    <div id="tea-analysis-panel" className="max-w-4xl mx-auto px-4 py-8">
      
      {/* Title */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 10 }}
          className="inline-block p-2.5 rounded-full bg-[#e5c9a7]/10 border border-[#e5c9a7]/30 text-gold-400 mb-3"
        >
          <Award className="w-8 h-8" />
        </motion.div>
        <h2 className="text-3xl font-display font-bold text-gold-500 tracking-tight">
          আপনার চা পারফেকশন স্কোর
        </h2>
        <p className="text-gray-400 text-xs uppercase tracking-widest font-mono mt-1">
          Recipe Evaluation Summary
        </p>
      </div>

      <div className="grid md:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: VISUAL GAUGE & ATTRIBUTES (7 Cols) */}
        <div className="md:col-span-7 space-y-6">
          <div className="bg-[#140f0c]/85 border border-[#e5c9a7]/10 p-6 md:p-8 rounded-md shadow-2xl backdrop-blur-lg space-y-6">
            
            {/* Visual Arc / Ring representation */}
            <div className="flex flex-col items-center text-center">
              <div className="relative w-44 h-44 flex items-center justify-center">
                {/* SVG circular progress indicator */}
                <svg className="absolute w-full h-full transform -rotate-90">
                  <circle
                    cx="88"
                    cy="88"
                    r="76"
                    className="stroke-[#150d08]"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  <circle
                    cx="88"
                    cy="88"
                    r="76"
                    className="stroke-[#e5c9a7]"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 76}
                    strokeDashoffset={2 * Math.PI * 76 * (1 - score.total / 100)}
                    strokeLinecap="round"
                  />
                </svg>

                <div className="text-center z-10">
                  <span className="text-5xl font-mono font-extrabold text-parchment leading-none block">
                    {score.total}
                  </span>
                  <span className="text-xs font-mono text-gold-400 font-bold block uppercase tracking-widest mt-1">
                    / 100
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-xl font-display font-black text-gold-500">
                  {personality.titleBn}!
                </h3>
                <p className="text-xs text-gold-500/70 font-mono mt-0.5 tracking-wide uppercase">
                  {personality.titleEn}
                </p>
                <p className="text-sm font-medium text-parchment/90 mt-2 max-w-sm italic">
                  &ldquo;{getScoreSummary(score.total)}&rdquo;
                </p>
              </div>
            </div>

            {/* Sub-scores details */}
            <div className="space-y-4 border-t border-[#3d2b1f]/30 pt-5">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-sans">স্বাদ (Taste Intensity)</span>
                  <span className="font-mono font-bold text-gold-400">{score.taste}%</span>
                </div>
                <div className="w-full h-2 bg-[#150d08] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-gold-600 to-[#e5c9a7]" style={{ width: `${score.taste}%` }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-sans">সুগন্ধ (Aromatic Bloom)</span>
                  <span className="font-mono font-bold text-gold-400">{score.aroma}%</span>
                </div>
                <div className="w-full h-2 bg-[#150d08] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-gold-600 to-[#e5c9a7]" style={{ width: `${score.aroma}%` }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-sans">রঙ (Liquor Density Color)</span>
                  <span className="font-mono font-bold text-gold-400">{score.color}%</span>
                </div>
                <div className="w-full h-2 bg-[#150d08] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-gold-600 to-[#e5c9a7]" style={{ width: `${score.color}%` }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-sans">সামঞ্জস্য (Ingredient Harmony)</span>
                  <span className="font-mono font-bold text-gold-400">{score.balance}%</span>
                </div>
                <div className="w-full h-2 bg-[#150d08] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-gold-600 to-[#e5c9a7]" style={{ width: `${score.balance}%` }} />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: AI ANALYSIS & REWARDS (5 Cols) */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Personality Description Card */}
          <div className="bg-[#140f0c]/85 border border-[#e5c9a7]/10 p-6 rounded-md shadow-2xl backdrop-blur-lg">
            <h3 className="text-sm font-mono text-gold-500 uppercase tracking-widest mb-3 font-bold">
              Personality Evaluation
            </h3>
            
            <p className="text-gray-300 text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
              {personality.descriptionBn}
            </p>
          </div>

          {/* Reward Coupon Card */}
          <div className="bg-gradient-to-r from-[#e5c9a7]/5 to-[#c0a684]/10 border border-[#e5c9a7]/20 p-5 rounded-md relative overflow-hidden text-center shadow-lg">
            <div className="absolute top-0 left-0 bg-[#e5c9a7] text-[#1a0f08] font-mono font-bold text-[8px] py-0.5 px-2 rounded-br-sm uppercase tracking-wider">
              Exclusive Reward
            </div>
            
            <div className="text-xs text-gold-400 font-sans mt-1">অভিনন্দন! আপনি একটি গিফট কুপন পেয়েছেন:</div>
            
            <div className="my-4 bg-[#150d08]/80 border border-[#e5c9a7]/20 py-3 px-4 rounded-md flex items-center justify-between gap-3 font-mono font-bold text-sm text-gold-400 select-all">
              <span>{session.couponCode}</span>
              <button
                onClick={handleCopyCoupon}
                className="text-gray-400 hover:text-[#e5c9a7] transition-all p-1.5 hover:bg-[#e5c9a7]/10 rounded-sm cursor-pointer shrink-0"
                title="Copy Code"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="text-[10px] text-gray-400 leading-normal flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
              <span>আপনার নিকটস্থ রিটেইলার বা সুপারশপে কুপনটি দেখিয়ে ডিসকাউন্ট পান।</span>
            </div>
          </div>

          {/* Action Navigation Panels */}
          <div className="space-y-3">
            <button
              onClick={handleShare}
              className="w-full py-3 bg-[#1a1310] border border-[#e5c9a7]/10 hover:border-[#e5c9a7]/30 text-parchment hover:text-[#e5c9a7] rounded-sm font-mono font-bold text-xs uppercase tracking-[2px] flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-md"
            >
              <Share2 className="w-4 h-4" />
              {shared ? 'লিংক কপি করা হয়েছে!' : 'বন্ধুদের সাথে শেয়ার করুন'}
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleReplayClick}
                className="py-3 bg-[#150d08] border border-[#3d2b1f]/60 hover:border-[#e5c9a7]/20 text-gray-300 font-bold text-xs rounded-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> আবার খেলুন
              </button>
              
              <button
                onClick={onGoToLeaderboard}
                className="py-3 bg-[#e5c9a7] text-[#1a0f08] hover:brightness-110 font-bold text-xs rounded-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Trophy className="w-3.5 h-3.5" /> লিডারবোর্ড দেখুন
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
export default TeaAnalysis;
