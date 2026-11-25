import React from 'react';
import type { PublicUser } from '../types';

interface NavbarProps {
  user: PublicUser | null;
  activeView: 'home' | 'cabinet';
  onNavigateHome: (sectionId?: string) => void;
  onOpenAuth: () => void;
  onOpenCabinet: () => void;
}

export const LOGO_PATH = '/assets/aistudio/photo_2026-11-05_16-27-54_7713e334.jpg';

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeView,
  onNavigateHome,
  onOpenAuth,
  onOpenCabinet,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand mark */}
        <button
          type="button"
          onClick={() => onNavigateHome()}
          className="flex items-center gap-3 text-left whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057FF] rounded-lg"
        >
          <img
            src={LOGO_PATH}
            alt="Meta IT School logotipi"
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
          />
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            Meta IT School
          </span>
        </button>

        {/* Zone 2: 5 clean single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onNavigateHome('hero')}
            className="hover:text-[#0057FF] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Bosh sahifa
          </button>
          <button
            type="button"
            onClick={() => onNavigateHome('courses')}
            className="hover:text-[#0057FF] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Yo'nalishlar
          </button>
          <button
            type="button"
            onClick={() => onNavigateHome('register')}
            className="hover:text-[#0057FF] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Ro'yxatdan o'tish
          </button>
          <button
            type="button"
            onClick={() => onNavigateHome('location')}
            className="hover:text-[#0057FF] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Manzil
          </button>
          <button
            type="button"
            onClick={() => onNavigateHome('portals')}
            className="hover:text-[#0057FF] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Kabinetlar
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          {user ? (
            <button
              type="button"
              onClick={activeView === 'cabinet' ? () => onNavigateHome('hero') : onOpenCabinet}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0057FF] hover:bg-[#0044CC] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {activeView === 'cabinet' ? 'Bosh sahifa' : 'Kabinetim'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0057FF] hover:bg-[#0044CC] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Kabinetga kirish
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
