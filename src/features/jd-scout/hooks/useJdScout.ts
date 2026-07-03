import { useState, useCallback, useRef } from 'react';
import type { JdFormData, ScoutResults } from '../types/jd-scout.types';
import { jdScoutService } from '../services/jdScoutService';

export const DEFAULT_JD: JdFormData = {
  title: '', company: '', location: '', locationType: 'hybrid',
  experienceMin: 2, experienceMax: 8, salaryMin: 0, salaryMax: 0,
  skills: [], description: '', education: '', industry: '',
};

export function useJdScout() {
  const [jdData, setJdData] = useState<JdFormData>(DEFAULT_JD);
  const [results, setResults] = useState<ScoutResults | null>(null);
  const [status, setStatus] = useState<'idle' | 'searching' | 'complete' | 'error'>('idle');
  const [uploadMode, setUploadMode] = useState<'form' | 'upload'>('form');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const updateJd = useCallback((updates: Partial<JdFormData>) => {
    setJdData(prev => ({ ...prev, ...updates }));
  }, []);

  const addSkill = useCallback((skill: string) => {
    const s = skill.trim();
    if (!s) return;
    setJdData(prev => ({
      ...prev,
      skills: prev.skills.includes(s) ? prev.skills : [...prev.skills, s],
    }));
  }, []);

  const removeSkill = useCallback((skill: string) => {
    setJdData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadedFile(file);
    setParseLoading(true);
    try {
      const parsed = await jdScoutService.uploadAndParse(file);
      setJdData(prev => ({ ...prev, ...parsed }));
    } finally {
      setParseLoading(false);
    }
  }, []);

  const scout = useCallback(async () => {
    if (!jdData.title.trim()) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setStatus('searching');
    setResults(null);
    try {
      const data = await jdScoutService.searchCandidates(jdData);
      setResults(data);
      setStatus('complete');
    } catch {
      setStatus('error');
    }
  }, [jdData]);

  const reset = useCallback(() => {
    setJdData(DEFAULT_JD);
    setResults(null);
    setStatus('idle');
    setUploadedFile(null);
  }, []);

  return {
    jdData, updateJd, addSkill, removeSkill,
    results, status, uploadMode, setUploadMode,
    uploadedFile, handleFileUpload, parseLoading,
    scout, reset,
  };
}
