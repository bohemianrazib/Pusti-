import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, RotateCcw, AlertTriangle, Trophy, Gift } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';

interface Slice {
  value: number;
  label: string;
  color: string;
  textColor: string;
}

const SLICES: Slice[] = [
  { value: 5, label: '৫% ছাড়', color: '#781206', textColor: '#f5ebe0' }, // Dark Crimson
  { value: 20, label: '২০% ছাড়', color: '#c2410c', textColor: '#f5ebe0' }, // Dark Orange
  { value: 10, label: '১০% ছাড়', color: '#b45309', textColor: '#f5ebe0' }, // Amber
  { value: 35, label: '৩৫% ছাড়', color: '#854d0e', textColor: '#f5ebe0' }, // Yellow-gold
  { value: 15, label: '১৫% ছাড়', color: '#52150a', textColor: '#f5ebe0' }, // Deep Maroon
  { value: 50, label: '৫০% ছাড় 🌟', color: '#d97706', textColor: '#1a0f08' }, // Vibrant Gold
  { value: 25, label: '২৫% ছাড়', color: '#9a3412', textColor: '#f5ebe0' }, // Burnt Orange
  { value: 30, label: '৩০% ছাড়', color: '#7c2d12', textColor: '#f5ebe0' }, // Rust Red
];

interface WheelOfFortuneProps {
  onSpinResult: (discount: number) => void;
  currentMaxDiscount: number;
  isStoveActive: boolean;
  timeLeft: number;
}

