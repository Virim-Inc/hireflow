import { useState, useCallback, useRef } from 'react';

export interface UploadState {
  isDragging: boolean;
  file: File | null;
  preview: string | null;
  error: string | null;
}

const ACCEPTED = ['application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'];

export function useFileUpload(onFile: (file: File) => void) {
  const [state, setState] = useState<UploadState>({
    isDragging: false, file: null, preview: null, error: null,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!ACCEPTED.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt)$/i)) {
      setState(p => ({ ...p, error: 'Please upload a PDF, DOC, DOCX, or TXT file', isDragging: false }));
      return;
    }
    setState(p => ({ ...p, file, preview: file.name, error: null, isDragging: false }));
    onFile(file);
  }, [onFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState(p => ({ ...p, isDragging: true }));
  }, []);

  const onDragLeave = useCallback(() => {
    setState(p => ({ ...p, isDragging: false }));
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const clear = useCallback(() => {
    setState({ isDragging: false, file: null, preview: null, error: null });
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  return { state, inputRef, onDragOver, onDragLeave, onDrop, onInputChange, clear };
}
