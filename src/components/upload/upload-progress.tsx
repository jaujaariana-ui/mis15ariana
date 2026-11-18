'use client';

import { useState, useEffect, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

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
    <Card className="mb-6 shadow-sm border-0 ring-1 ring-gray-100">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">
            {allDone ? 'Subida completada' : 'Subiendo fotos...'}
          </span>
          <span className="text-sm text-gray-500">
            {completed}/{total}
          </span>
        </div>

        <Progress value={overallProgress} className="h-2 mb-4" />

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-gray-50"
            >
              <div className="w-12 h-12 rounded-md overflow-hidden shrink-0 bg-gray-200">
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {item.status === 'pending' && (
                    <span className="text-[10px] text-gray-400">Esperando...</span>
                  )}
                  {item.status === 'compressing' && (
                    <span className="text-[10px] text-purple-500">Comprimiendo...</span>
                  )}
                  {item.status === 'uploading' && (
                    <>
                      <Progress value={item.progress} className="h-1 w-16" />
                      <span className="text-[10px] text-blue-500">
                        {Math.round(item.progress)}%
                      </span>
                    </>
                  )}
                  {item.status === 'success' && (
                    <span className="text-[10px] text-green-600">✓ Subida</span>
                  )}
                  {item.status === 'error' && (
                    <span className="text-[10px] text-red-500">
                      {item.error || 'Error'}
                    </span>
                  )}
                </div>
              </div>

              {item.status === 'error' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs shrink-0"
                  onClick={() => onRetry(item.id)}
                >
                  Reintentar
                </Button>
              )}
            </div>
          ))}
        </div>

        {allDone && (
          <div className="mt-4 flex gap-2">
            {failed > 0 && (
              <Alert variant="destructive" className="flex-1">
                <AlertDescription className="text-xs">
                  {failed} foto(s) no se pudieron subir
                </AlertDescription>
              </Alert>
            )}
            <Button
              variant="outline"
              className="flex-1 text-sm"
              onClick={onComplete}
            >
              Cerrar
            </Button>
          </div>
        )}

        {onCancel && active > 0 && (
          <Button
            variant="ghost"
            className="w-full mt-2 text-sm"
            onClick={onCancel}
          >
            Cancelar subida
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
