import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Building2,
  Globe,
  Mail,
  UserCheck,
  Plus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { PartnerCompanyLogo } from './PartnerCompanyLogo';
import { createPartnerCompany } from '../services/referral.service';
import type { PartnerCompany } from '../types/referral.types';

interface AddPartnerCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newCompany: PartnerCompany) => void;
}

const POPULAR_INDUSTRIES = [
  'Enterprise Software',
  'Fintech / Payments',
  'Data & AI',
  'Technology / Cloud',
  'E-commerce / Retail',
  'HealthTech / BioTech',
  'Cybersecurity',
  'EdTech',
  'Gaming & Entertainment',
  'Other',
];

export const AddPartnerCompanyModal: React.FC<AddPartnerCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState(POPULAR_INDUSTRIES[0]);
  const [customIndustry, setCustomIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Lock background scroll
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setIndustry(POPULAR_INDUSTRIES[0]);
      setCustomIndustry('');
      setWebsite('');
      setLogoUrl('');
      setContactPerson('');
      setContactEmail('');
      setDescription('');
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  // Auto-fill logo URL from website domain favicon if logoUrl is empty
  const handleWebsiteBlur = () => {
    if (website && !logoUrl) {
      try {
        let domain = website.trim();
        if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
          domain = 'https://' + domain;
        }
        const parsed = new URL(domain);
        const favicon = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=128`;
        setLogoUrl(favicon);
      } catch {
        // ignore invalid URL parsing
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Company name is required.');
      return;
    }

    const finalIndustry = industry === 'Other' ? customIndustry.trim() || 'Technology' : industry;

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);

      const newCompany = await createPartnerCompany({
        name: name.trim(),
        industry: finalIndustry,
        website: website.trim() || undefined,
        logo_url: logoUrl.trim() || undefined,
        contact_person: contactPerson.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        description: description.trim() || undefined,
      });

      setSuccessMsg(`Successfully added ${newCompany.name} to partner network!`);

      setTimeout(() => {
        if (onSuccess) onSuccess(newCompany);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to create partner company.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      style={{ zIndex: 999999 }}
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl my-auto bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/25 shrink-0">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                Add New Partner Company
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Add an external hiring partner to your talent sharing network.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4.5">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300 font-medium">
                <AlertCircle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Live Preview Bar */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <PartnerCompanyLogo
                name={name || 'Company'}
                logoUrl={logoUrl || null}
                size="md"
                className="shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {name || 'New Partner Company'}
                  </span>
                  <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/50">
                    {industry === 'Other' ? customIndustry || 'Technology' : industry}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate mt-0.5">
                  {website || contactEmail || 'Fill in details below to register partner company'}
                </p>
              </div>
            </div>

            {/* 1. Company Name & Industry Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Stripe, Acme Corp"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 outline-none focus:border-indigo-500 transition-colors shadow-2xs placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Industry / Sector
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 outline-none focus:border-indigo-500 transition-colors shadow-2xs cursor-pointer"
                >
                  {POPULAR_INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {industry === 'Other' && (
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Specify Custom Industry
                </label>
                <input
                  type="text"
                  value={customIndustry}
                  onChange={(e) => setCustomIndustry(e.target.value)}
                  placeholder="e.g. Aerospace, Robotics, Clean Energy"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                />
              </div>
            )}

            {/* 2. Website & Logo URL Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Company Website
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    onBlur={handleWebsiteBlur}
                    placeholder="https://company.com"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 outline-none focus:border-indigo-500 transition-colors shadow-2xs placeholder:text-slate-400"
                  />
                  <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Logo URL (Optional)
                </label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://.../logo.png"
                  className="w-full px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 outline-none focus:border-indigo-500 transition-colors shadow-2xs placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* 3. Contact Person & Contact Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Contact Person / Recruiter
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Sarah Connor (Head of Talent)"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 outline-none focus:border-indigo-500 transition-colors shadow-2xs placeholder:text-slate-400"
                  />
                  <UserCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Contact Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="hiring@company.com"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 outline-none focus:border-indigo-500 transition-colors shadow-2xs placeholder:text-slate-400"
                  />
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            {/* 4. Company Description */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Company Description / Notes
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of company culture, tech stack focus, open hiring needs..."
                className="w-full px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400 resize-vertical shadow-2xs leading-relaxed"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-white dark:bg-slate-900 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Adding Company...
                </>
              ) : (
                <>
                  <Plus size={15} /> Add Partner Company
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};
