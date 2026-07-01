import { Ingredient } from './types';

export const INGREDIENTS: Ingredient[] = [
  {
    id: 'pushtiTea',
    nameBn: 'পুষ্টি চা',
    nameEn: 'Pushti Tea',
    unitBn: 'চা চামচ',
    unitEn: 'tsp',
    min: 0,
    max: 5,
    step: 0.5,
    defaultValue: 2,
    color: '#8b1e0f', // Rich amber/dark red tea color
    bubbleRate: 1.1,
    aromaWeight: 40,
    tasteProfile: 'Bold & Rich'
  },
  {
    id: 'milkPowder',
    nameBn: 'দুধ পাউডার',
    nameEn: 'Milk Powder',
    unitBn: 'চা চামচ',
    unitEn: 'tsp',
    min: 0,
    max: 4,
    step: 0.5,
    defaultValue: 0,
    color: '#fdfcf7', // Creamy white
    bubbleRate: 0.8,
    aromaWeight: 20,
    tasteProfile: 'Creamy'
  },
  {
    id: 'sugar',
    nameBn: 'চিনি',
    nameEn: 'Sugar',
    unitBn: 'চা চামচ',
    unitEn: 'tsp',
    min: 0,
    max: 4,
    step: 0.5,
    defaultValue: 1,
    color: '#ffffff', // Dissolves, clear
    bubbleRate: 1.0,
    aromaWeight: 5,
    tasteProfile: 'Sweet'
  },
  {
    id: 'lemon',
    nameBn: 'লেবু',
    nameEn: 'Lemon',
    unitBn: 'টুকরো',
    unitEn: 'slice',
    min: 0,
    max: 3,
    step: 1,
    defaultValue: 0,
    color: '#e2f45c', // Pale yellow-green tint
    bubbleRate: 1.2,
    aromaWeight: 15,
    tasteProfile: 'Citrus'
  },
  {
    id: 'mint',
    nameBn: 'পুদিনা পাতা',
    nameEn: 'Mint Leaf',
    unitBn: 'টি পাতা',
    unitEn: 'leaves',
    min: 0,
    max: 6,
    step: 1,
    defaultValue: 0,
    color: '#3ba43e', // Fresh green tint
    bubbleRate: 1.0,
    aromaWeight: 18,
    tasteProfile: 'Fresh Minty'
  },
  {
    id: 'cardamom',
    nameBn: 'এলাচ',
    nameEn: 'Cardamom',
    unitBn: 'টি',
    unitEn: 'pc',
    min: 0,
    max: 4,
    step: 1,
    defaultValue: 0,
    color: '#90a86d', // Greenish-brown oil shimmer
    bubbleRate: 1.0,
    aromaWeight: 25,
    tasteProfile: 'Aromatic'
  },
  {
    id: 'cinnamon',
    nameBn: 'দারুচিনি',
    nameEn: 'Cinnamon',
    unitBn: 'টুকরো',
    unitEn: 'stick',
    min: 0,
    max: 3,
    step: 1,
    defaultValue: 0,
    color: '#844d2d', // Woody reddish-brown
    bubbleRate: 0.9,
    aromaWeight: 22,
    tasteProfile: 'Warm Woody'
  },
  {
    id: 'ginger',
    nameBn: 'আদা',
    nameEn: 'Ginger',
    unitBn: 'টুকরো',
    unitEn: 'slice',
    min: 0,
    max: 4,
    step: 1,
    defaultValue: 0,
    color: '#e2cc95', // Ginger golden juice tint
    bubbleRate: 1.1,
    aromaWeight: 30,
    tasteProfile: 'Sharp Spicy'
  },
  {
    id: 'honey',
    nameBn: 'মধু',
    nameEn: 'Honey',
    unitBn: 'চা চামচ',
    unitEn: 'tsp',
    min: 0,
    max: 3,
    step: 0.5,
    defaultValue: 0,
    color: '#b77d20', // Clear amber amber
    bubbleRate: 0.9,
    aromaWeight: 10,
    tasteProfile: 'Sweet Amber'
  },
  {
    id: 'clove',
    nameBn: 'লবঙ্গ',
    nameEn: 'Clove',
    unitBn: 'টি',
    unitEn: 'pc',
    min: 0,
    max: 5,
    step: 1,
    defaultValue: 0,
    color: '#492a17', // Dark brown oil ripples
    bubbleRate: 1.0,
    aromaWeight: 20,
    tasteProfile: 'Pungent Spicy'
  }
];

export const DISTRICTS = [
  'Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh',
  'Comilla', 'Narayanganj', 'Gazipur', 'Bogra', 'Jessore', 'Cox\'s Bazar', 'Feni', 'Noakhali'
];
