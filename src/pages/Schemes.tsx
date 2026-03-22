import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Filter,
  Heart,
  X,
  ExternalLink,
  Building2,
  Banknote,
  Tag,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

interface Scheme {
  id: string;
  name: string;
  offeredBy: string;
  maxFunding: string;
  type: string;
  category: string;
  description: string;
  eligibility: string[];
  officialUrl?: string;
}

const SCHEMES: Scheme[] = [
  {
    id: '1',
    name: 'Startup India Seed Fund Scheme (SISFS)',
    offeredBy: 'DPIIT, Ministry of Commerce & Industry',
    maxFunding: '₹50 Lakhs',
    type: 'Grant & Debt',
    category: 'General',
    description: 'Financial assistance to startups for proof of concept, prototype development, product trials, market entry, and commercialization.',
    eligibility: [
      'Recognized by DPIIT.',
      'Incorporated less than 2 years ago.',
      'Must have a viable business idea with scope for scaling.',
      'Should not have received more than ₹10 Lakhs of monetary support under any other Central/State Govt scheme.'
    ],
    officialUrl: 'https://www.startupindia.gov.in/'
  },
  {
    id: '2',
    name: "Prime Minister's Employment Generation Programme (PMEGP)",
    offeredBy: 'Ministry of MSME',
    maxFunding: '₹50 Lakhs',
    type: 'Subsidy',
    category: 'General',
    description: 'Credit-linked subsidy program aimed at generating employment opportunities through establishment of micro-enterprises in rural and urban areas.',
    eligibility: [
      'Any individual above 18 years of age.',
      'At least VIII standard pass for projects costing above ₹10 lakh in manufacturing.',
      'Only new projects are considered for sanction under PMEGP.',
      'Self Help Groups eligible under scheme conditions.'
    ],
    officialUrl: 'https://www.kviconline.gov.in/pmegp/'
  },
  {
    id: '3',
    name: 'SAMRIDH Scheme',
    offeredBy: 'Ministry of Electronics & IT (MeitY)',
    maxFunding: '₹40 Lakhs',
    type: 'Grant',
    category: 'Technology',
    description: "Supports accelerators to select and accelerate potential IT-based startups to scale for solving India's problems.",
    eligibility: [
      'Startups working in the IT/Software product sector.',
      'Must have a ready product and a customer base.',
      'Seeking acceleration and investment to scale up.',
      'Registered with DPIIT.'
    ],
    officialUrl: 'https://www.meity.gov.in/'
  },
  {
    id: '4',
    name: 'Stand-Up India Scheme',
    offeredBy: 'Department of Financial Services',
    maxFunding: '₹1 Crore',
    type: 'Loan',
    category: 'Women / SC / ST',
    description: 'Facilitates bank loans for SC/ST borrowers and women entrepreneurs for greenfield enterprises.',
    eligibility: [
      'SC/ST and/or woman entrepreneurs above 18 years of age.',
      'Loans available only for greenfield project.',
      'Borrower should not be in default to any bank/financial institution.',
      'For non-individual enterprises, 51% stake should be with SC/ST and/or woman entrepreneur.'
    ],
    officialUrl: 'https://www.standupmitra.in/'
  },
  {
    id: '5',
    name: 'MSME Innovative Scheme',
    offeredBy: 'Ministry of MSME',
    maxFunding: '₹15 Lakhs',
    type: 'Grant',
    category: 'Technology',
    description: 'Promotes innovation and adoption of latest technologies in MSMEs through incubation, design, and IPR support.',
    eligibility: [
      'Registered MSMEs with Udyam Registration.',
      'Students/Innovators supported by Host Institutions.',
      'Must propose an innovative idea with commercial viability.'
    ],
    officialUrl: 'https://msme.gov.in/'
  },
  {
    id: '6',
    name: 'Credit Guarantee Scheme for Startups (CGSS)',
    offeredBy: 'DPIIT',
    maxFunding: '₹10 Crore',
    type: 'Guarantee',
    category: 'General',
    description: 'Provides credit guarantees to loans extended by member institutions to eligible startups.',
    eligibility: [
      'Startups recognized by DPIIT.',
      'Must have reached the stage of stable revenue stream.',
      'Not in default to any lending institution.',
      'Not classified as Non-Performing Asset (NPA).'
    ],
    officialUrl: 'https://www.startupindia.gov.in/'
  }
];

const CATEGORIES = ['All', 'General', 'Technology', 'Women / SC / ST', 'Agriculture'];
const FUNDING_TYPES = ['All', 'Grant', 'Loan', 'Subsidy', 'Guarantee', 'Grant & Debt'];

