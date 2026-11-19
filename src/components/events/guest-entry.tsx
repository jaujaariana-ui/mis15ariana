'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface GuestEntryProps {
  displayName: string;
  setDisplayName: (name: string) => void;
  onJoin: () => void;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}

export default function GuestEntry({
  displayName,
  setDisplayName,
  onJoin,
  loading,
  error,
  setError,
}: GuestEntryProps) {
  return (
    <div className="glass rounded-2xl p-5 sm:p-6 mb-6">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 mb-3">
          <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h2 className="font-playfair text-lg sm:text-xl font-semibold text-slate-800 mb-1">
          Únete a la galería
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Ingresa tu nombre para compartir y explorar fotos
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 bg-red-50/80 border border-red-100 text-red-600 text-xs rounded-xl p-3 flex items-center justify-between animate-fade-in-up">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 ml-2 shrink-0"
            aria-label="Cerrar mensaje de error"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Input form */}
      <div className="flex gap-2 max-w-sm mx-auto">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <Input
            placeholder="Tu nombre o apodo"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && onJoin()}
            maxLength={30}
            className="premium-input pl-10"
            autoFocus
          />
        </div>
        <button
          onClick={onJoin}
          disabled={!displayName.trim() || loading}
          className="premium-btn px-5 py-3 text-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span className="hidden sm:inline">Entrar</span>
              <span className="sm:hidden">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
