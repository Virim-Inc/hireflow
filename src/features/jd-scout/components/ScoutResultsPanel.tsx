import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { ScoutResults } from '../types/jd-scout.types';
import { ScoutCandidateCard } from './ScoutCandidateCard';
import { Users, Trophy, Loader2, Search } from 'lucide-react';

interface ScoutResultsPanelProps {
  status: 'idle' | 'searching' | 'complete' | 'error';
  results: ScoutResults | null;
}

function SkeletonScoutCard() {
  return (
    <div className="scout-card glass-card scout-card--skeleton">
      <div className="scout-card-main">
        <div className="hf-skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
        <div className="hf-skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="hf-skeleton" style={{ width: '55%', height: 16 }} />
          <div className="hf-skeleton" style={{ width: '40%', height: 13 }} />
          <div className="hf-skeleton" style={{ width: '75%', height: 11 }} />
        </div>
        <div className="hf-skeleton" style={{ width: 64, height: 64, borderRadius: '50%' }} />
      </div>
    </div>
  );
}

function SearchingAnimation() {
  const radarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!radarRef.current) return;
    const rings = radarRef.current.querySelectorAll('.scout-radar-ring');
    gsap.fromTo(rings,
      { scale: 0.5, opacity: 0.8 },
      { scale: 2.5, opacity: 0, duration: 2, stagger: 0.5, ease: 'power1.out', repeat: -1 }
    );
  }, []);
  return (
    <div className="scout-searching-anim">
      <div ref={radarRef} className="scout-radar">
        <div className="scout-radar-ring" />
        <div className="scout-radar-ring" />
        <div className="scout-radar-ring" />
        <div className="scout-radar-core">
          <Search size={22} />
        </div>
      </div>
      <p className="scout-searching-title">Scouting Talent Pool…</p>
      <p className="scout-searching-sub">AI is comparing candidates against your JD</p>
      <div className="scout-searching-steps">
        {['Analyzing JD', 'Scanning profiles', 'Scoring matches', 'Ranking results'].map((step, i) => (
          <span key={step} className="scout-step" style={{ animationDelay: `${i * 0.5}s` }}>
            <Loader2 size={11} className="scout-step-spin" /> {step}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ScoutResultsPanel({ status, results }: ScoutResultsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== 'complete' || !panelRef.current) return;
    const cards = panelRef.current.querySelectorAll('.scout-card:not(.scout-card--skeleton)');
    gsap.fromTo(cards,
      { opacity: 0, y: 35 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.09, ease: 'power3.out', delay: 0.1 }
    );
  }, [status]);

  return (
    <div ref={panelRef} className="scout-results-panel">
      {/* Header */}
      <div className="scout-results-header">
        <div className="scout-results-title-row">
          <div className="scout-results-icon"><Users size={18} /></div>
          <h2 className="scout-results-title">
            {status === 'complete' && results ? `${results.totalFound} Candidates Found` : 'Scout Results'}
          </h2>
        </div>
        {status === 'complete' && results && (
          <div className="scout-results-meta">
            <span><Trophy size={13} /> Ranked by AI match score</span>
            <span>JD: {results.jdTitle}</span>
          </div>
        )}
      </div>

      {/* Content */}
      {status === 'idle' && (
        <div className="scout-empty-state">
          <div className="scout-empty-icon">🎯</div>
          <h3 className="scout-empty-title">Ready to Scout</h3>
          <p className="scout-empty-sub">Fill in your Job Description and click "Scout Best Candidates" to find top matches from our talent pool</p>
        </div>
      )}

      {status === 'searching' && (
        <div className="scout-loading-list">
          <SearchingAnimation />
          {Array.from({ length: 3 }).map((_, i) => <SkeletonScoutCard key={i} />)}
        </div>
      )}

      {status === 'complete' && results && (
        <div className="scout-cards-list">
          {results.candidates.map((c, i) => (
            <ScoutCandidateCard key={c.id} candidate={c} index={i} animate />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="scout-empty-state">
          <div className="scout-empty-icon">⚠️</div>
          <h3 className="scout-empty-title">Search Failed</h3>
          <p className="scout-empty-sub">Something went wrong. Please try again.</p>
        </div>
      )}
    </div>
  );
}
