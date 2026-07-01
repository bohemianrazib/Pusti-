import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Thermometer, Flame, Award } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';

interface TutorialScreenProps {
  onStart: () => void;
}

export const TutorialScreen: React.FC<TutorialScreenProps> = ({ onStart }) => {
  const handleClick = () => {
    audioEngine.playClick();
    audioEngine.startAmbience();
    onStart();
  };

  const steps = [
    {
      icon: <Sparkles className="w-6 h-6 text-gold-400" />,
      titleBn: 'আপনার উপকরণ বাছুন',
      titleEn: 'Choose Ingredients',
      descBn: 'পুষ্টি চা, দুধ পাউডার, চিনি এবং বিভিন্ন ঐতিহ্যবাহী মসলা আপনার পছন্দমতো যোগ করুন।',
      descEn: 'Add Pushti tea, milk, sugar, and organic spices in your desired ratios.'
    },
    {
      icon: <Flame className="w-6 h-6 text-orange-400" />,
      titleBn: 'কেটলি গরম করুন ও বানান',
      titleEn: 'Heat and Brew',
      descBn: 'গ্যাসের চুলা অন করে তাপমাত্রা নিয়ন্ত্রণ করুন। জল ১০০° সেলসিয়াস ফুটিয়ে চা তৈরি করুন।',
      descEn: 'Turn on the gas burner, adjust flame intensity, and boil up to a perfect 100°C.'
    },
    {
      icon: <Award className="w-6 h-6 text-green-400" />,
      titleBn: 'এআই স্কোর ও ব্যক্তিত্ব পান',
      titleEn: 'Get Rated',
      descBn: 'তাপমাত্রা ও সঠিক টাইমিংয়ের ওপর ভিত্তি করে পান ১০০ তে আপনার পারফেকশন স্কোর ও ব্যক্তিত্ব!',
      descEn: 'Receive a total rating out of 100 with customized tea personality analysis!'
    }
  ];

  return (
    <div id="tutorial-screen-container" className="max-w-3xl mx-auto py-8 px-4 flex flex-col justify-center min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl md:text-4xl font-display font-bold text-gold-400 tracking-tight mb-3">
          কিভাবে পারফেক্ট চা বানাবেন?
        </h2>
        <p className="text-gray-300 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
          খাঁটি লিকার ও নিখুঁত স্বাদের মেলবন্ধনে তৈরি করুন আপনার সেরা চা রেসিপি। আপনার প্রতিটি সিদ্ধান্ত চায়ের স্বাদ, সুগন্ধ এবং পারফেকশন নির্ধারণ করবে!
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {steps.map((step, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.15 }}
            whileHover={{ y: -4, borderColor: 'rgba(229, 201, 167, 0.25)' }}
            className="bg-[#140f0c]/80 border border-[#e5c9a7]/10 p-6 rounded-md text-center flex flex-col items-center shadow-2xl backdrop-blur-lg transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-[#1a1310] flex items-center justify-center border border-[#e5c9a7]/15 mb-4 shadow-inner">
              {step.icon}
            </div>
            
            <h3 className="text-lg font-display font-bold text-gold-500 mb-1">
              {step.titleBn}
            </h3>
            <span className="text-[10px] font-mono text-gold-500/60 uppercase tracking-widest block mb-3">
              {step.titleEn}
            </span>
            
            <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
              {step.descBn}
            </p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex justify-center"
      >
        <button
          id="btn-start-kitchen"
          onClick={handleClick}
          className="px-12 py-4 bg-[#e5c9a7] text-[#1a0f08] font-mono font-bold text-xs uppercase tracking-[3px] rounded-xs cursor-pointer hover:brightness-110 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 shadow-xl flex items-center gap-3"
        >
          রান্নাঘরে প্রবেশ করুন ☕
        </button>
      </motion.div>
    </div>
  );
};
