import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Coffee, ArrowRight, Sparkles } from 'lucide-react';
import { RecipeState } from '../types';
import { audioEngine } from '../lib/audioEngine';

interface PouringStageProps {
  recipe: RecipeState;
  temperature: number;
  brewingTime: number;
  onComplete: () => void;
}

export const PouringStage: React.FC<PouringStageProps> = ({
  recipe,
  temperature,
  brewingTime,
  onComplete,
}) => {
  const [isPouring, setIsPouring] = useState(false);
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const progressRef = useRef(0);

  // Blend color calculation (consistent with KitchenCanvas)
  const getTeaColor = () => {
    const teaCount = recipe.pushtiTea;
    const milkCount = recipe.milkPowder;
    const lemonCount = recipe.lemon;
    const cinnamonCount = recipe.cinnamon;
    const gingerCount = recipe.ginger;

    let liquidR = 210, liquidG = 230, liquidB = 250, liquidAlpha = 0.25;

    if (teaCount > 0) {
      const teaRatio = Math.min(teaCount / 3, 1.2);
      liquidR = Math.round(liquidR * (1 - teaRatio) + 139 * teaRatio);
      liquidG = Math.round(liquidG * (1 - teaRatio) + 30 * teaRatio);
      liquidB = Math.round(liquidB * (1 - teaRatio) + 15 * teaRatio);
      liquidAlpha = 0.5 + (teaRatio * 0.3);
    }

    if (cinnamonCount > 0) {
      const cinnamonRatio = Math.min(cinnamonCount / 2, 0.8);
      liquidR = Math.round(liquidR * (1 - cinnamonRatio) + 100 * cinnamonRatio);
      liquidG = Math.round(liquidG * (1 - cinnamonRatio) + 50 * cinnamonRatio);
      liquidB = Math.round(liquidB * (1 - cinnamonRatio) + 20 * cinnamonRatio);
    }

    if (gingerCount > 0) {
      liquidR = Math.min(liquidR + gingerCount * 12, 255);
      liquidG = Math.min(liquidG + gingerCount * 8, 255);
    }

    if (lemonCount > 0 && milkCount === 0) {
      const lemonRatio = Math.min(lemonCount / 3, 0.8);
      liquidR = Math.round(liquidR * (1 - lemonRatio) + 230 * lemonRatio);
      liquidG = Math.round(liquidG * (1 - lemonRatio) + 170 * lemonRatio);
      liquidB = Math.round(liquidB * (1 - lemonRatio) + 60 * lemonRatio);
    }

    if (milkCount > 0) {
      const milkRatio = Math.min(milkCount / 2.5, 0.95);
      liquidR = Math.round(liquidR * (1 - milkRatio) + 245 * milkRatio);
      liquidG = Math.round(liquidG * (1 - milkRatio) + 232 * milkRatio);
      liquidB = Math.round(liquidB * (1 - milkRatio) + 210 * milkRatio);
      liquidAlpha = 0.95;
    }

    return {
      cssColor: `rgba(${liquidR}, ${liquidG}, ${liquidB}, ${liquidAlpha})`,
      r: liquidR,
      g: liquidG,
      b: liquidB,
      alpha: liquidAlpha,
    };
  };

  const teaColor = getTeaColor();

  const handleStartPouring = () => {
    setIsPouring(true);
    audioEngine.playPour();
  };

  useEffect(() => {
    if (!isPouring) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();

    // Setup animation loop
    let lastTime = Date.now();
    let streamPulse = 0;
    const steamParticles: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }> = [];

    const animate = () => {
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, w, h);

      // Increase progress slowly over 3 seconds
      const now = Date.now();
      const elapsed = now - lastTime;
      lastTime = now;

      progressRef.current = Math.min(100, progressRef.current + (elapsed / 3000) * 100);
      setProgress(Math.round(progressRef.current));

      const p = progressRef.current / 100;

      // Define locations
      const kettleSpoutX = w * 0.35;
      const kettleSpoutY = h * 0.35;
      const cupCenterX = w * 0.65;
      const cupCenterY = h * 0.72;
      const cupW = 80;
      const cupH = 65;

      // 1. Draw Steam rising from the cup
      if (p > 0.1) {
        if (Math.random() < 0.15) {
          steamParticles.push({
            x: cupCenterX + (Math.random() - 0.5) * (cupW - 20),
            y: cupCenterY - (cupH * p) + 5,
            vx: (Math.random() - 0.5) * 0.6,
            vy: -1.0 - Math.random() * 1.5,
            size: 5 + Math.random() * 10,
            alpha: 0.2 + Math.random() * 0.2,
          });
        }
      }

      for (let i = steamParticles.length - 1; i >= 0; i--) {
        const sp = steamParticles[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.alpha -= 0.005;
        sp.size += 0.15;
        if (sp.alpha <= 0) {
          steamParticles.splice(i, 1);
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${sp.alpha})`;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Draw clay cup (Matir Kaap)
      ctx.save();
      // Drop Shadow for cup
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;

      // Outer clay surface
      const clayGrad = ctx.createLinearGradient(cupCenterX - cupW / 2, cupCenterY, cupCenterX + cupW / 2, cupCenterY);
      clayGrad.addColorStop(0, '#733c1d'); // Rich baked clay
      clayGrad.addColorStop(0.5, '#a35c37'); // Highlighted warm clay
      clayGrad.addColorStop(1, '#592e16'); // Shaded clay

      ctx.fillStyle = clayGrad;
      ctx.beginPath();
      ctx.moveTo(cupCenterX - cupW / 2, cupCenterY - cupH);
      // Cup curves down to base
      ctx.quadraticCurveTo(cupCenterX - cupW * 0.45, cupCenterY, cupCenterX - cupW * 0.3, cupCenterY);
      ctx.lineTo(cupCenterX + cupW * 0.3, cupCenterY);
      ctx.quadraticCurveTo(cupCenterX + cupW * 0.45, cupCenterY, cupCenterX + cupW / 2, cupCenterY - cupH);
      ctx.closePath();
      ctx.fill();

      // Golden traditional paint design on cup middle
      ctx.strokeStyle = '#e5c9a7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cupCenterX - cupW * 0.45, cupCenterY - cupH * 0.4);
      ctx.quadraticCurveTo(cupCenterX, cupCenterY - cupH * 0.35, cupCenterX + cupW * 0.45, cupCenterY - cupH * 0.4);
      ctx.stroke();

      ctx.restore();

      // Inner liquid inside cup (masks to cup boundaries)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cupCenterX - cupW / 2 + 1, cupCenterY - cupH + 1);
      ctx.quadraticCurveTo(cupCenterX - cupW * 0.45, cupCenterY, cupCenterX - cupW * 0.3, cupCenterY);
      ctx.lineTo(cupCenterX + cupW * 0.3, cupCenterY);
      ctx.quadraticCurveTo(cupCenterX + cupW * 0.45, cupCenterY, cupCenterX + cupW / 2 - 1, cupCenterY - cupH + 1);
      ctx.closePath();
      ctx.clip();

      // Liquid filled body
      const fillHeight = cupH * p * 0.92;
      if (p > 0.02) {
        ctx.fillStyle = teaColor.cssColor;
        ctx.beginPath();
        ctx.rect(cupCenterX - cupW / 2 - 10, cupCenterY - fillHeight, cupW + 20, fillHeight + 10);
        ctx.fill();

        // Liquid surface ripples/foam
        ctx.fillStyle = `rgba(${Math.min(255, teaColor.r + 40)}, ${Math.min(255, teaColor.g + 30)}, ${Math.min(255, teaColor.b + 20)}, 0.55)`;
        ctx.beginPath();
        ctx.ellipse(cupCenterX, cupCenterY - fillHeight, cupW * 0.45, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Splash bubbles inside cup
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        for (let b = 0; b < 6; b++) {
          const bx = cupCenterX + Math.sin(Date.now() * 0.01 + b) * (cupW * 0.3);
          const by = cupCenterY - fillHeight + (Math.random() - 0.5) * 3;
          ctx.beginPath();
          ctx.arc(bx, by, 1 + Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // 3. Draw Tilted Kettle pouring
      const kettleOriginX = kettleSpoutX - 40;
      const kettleOriginY = kettleSpoutY + 15;
      const localSpoutX = 35;
      const localSpoutY = -8;
      const tiltAngle = Math.PI * 0.18 * Math.min(1.0, p * 8);

      // Rotated local spout offset to find exact world spout tip coordinate
      const rotSpoutX = localSpoutX * Math.cos(tiltAngle) - localSpoutY * Math.sin(tiltAngle);
      const rotSpoutY = localSpoutX * Math.sin(tiltAngle) + localSpoutY * Math.cos(tiltAngle);
      const activeSpoutX = kettleOriginX + rotSpoutX;
      const activeSpoutY = kettleOriginY + rotSpoutY;

      ctx.save();
      ctx.translate(kettleOriginX, kettleOriginY);
      // Tilt animation based on pouring (positive angle to tilt right towards the cup)
      ctx.rotate(tiltAngle);

      // Draw simplified kettle silhouette in tilted state
      ctx.fillStyle = '#222';
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-25, -40, 50, 80, 8);
      ctx.fill();
      ctx.stroke();

      // Handle
      ctx.strokeStyle = '#c0a684';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-25, -20);
      ctx.quadraticCurveTo(-45, 0, -25, 20);
      ctx.stroke();

      // Kettle liquid inside (blended transparently) - decreases as tea pours out
      ctx.fillStyle = teaColor.cssColor;
      ctx.beginPath();
      const liquidHeight = Math.max(0, 35 * (1 - p));
      const liquidY = 35 * p;
      ctx.rect(-20, liquidY, 40, liquidHeight);
      ctx.fill();

      // Spout
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.moveTo(20, -15);
      ctx.lineTo(40, -10);
      ctx.lineTo(38, 5);
      ctx.lineTo(20, 5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // 4. Draw Stream of Tea Liquid from Kettle to Cup (originates from dynamic activeSpout coordinate)
      if (p < 0.99) {
        streamPulse += 0.15;
        const streamW = 4 + Math.sin(streamPulse) * 1.2;

        ctx.strokeStyle = teaColor.cssColor;
        ctx.lineWidth = streamW;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(activeSpoutX, activeSpoutY);
        // Beautiful curve into cup center
        ctx.quadraticCurveTo(
          activeSpoutX + (cupCenterX - activeSpoutX) * 0.45,
          activeSpoutY + (cupCenterY - activeSpoutY) * 0.2,
          cupCenterX,
          cupCenterY - fillHeight
        );
        ctx.stroke();

        // White highlight line inside the stream for high-speed liquid shine
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = streamW * 0.35;
        ctx.beginPath();
        ctx.moveTo(activeSpoutX, activeSpoutY);
        ctx.quadraticCurveTo(
          activeSpoutX + (cupCenterX - activeSpoutX) * 0.45,
          activeSpoutY + (cupCenterY - activeSpoutY) * 0.2,
          cupCenterX,
          cupCenterY - fillHeight
        );
        ctx.stroke();
      }

      if (progressRef.current >= 100) {
        // Complete! Wait 800ms, then trigger scoring callback
        setTimeout(() => {
          onComplete();
        }, 800);
      } else {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPouring]);

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="bg-[#140f0c]/85 border border-[#e5c9a7]/15 p-6 md:p-8 rounded-md shadow-2xl backdrop-blur-lg text-center relative overflow-hidden">
        
        {/* Particle and Glow Effects */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500/10 via-[#e5c9a7]/40 to-amber-500/10" />
        
        {/* Step Info */}
        <div className="mb-6">
          <span className="text-[10px] font-mono tracking-[4px] uppercase text-gold-500 font-bold block mb-2">
            সর্বশেষ ধাপ (Final Stage)
          </span>
          <h2 className="text-xl md:text-2xl font-display font-black text-parchment">
            চা কাপে পরিবেশন (Serving the Brew)
          </h2>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            কেটলি থেকে গরম গরম সুস্বাদু পুষ্টি চা ঢালুন এবং আপনার পারফেক্ট স্কোর উন্মোচন করুন।
          </p>
        </div>

        {/* Visual Stage Box */}
        <div className="bg-[#1a1310] border border-[#3d2b1f]/60 rounded-md p-4 mb-6 relative">
          <canvas
            ref={canvasRef}
            className="w-full h-[220px] block"
            style={{ width: '100%', height: '220px' }}
          />

          {/* Prompt overlay before pouring */}
          {!isPouring && (
            <div className="absolute inset-0 bg-[#140f0cd9] flex flex-col items-center justify-center p-6 rounded-md animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-[#e5c9a7]/10 border border-[#e5c9a7]/20 flex items-center justify-center text-[#e5c9a7] mb-3.5 animate-bounce shadow-lg" style={{ animationDuration: '3s' }}>
                <Coffee className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-parchment font-display">গরম চা পরিবেশনের জন্য প্রস্তুত!</h4>
              <p className="text-[11px] text-gray-400 mt-1 max-w-[280px]">
                নীচের <strong>&ldquo;চা ঢালুন&rdquo;</strong> বাটনে ক্লিক করে মাটির কাপে চা ঢালুন।
              </p>
            </div>
          )}

          {/* Progress Indicator */}
          {isPouring && (
            <div className="absolute bottom-4 left-4 right-4 bg-[#140f0c]/90 border border-[#3d2b1f]/60 px-4 py-2 rounded-sm flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gold-400 animate-ping" />
                <span className="text-[10px] font-mono tracking-wider text-gray-400 uppercase">পরিবেশন হচ্ছে...</span>
              </div>
              <span className="text-xs font-mono font-bold text-gold-400">{progress}%</span>
            </div>
          )}
        </div>

        {/* Controls Area */}
        <div className="flex flex-col items-center gap-4">
          {!isPouring ? (
            <button
              onClick={handleStartPouring}
              className="w-full sm:w-auto px-16 py-4 bg-[#e5c9a7] text-[#1a0f08] font-mono font-bold text-xs uppercase tracking-[3px] rounded-xs cursor-pointer hover:brightness-110 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 shadow-xl flex items-center justify-center gap-3"
            >
              চা ঢালুন ☕
            </button>
          ) : (
            <div className="w-full bg-[#150d08] border border-[#3d2b1f]/60 p-4 rounded-sm flex items-center justify-center gap-2.5">
              <Sparkles className="w-4 h-4 text-gold-400 animate-pulse" />
              <span className="text-xs text-gold-400 font-display font-medium">
                মাটির কাপে সুবাসিত চা ঢালা হচ্ছে, অপেক্ষা করুন...
              </span>
            </div>
          )}

          {/* Thermal reminder */}
          <div className="text-[10px] text-gray-500 font-mono">
            Brewing Temp: {Math.round(temperature)}°C | Time: {brewingTime} seconds
          </div>
        </div>

      </div>
    </div>
  );
};
