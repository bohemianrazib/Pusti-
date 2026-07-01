import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Thermometer, Clock, HelpCircle, AlertCircle, Plus, Minus, Check, Droplet, Coffee } from 'lucide-react';
import { KitchenCanvas } from './KitchenCanvas';
import { INGREDIENTS } from '../ingredientsData';
import { RecipeState } from '../types';
import { audioEngine } from '../lib/audioEngine';
import { SlidingPuzzle } from './SlidingPuzzle';

interface InteractiveKitchenProps {
  userId: string;
  onBrewComplete: (recipeData: {
    recipe: RecipeState;
    temperature: number;
    brewingTime: number;
  }) => void;
}

export const InteractiveKitchen: React.FC<InteractiveKitchenProps> = ({ userId, onBrewComplete }) => {
  // 1. SEQUENCE STATE
  const [activeStep, setActiveStep] = useState<'water' | 'ingredients' | 'stove' | 'done'>('water');

  // Water Volume selection
  const [selectedWater, setSelectedWater] = useState<number>(350); // in ml: 250, 350, 500
  const [waterLevel, setWaterLevel] = useState<number>(0.0); // Visual canvas water height (0.0 to 1.0)
  const [isWaterFilling, setIsWaterFilling] = useState<boolean>(false);

  // Recipe State
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

  // Stove Target Controls
  const [targetTemp, setTargetTemp] = useState<number>(100); // target temperature (80 to 100)
  const [targetTime, setTargetTime] = useState<number>(20); // target time (10 to 60)
  const [countdownTime, setCountdownTime] = useState<number>(20); // ticks down to 0
  const [isCountingDown, setIsCountingDown] = useState<boolean>(false);

  // Gas and Stove Physics State
  const [isGasOn, setIsGasOn] = useState(false);
  const [flameLevel, setFlameLevel] = useState(3); // default Level 3
  const [temperature, setTemperature] = useState(25); // Starts at room temp (25°C)
  const [brewingTime, setBrewingTime] = useState(0); // in seconds
  const [isBrewingStarted, setIsBrewingStarted] = useState(false);

  // Sliding Puzzle state
  const [isPuzzleOpen, setIsPuzzleOpen] = useState<boolean>(false);

  // Sound timers and interval refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const soundTempRef = useRef(25);

  // Sync countdown time to user selection initially
  useEffect(() => {
    if (!isCountingDown) {
      setCountdownTime(targetTime);
    }
  }, [targetTime, isCountingDown]);

  // 2. STOVE TEMPERATURE REAL-TIME SIMULATION
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
          soundTempRef.current = Math.max(25, soundTempRef.current - 18);
        }

        // Update real-time synthesized sounds based on sound-effective temperature
        audioEngine.updateBoiling(soundTempRef.current);
        audioEngine.updateSteam(soundTempRef.current);

        return Math.round(nextTemp * 10) / 10;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGasOn, flameLevel]);

  // COUNTDOWN TICKER EFFECT (Ticks only when gas is on and temperature is hot enough)
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout | null = null;

    if (isGasOn && temperature >= targetTemp && countdownTime > 0) {
      setIsCountingDown(true);
      setIsBrewingStarted(true);

      countdownInterval = setInterval(() => {
        setCountdownTime((prev) => {
          if (prev <= 1) {
            // Countdown complete! Turn off stove and advance step
            setIsGasOn(false);
            setIsCountingDown(false);
            setIsPuzzleOpen(false); // Auto-close puzzle on completion
            setActiveStep('done');
            audioEngine.stopAll();
            audioEngine.playSpoonClink(); // Success chime
            return 0;
          }
          return prev - 1;
        });

        // Track total active brewing seconds
        setBrewingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setIsCountingDown(false);
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [isGasOn, temperature, targetTemp, countdownTime]);

  // Clean up sounds when leaving kitchen
  useEffect(() => {
    return () => {
      audioEngine.stopAll();
    };
  }, []);

  // 3. HANDLERS & ANIMATIONS
  const triggerWaterFilling = () => {
    if (isWaterFilling) return;
    setIsWaterFilling(true);
    setWaterLevel(0.0);
    audioEngine.playPour(); // satisfying water flow sound

    const targetRatio = selectedWater === 250 ? 0.55 : selectedWater === 350 ? 0.78 : 1.0;
    let current = 0;

    const fillInterval = setInterval(() => {
      current += 0.025;
      if (current >= targetRatio) {
        setWaterLevel(targetRatio);
        setIsWaterFilling(false);
        clearInterval(fillInterval);
        audioEngine.playSpoonClink(); // Done bell
        setActiveStep('ingredients'); // Transition
      } else {
        setWaterLevel(current);
      }
    }, 30);
  };

  const toggleGas = () => {
    const nextState = !isGasOn;
    setIsGasOn(nextState);
    if (nextState) {
      audioEngine.playStoveIgnition();
    } else {
      audioEngine.playClick();
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
    // Basic verification: user must have added some Pushti Tea
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
    <div id="interactive-kitchen-container" className="max-w-7xl mx-auto px-2 sm:px-4 py-4 md:py-6 h-full flex flex-col justify-between">
      
      {/* 1. Header Area */}
      <div className="text-center mb-4 shrink-0 px-2">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-gold-400 tracking-tight">
          আপনার চা, আপনার পারফেকশন 🍂
        </h2>
        <p className="text-gray-300 text-[10px] md:text-xs mt-0.5 max-w-lg mx-auto">
          ধারাবাহিক নিয়মে পানি ও উপকরণগুলো যোগ করুন, সঠিক তাপমাত্রা নির্ধারণ করে রান্না করুন পুষ্টি চা।
        </p>
      </div>

      {/* 2. Step Indicator Tabs */}
      <div className="flex justify-center items-center gap-1 sm:gap-2 mb-4 px-2 shrink-0 max-w-lg mx-auto w-full">
        {[
          { key: 'water', label: '১. পানি', icon: Droplet },
          { key: 'ingredients', label: '২. উপকরণ', icon: Plus },
          { key: 'stove', label: '৩. সেদ্ধ', icon: Flame },
          { key: 'done', label: '৪. পরিবেশন', icon: Coffee }
        ].map((step, idx) => {
          const Icon = step.icon;
          const isActive = activeStep === step.key;
          const isCompleted = 
            (step.key === 'water' && activeStep !== 'water') ||
            (step.key === 'ingredients' && (activeStep === 'stove' || activeStep === 'done')) ||
            (step.key === 'stove' && activeStep === 'done');

          return (
            <div key={step.key} className="flex items-center flex-1">
              <button
                disabled={activeStep === 'done' || step.key === 'done'}
                onClick={() => {
                  if (step.key === 'water') {
                    setActiveStep('water');
                  } else if (step.key === 'ingredients' && waterLevel > 0) {
                    setActiveStep('ingredients');
                  } else if (step.key === 'stove' && waterLevel > 0 && recipe.pushtiTea > 0) {
                    setActiveStep('stove');
                  }
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xs text-[10px] sm:text-xs font-mono font-bold transition-all w-full border ${
                  isActive
                    ? 'bg-gold-500 text-[#1a0f08] border-gold-400 shadow-lg'
                    : isCompleted
                    ? 'bg-gold-500/10 text-gold-400 border-gold-500/30'
                    : 'bg-black/45 text-gray-500 border-white/5 cursor-not-allowed'
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="hidden xs:inline">{step.label}</span>
              </button>
              {idx < 3 && <div className={`h-[1px] w-1 sm:w-2 ${isCompleted ? 'bg-gold-500/50' : 'bg-white/5'}`} />}
            </div>
          );
        })}
      </div>

      {/* 3. Main Split Screen Body */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-8 items-start flex-1 overflow-y-auto lg:overflow-visible pb-16 lg:pb-0">
        
        {/* LEFT/STICKY TOP: Kettle Canvas */}
        <div className="w-full lg:col-span-6 xl:col-span-7 sticky top-0 lg:relative z-20 bg-[#140f0c] lg:bg-transparent border-b lg:border-none border-[#e5c9a7]/10 pb-4 lg:pb-0 h-[38vh] md:h-[45vh] lg:h-[480px] shrink-0">
          <div className="h-full w-full relative">
            <KitchenCanvas
              recipe={recipe}
              temperature={temperature}
              isGasOn={isGasOn}
              flameLevel={flameLevel}
              waterLevel={waterLevel}
            />
            {/* Overlay indicators on the kettle */}
            <div className="absolute top-2 left-2 bg-black/75 border border-gold-500/15 py-1 px-2.5 rounded-xs font-mono text-[10px] space-y-0.5">
              <div className="flex justify-between gap-4 text-gray-400">
                <span>জল স্তর (Water Level):</span>
                <span className="text-gold-400 font-bold">{Math.round(waterLevel * 100)}%</span>
              </div>
              <div className="flex justify-between gap-4 text-gray-400">
                <span>তাপমাত্রা (Temperature):</span>
                <span className="text-gold-400 font-bold">{Math.round(temperature)}°C</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT/SCROLLABLE CONTROLS: Wizard Steps */}
        <div className="w-full lg:col-span-6 xl:col-span-5 px-2 md:px-0 space-y-4 lg:max-h-[580px] lg:overflow-y-auto pr-0 lg:pr-2">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: WATER SELECTION */}
            {activeStep === 'water' && (
              <motion.div
                key="step-water"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#140f0c]/85 border border-gold-500/10 p-4 sm:p-5 rounded-md shadow-2xl space-y-4"
              >
                <div className="border-b border-white/5 pb-2">
                  <h3 className="text-sm font-display font-bold text-gold-400 uppercase tracking-wide">
                    ধাপ ১: পানি নির্বাচন (Choose Water Volume)
                  </h3>
                  <p className="text-[10px] text-gray-400">কেটলিতে পানি দিতে কতটুকু পানি প্রয়োজন তা নির্ধারণ করুন।</p>
                </div>

                {/* Pre-defined volumes */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { ml: 250, label: '১ কাপ (250ml)', desc: 'হালকা ও গাঢ়' },
                    { ml: 350, label: '২ কাপ (350ml)', desc: 'আদর্শ ও সুষম' },
                    { ml: 500, label: '৩ কাপ (500ml)', desc: 'পারিবারিক পরিবেশন' }
                  ].map((vol) => (
                    <button
                      key={vol.ml}
                      disabled={isWaterFilling}
                      onClick={() => setSelectedWater(vol.ml)}
                      className={`p-3 rounded-md border flex flex-col items-center justify-center transition-all ${
                        selectedWater === vol.ml
                          ? 'bg-gold-500/15 border-gold-500 shadow-md'
                          : 'bg-[#150d08] border-[#3d2b1f]/50 hover:bg-[#1a1310]'
                      }`}
                    >
                      <Droplet className={`w-5 h-5 mb-1 ${selectedWater === vol.ml ? 'text-gold-400' : 'text-gray-500'}`} />
                      <span className="text-[11px] font-bold text-parchment text-center">{vol.label}</span>
                      <span className="text-[8px] text-gray-400 mt-0.5 text-center">{vol.desc}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={triggerWaterFilling}
                  disabled={isWaterFilling}
                  className="w-full py-3 bg-[#e5c9a7] text-[#1a0f08] font-bold text-xs uppercase tracking-[2px] rounded-xs cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isWaterFilling ? (
                    <>
                      <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-[#1a0f08] border-t-transparent rounded-full" />
                      পানি ঢালা হচ্ছে... (Filling...)
                    </>
                  ) : (
                    <>কেটলিতে পানি যোগ করুন 💧</>
                  )}
                </button>
              </motion.div>
            )}

            {/* STEP 2: INGREDIENTS SELECTOR */}
            {activeStep === 'ingredients' && (
              <motion.div
                key="step-ingredients"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#140f0c]/85 border border-gold-500/10 p-4 rounded-md shadow-2xl space-y-4"
              >
                <div className="border-b border-white/5 pb-2">
                  <h3 className="text-sm font-display font-bold text-gold-400 uppercase tracking-wide">
                    ধাপ ২: উপকরণ যোগ করুন (Add Ingredients)
                  </h3>
                  <p className="text-[10px] text-gray-400">কেটলির পানিতে স্বাদ অনুযায়ী উপকরণ ও পুষ্টি চা পাতা যোগ করুন।</p>
                </div>

                {/* Ingredients Grid */}
                <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {INGREDIENTS.map((item) => {
                    const currentAmount = recipe[item.id as keyof RecipeState];
                    const isRequired = item.id === 'pushtiTea';

                    return (
                      <div
                        key={item.id}
                        className={`bg-[#1a1310] border p-2.5 rounded-md flex flex-col justify-between transition-all ${
                          currentAmount > 0
                            ? 'border-gold-500/30 bg-gold-500/5 shadow-inner'
                            : 'border-[#3d2b1f]/50'
                        }`}
                      >
                        <div className="mb-2">
                          <h4 className="text-xs font-display font-bold text-parchment flex items-center gap-1.5 leading-tight">
                            {item.nameBn}
                            {isRequired && <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/20 px-1 py-0.2 rounded-xs font-mono font-bold">জরুরী</span>}
                          </h4>
                          <span className="text-[8px] font-mono text-gray-400 uppercase tracking-wider block">
                            {item.nameEn}
                          </span>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1 bg-[#150d08] rounded-xs px-1 py-0.5 border border-[#3d2b1f]/60 justify-between">
                          <button
                            onClick={() => updateIngredientValue(item.id as keyof RecipeState, -item.step)}
                            disabled={currentAmount <= item.min}
                            className={`p-1 rounded-sm transition-all ${
                              currentAmount <= item.min
                                ? 'text-gray-600 cursor-not-allowed'
                                : 'text-gold-400 hover:bg-gold-500/15'
                            }`}
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <div className="text-center min-w-[32px] flex-1">
                            <span className="text-xs font-mono font-bold text-gold-400 block">{currentAmount}</span>
                            <span className="text-[8px] text-gray-400 block -mt-0.5">{item.unitBn}</span>
                          </div>

                          <button
                            onClick={() => updateIngredientValue(item.id as keyof RecipeState, item.step)}
                            disabled={currentAmount >= item.max}
                            className={`p-1 rounded-sm transition-all ${
                              currentAmount >= item.max
                                ? 'text-gray-600 cursor-not-allowed'
                                : 'text-gold-400 hover:bg-gold-500/15'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2.5 bg-yellow-500/5 border border-yellow-500/10 p-2.5 rounded-md text-[10px] text-yellow-400/85">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-yellow-400" />
                  <span>পুষ্টি চা পাতা অন্তত ২ চামচ দেওয়া আদর্শ কড়া লিকারের জন্য!</span>
                </div>

                <button
                  onClick={() => {
                    if (recipe.pushtiTea === 0) {
                      alert('দয়া করে অন্তত কিছু পুষ্টি চা পাতা যোগ করুন!');
                      return;
                    }
                    setActiveStep('stove');
                  }}
                  className="w-full py-3 bg-[#e5c9a7] text-[#1a0f08] font-bold text-xs uppercase tracking-[2px] rounded-xs cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1"
                >
                  ধাপ ৩: চুলা জ্বালান ও সেদ্ধ করুন ➡️
                </button>
              </motion.div>
            )}

            {/* STEP 3: STOVE AND COOK CONTROLS (With Slider Puzzle option) */}
            {activeStep === 'stove' && (
              <motion.div
                key="step-stove"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#140f0c]/85 border border-gold-500/10 p-4 sm:p-5 rounded-md shadow-2xl space-y-4"
              >
                <div className="border-b border-white/5 pb-2 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-display font-bold text-gold-400 uppercase tracking-wide">
                      ধাপ ৩: চুলা নিয়ন্ত্রণ ও সেদ্ধ
                    </h3>
                    <p className="text-[10px] text-gray-400">চুলা কত তাপমাত্রায় কতক্ষণ চালাতে চান সেট করুন।</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider animate-pulse">
                      {isCountingDown ? 'Boiling...' : 'Ready'}
                    </span>
                  </div>
                </div>

                {/* Setup controls (Sliders) before gas is turned on / during cooking */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#150d08] border border-[#3d2b1f]/60 p-3 rounded-md">
                    <label className="text-[10px] text-gray-400 block mb-1">টার্গেট তাপমাত্রা (°C)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="80"
                        max="100"
                        step="5"
                        value={targetTemp}
                        onChange={(e) => !isCountingDown && setTargetTemp(Number(e.target.value))}
                        disabled={isCountingDown}
                        className="w-full accent-gold-500 cursor-pointer disabled:opacity-55"
                      />
                      <span className="text-xs font-mono font-bold text-gold-400 w-10 text-right">{targetTemp}°C</span>
                    </div>
                  </div>

                  <div className="bg-[#150d08] border border-[#3d2b1f]/60 p-3 rounded-md">
                    <label className="text-[10px] text-gray-400 block mb-1">রান্নার সময় (সেকেন্ড)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="10"
                        max="60"
                        step="5"
                        value={targetTime}
                        onChange={(e) => !isCountingDown && setTargetTime(Number(e.target.value))}
                        disabled={isCountingDown}
                        className="w-full accent-gold-500 cursor-pointer disabled:opacity-55"
                      />
                      <span className="text-xs font-mono font-bold text-gold-400 w-8 text-right">{targetTime}s</span>
                    </div>
                  </div>
                </div>

                {/* Readouts Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#150d08] border border-[#3d2b1f]/40 p-2.5 rounded-md flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider block">বর্তমান তাপমাত্রা</span>
                      <span className="text-base font-mono font-black text-parchment">{Math.round(temperature)}°C</span>
                    </div>
                    <Thermometer className={`w-4 h-4 ${temperature >= 80 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`} />
                  </div>

                  <div className="bg-[#150d08] border border-[#3d2b1f]/40 p-2.5 rounded-md flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider block">অবশিষ্ট সময়</span>
                      <span className={`text-base font-mono font-black ${isCountingDown ? 'text-green-400 animate-pulse' : 'text-parchment'}`}>
                        {countdownTime} সেকেন্ড
                      </span>
                    </div>
                    <Clock className={`w-4 h-4 ${isCountingDown ? 'text-green-400 animate-spin' : 'text-gray-500'}`} style={{ animationDuration: '4s' }} />
                  </div>
                </div>

                {/* Power & Flame Controls */}
                <div className="bg-[#150d08] p-3 rounded-md border border-[#3d2b1f]/60 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-300 font-medium">গ্যাস সংযোগ অন/অফ</span>
                    <button
                      onClick={toggleGas}
                      className={`px-6 py-2 rounded-sm font-bold text-xs uppercase cursor-pointer transition-all duration-300 ${
                        isGasOn
                          ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.45)] hover:bg-red-700'
                          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                      }`}
                    >
                      {isGasOn ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                    <span className="text-[10px] text-gray-400 block">আগুনের তীব্রতা (Flame Intensity)</span>
                    <div className="grid grid-cols-5 gap-1">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => isGasOn && adjustFlame(lvl)}
                          disabled={!isGasOn}
                          className={`py-1.5 rounded-sm text-xs font-mono font-bold transition-all ${
                            !isGasOn
                              ? 'bg-gray-950 text-gray-600 border border-gray-900 cursor-not-allowed'
                              : flameLevel === lvl
                              ? 'bg-[#e5c9a7] text-[#1a0f08] shadow-[0_0_10px_rgba(229,201,167,0.25)] scale-105'
                              : 'bg-[#150d08] text-gray-400 border border-[#3d2b1f]/60 hover:bg-[#3d2b1f]/30'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SLIDING PUZZLE OPTION FOR USERS DURING COUNTDOWN */}
                {isGasOn && (
                  <div className="bg-gradient-to-r from-amber-500/10 to-gold-500/5 border border-gold-500/20 p-3 rounded-md space-y-2.5">
                    <div className="flex justify-between items-center">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-bold text-gold-400 block">🧩 সময় কাটানোর মিনি-গেম!</span>
                        <span className="text-[9px] text-gray-400 block">চা ফোটা পর্যন্ত পুষ্টি চায়ের স্লাইড পাজেলটি মেলান।</span>
                      </div>
                      <button
                        onClick={() => {
                          audioEngine.playClick();
                          setIsPuzzleOpen(!isPuzzleOpen);
                        }}
                        className={`px-3 py-1.5 rounded-sm text-[10px] font-mono font-extrabold transition-all ${
                          isPuzzleOpen
                            ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                            : 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                        }`}
                      >
                        {isPuzzleOpen ? 'পাজেল বন্ধ করুন' : 'পাজেল মেলান 🧩'}
                      </button>
                    </div>

                    {/* Integrated sliding puzzle container */}
                    <AnimatePresence>
                      {isPuzzleOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2">
                            <SlidingPuzzle />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Simple Help Text */}
                {!isGasOn && (
                  <div className="flex gap-2.5 bg-yellow-500/5 border border-yellow-500/10 p-2.5 rounded-md text-[10px] text-yellow-400/80 leading-normal">
                    <HelpCircle className="w-3.5 h-3.5 shrink-0 text-yellow-400" />
                    <span>গ্যাস সংযোগ চালু করে চুলা জ্বালান। কেটলির পানি নির্ধারিত টার্গেট তাপমাত্রায় পৌঁছালে স্বয়ংক্রিয়ভাবে সেকেন্ডের কাউন্টডাউন শুরু হবে।</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 4: COOK COMPLETE & READY FOR SERVING */}
            {activeStep === 'done' && (
              <motion.div
                key="step-done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#140f0c]/90 border-2 border-gold-500/40 p-5 rounded-md shadow-2xl text-center space-y-4"
              >
                <div className="w-12 h-12 bg-gold-500/20 text-gold-400 rounded-full flex items-center justify-center mx-auto border border-gold-500 animate-bounce">
                  <Check className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-display font-black text-gold-400 uppercase tracking-widest">
                    পুষ্টি চা সম্পূর্ণ প্রস্তুত! 🍂☕
                  </h3>
                  <p className="text-xs text-gray-300">
                    কেটলির পানি ফুটানো সফল হয়েছে। আপনার চায়ের পারফেকশন সুবাস ছড়াচ্ছে।
                  </p>
                </div>

                <div className="bg-[#110a06] border border-[#3d2b1f]/60 p-3 rounded-md text-[11px] space-y-1 text-gray-400 max-w-xs mx-auto">
                  <div className="flex justify-between">
                    <span>পানি স্তর:</span>
                    <strong className="text-parchment font-mono">{selectedWater}ml</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>শেষ তাপমাত্রা:</span>
                    <strong className="text-parchment font-mono">{Math.round(temperature)}°C</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>মোট ফোটানো সময়:</span>
                    <strong className="text-parchment font-mono">{brewingTime} সেকেন্ড</strong>
                  </div>
                </div>

                <button
                  id="btn-brewing-complete"
                  onClick={handleBrewSubmit}
                  className="w-full py-4 bg-gradient-to-r from-gold-500 to-[#e5c9a7] text-[#1a0f08] font-mono font-black text-xs uppercase tracking-[3px] rounded-xs cursor-pointer hover:brightness-110 active:scale-[0.97] transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  চা পরিবেশন করুন 🍵
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

    </div>
  );
};

export default InteractiveKitchen;
