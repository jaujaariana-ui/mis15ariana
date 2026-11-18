'use client';

import { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface SelectedFile {
  file: File;
  previewUrl: string;
}

interface FileSelectorProps {
  onSelect: (files: File[]) => void;
  onCancel: () => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
}

export function FileSelector({
  onSelect,
  onCancel,
  maxFiles = 10,
  maxSizeMB = 10,
  accept = 'image/*',
}: FileSelectorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    setError(null);

    const newFiles: SelectedFile[] = [];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check if we've reached the limit
      if (selectedFiles.length + newFiles.length >= maxFiles) {
        setError(`Puedes seleccionar hasta ${maxFiles} fotos`);
        break;
      }

      // Check file size
      if (file.size > maxSizeBytes) {
        setError(`"${file.name}" es demasiado grande (máx ${maxSizeMB} MB)`);
        continue;
      }

      // Check MIME type
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" no es una imagen válida`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      newFiles.push({ file, previewUrl });
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  }, [selectedFiles.length, maxFiles, maxSizeMB]);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => {
      prev[index].previewUrl && URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedFiles.length === 0) return;
    const files = selectedFiles.map((sf) => sf.file);
    // Clean up preview URLs
    selectedFiles.forEach((sf) => URL.revokeObjectURL(sf.previewUrl));
    onSelect(files);
  }, [selectedFiles, onSelect]);

  const handleCancel = useCallback(() => {
    selectedFiles.forEach((sf) => URL.revokeObjectURL(sf.previewUrl));
    onCancel();
  }, [selectedFiles, onCancel]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {selectedFiles.length === 0 ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <div className="text-4xl mb-2">📁</div>
          <p className="text-sm text-gray-600 mb-1">Toca para seleccionar fotos</p>
          <p className="text-xs text-gray-400">
            Hasta {maxFiles} fotos, máx {maxSizeMB} MB cada una
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
          {selectedFiles.map((sf, index) => (
            <div key={index} className="relative aspect-square group">
              <img
                src={sf.previewUrl}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {selectedFiles.length < maxFiles && (
            <div
              className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-400 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <span className="text-2xl text-gray-400">+</span>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex gap-2">
        {selectedFiles.length > 0 && (
          <>
            <Button onClick={handleSubmit} className="flex-1">
              Subir {selectedFiles.length} foto{selectedFiles.length !== 1 ? 's' : ''}
            </Button>
            <Button
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={selectedFiles.length >= maxFiles}
            >
              Añadir
            </Button>
          </>
        )}
      </div>

      <Button variant="ghost" onClick={handleCancel} className="w-full">
        Cancelar
      </Button>
    </div>
  );
}
