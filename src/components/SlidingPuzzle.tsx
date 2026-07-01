import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, CheckCircle, HelpCircle } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';

// Dynamically import all uploaded puzzle tiles
// @ts-ignore
const imageModules = import.meta.glob('../images/1-*.jpg', { eager: true, import: 'default' }) as Record<string, string>;

// @ts-ignore
import fullPacketUrl from '../images/Full Packet.jpeg';

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
    // Construct exact expected image path key (e.g. '../images/1-01.jpg')
    const padNum = (tileId + 1).toString().padStart(2, '0');
    const imageKey = `../images/1-${padNum}.jpg`;
    const uploadedImageUrl = imageModules[imageKey];

    if (uploadedImageUrl) {
      return (
        <div className="absolute inset-0 bg-[#110a06] flex items-center justify-center rounded-xs overflow-hidden w-full h-full">
          <img 
            src={uploadedImageUrl} 
            alt={`Pushti Tile ${padNum}`} 
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            className="select-none"
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }

    // Determine target col and row for this tileId (solved state) for fallback
    const targetCol = tileId % COLS;
    const targetRow = Math.floor(tileId / COLS);

    return (
      <div className="absolute inset-0 overflow-hidden rounded-xs w-full h-full">
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
    <div id="sliding-puzzle-wrapper" className="bg-[#1b120c] border border-gold-500/20 rounded-md p-4 max-w-2xl mx-auto shadow-2xl flex flex-col items-center">
      {/* Title */}
      <div className="w-full flex justify-between items-center mb-4 pb-2 border-b border-[#3d2b1f]/60">
        <div>
          <h4 className="text-sm font-display font-bold text-gold-400">পুষ্টি চা স্লাইড পাজেল 🧩</h4>
          <p className="text-[10px] text-gray-400">চা ফোটার সময় টুকরোগুলো মিলিয়ে প্যাকেট তৈরি করুন!</p>
        </div>
        <button
          onClick={shuffleBoard}
          className="p-1.5 bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 rounded-sm transition-all flex items-center gap-1 text-[10px] font-medium"
          title="রি-শাফেল করুন"
        >
          <RefreshCw className="w-3.5 h-3.5" /> শাফেল
        </button>
      </div>

      {/* Main Grid + Target side-by-side flex layout */}
      <div className="flex flex-col md:flex-row gap-5 items-center md:items-start justify-center w-full">
        {/* Left block: Stats & Puzzle Grid */}
        <div className="flex flex-col items-center">
          {/* Stats row */}
          <div className="w-[240px] flex justify-between text-[11px] text-gray-400 mb-2.5 bg-[#110a06] py-1 px-3 rounded-sm border border-[#2b1b11]">
            <span>মুভ সংখ্যা: <strong className="text-gold-400 font-mono">{moveCount}</strong></span>
            {isSolved ? (
              <span className="text-green-400 font-bold flex items-center gap-1">🧩 সম্পন্ন হয়েছে!</span>
            ) : (
              <span>স্লাইড করুন</span>
            )}
          </div>

          {/* Grid Canvas */}
          <div className="grid grid-cols-3 gap-1.5 bg-[#110a06] p-2 rounded-md border-2 border-gold-500/20 w-[240px] h-[320px] shadow-inner">
            {board.map((tileId, index) => {
              const isEmpty = tileId === 11;
              const isCorrectPosition = tileId === index;

              return (
                <div
                  key={index}
                  onClick={() => handleTileClick(index)}
                  className={`relative rounded-xs cursor-pointer overflow-hidden select-none transition-all duration-150 w-full h-full ${
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
        </div>

        {/* Right block: Target reference image */}
        <div className="flex flex-col items-center md:items-start bg-[#110a06]/80 border border-[#2b1b11] p-3 rounded-md w-[200px] text-center md:text-left shadow-lg">
          <span className="text-[11px] font-bold text-gold-400 mb-2 block uppercase tracking-wider">টার্গেট প্যাকেট (Target)</span>
          <div className="w-[140px] h-[186px] rounded-sm overflow-hidden border border-gold-500/20 bg-black/40 flex items-center justify-center mx-auto md:mx-0 shadow-md">
            <img 
              src={fullPacketUrl} 
              alt="Pushti Tea Full Packet" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              className="select-none"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-2.5 leading-snug">
            এই প্যাকেটটির সাথে মিলিয়ে উপরে ১১টি ছবির টুকরো সঠিক জায়গায় সাজান।
          </p>
        </div>
      </div>

      {/* Instructions footer */}
      <div className="mt-4 flex gap-2 items-start text-[10px] text-gray-400 max-w-md w-full border-t border-[#3d2b1f]/40 pt-3">
        <HelpCircle className="w-3.5 h-3.5 text-gold-500 shrink-0 mt-0.5" />
        <span>খালি ঘরের চারপাশের যেকোনো টুকরোতে ক্লিক করলে তা খালি ঘরে চলে যাবে। প্যাকেটটি সম্পন্ন হলে কাস্টমারকে পরিবেশন করতে পারবেন!</span>
      </div>
    </div>
  );
};