export default function Schemes() {
  const { token } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  const [savedSchemes, setSavedSchemes] = useState<Set<string>>(new Set());
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [toast, setToast] = useState({ show: false, message: '' });

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  useEffect(() => {
    const fetchSavedSchemes = async () => {
      if (!token) return;

      try {
        const res = await fetch('/api/my-schemes', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) return;

        const ids = new Set<string>((data.schemes || []).map((item: any) => item.scheme_id));
        setSavedSchemes(ids);
      } catch (error) {
        console.error('Failed to fetch saved schemes:', error);
      }
    };

    fetchSavedSchemes();
  }, [token]);

  const saveSchemeToBackend = async (scheme: Scheme) => {
    if (!token) {
      showToast('Please login first to save schemes');
      return false;
    }

    try {
      const res = await fetch('/api/save-scheme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          schemeId: scheme.id,
          schemeName: scheme.name,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to save scheme');
      }

      return true;
    } catch (error: any) {
      showToast(error.message || 'Could not save scheme');
      return false;
    }
  };

  const toggleSave = async (e: React.MouseEvent, scheme: Scheme) => {
    e.stopPropagation();

    if (savedSchemes.has(scheme.id)) {
      showToast('Scheme already saved');
      return;
    }

    const ok = await saveSchemeToBackend(scheme);

    if (ok) {
      setSavedSchemes((prev) => new Set(prev).add(scheme.id));
      showToast('Saved to Dashboard!');
    }
  };

  const filteredSchemes = useMemo(() => {
    return SCHEMES.filter((scheme) => {
      const matchesSearch =
        scheme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scheme.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'All' || scheme.category === selectedCategory;

      const matchesType =
        selectedType === 'All' || scheme.type.includes(selectedType);

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [searchQuery, selectedCategory, selectedType]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-8 left-1/2 z-50 flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white border-b border-slate-200 pt-12 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Government Startup Schemes
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl">
            Discover grants, loans, and subsidies offered by the government to help you fund and scale your startup.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-64 flex-shrink-0 space-y-8">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Search Schemes</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="e.g., Seed Fund..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-500" /> Category
              </label>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => (
                  <label key={cat} className="flex items-center cursor-pointer group">
                    <input
                      type="radio"
                      name="category"
                      value={cat}
                      checked={selectedCategory === cat}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className={`ml-3 text-sm transition-colors ${
                      selectedCategory === cat ? 'text-slate-900 font-medium' : 'text-slate-600 group-hover:text-slate-900'
                    }`}>
                      {cat}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-slate-500" /> Funding Type
              </label>
              <div className="space-y-2">
                {FUNDING_TYPES.map((type) => (
                  <label key={type} className="flex items-center cursor-pointer group">
                    <input
                      type="radio"
                      name="fundingType"
                      value={type}
                      checked={selectedType === type}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className={`ml-3 text-sm transition-colors ${
                      selectedType === type ? 'text-slate-900 font-medium' : 'text-slate-600 group-hover:text-slate-900'
                    }`}>
                      {type}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {filteredSchemes.length} {filteredSchemes.length === 1 ? 'Scheme' : 'Schemes'} Found
              </h2>
            </div>

            {filteredSchemes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                {filteredSchemes.map((scheme) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={scheme.id}
                    onClick={() => setSelectedScheme(scheme)}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col h-full group"
                  >
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {scheme.maxFunding}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            {scheme.type}
                          </span>
                        </div>
                        <button
                          onClick={(e) => toggleSave(e, scheme)}
                          className="text-slate-400 hover:text-red-500 transition-colors focus:outline-none p-1"
                        >
                          <Heart className={`w-6 h-6 ${savedSchemes.has(scheme.id) ? 'fill-red-500 text-red-500' : ''}`} />
                        </button>
                      </div>

                      <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors line-clamp-2">
                        {scheme.name}
                      </h3>

                      <div className="flex items-center text-sm text-slate-500 mb-4">
                        <Building2 className="w-4 h-4 mr-1.5 flex-shrink-0" />
                        <span className="truncate">{scheme.offeredBy}</span>
                      </div>

                      <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">
                        {scheme.description}
                      </p>
                    </div>

                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex items-center justify-between">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                        {scheme.category}
                      </span>
                      <span className="text-sm font-semibold text-emerald-600 flex items-center group-hover:translate-x-1 transition-transform">
                        View Details <ChevronRight className="w-4 h-4 ml-1" />
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
                <div className="bg-slate-50 p-4 rounded-full mb-4">
                  <Filter className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No schemes found</h3>
                <p className="text-slate-500 max-w-md">
                  We couldn't find any schemes matching your current filters.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setSelectedType('All');
                  }}
                  className="mt-6 text-emerald-600 font-semibold hover:text-emerald-700"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedScheme && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedScheme(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="flex justify-between items-start p-6 border-b border-slate-100">
                <div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      Max: {selectedScheme.maxFunding}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                      {selectedScheme.type}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 pr-8">{selectedScheme.name}</h2>
                  <div className="flex items-center text-sm text-slate-500 mt-2">
                    <Building2 className="w-4 h-4 mr-1.5" />
                    {selectedScheme.offeredBy}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedScheme(null)}
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-8">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">About the Scheme</h4>
                  <p className="text-slate-600 leading-relaxed">{selectedScheme.description}</p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Eligibility Criteria</h4>
                  <ul className="space-y-3">
                    {selectedScheme.eligibility.map((criterion, idx) => (
                      <li key={idx} className="flex items-start">
                        <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 mr-3" />
                        <span className="text-slate-600 leading-relaxed">{criterion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-4 justify-end items-center">
                <button
                  onClick={(e) => toggleSave(e, selectedScheme)}
                  className={`w-full sm:w-auto px-6 py-3 rounded-xl font-semibold border transition-colors flex items-center justify-center gap-2 ${
                    savedSchemes.has(selectedScheme.id)
                      ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${savedSchemes.has(selectedScheme.id) ? 'fill-current' : ''}`} />
                  {savedSchemes.has(selectedScheme.id) ? 'Saved' : 'Save Scheme'}
                </button>

                <a
                  href={selectedScheme.officialUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  Apply Now <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}