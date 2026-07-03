import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useJdScout } from '../hooks/useJdScout';
import { JdInputPanel } from './JdInputPanel';
import { ScoutResultsPanel } from './ScoutResultsPanel';
import { Telescope, RotateCcw } from 'lucide-react';
import '../styles/jd-scout.css';

export function JdScoutPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    jdData, updateJd, addSkill, removeSkill,
    results, status, uploadMode, setUploadMode,
    uploadedFile, handleFileUpload, parseLoading,
    scout, reset,
  } = useJdScout();

  useEffect(() => {
    const tl = gsap.timeline();
    if (headerRef.current)
      tl.fromTo(headerRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' });
    if (contentRef.current)
      tl.fromTo(contentRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.3');
  }, []);

  return (
    <div className="jd-scout-page">
      {/* Header */}
      <div ref={headerRef} className="jd-scout-header" style={{ opacity: 0 }}>
        <div className="jd-scout-header-left">
          <div className="jd-scout-icon">
            <Telescope size={22} />
          </div>
          <div>
            <h1 className="jd-scout-title">JD Scout</h1>
            <p className="jd-scout-subtitle">Upload or describe a role · AI finds and ranks the best candidates</p>
          </div>
        </div>
        {status !== 'idle' && (
          <button id="jd-reset" className="jd-reset-btn" onClick={reset}>
            <RotateCcw size={15} /> New Search
          </button>
        )}
      </div>

      {/* Main split layout */}
      <div ref={contentRef} className="jd-scout-layout" style={{ opacity: 0 }}>
        {/* Left: JD Input */}
        <div className="jd-scout-left">
          <JdInputPanel
            mode={uploadMode}
            onModeChange={setUploadMode}
            jdData={jdData}
            onChange={updateJd}
            onAddSkill={addSkill}
            onRemoveSkill={removeSkill}
            onScout={scout}
            isSearching={status === 'searching'}
            onFileUpload={handleFileUpload}
            parseLoading={parseLoading}
            uploadedFile={uploadedFile}
          />
        </div>

        {/* Right: Results */}
        <div className="jd-scout-right">
          <ScoutResultsPanel status={status} results={results} />
        </div>
      </div>
    </div>
  );
}
