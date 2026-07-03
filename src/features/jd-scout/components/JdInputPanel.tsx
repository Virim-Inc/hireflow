import { UploadCloud, FileText, X, Loader2 } from 'lucide-react';
import { useFileUpload } from '../hooks/useFileUpload';
import { JdFormEditor } from './JdFormEditor';
import type { JdFormData } from '../types/jd-scout.types';

interface JdInputPanelProps {
  mode: 'form' | 'upload';
  onModeChange: (m: 'form' | 'upload') => void;
  jdData: JdFormData;
  onChange: (u: Partial<JdFormData>) => void;
  onAddSkill: (s: string) => void;
  onRemoveSkill: (s: string) => void;
  onScout: () => void;
  isSearching: boolean;
  onFileUpload: (f: File) => void;
  parseLoading: boolean;
  uploadedFile: File | null;
}

export function JdInputPanel({
  mode, onModeChange, jdData, onChange, onAddSkill, onRemoveSkill,
  onScout, isSearching, onFileUpload, parseLoading, uploadedFile,
}: JdInputPanelProps) {
  const { state: uploadState, inputRef, onDragOver, onDragLeave, onDrop, onInputChange, clear } = useFileUpload(onFileUpload);

  return (
    <div className="jd-panel">
      {/* Panel header */}
      <div className="jd-panel-header">
        <h2 className="jd-panel-title">
          <span className="jd-panel-icon">📋</span>
          Job Description
        </h2>
        {/* Mode toggle */}
        <div className="jd-mode-toggle">
          <button
            id="jd-mode-form"
            className={`jd-mode-btn ${mode === 'form' ? 'jd-mode-btn--active' : ''}`}
            onClick={() => onModeChange('form')}
          >
            Fill Form
          </button>
          <button
            id="jd-mode-upload"
            className={`jd-mode-btn ${mode === 'upload' ? 'jd-mode-btn--active' : ''}`}
            onClick={() => onModeChange('upload')}
          >
            Upload JD
          </button>
        </div>
      </div>

      {/* Upload zone */}
      {mode === 'upload' && (
        <div className="jd-upload-section">
          {!uploadedFile ? (
            <div
              className={`jd-dropzone ${uploadState.isDragging ? 'jd-dropzone--drag' : ''}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              id="jd-dropzone"
              aria-label="Drop JD file here"
              onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="jd-file-input" onChange={onInputChange} id="jd-file-input" />
              <div className="jd-dropzone-content">
                <UploadCloud size={40} className="jd-upload-icon" />
                <p className="jd-dropzone-title">Drop your JD file here</p>
                <p className="jd-dropzone-sub">PDF, DOC, DOCX, or TXT · Click to browse</p>
              </div>
            </div>
          ) : (
            <div className="jd-file-preview">
              <FileText size={20} className="jd-file-icon" />
              <span className="jd-file-name">{uploadedFile.name}</span>
              {parseLoading && <Loader2 size={16} className="jd-parse-spin" />}
              {parseLoading && <span className="jd-parse-label">Parsing with AI…</span>}
              {!parseLoading && <span className="jd-parse-done">✓ Parsed</span>}
              <button type="button" id="jd-clear-file" className="jd-clear-btn" onClick={clear} aria-label="Remove file"><X size={14} /></button>
            </div>
          )}
          {uploadState.error && <p className="jd-upload-error">{uploadState.error}</p>}
          {/* After parse, also show the form below pre-filled */}
          {uploadedFile && !parseLoading && (
            <div className="jd-upload-form-hint">
              <p className="jd-hint-text">✨ JD parsed! Review and edit below, then scout.</p>
            </div>
          )}
        </div>
      )}

      {/* Form (always shown unless upload mode with no file yet) */}
      {(mode === 'form' || (mode === 'upload' && uploadedFile && !parseLoading)) && (
        <JdFormEditor
          data={jdData}
          onChange={onChange}
          onAddSkill={onAddSkill}
          onRemoveSkill={onRemoveSkill}
          onScout={onScout}
          isSearching={isSearching}
        />
      )}
    </div>
  );
}
