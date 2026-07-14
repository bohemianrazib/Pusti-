import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { db } from './src/db';
import { RecipeState, ScoreBreakdown, TeaPersonality } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log('Gemini API successfully initialized for server-side tea descriptions.');
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI. Falling back to local descriptions.', err);
  }
} else {
  console.log('GEMINI_API_KEY environment variable is not defined. Server will use local ruleset.');
}

// --- API ENDPOINTS ---

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. User Register & Login with SMS OTP simulation
app.post('/api/auth/login-register', (req, res) => {
  const { name, phone, district, referralCode } = req.body;

  if (!name || !phone || !district) {
    return res.status(400).json({ error: 'Name, Phone, and District are required.' });
  }

  try {
    const user = db.getOrCreateUser(name, phone, district, referralCode);
    res.json({
      success: true,
      user,
      message: 'Logged in successfully!'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

// 3. Simulated OTP Request
app.post('/api/auth/send-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }
  // Generate a random 6-digit pin
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`[SIMULATED OTP] SMS to ${phone}: Your PUSHTI TEA OTP is ${code}`);
  res.json({
    success: true,
    message: 'OTP Sent successfully!',
    code // Return it so client can auto-fill or simulate it beautifully
  });
});

// 4. Recipe Analyzer & AI Scorer
app.post('/api/recipes/analyze', async (req, res) => {
  const { userId, recipe, temperature, brewingTime, discount } = req.body as {
    userId: string;
    recipe: RecipeState;
    temperature: number;
    brewingTime: number;
    discount?: number;
  };

  if (!userId || !recipe) {
    return res.status(400).json({ error: 'User ID and recipe are required.' });
  }

  try {
    // --- SCORE CALCULATIONS ---
    const { pushtiTea, milkPowder, sugar, lemon, mint, cardamom, cinnamon, ginger, honey, clove } = recipe;

    // Taste Score (based on ratios of core components)
    // Pushti Tea is the foundation of flavor. Ideal Pushti Tea is 1.5 to 2.5 spoonfuls.
    let taste = 100;
    const teaDiff = Math.abs(pushtiTea - 2.0);
    taste -= teaDiff * 25; // deducts up to 50 for bad tea ratio

    // Milk vs Lemon compatibility. Adding both ruins the tea (curdling)!
    if (milkPowder > 0 && lemon > 0) {
      taste -= 60; // Huge deduction for curdled tea
    }

    // Sugar & honey levels: sweet, but not too sweet (ideal is 1-2 sweet units total)
    const sweetness = sugar + (honey * 1.5);
    if (sweetness > 3) {
      taste -= (sweetness - 3) * 15;
    } else if (sweetness === 0 && milkPowder > 0) {
      taste -= 15; // Unsweetened milk tea feels incomplete
    }

    // Aroma Score (spices & mint + hot steam activation)
    let aroma = 40; // Base aroma
    if (temperature >= 80) aroma += 20; // Heat releases essential oils
    if (temperature >= 95) aroma += 10; // Steam carries scent
    
    // Spices add aroma
    const spiceCount = cardamom + cinnamon + ginger + clove;
    if (spiceCount > 0 && spiceCount <= 4) {
      aroma += spiceCount * 8; // Good complexity
    } else if (spiceCount > 4) {
      aroma += 20 - (spiceCount - 4) * 10; // Over-spiced penalty
    }
    if (mint > 0) aroma += Math.min(mint * 5, 10);

    // Color Score (brewing time + tea leaves + milk powder)
    let color = 50;
    // Over or under brewing diminishes color rating
    if (brewingTime < 120) {
      color -= (120 - brewingTime) * 0.3; // Under-brewed
    } else if (brewingTime > 240) {
      color -= (brewingTime - 240) * 0.2; // Over-brewed
    }

    // Tea leaf amount changes density
    if (pushtiTea === 0) {
      color = 10; // Clear water
    } else {
      const colorMultiplier = Math.min(pushtiTea / 2.0, 1.5);
      color = Math.round(color * colorMultiplier);
    }

    // Milk powder lightens color to creamy golden
    if (milkPowder > 0) {
      color = Math.min(color + 10, 95); // Creates a beautiful white-brown milky blend
    }
    color = Math.min(Math.max(color, 10), 100);

    // Balance Score (harmony and lack of overwhelming single tastes)
    let balance = 100;
    const totalIngredients = Object.values(recipe).reduce((a, b) => a + b, 0);
    if (totalIngredients > 12) {
      balance -= (totalIngredients - 12) * 8; // Too cluttered
    }
    if (pushtiTea === 0) {
      balance = 10; // Not tea at all!
    }

    // Cap scores safely between 20 and 100
    const sanitize = (val: number) => Math.min(Math.max(Math.round(val), 20), 100);
    
    const finalTaste = sanitize(taste);
    const finalAroma = sanitize(aroma);
    const finalColor = sanitize(color);
    const finalBalance = sanitize(balance);

    const total = Math.round((finalTaste * 0.35) + (finalAroma * 0.25) + (finalColor * 0.20) + (finalBalance * 0.20));

    const breakdown: ScoreBreakdown = {
      taste: finalTaste,
      aroma: finalAroma,
      color: finalColor,
      balance: finalBalance,
      total
    };

    // --- DECIDE PERSONALITY ---
    let personality: TeaPersonality;

    if (milkPowder >= 2 && sugar >= 1.5) {
      personality = {
        titleBn: 'দুধ চায়ের জাদুকর',
        titleEn: 'Milk Tea Artist',
        descriptionBn: 'আপনি ঘন দুধ আর মিষ্টি দিয়ে কড়া স্বাদের রাজকীয় চা বানাতে ভালোবাসেন! আপনার চা মনকে প্রশান্ত করে এবং সারাদিনের ক্লান্তি নিমেষেই দূর করে।',
        descriptionEn: 'You love crafting rich, creamy, and sweet milk tea! Your creation brings ultimate comfort and instantly washes away the day\'s fatigue.',
        badge: 'Milk Tea Artist Badge',
        tagline: 'রাজকীয় তৃপ্তি!'
      };
    } else if (recipe.ginger >= 1 || recipe.cardamom >= 1 || recipe.cinnamon >= 1) {
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

    // --- OPTIONAL GEMINI COMMENTARY ---
    let aiCommentary = '';
    if (ai) {
      try {
        const ingredientsText = Object.entries(recipe)
          .filter(([_, val]) => val > 0)
          .map(([name, val]) => `${name}: ${val} units`)
          .join(', ');

        const prompt = `You are a world-class tea chef representing 'PUSHTI TEA'.
Evaluate this brewed tea recipe:
- Pushti Tea: ${recipe.pushtiTea} spoons (Main Ingredient)
- Other ingredients: ${ingredientsText}
- Brewing temperature: ${temperature}°C
- Brewing time: ${brewingTime} seconds
- Evaluated Score: ${total}/100
- Personality Class: ${personality.titleEn}

Write a short, engaging, highly positive evaluation comment (2 sentences maximum) in fluent Bengali.
Praise the user for choosing PUSHTI TEA and connect their personality with PUSHTI TEA's promise of 'Your Tea, Your Perfection' (আপনার চা, আপনার পারফেকশন).
Return only the raw Bengali text. Do not add any conversational English or markdown.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
        });

        if (response.text) {
          aiCommentary = response.text.trim();
        }
      } catch (err) {
        console.error('Gemini content generation failed, continuing with ruleset.', err);
      }
    }

    // If Gemini commentary failed or key was missing, use a beautiful fallback based on score
    if (!aiCommentary) {
      if (total >= 90) {
        aiCommentary = `চমৎকার চা বানিয়েছেন! পুষ্টি চায়ের সাথে আপনার এই নিখুঁত মেলবন্ধন প্রমাণ করে আপনি একজন প্রকৃত টি-মাস্টার। আপনার চা, আপনার পারফেকশন!`;
      } else if (total >= 75) {
        aiCommentary = `অসাধারণ স্বাদ ও সুগন্ধের এক অতুলনীয় কাপ! পুষ্টি চায়ের আসল লিকার আপনার চায়ের স্বাদকে করেছে অত্যন্ত লোভনীয় ও সতেজ।`;
      } else {
        aiCommentary = `আপনার চায়ের স্বাদ বেশ চমৎকার হয়েছে! পরবর্তী কাপে তাপমাত্রা আরেকটু বাড়িয়ে আরও বেশি পারফেকশন অর্জন করতে পারেন।`;
      }
    }

    // Attach aiCommentary to the personality description
    personality.descriptionBn = `${personality.descriptionBn}\n\n🤖 পিউরিফাইড এআই রেটিং:\n"${aiCommentary}"`;

    // Save session details to the file database
    const sessionRecord = db.addSession(userId, recipe, temperature, brewingTime, breakdown, personality, discount);

    res.json({
      success: true,
      session: sessionRecord
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

// 5. Get Leaderboard (with district metrics and filters)
app.get('/api/leaderboard', (req, res) => {
  try {
    const list = db.getLeaderboard(50);
    res.json({
      success: true,
      leaderboard: list
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Get Admin Analytics
app.get('/api/admin/analytics', (req, res) => {
  try {
    const stats = db.getAdminStats();
    res.json({
      success: true,
      stats
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Get Recent Sessions for Admin
app.get('/api/admin/sessions', (req, res) => {
  try {
    const sessions = db.getSessions().slice(-20).reverse(); // latest 20
    res.json({
      success: true,
      sessions
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- VITE AND STATIC FILE SERVING MIDDLEWARE ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Running in Development mode with Vite middleware.');
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Running in Production static serving mode.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server successfully started on http://localhost:${PORT}`);
  });
}

startServer();
