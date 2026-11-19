'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PhotoUploadItem {
  id: string;
  name: string;
  previewUrl: string;
  status: 'pending' | 'compressing' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface UploadProgressProps {
  items: PhotoUploadItem[];
  onRetry: (id: string) => void;
  onComplete: () => void;
  onCancel?: () => void;
}

export function UploadProgress({ items, onRetry, onComplete, onCancel }: UploadProgressProps) {
  const [dismissed, setDismissed] = useState(false);

  const total = items.length;
  const completed = items.filter((i) => i.status === 'success').length;
  const failed = items.filter((i) => i.status === 'error').length;
  const active = items.filter(
    (i) => i.status === 'pending' || i.status === 'compressing' || i.status === 'uploading'
  ).length;
  const overallProgress = total > 0 ? ((completed + failed) / total) * 100 : 0;

  const allDone = active === 0;

  return (
    <div className="glass rounded-2xl p-4 mb-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${allDone ? 'bg-emerald-400' : 'bg-blue-400 animate-pulse'}`} />
            <span className="text-sm font-medium text-slate-700">
              {allDone ? 'Subida completada' : 'Subiendo fotos...'}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {completed}/{total}
          </span>
        </div>

        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-slate-400 to-slate-600 rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/80"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-200">
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-600 truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {item.status === 'pending' && (
                    <span className="text-[10px] text-slate-400">Esperando...</span>
                  )}
                  {item.status === 'compressing' && (
                    <span className="text-[10px] text-slate-500">Comprimiendo...</span>
                  )}
                  {item.status === 'uploading' && (
                    <>
                      <div className="h-1 w-16 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-400 rounded-full transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {Math.round(item.progress)}%
                      </span>
                    </>
                  )}
                  {item.status === 'success' && (
                    <span className="text-[10px] text-emerald-600 font-medium">✓ Completada</span>
                  )}
                  {item.status === 'error' && (
                    <span className="text-[10px] text-red-500">
                      {item.error || 'Error'}
                    </span>
                  )}
                </div>
              </div>

              {item.status === 'error' && (
                <button
                  className="h-6 px-2.5 text-xs shrink-0 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
                  onClick={() => onRetry(item.id)}
                >
                  Reintentar
                </button>
              )}
            </div>
          ))}
        </div>

        {allDone && (
          <div className="mt-4 flex gap-2">
            {failed > 0 && (
              <div className="flex-1 bg-red-50/80 border border-red-100 rounded-xl px-3 py-2">
                <p className="text-xs text-red-600">
                  {failed} foto(s) no se pudieron subir
                </p>
              </div>
            )}
            <button
              className="premium-btn-secondary flex-1 py-2 text-sm"
              onClick={onComplete}
            >
              Cerrar
            </button>
          </div>
        )}

        {onCancel && active > 0 && (
          <button
            className="w-full mt-2 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
            onClick={onCancel}
          >
            Cancelar subida
          </button>
        )}
      </div>
  );
}
