import React, { useEffect, useRef } from 'react';
import { RecipeState } from '../types';

interface KitchenCanvasProps {
  recipe: RecipeState;
  temperature: number;
  isGasOn: boolean;
  flameLevel: number; // 1 to 5
  waterLevel?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'steam' | 'bubble' | 'teaLeaf' | 'spice' | 'milkSwirl';
  bobSpeed?: number;
  bobOffset?: number;
}

export const KitchenCanvas: React.FC<KitchenCanvasProps> = ({
  recipe,
  temperature,
  isGasOn,
  flameLevel,
  waterLevel = 1.0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number | null>(null);

  // Keep track of ingredients in refs to avoid restarting canvas loop
  const recipeRef = useRef<RecipeState>(recipe);
  const waterLevelRef = useRef<number>(waterLevel);
  const prevTeaCountRef = useRef(0);
  const prevMintCountRef = useRef(0);
  const prevSpiceCountRef = useRef(0);

  useEffect(() => {
    recipeRef.current = recipe;
  }, [recipe]);

  useEffect(() => {
    waterLevelRef.current = waterLevel;
  }, [waterLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-DPI scaling
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize floating items / particles
    const particles = particlesRef.current;

    const animate = () => {
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      // Clear with dark, premium cinematic background
      ctx.clearRect(0, 0, width, height);

      // 1. DRAW STOVE TOP BASE (metallic dark shelf)
      const stoveY = height - 45;
      ctx.fillStyle = '#1e1b1b';
      ctx.beginPath();
      ctx.roundRect(width / 2 - 120, stoveY, 240, 20, 4);
      ctx.fill();

      // Stove metal grate lines
      ctx.strokeStyle = '#3a3434';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 100, stoveY);
      ctx.lineTo(width / 2 + 100, stoveY);
      ctx.moveTo(width / 2 - 70, stoveY - 5);
      ctx.lineTo(width / 2 - 70, stoveY);
      ctx.moveTo(width / 2 + 70, stoveY - 5);
      ctx.lineTo(width / 2 + 70, stoveY);
      ctx.stroke();

      // 2. DRAW FLAME (If gas is on)
      if (isGasOn) {
        const flameHeight = 15 + flameLevel * 6;
        const flameWidth = 140;
        const burnerX = width / 2;
        const burnerY = stoveY - 2;

        // Render ambient heat glow behind burner
        const glowGrad = ctx.createRadialGradient(burnerX, burnerY - 10, 5, burnerX, burnerY - 10, flameHeight * 1.8);
        glowGrad.addColorStop(0, 'rgba(30, 100, 255, 0.25)');
        glowGrad.addColorStop(1, 'rgba(18, 3, 5, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(burnerX, burnerY - 10, flameHeight * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Draw individual gas flames flickering
        const numFlames = 12;
        for (let i = 0; i < numFlames; i++) {
          const fx = burnerX - 60 + (i * 12) + (Math.sin(Date.now() * 0.05 + i) * 2);
          const fHeight = flameHeight * (0.8 + Math.random() * 0.4);
          
          const flameGrad = ctx.createLinearGradient(fx, burnerY, fx, burnerY - fHeight);
          flameGrad.addColorStop(0, '#001a4d'); // Dark deep blue base
          flameGrad.addColorStop(0.3, '#3366ff'); // Classic gas blue
          flameGrad.addColorStop(0.7, '#80b3ff'); // Light high energy center
          flameGrad.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Dissipates

          ctx.fillStyle = flameGrad;
          ctx.beginPath();
          ctx.moveTo(fx - 4, burnerY);
          ctx.quadraticCurveTo(fx, burnerY - fHeight * 0.8, fx + 1, burnerY - fHeight);
          ctx.quadraticCurveTo(fx + 2, burnerY - fHeight * 0.4, fx + 4, burnerY);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Kettle Dimensions
      const kettleX = width / 2;
      const kettleY = stoveY - 28; // Elevated to leave a beautiful 28px gap above burner for the flame
      const kettleW = 140;
      const kettleH = 170;
      const kettleRadius = 15;

      // Draw elegant metal support brackets/prongs holding the kettle base elevated above stove
      ctx.fillStyle = '#444444';
      ctx.strokeStyle = '#252121';
      ctx.lineWidth = 1.5;
      
      // Left Support Prong
      ctx.beginPath();
      ctx.roundRect(kettleX - 52, stoveY - 28, 8, 28, 1.5);
      ctx.fill();
      ctx.stroke();

      // Right Support Prong
      ctx.beginPath();
      ctx.roundRect(kettleX + 44, stoveY - 28, 8, 28, 1.5);
      ctx.fill();
      ctx.stroke();

      // 3. WATER COLOR AND INGREDIENT INFLUENCE DYNAMICS
      // Standard water coordinates
      const maxWaterTopY = kettleY - kettleH * 0.78;
      const waterBottomY = kettleY - 5;
      const waterHeight = waterBottomY - maxWaterTopY;
      const waterTopY = waterBottomY - waterHeight * waterLevelRef.current;
      const waterLeftX = kettleX - kettleW / 2 + 5;
      const waterRightX = kettleX + kettleW / 2 - 5;

      const currentRecipe = recipeRef.current;
      const teaCount = currentRecipe.pushtiTea;
      const milkCount = currentRecipe.milkPowder;
      const lemonCount = currentRecipe.lemon;
      const cinnamonCount = currentRecipe.cinnamon;
      const gingerCount = currentRecipe.ginger;
      const mintCount = currentRecipe.mint;
      const cardamomCount = currentRecipe.cardamom;

      // Calculate base liquid color
      // Blend standard clear water with tea leaves (amber/red) and milk powder (milky cream)
      let liquidR = 210, liquidG = 230, liquidB = 250, liquidAlpha = 0.25; // Base clear water

      // If tea is added, gradually change color toward deep copper/amber
      if (teaCount > 0) {
        const teaRatio = Math.min(teaCount / 3, 1.2); // Cap color influence
        // Blend from clear-blue to rich reddish brown (139, 30, 15)
        liquidR = Math.round(liquidR * (1 - teaRatio) + 139 * teaRatio);
        liquidG = Math.round(liquidG * (1 - teaRatio) + 30 * teaRatio);
        liquidB = Math.round(liquidB * (1 - teaRatio) + 15 * teaRatio);
        liquidAlpha = 0.45 + (teaRatio * 0.25);
      }

      // If cinnamon is added, darken the infusion
      if (cinnamonCount > 0) {
        const cinnamonRatio = Math.min(cinnamonCount / 2, 0.8);
        liquidR = Math.round(liquidR * (1 - cinnamonRatio) + 100 * cinnamonRatio);
        liquidG = Math.round(liquidG * (1 - cinnamonRatio) + 50 * cinnamonRatio);
        liquidB = Math.round(liquidB * (1 - cinnamonRatio) + 20 * cinnamonRatio);
      }

      // If ginger is added, tint golden pale
      if (gingerCount > 0) {
        liquidR = Math.min(liquidR + gingerCount * 12, 255);
        liquidG = Math.min(liquidG + gingerCount * 8, 255);
      }

      // If lemon is added, slightly lighten or clarify the red tea liquor (classic chemical reaction!)
      if (lemonCount > 0 && milkCount === 0) {
        const lemonRatio = Math.min(lemonCount / 3, 0.8);
        liquidR = Math.round(liquidR * (1 - lemonRatio) + 230 * lemonRatio);
        liquidG = Math.round(liquidG * (1 - lemonRatio) + 170 * lemonRatio);
        liquidB = Math.round(liquidB * (1 - lemonRatio) + 60 * lemonRatio);
      }

      // If milk is added, blend heavily to cream color (245, 235, 215)
      if (milkCount > 0) {
        const milkRatio = Math.min(milkCount / 2.5, 0.95);
        liquidR = Math.round(liquidR * (1 - milkRatio) + 245 * milkRatio);
        liquidG = Math.round(liquidG * (1 - milkRatio) + 232 * milkRatio);
        liquidB = Math.round(liquidB * (1 - milkRatio) + 210 * milkRatio);
        liquidAlpha = 0.85 + (milkRatio * 0.15); // Opaque milky cream!
      }

      const liquidColor = `rgba(${liquidR}, ${liquidG}, ${liquidB}, ${liquidAlpha})`;

      // Draw the water volume inside the kettle
      ctx.save();
      // Create rounded clipping path for the water inside kettle glass boundaries
      ctx.beginPath();
      ctx.moveTo(kettleX - kettleW / 2 + 5, waterBottomY);
      ctx.lineTo(kettleX + kettleW / 2 - 5, waterBottomY);
      ctx.lineTo(kettleX + kettleW / 2 - 5, waterTopY);
      ctx.lineTo(kettleX - kettleW / 2 + 5, waterTopY);
      ctx.closePath();
      ctx.clip();

      // Liquid base fill
      ctx.fillStyle = liquidColor;
      ctx.fill();

      // Add soft bottom burner heat glow inside water
      if (isGasOn) {
        const waterGlow = ctx.createRadialGradient(kettleX, waterBottomY, 2, kettleX, waterBottomY, 40);
        waterGlow.addColorStop(0, 'rgba(255, 120, 30, 0.35)');
        waterGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = waterGlow;
        ctx.fillRect(kettleX - kettleW / 2, waterBottomY - 40, kettleW, 40);
      }

      // Draw dynamic water surface ripples
      const surfaceRippleCount = 5;
      ctx.strokeStyle = `rgba(${Math.min(liquidR + 30, 255)}, ${Math.min(liquidG + 30, 255)}, ${Math.min(liquidB + 30, 255)}, 0.4)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let j = 0; j <= surfaceRippleCount; j++) {
        const rx = waterLeftX + (j / surfaceRippleCount) * (waterRightX - waterLeftX);
        const ry = waterTopY + Math.sin(Date.now() * 0.005 + j * 1.5) * (temperature >= 80 ? 4 : 1.5);
        if (j === 0) {
          ctx.moveTo(rx, ry);
        } else {
          ctx.lineTo(rx, ry);
        }
      }
      ctx.stroke();

      // PARTICLE SIMULATION INSIDE KETTLE (bubbles, floating herbs, milk swirls)
      // Generate bubbles based on temperature
      if (temperature >= 40) {
        // Temperature thresholds dictate bubble spawn rates
        let spawnChance = 0.02;
        let pType: 'bubble' = 'bubble';
        if (temperature >= 60) spawnChance = 0.15;
        if (temperature >= 80) spawnChance = 0.45;
        if (temperature >= 95) spawnChance = 0.85;

        if (Math.random() < spawnChance) {
          const bSize = temperature >= 80 ? (2 + Math.random() * 8) : (1 + Math.random() * 3);
          const bubbleX = waterLeftX + 10 + Math.random() * (waterRightX - waterLeftX - 20);
          particles.push({
            x: bubbleX,
            y: waterBottomY - 5,
            vx: (Math.random() - 0.5) * (temperature >= 80 ? 2.5 : 0.5),
            vy: -((1 + Math.random() * 2) + (temperature - 40) * 0.05),
            size: bSize,
            color: milkCount > 0 ? 'rgba(255, 255, 255, 0.6)' : 'rgba(230, 245, 255, 0.4)',
            alpha: 0.3 + Math.random() * 0.4,
            life: 0,
            maxLife: 200,
            type: 'bubble'
          });
        }
      }

      // Handle particle dynamics
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        if (p.type === 'bubble') {
          // Accelerate bubble upwards
          p.x += p.vx;
          p.y += p.vy;
          p.vy -= 0.02; // gravity floating acceleration

          // Keep bubbles inside water boundary
          if (p.x < waterLeftX) p.x = waterLeftX + 2;
          if (p.x > waterRightX) p.x = waterRightX - 2;

          // Pop bubble when reaching water surface
          if (p.y <= waterTopY + 3) {
            // Spawn tiny steam particles when boiling hot bubble pops
            if (temperature >= 80 && Math.random() < 0.25) {
              p.type = 'steam';
              p.y = waterTopY - 5;
              p.vx = (Math.random() - 0.5) * 1.5;
              p.vy = -1.5 - Math.random() * 1.5;
              p.size = 3 + Math.random() * 5;
              p.maxLife = 40 + Math.random() * 30;
              p.alpha = 0.35;
              p.color = 'rgba(255, 255, 255, 0.3)';
            } else {
              particles.splice(i, 1);
              continue;
            }
          }

          // Render bubble
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();

          // Highlight dot
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x - p.size / 3, p.y - p.size / 3, p.size / 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'teaLeaf' || p.type === 'spice') {
          // Chaos-based convection and thermal turbulence to scatter particles across the full width
          const thermalTurbulence = Math.max(0, (temperature - 30) / 70); // 0 to 1
          
          // Random horizontal push to spread them out widely
          p.vx += (Math.random() - 0.5) * (0.12 + thermalTurbulence * 0.7);
          
          // Gentle vertical bobbing
          const bobForce = Math.sin((p.bobOffset || 0) + Date.now() * 0.002) * p.bobSpeed!;
          p.vy += bobForce;

          // If gas is ON and water is hot, add convective forces. Otherwise, let them settle to the bottom!
          const activeConvection = isGasOn && temperature >= 60;
          if (activeConvection) {
            // Unique temporal convection wave for each particle to rise and fall at different times
            const convectiveLift = (Math.sin(Date.now() * 0.0015 + p.bobOffset!) + 0.2) * thermalTurbulence * 0.55;
            p.vy -= convectiveLift;
          } else {
            // Sinking under gravity when gas is OFF
            p.vy += 0.12; // Accelerates sinking to the bottom
            p.vx *= 0.85; // Dampen horizontal movement quickly
          }

          // Apply velocity and drag
          p.vx *= 0.93;
          p.vy *= 0.93;

          p.x += p.vx;
          p.y += p.vy;

          if (p.bobOffset !== undefined) p.bobOffset += 0.02;

          // Keep strictly inside the water volume with soft bounces to prevent clumping on edges
          if (p.x < waterLeftX + 6) {
            p.x = waterLeftX + 6;
            p.vx *= -0.6;
          } else if (p.x > waterRightX - 6) {
            p.x = waterRightX - 6;
            p.vx *= -0.6;
          }

          if (p.y < waterTopY + 10) {
            p.y = waterTopY + 10;
            p.vy *= -0.4;
          } else if (p.y > waterBottomY - 6) {
            p.y = waterBottomY - 6;
            p.vy *= -0.4;
          }

          // Draw floating leaves/particles
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.bobOffset || 0) + p.x * 0.01);
          
          ctx.beginPath();
          if (p.type === 'teaLeaf') {
            // Leaf drawing
            ctx.ellipse(0, 0, p.size * 1.4, p.size * 0.7, 0, 0, Math.PI * 2);
          } else {
            // Stick cinnamon or seed cardamom
            ctx.roundRect(-p.size, -p.size/2, p.size * 2, p.size, 2);
          }
          ctx.fill();
          ctx.restore();
        }
      }

      // Render swirling cream clouds when milk powder is high
      if (milkCount > 0) {
        ctx.fillStyle = 'rgba(255, 252, 245, 0.08)';
        for (let s = 0; s < Math.min(milkCount * 3, 10); s++) {
          const swirlX = kettleX + Math.sin(Date.now() * 0.001 + s) * 35;
          const swirlY = waterTopY + 20 + s * 12;
          ctx.beginPath();
          ctx.arc(swirlX, swirlY, 20 + Math.sin(Date.now() * 0.002) * 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore(); // Unclip from water boundaries

      // 4. DRAW GLASS KETTLE FRAME ON TOP OF WATER
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 4.5;
      
      // Draw kettle body silhouette (bell shape)
      ctx.beginPath();
      // Bottom left
      ctx.moveTo(kettleX - kettleW / 2, kettleY);
      // Left glass wall straight up
      ctx.lineTo(kettleX - kettleW / 2, kettleY - kettleH * 0.85);
      // Top neck curving inward
      ctx.quadraticCurveTo(kettleX - kettleW / 2.8, kettleY - kettleH, kettleX - kettleW / 3, kettleY - kettleH);
      // Top lip
      ctx.lineTo(kettleX + kettleW / 3, kettleY - kettleH);
      // Right neck curving outward
      ctx.quadraticCurveTo(kettleX + kettleW / 2.8, kettleY - kettleH, kettleX + kettleW / 2, kettleY - kettleH * 0.85);
      // Right glass wall straight down
      ctx.lineTo(kettleX + kettleW / 2, kettleY);
      // Base flat connection
      ctx.closePath();
      ctx.stroke();

      // Draw glass reflections and metallic rim accents
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(kettleX - kettleW / 2 + 10, kettleY - 15);
      ctx.lineTo(kettleX - kettleW / 2 + 10, kettleY - kettleH * 0.75);
      ctx.stroke();

      // Kettle plastic black base and handle
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.roundRect(kettleX - kettleW / 2 - 4, kettleY - 4, kettleW + 8, 12, 3);
      ctx.fill();

      // Handle on the right side
      ctx.strokeStyle = '#c0a684'; // Contrasting bronze-gold handle
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(kettleX - kettleW / 2, kettleY - kettleH * 0.75);
      ctx.quadraticCurveTo(kettleX - kettleW / 2 - 45, kettleY - kettleH * 0.45, kettleX - kettleW / 2, kettleY - 20);
      ctx.stroke();

      // Add elegant champagne-gold metallic accent line inside handle
      ctx.strokeStyle = '#e5c9a7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(kettleX - kettleW / 2 - 2, kettleY - kettleH * 0.72);
      ctx.quadraticCurveTo(kettleX - kettleW / 2 - 41, kettleY - kettleH * 0.45, kettleX - kettleW / 2 - 2, kettleY - 22);
      ctx.stroke();

      // Lid on top
      ctx.fillStyle = '#222222';
      ctx.beginPath();
      ctx.roundRect(kettleX - kettleW / 3.5, kettleY - kettleH - 6, (kettleW / 3.5) * 2, 8, 2);
      ctx.fill();
      // Lid handle knob (Matching warm bronze-gold)
      ctx.fillStyle = '#c0a684';
      ctx.beginPath();
      ctx.roundRect(kettleX - 15, kettleY - kettleH - 12, 30, 8, 1.5);
      ctx.fill();

      // Kettle Volume Markings & measurement texts (Dynamic)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = 'bold 9px var(--font-mono)';
      ctx.textAlign = 'center';
      
      const lineLength = 10;
      const markX = kettleX + kettleW / 2.5;

      // 1.5L line
      ctx.fillRect(markX - lineLength, kettleY - kettleH * 0.70, lineLength, 1.5);
      ctx.fillText('1.5L MAX', markX - 32, kettleY - kettleH * 0.70 + 3);

      // 1.0L line
      ctx.fillRect(markX - lineLength, kettleY - kettleH * 0.48, lineLength, 1.5);
      ctx.fillText('1.0L', markX - 25, kettleY - kettleH * 0.48 + 3);

      // 0.5L line
      ctx.fillRect(markX - lineLength, kettleY - kettleH * 0.25, lineLength, 1.5);
      ctx.fillText('0.5L MIN', markX - 32, kettleY - kettleH * 0.25 + 3);


      // 5. EMIT STEAM PARTICLES AT KETTLE SPOUT (If water is steaming)
      if (temperature >= 70) {
        // Higher temperature -> denser, faster steam
        const steamLimit = Math.round((temperature - 70) / 30 * 2.5) + 1;
        if (Math.random() < 0.2) {
          for (let s = 0; s < steamLimit; s++) {
            particles.push({
              x: kettleX + (Math.random() - 0.5) * 15,
              y: kettleY - kettleH - 10,
              vx: (Math.random() - 0.45) * 1.2,
              vy: -1.2 - Math.random() * 1.8,
              size: 4 + Math.random() * 8,
              color: 'rgba(255, 255, 255, 0.22)',
              alpha: 0.15 + Math.random() * 0.2,
              life: 0,
              maxLife: 60 + Math.random() * 50,
              type: 'steam'
            });
          }
        }
      }

      // Simulate and draw steam particles (rising and expanding above kettle)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.type === 'steam') {
          p.x += p.vx;
          p.y += p.vy;
          p.size += 0.25; // Expands as it rises
          p.life++;

          // Smooth fadeout
          const progress = p.life / p.maxLife;
          p.alpha = Math.max(0, p.alpha * (1 - progress));

          if (progress >= 1.0) {
            particles.splice(i, 1);
            continue;
          }

          // Draw steam puff
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Continuous spawning of falling ingredient items based on tea list additions
      // We checks if ingredients list changed to trigger a visual splash
      if (teaCount > prevTeaCountRef.current) {
        // Spawn tea leaves falling in water
        const countToAdd = Math.round((teaCount - prevTeaCountRef.current) * 15);
        for (let l = 0; l < countToAdd; l++) {
          particles.push({
            x: waterLeftX + 15 + Math.random() * (waterRightX - waterLeftX - 30),
            y: waterTopY + 5,
            vx: (Math.random() - 0.5) * 0.8,
            vy: 0.8 + Math.random() * 1.5,
            size: 2.5 + Math.random() * 2,
            color: '#3d1607', // Dark black tea leaf particle
            alpha: 1.0,
            life: 0,
            maxLife: 9999,
            type: 'teaLeaf',
            bobSpeed: 0.01 + Math.random() * 0.02,
            bobOffset: Math.random() * Math.PI * 2
          });
        }
      }
      prevTeaCountRef.current = teaCount;

      if (mintCount > prevMintCountRef.current) {
        // Spawn fresh mint leaves floating on surface
        const countToAdd = Math.round((mintCount - prevMintCountRef.current) * 4);
        for (let l = 0; l < countToAdd; l++) {
          particles.push({
            x: waterLeftX + 20 + Math.random() * (waterRightX - waterLeftX - 40),
            y: waterTopY + 5,
            vx: (Math.random() - 0.5) * 0.5,
            vy: 0.4 + Math.random() * 0.8,
            size: 5 + Math.random() * 3,
            color: '#2e8540', // Fresh green leaf color
            alpha: 1.0,
            life: 0,
            maxLife: 9999,
            type: 'teaLeaf',
            bobSpeed: 0.005 + Math.random() * 0.01,
            bobOffset: Math.random() * Math.PI * 2
          });
        }
      }
      prevMintCountRef.current = mintCount;

      const currentSpiceCount = cinnamonCount + gingerCount + cardamomCount;
      if (currentSpiceCount > prevSpiceCountRef.current) {
        // Spawn spice chunks
        const countToAdd = Math.round((currentSpiceCount - prevSpiceCountRef.current) * 2);
        for (let l = 0; l < countToAdd; l++) {
          particles.push({
            x: waterLeftX + 20 + Math.random() * (waterRightX - waterLeftX - 40),
            y: waterTopY + 5,
            vx: (Math.random() - 0.5) * 0.5,
            vy: 1.2 + Math.random() * 1.5,
            size: 4 + Math.random() * 3,
            color: '#733c1d', // Cinnamon brown
            alpha: 1.0,
            life: 0,
            maxLife: 9999,
            type: 'spice',
            bobSpeed: 0.006 + Math.random() * 0.006,
            bobOffset: Math.random() * Math.PI * 2
          });
        }
      }
      prevSpiceCountRef.current = currentSpiceCount;

      requestRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isGasOn, flameLevel, temperature]);

  return (
    <div id="canvas-container" className="relative w-full h-[320px] md:h-[400px] flex items-center justify-center bg-radial from-crimson-900/40 to-transparent rounded-2xl overflow-hidden border border-crimson-800/20 shadow-inner">
      <div className="absolute inset-0 bg-radial from-amber-500/5 to-transparent pointer-events-none animate-pulse" />
      <canvas
        id="kettle-stage"
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor: 'pointer' }}
      />
    </div>
  );
};
