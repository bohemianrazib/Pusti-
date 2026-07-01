import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, CheckCircle, HelpCircle } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';

// Dynamically import all uploaded puzzle tiles
// @ts-ignore
const imageModules = import.meta.glob('/src/images/1-*.jpg', { eager: true, import: 'default' }) as Record<string, string>;

interface SlidingPuzzleProps {
  onSolve?: () => void;
  isCompletedExternal?: boolean;
}

// 3x4 Grid (12 total positions, 11 tiles + 1 empty space)
const COLS = 3;
const ROWS = 4;
const TILE_COUNT = COLS * ROWS; // 12

export const SlidingPuzzle: React.FC<SlidingPuzzleProps> = ({ onSolve, isCompletedExternal }) => {
  const [board, setBoard] = useState<number[]>([]);
  const [emptyIndex, setEmptyIndex] = useState<number>(11);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [moveCount, setMoveCount] = useState<number>(0);

  // Generate a solved board [0, 1, 2, ..., 11]
  const getSolvedBoard = (): number[] => {
    return Array.from({ length: TILE_COUNT }, (_, i) => i);
  };

  // Check if board is solved
  const checkIsSolved = (currentBoard: number[]): boolean => {
    for (let i = 0; i < TILE_COUNT; i++) {
      if (currentBoard[i] !== i) return false;
    }
    return true;
  };

  // Shuffle board by performing valid random slides starting from solved board
  const shuffleBoard = () => {
    let tempBoard = getSolvedBoard();
    let currentEmpty = 11; // Last position is empty
    const moves = 25; // number of random shuffles to guarantee solvability

    for (let i = 0; i < moves; i++) {
      // Find valid neighbor indices for currentEmpty
      const neighbors: number[] = [];
      const emptyRow = Math.floor(currentEmpty / COLS);
      const emptyCol = currentEmpty % COLS;

      // Up
      if (emptyRow > 0) neighbors.push(currentEmpty - COLS);
      // Down
      if (emptyRow < ROWS - 1) neighbors.push(currentEmpty + COLS);
      // Left
      if (emptyCol > 0) neighbors.push(currentEmpty - 1);
      // Right
      if (emptyCol < COLS - 1) neighbors.push(currentEmpty + 1);

      // Pick a random neighbor and swap
      const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
      tempBoard[currentEmpty] = tempBoard[randomNeighbor];
      tempBoard[randomNeighbor] = 11; // Move empty space there
      currentEmpty = randomNeighbor;
    }

    setBoard(tempBoard);
    setEmptyIndex(currentEmpty);
    setIsSolved(false);
    setMoveCount(0);
  };

  // On mount, shuffle
  useEffect(() => {
    shuffleBoard();
  }, []);

  // Handle tile click
  const handleTileClick = (index: number) => {
    if (isSolved) return;

    const row = Math.floor(index / COLS);
    const col = index % COLS;
    const emptyRow = Math.floor(emptyIndex / COLS);
    const emptyCol = emptyIndex % COLS;

    // Check if clicked tile is adjacent to empty tile
    const isAdjacent = 
      (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
      (Math.abs(col - emptyCol) === 1 && row === emptyRow);

    if (isAdjacent) {
      // Swap elements
      const nextBoard = [...board];
      nextBoard[emptyIndex] = board[index];
      nextBoard[index] = 11; // Set clicked index as empty

      setBoard(nextBoard);
      setEmptyIndex(index);
      setMoveCount(prev => prev + 1);
      audioEngine.playSpoonClink(); // satisfying click noise

      // Check if solved
      if (checkIsSolved(nextBoard)) {
        setIsSolved(true);
        if (onSolve) onSolve();
      }
    }
  };

  // Helper to render the beautiful Pushti Tea packet inside tile
  const renderPushtiPacketSubSection = (tileId: number) => {
    // Construct exact expected image path key (e.g. '/src/images/1-01.jpg')
    const padNum = (tileId + 1).toString().padStart(2, '0');
    const imageKey = `/src/images/1-${padNum}.jpg`;
    const uploadedImageUrl = imageModules[imageKey];

    if (uploadedImageUrl) {
      return (
        <div className="absolute inset-0 bg-[#110a06] flex items-center justify-center rounded-xs overflow-hidden">
          <img 
            src={uploadedImageUrl} 
            alt={`Pushti Tile ${padNum}`} 
            className="w-full h-full object-cover select-none"
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }

    // Determine target col and row for this tileId (solved state) for fallback
    const targetCol = tileId % COLS;
    const targetRow = Math.floor(tileId / COLS);

    return (
      <div className="absolute inset-0 overflow-hidden rounded-xs">
        {/* Full Packet Card Layout, scaled and translated */}
        <div 
          className="absolute bg-gradient-to-br from-[#8b1e0f] via-[#c2410c] to-[#781206] text-white border-2 border-gold-400 p-4 flex flex-col justify-between"
          style={{
            width: `${COLS * 100}%`,
            height: `${ROWS * 100}%`,
            left: `-${targetCol * 100}%`,
            top: `-${targetRow * 100}%`,
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-yellow-300 font-mono tracking-widest uppercase">Premium</span>
            <span className="text-[9px] bg-yellow-400 text-black font-extrabold px-1.5 py-0.5 rounded-sm">খাঁটি লিকার</span>
          </div>

          {/* Main Brand Name */}
          <div className="text-center my-auto flex flex-col items-center justify-center">
            <div className="text-yellow-400 text-xs font-mono tracking-[4px] font-black">PUSHTI</div>
            <div className="text-2xl font-extrabold text-white tracking-wider font-display drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              পুষ্টি চা
            </div>
            <div className="text-[10px] text-gray-200 font-mono tracking-wide mt-1">BLACK TEA</div>
          </div>

          {/* Illustrative details */}
          <div className="flex justify-between items-end border-t border-yellow-500/30 pt-2">
            <div className="flex flex-col">
              <span className="text-[9px] text-yellow-200">সিলেটের সুগন্ধি</span>
              <span className="text-[7px] text-gray-300">১০০% প্রাকৃতিক পাতা</span>
            </div>
            <div className="w-6 h-6 rounded-full bg-yellow-400/20 border border-yellow-400 flex items-center justify-center text-yellow-400 font-bold text-[8px]">
              👑
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="sliding-puzzle-wrapper" className="bg-[#1b120c] border border-gold-500/20 rounded-md p-4 max-w-sm mx-auto shadow-2xl flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-3">
        <div>
          <h4 className="text-sm font-display font-bold text-gold-400">পুষ্টি চা স্লাইড পাজেল 🧩</h4>
          <p className="text-[10px] text-gray-400">চা ফোটার সময় টুকরোগুলো মিলিয়ে প্যাকেট তৈরি করুন!</p>
        </div>
        <button
          onClick={shuffleBoard}
          className="p-1.5 bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 rounded-sm transition-all"
          title="রি-শাফেল করুন"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Stats row */}
      <div className="w-full flex justify-between text-[11px] text-gray-400 mb-3 bg-[#110a06] py-1 px-3 rounded-sm border border-[#2b1b11]">
        <span>মুভ সংখ্যা: <strong className="text-gold-400 font-mono">{moveCount}</strong></span>
        {isSolved ? (
          <span className="text-green-400 font-bold flex items-center gap-1">🧩 সম্পন্ন হয়েছে!</span>
        ) : (
          <span>পাশের ঘরে ক্লিক করুন</span>
        )}
      </div>

      {/* Grid Canvas */}
      <div className="grid grid-cols-3 gap-1.5 bg-[#110a06] p-2 rounded-md border-2 border-gold-500/20 w-[240px] h-[320px]">
        {board.map((tileId, index) => {
          const isEmpty = tileId === 11;
          const isCorrectPosition = tileId === index;

          return (
            <div
              key={index}
              onClick={() => handleTileClick(index)}
              className={`relative rounded-xs cursor-pointer overflow-hidden select-none transition-all duration-150 ${
                isEmpty 
                  ? 'bg-[#110a06] border border-[#2b1b11]' 
                  : isCorrectPosition
                  ? 'border border-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.15)]'
                  : 'border border-gold-500/15 hover:border-gold-400/40'
              }`}
              style={{
                aspectRatio: '1/1',
              }}
            >
              {!isEmpty && renderPushtiPacketSubSection(tileId)}
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      <div className="mt-3 flex gap-1.5 items-start text-[10px] text-gray-400 max-w-[240px]">
        <HelpCircle className="w-3.5 h-3.5 text-gold-500 shrink-0 mt-0.5" />
        <span>খালি ঘরের সাথে লাগানো যেকোনো টুকরোতে ক্লিক করলে সেটি খালি ঘরে সরে যাবে। মোট ১১টি টুকরো মিলিয়ে প্যাকেটটি সম্পন্ন করুন।</span>
      </div>
    </div>
  );
};