export const WheelOfFortune: React.FC<WheelOfFortuneProps> = ({
  onSpinResult,
  currentMaxDiscount,
  isStoveActive,
  timeLeft,
}) => {
  const [rotation, setRotation] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [spinResult, setSpinResult] = useState<Slice | null>(null);

  const handleSpin = () => {
    if (isSpinning) return;
    if (!isStoveActive) {
      audioEngine.playClick();
      alert('চাকা ঘুরাতে প্রথমে ৩ নম্বর ধাপে গিয়ে গ্যাস চালু করে চুলা জ্বালান! 🔥');
      return;
    }

    setIsSpinning(true);
    setSpinResult(null);
    audioEngine.playStoveIgnition(); // Spin start sound

    // Select a random slice index
    const randomIndex = Math.floor(Math.random() * SLICES.length);
    const selectedSlice = SLICES[randomIndex];

    // Compute target rotation
    // 360 / 8 = 45 degrees per slice.
    // Center of slice i is at i * 45 degrees.
    // To land slice i at the top pointer (0 deg), we need to rotate the wheel by - (i * 45) deg.
    // Let's add 5-7 full spins (360 * 5) and substract current rotation remainder to spin cleanly
    const fullSpins = 5 + Math.floor(Math.random() * 3);
    const targetAngle = - (randomIndex * 45);
    const randomOffset = Math.random() * 24 - 12; // slight organic variation inside slice (+/- 12 deg)
    
    // We want the rotation to increase continuously
    const newRotation = rotation + (fullSpins * 360) + targetAngle - (rotation % 360) + randomOffset;
    
    setRotation(newRotation);

    // Simulated ticking sound during spinning
    let tickCount = 0;
    const ticks = 18;
    const tickInterval = setInterval(() => {
      if (tickCount < ticks) {
        audioEngine.playSpoonClink();
        tickCount++;
      } else {
        clearInterval(tickInterval);
      }
    }, 180);

    setTimeout(() => {
      setIsSpinning(false);
      setSpinResult(selectedSlice);
      onSpinResult(selectedSlice.value);
      audioEngine.playSpoonClink(); // Done sound
    }, 3500); // 3.5s duration
  };

  return (
    <div id="wheel-of-fortune-container" className="bg-[#1b120c] border border-gold-500/20 rounded-md p-4 max-w-2xl mx-auto shadow-2xl flex flex-col items-center">
      {/* Title Header */}
      <div className="w-full flex justify-between items-center mb-4 pb-2 border-b border-[#3d2b1f]/60">
        <div>
          <h4 className="text-sm font-display font-bold text-gold-400">ভাগ্যের চাকা (Wheel of Fortune) 🎡</h4>
          <p className="text-[10px] text-gray-400">১ মিনিট চুলা চলার সময় চাকা ঘুরিয়ে সর্বোচ্চ ৫০% ছাড়ের কুপন জিতুন!</p>
        </div>
        <div className="text-right">
          {isStoveActive ? (
            <span className="text-[10px] font-bold text-green-400 animate-pulse bg-green-500/10 px-2 py-0.5 rounded-sm border border-green-500/20">
              অবশিষ্ট: {timeLeft} সে.
            </span>
          ) : (
            <span className="text-[10px] font-bold text-yellow-400 bg-yellow-500/5 px-2 py-0.5 rounded-sm border border-yellow-500/15">
              চুলা বন্ধ
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Wheel + Status */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-center w-full">
        
        {/* Left Side: The Interactive Spin Wheel */}
        <div className="relative flex flex-col items-center">
          {/* Wheel frame & pointer pointer */}
          <div className="relative w-[230px] h-[230px] flex items-center justify-center bg-[#110a06] p-3.5 rounded-full border-4 border-gold-500/30 shadow-[0_0_20px_rgba(217,119,6,0.15)]">
            
            {/* Top Pointer Needle */}
            <div className="absolute top-1 z-30 flex flex-col items-center">
              <div className="w-4 h-5 bg-gradient-to-b from-yellow-400 to-amber-500 rounded-t-full clip-triangle shadow-md" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
              <div className="-mt-1 w-2 h-2 bg-amber-600 rounded-full border border-black" />
            </div>

            {/* Spinning Canvas */}
            <motion.div
              className="w-full h-full rounded-full relative overflow-hidden shadow-inner cursor-pointer"
              style={{ originX: '50%', originY: '50%' }}
              animate={{ rotate: rotation }}
              transition={{ duration: 3.5, ease: 'easeOut' }}
              onClick={handleSpin}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full select-none">
                {/* Draw 8 segments */}
                {SLICES.map((slice, index) => {
                  const startAngle = index * 45 - 22.5; // Offset by 22.5 to center slice 0 at top
                  const endAngle = startAngle + 45;
                  
                  // Convert polar to cartesian coordinates
                  const rad = (deg: number) => (deg - 90) * Math.PI / 180;
                  const x1 = 50 + 50 * Math.cos(rad(startAngle));
                  const y1 = 50 + 50 * Math.sin(rad(startAngle));
                  const x2 = 50 + 50 * Math.cos(rad(endAngle));
                  const y2 = 50 + 50 * Math.sin(rad(endAngle));
                  
                  // Path for pie slice
                  const d = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;

                  // Text position coordinates
                  const textAngle = startAngle + 22.5;
                  const tx = 50 + 32 * Math.cos(rad(textAngle));
                  const ty = 50 + 32 * Math.sin(rad(textAngle));

                  return (
                    <g key={index}>
                      <path d={d} fill={slice.color} className="stroke-[#110a06] stroke-[0.6px]" />
                      <text
                        x={tx}
                        y={ty}
                        fill={slice.textColor}
                        fontSize="6px"
                        fontWeight="black"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        transform={`rotate(${textAngle + 90}, ${tx}, ${ty})`}
                        className="font-display select-none pointer-events-none"
                      >
                        {slice.label}
                      </text>
                    </g>
                  );
                })}
                {/* Center cap/peg */}
                <circle cx="50" cy="50" r="7" fill="#e5c9a7" stroke="#110a06" strokeWidth="1.5" />
                <circle cx="50" cy="50" r="3.5" fill="#1a0f08" />
              </svg>
            </motion.div>
          </div>

          {/* Spin Trigger Button */}
          <button
            onClick={handleSpin}
            disabled={isSpinning || (isStoveActive && timeLeft <= 0)}
            className={`mt-4 px-6 py-2 rounded-sm font-display font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all duration-300 ${
              isSpinning
                ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed scale-95'
                : !isStoveActive
                ? 'bg-amber-600/10 text-amber-500 border border-amber-500/20 hover:bg-amber-600/20'
                : 'bg-gradient-to-r from-gold-500 to-amber-500 text-royal-bg shadow-[0_4px_12px_rgba(217,119,6,0.3)] hover:scale-105 active:scale-95 cursor-pointer'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
            {isSpinning ? 'চাকা ঘুরছে...' : 'চাকা ঘুরান (SPIN!)'}
          </button>
        </div>

        {/* Right Side: Scoreboard & Status Feedback */}
        <div className="flex-1 w-full flex flex-col justify-between bg-[#110a06]/80 border border-[#2b1b11] p-4 rounded-md shadow-lg min-h-[230px]">
          
          {/* Status Bar */}
          <div className="border-b border-[#2b1b11] pb-3 text-center md:text-left">
            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 block mb-1">স্ট্যাটাস</span>
            {isSpinning ? (
              <span className="text-xs text-gold-400 font-bold animate-pulse">চাকা ঘুরছে! নিঃশ্বাস বন্ধ করে অপেক্ষা করুন... 🤞</span>
            ) : spinResult ? (
              <div className="animate-fade-in space-y-1">
                <span className="text-xs text-green-400 font-bold flex items-center gap-1 justify-center md:justify-start">
                  🎉 অভিনন্দন! আপনি <strong className="text-parchment text-sm bg-green-950 px-1.5 py-0.5 rounded-sm">{spinResult.value}% ছাড়</strong> পেয়েছেন!
                </span>
              </div>
            ) : !isStoveActive ? (
              <div className="flex gap-1.5 items-center justify-center md:justify-start text-amber-500/95 text-[11px] font-medium animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>চাকা ঘুরাতে প্রথমে ৩ নম্বর ধাপে চুলা জ্বালান।</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">চাকা ঘুরিয়ে আপনার ভাগ্য পরীক্ষা করুন!</span>
            )}
          </div>

          {/* Current Score Cards */}
          <div className="grid grid-cols-2 gap-3.5 py-3">
            <div className="bg-[#150d08] border border-[#3d2b1f]/45 p-2.5 rounded-sm text-center">
              <span className="text-[9px] text-gray-500 block uppercase">এই স্পিনের ছাড়</span>
              <strong className="text-parchment text-lg font-mono block mt-0.5">
                {isSpinning ? '...' : spinResult ? `${spinResult.value}%` : '০%'}
              </strong>
            </div>

            <div className="bg-[#1c120a] border border-gold-500/20 p-2.5 rounded-sm text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-gold-500/5 rounded-bl-full pointer-events-none" />
              <span className="text-[9px] text-gold-400 block uppercase font-bold">সর্বোচ্চ ছাড় (MAX)</span>
              <strong className="text-gold-400 text-lg font-mono block mt-0.5 flex items-center justify-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-gold-500 shrink-0" /> {currentMaxDiscount}%
              </strong>
            </div>
          </div>

          {/* Guidelines Footer */}
          <div className="text-[10px] text-gray-400 leading-normal pt-2.5 border-t border-[#2b1b11] flex gap-2">
            <Gift className="w-4 h-4 text-gold-500 shrink-0" />
            <p>
              চুলা চলাকালীন ৬০ সেকেন্ডে যতবার খুশি স্পিন করতে পারবেন। আপনার সর্বোচ্চ স্পিন রেজাল্টটি ফাইনাল ছাড় হিসেবে বিবেচনা করা হবে এবং আপনার নামে কুপন কোড জেনারেট হবে।
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
