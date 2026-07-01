import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Flame, Thermometer, Clock, HelpCircle, AlertCircle, Plus, Minus, Check } from 'lucide-react';
import { KitchenCanvas } from './KitchenCanvas';
import { INGREDIENTS } from '../ingredientsData';
import { RecipeState, ScoreBreakdown } from '../types';
import { audioEngine } from '../lib/audioEngine';

interface InteractiveKitchenProps {
  userId: string;
  onBrewComplete: (recipeData: {
    recipe: RecipeState;
    temperature: number;
    brewingTime: number;
  }) => void;
}

export const InteractiveKitchen: React.FC<InteractiveKitchenProps> = ({ userId, onBrewComplete }) => {
  // 1. STATE declarations
  const [recipe, setRecipe] = useState<RecipeState>({
    pushtiTea: 0,
    milkPowder: 0,
    sugar: 0,
    lemon: 0,
    mint: 0,
    cardamom: 0,
    cinnamon: 0,
    ginger: 0,
    honey: 0,
    clove: 0,
  });

  const [isGasOn, setIsGasOn] = useState(false);
  const [flameLevel, setFlameLevel] = useState(3); // default Level 3
  const [temperature, setTemperature] = useState(25); // Starts at room temp (25°C)
  const [brewingTime, setBrewingTime] = useState(0); // in seconds
  const [isBrewingStarted, setIsBrewingStarted] = useState(false);

  // Sound timers and interval refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const soundTempRef = useRef(25);

  // 2. STOVE TEMPERATURE & TIMER CALCULATIONS (Simulating physics real-time)
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTemperature((prevTemp) => {
        let nextTemp = prevTemp;
        if (isGasOn) {
          // Heat up rate depends on flame levels (Level 1 is slow, Level 5 is fast)
          const heatingFactor = 1.0 + (flameLevel * 0.5);
          nextTemp = Math.min(100, prevTemp + heatingFactor);
          soundTempRef.current = nextTemp;
        } else {
          // Cool down slowly toward room temperature (25C)
          nextTemp = Math.max(25, prevTemp - 1.2);
          // Sound fades out much faster (over ~4 seconds)
          soundTempRef.current = Math.max(25, soundTempRef.current - 18);
        }

        // Update real-time synthesized sounds based on sound-effective temperature
        audioEngine.updateBoiling(soundTempRef.current);
        audioEngine.updateSteam(soundTempRef.current);

        return Math.round(nextTemp * 10) / 10;
      });

      // Brewing clock runs if temperature is hot enough (>= 80C)
      setTemperature((currentTemp) => {
        if (currentTemp >= 80) {
          setIsBrewingStarted(true);
          setBrewingTime((prevTime) => prevTime + 1);
        }
        return currentTemp;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGasOn, flameLevel]);

  // Clean up sounds when leaving kitchen
  useEffect(() => {
    return () => {
      audioEngine.stopAll();
    };
  }, []);

  // 3. HANDLERS
  const toggleGas = () => {
    const nextState = !isGasOn;
    setIsGasOn(nextState);
    if (nextState) {
      audioEngine.playStoveIgnition();
    } else {
      audioEngine.playClick();
      // No instant muting here, let the interval handle the organic sound fade-out!
    }
  };

  const adjustFlame = (level: number) => {
    audioEngine.playClick();
    setFlameLevel(level);
  };

  const updateIngredientValue = (id: keyof RecipeState, amount: number) => {
    const found = INGREDIENTS.find((i) => i.id === id);
    if (!found) return;

    audioEngine.playSpoonClink();

    setRecipe((prev) => {
      const nextVal = Math.min(found.max, Math.max(found.min, prev[id] + amount));
      return {
        ...prev,
        [id]: nextVal,
      };
    });
  };

  const handleBrewSubmit = () => {
    // If user has not even added tea leaves, remind them gently
    if (recipe.pushtiTea === 0) {
      audioEngine.playClick();
      alert('কেটলিতে অন্তত কিছু পুষ্টি চা পাতা যোগ করুন!');
      return;
    }

    audioEngine.playPour();
    audioEngine.stopAll();

    onBrewComplete({
      recipe,
      temperature,
      brewingTime,
    });
  };

  // Helper to resolve thermal state text
  const getThermalStatusBn = (temp: number) => {
    if (temp < 40) return 'স্থির পানি (Still water)';
    if (temp < 60) return 'ছোট বুদবুদ (Tiny bubbles forming)';
    if (temp < 80) return 'বুদবুদ উঠছে (Rising bubbles)';
    if (temp < 95) return 'ফুটন্ত পানি (Rolling hot bubbles)';
    return 'তীব্র বাষ্প ও ফুটন্ত (Full boil & steam)';
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div id="interactive-kitchen-container" className="max-w-7xl mx-auto px-4 py-6">
      {/* Upper header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-display font-bold text-gold-400 tracking-tight">
          আপনার চা, আপনার পারফেকশন 🍂
        </h2>
        <p className="text-gray-300 text-xs md:text-sm mt-1 max-w-lg mx-auto leading-relaxed">
          উপকরণগুলোর পরিমাণ নির্বাচন করে কেটলিতে দিন, গ্যাসের চুলা জ্বালান এবং নিখুঁত তাপমাত্রায় ফুটিয়ে তৈরি করুন আপনার পারফেক্ট চা।
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: VISUAL STAGE & INGREDIENT SELECTORS (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Visual Stage */}
          <div className="relative">
            <KitchenCanvas
              recipe={recipe}
              temperature={temperature}
              isGasOn={isGasOn}
              flameLevel={flameLevel}
            />
          </div>

          {/* CHOOSE INGREDIENTS SELECTOR PANEL */}
          <div className="bg-[#140f0c]/85 border border-[#e5c9a7]/10 p-6 rounded-md shadow-2xl backdrop-blur-lg">
            <h3 className="text-base font-display font-bold text-gold-500 mb-5 text-center uppercase tracking-wider">
              আপনার উপকরণ বাছুন (Choose Ingredients)
            </h3>

            {/* Grid of ingredients card items */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
              {INGREDIENTS.map((item) => {
                const currentAmount = recipe[item.id as keyof RecipeState];
                return (
                  <div
                    key={item.id}
                    className={`bg-[#1a1310] border p-3.5 rounded-md flex flex-col items-center justify-between transition-all ${
                      currentAmount > 0
                        ? 'border-gold-500/40 bg-gold-500/5 shadow-[inset_0_0_12px_rgba(229,201,167,0.06)] animate-pulse-slow'
                        : 'border-[#3d2b1f]/50'
                    }`}
                  >
                    {/* Visual Label */}
                    <div className="text-center mb-3">
                      <h4 className="text-xs md:text-sm font-display font-bold text-parchment leading-tight">
                        {item.nameBn}
                      </h4>
                      <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wide block">
                        {item.nameEn}
                      </span>
                    </div>

                    {/* Plus-Minus controls */}
                    <div className="flex items-center gap-2 bg-[#150d08] rounded-md px-1.5 py-1 border border-[#3d2b1f]/60 w-full justify-between">
                      <button
                        onClick={() => updateIngredientValue(item.id as keyof RecipeState, -item.step)}
                        disabled={currentAmount <= item.min}
                        className={`p-1 rounded-sm transition-all ${
                          currentAmount <= item.min
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-gold-400 hover:bg-gold-500/15 cursor-pointer'
                        }`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <div className="text-center min-w-[36px] flex-1">
                        <span className="text-xs font-mono font-bold text-gold-400 block">{currentAmount}</span>
                        <span className="text-[8px] text-gray-400 block font-sans -mt-0.5">{item.unitBn}</span>
                      </div>

                      <button
                        onClick={() => updateIngredientValue(item.id as keyof RecipeState, item.step)}
                        disabled={currentAmount >= item.max}
                        className={`p-1 rounded-sm transition-all ${
                          currentAmount >= item.max
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-gold-400 hover:bg-gold-500/15 cursor-pointer'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BREWING ACTION BUTTON */}
          <div className="flex justify-center pt-2">
            <button
              id="btn-brewing-complete"
              onClick={handleBrewSubmit}
              className="w-full sm:w-auto px-16 py-4 bg-[#e5c9a7] text-[#1a0f08] font-mono font-bold text-xs uppercase tracking-[3px] rounded-xs cursor-pointer hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-xl flex items-center justify-center gap-3"
            >
              চা তৈরি করুন ☕
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: STOVE CONSOLE, INSTRUCTIONS & TELEMETRY (4 Cols) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          
          {/* Stove Console */}
          <div className="bg-[#140f0c]/85 border border-[#e5c9a7]/10 p-5 rounded-md shadow-lg space-y-6">
            <h3 className="text-sm font-display font-bold text-[#e5c9a7] border-b border-[#3d2b1f]/60 pb-2.5 uppercase tracking-wide">
              গ্যাস চুলা নিয়ন্ত্রণ (Stove Console)
            </h3>

            {/* Thermal & Timer Readouts */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-[#150d08] border border-[#3d2b1f]/60 p-3.5 rounded-md flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono uppercase text-gray-400 block tracking-wider">তাপমাত্রা</span>
                  <span className="text-xl font-mono font-bold text-parchment">{Math.round(temperature)}°C</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#140f0c] flex items-center justify-center border border-[#3d2b1f]/40 shadow-inner">
                  <Thermometer className={`w-4 h-4 ${temperature >= 80 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`} />
                </div>
              </div>

              <div className="bg-[#150d08] border border-[#3d2b1f]/60 p-3.5 rounded-md flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono uppercase text-gray-400 block tracking-wider">সময়</span>
                  <span className="text-xl font-mono font-bold text-parchment">{formatTime(brewingTime)}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#140f0c] flex items-center justify-center border border-[#3d2b1f]/40 shadow-inner">
                  <Clock className={`w-4 h-4 ${isBrewingStarted ? 'text-gold-400 animate-spin' : 'text-gray-500'}`} style={{ animationDuration: '6s' }} />
                </div>
              </div>
            </div>

            {/* Thermal water state display */}
            <div className="bg-[#150d08] border border-[#3d2b1f]/40 rounded-md p-2.5 text-center">
              <span className="text-[9px] uppercase font-mono tracking-wider text-gray-400 block mb-0.5">Water State</span>
              <span className="text-xs text-[#e5c9a7] font-bold">{getThermalStatusBn(temperature)}</span>
            </div>

            {/* Power Button */}
            <div className="flex justify-between items-center bg-[#150d08] p-3 rounded-md border border-[#3d2b1f]/60">
              <span className="text-xs text-gray-300 font-medium">গ্যাস সংযোগ অন/অফ</span>
              <button
                id="stove-power-btn"
                onClick={toggleGas}
                className={`px-5 py-2 rounded-sm font-bold text-xs uppercase cursor-pointer transition-all duration-300 ${
                  isGasOn
                    ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.45)] hover:bg-red-700'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                }`}
              >
                {isGasOn ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Flame Multipliers */}
            <div className="space-y-2">
              <span className="text-xs text-gray-400 block">আগুনের তীব্রতা (Flame Intensity)</span>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => isGasOn && adjustFlame(lvl)}
                    disabled={!isGasOn}
                    className={`py-2 rounded-sm text-xs font-mono font-bold transition-all ${
                      !isGasOn
                        ? 'bg-gray-950 text-gray-600 border border-gray-900 cursor-not-allowed'
                        : flameLevel === lvl
                        ? 'bg-[#e5c9a7] text-[#1a0f08] shadow-[0_0_10px_rgba(229,201,167,0.25)] hover:scale-105'
                        : 'bg-[#150d08] text-gray-400 border border-[#3d2b1f]/60 hover:bg-[#3d2b1f]/30'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Warning Indicator */}
            <div className="flex gap-2.5 bg-yellow-500/5 border border-yellow-500/10 p-3 rounded-md text-[11px] text-yellow-400/80 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-yellow-400" />
              <span>পানি ৮০° সেলসিয়াসের নিচে থাকলে চা সেদ্ধ হবে না। ১০০° সেলসিয়াস সম্পূর্ণ ফোটানো আদর্শ।</span>
            </div>
          </div>

          {/* HOW TO PLAY INSTRUCTIONS */}
          <div className="bg-[#140f0c]/85 border border-[#e5c9a7]/10 p-5 rounded-md shadow-lg">
            <h3 className="text-sm font-display font-bold text-[#e5c9a7] mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#e5c9a7]" />
              কিভাবে খেলবেন?
            </h3>
            
            <ul className="space-y-3.5 text-[11px] text-gray-300 leading-relaxed">
              <li className="flex gap-2.5">
                <span className="w-4 h-4 rounded-full bg-[#e5c9a7]/15 text-[#e5c9a7] border border-[#e5c9a7]/30 flex items-center justify-center font-mono font-bold shrink-0 text-[10px]">
                  ১
                </span>
                <span>বাম প্যানেল থেকে প্রয়োজনীয় উপকরণ যোগ করুন। (পুষ্টি চা আবশ্যক)</span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-4 h-4 rounded-full bg-[#e5c9a7]/15 text-[#e5c9a7] border border-[#e5c9a7]/30 flex items-center justify-center font-mono font-bold shrink-0 text-[10px]">
                  ২
                </span>
                <span><strong>&ldquo;গ্যাস চুলা অন/অফ&rdquo;</strong> বাটনে ক্লিক করে আগুন জ্বালান।</span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-4 h-4 rounded-full bg-[#e5c9a7]/15 text-[#e5c9a7] border border-[#e5c9a7]/30 flex items-center justify-center font-mono font-bold shrink-0 text-[10px]">
                  ৩
                </span>
                <span>জল গরম হতে শুরু করলে তাপমাত্রা ও সময় খেয়াল করুন। চা লিকারের রঙ পরিবর্তন লক্ষ্য করুন।</span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-4 h-4 rounded-full bg-[#e5c9a7]/15 text-[#e5c9a7] border border-[#e5c9a7]/30 flex items-center justify-center font-mono font-bold shrink-0 text-[10px]">
                  ৪
                </span>
                <span>চা কাঙ্ক্ষিত পরিমাণে ফুটলে নীচে <strong>&ldquo;চা তৈরি করুন&rdquo;</strong> বাটনে ক্লিক করুন।</span>
              </li>
            </ul>
          </div>

          {/* Branded elements */}
          <div className="bg-gradient-to-br from-[#140f0c] to-[#150d08] border border-[#e5c9a7]/10 rounded-md p-4 text-center overflow-hidden relative group">
            <div className="absolute top-0 right-0 bg-[#e5c9a7] text-[#1a0f08] font-mono font-bold text-[8px] py-0.5 px-2 rounded-bl-sm uppercase tracking-wider">
              Premium Leaf
            </div>
            <div className="text-xs text-gold-500/70 font-mono tracking-widest uppercase mb-1">Authentic Tea</div>
            <div className="font-display font-black text-lg text-parchment group-hover:scale-105 transition-transform duration-300">
              PUSHTI TEA
            </div>
            <p className="text-[10px] text-gray-400 italic mt-1">&quot;প্রতি চুমুকে খাঁটি সতেজতা ও নিখুঁত পারফেকশন&quot;</p>
          </div>

        </div>

      </div>

    </div>
  );
};

export default InteractiveKitchen;
