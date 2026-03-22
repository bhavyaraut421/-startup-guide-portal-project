import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  Lightbulb,
  Calculator,
  BookOpen,
  Download,
  ArrowRight,
  Plus,
  Clock,
  X,
  ChevronDown,
  Sparkles,
  ArrowLeft,
  FileText
} from 'lucide-react';

type ActivityItem = {
  id: number | string;
  type: 'idea' | 'scheme' | 'download';
  title: string;
  time: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  actionUrl?: string;
  external?: boolean;
};

type StatItem = {
  name: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  path: string;
};

export default function DashboardHome() {
  const { user, token } = useAuth();

  const userName = useMemo(() => {
    if (!user?.name) return 'Founder';
    return user.name.split(' ')[0];
  }, [user]);

  const [savedIdeas, setSavedIdeas] = useState<any[]>([]);
  const [savedSchemes, setSavedSchemes] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [budget, setBudget] = useState<string>('');
  const [skillset, setSkillset] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedIdea, setGeneratedIdea] = useState<{ name: string; pitch: string } | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) return;

      try {
        const [ideasRes, schemesRes, downloadsRes] = await Promise.all([
          fetch('/api/my-ideas', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch('/api/my-schemes', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch('/api/my-downloads', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        const ideasData = await ideasRes.json();
        const schemesData = await schemesRes.json();
        const downloadsData = await downloadsRes.json();

        const ideas = ideasRes.ok ? ideasData.ideas || [] : [];
        const schemes = schemesRes.ok ? schemesData.schemes || [] : [];
        const downloadedFiles = downloadsRes.ok ? downloadsData.downloads || [] : [];

        setSavedIdeas(ideas);
        setSavedSchemes(schemes);
        setDownloads(downloadedFiles);

        const ideaActivities: ActivityItem[] = ideas.slice(0, 3).map((idea: any) => ({
          id: `idea-${idea.id}`,
          type: 'idea',
          title: `Saved "${idea.title}" idea`,
          time: formatTimeAgo(idea.created_at),
          icon: <Lightbulb className="w-4 h-4" />,
          color: 'text-amber-600',
          bg: 'bg-amber-100',
          actionUrl: '/profile?tab=ideas',
          external: false,
        }));

        const schemeActivities: ActivityItem[] = schemes.slice(0, 3).map((scheme: any) => ({
          id: `scheme-${scheme.id}`,
          type: 'scheme',
          title: `Tracked "${scheme.scheme_name || scheme.scheme_id}"`,
          time: formatTimeAgo(scheme.created_at),
          icon: <BookOpen className="w-4 h-4" />,
          color: 'text-purple-600',
          bg: 'bg-purple-100',
          actionUrl: '/profile?tab=schemes',
          external: false,
        }));

        const downloadActivities: ActivityItem[] = downloadedFiles.slice(0, 5).map((file: any) => ({
          id: `download-${file.id}`,
          type: 'download',
          title: `Downloaded "${file.title}"`,
          time: formatTimeAgo(file.created_at),
          icon: <Download className="w-4 h-4" />,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          actionUrl: `/api/downloads/${file.id}/view`,
          external: true,
        }));

        const mergedActivities = [...downloadActivities, ...ideaActivities, ...schemeActivities]
          .sort((a, b) => {
            const aId = String(a.id);
            const bId = String(b.id);
            return bId.localeCompare(aId);
          })
          .slice(0, 6);

        setRecentActivities(mergedActivities);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, [token]);

  const stats: StatItem[] = [
    {
      name: 'Saved Ideas',
      value: String(savedIdeas.length),
      icon: <Lightbulb className="w-6 h-6 text-amber-500" />,
      color: 'bg-amber-50',
      path: '/profile?tab=ideas',
    },
    {
      name: 'Schemes Tracked',
      value: String(savedSchemes.length),
      icon: <BookOpen className="w-6 h-6 text-purple-500" />,
      color: 'bg-purple-50',
      path: '/profile?tab=schemes',
    },
    {
      name: 'Recent Downloads',
      value: String(downloads.length),
      icon: <Download className="w-6 h-6 text-blue-500" />,
      color: 'bg-blue-50',
      path: '/downloads',
    },
  ];

  const industriesList = [
    'Tech',
    'Sustainability',
    'Education',
    'Food',
    'Health',
    'Finance',
    'Entertainment',
    'Fashion',
  ];

  const budgetList = [
    'Bootstrapped ($0 - $1k)',
    'Lean ($1k - $10k)',
    'Funded ($10k - $50k)',
    'Well-Funded ($50k+)',
  ];

  const toggleIndustry = (ind: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind]
    );
  };

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const industry = selectedIndustries.join(', ');
      const skills = skillset;
      const timeCommitment = 'Part-time';

      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          industry,
          skills,
          budget,
          timeCommitment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to generate idea');
      }

      if (data.ideas && data.ideas.length > 0) {
        setGeneratedIdea({
          name: data.ideas[0].title,
          pitch: data.ideas[0].description,
        });
      } else {
        throw new Error('No ideas returned');
      }
    } catch (error) {
      console.error('Error generating idea:', error);
      setGeneratedIdea({
        name: 'EcoLearn Platform (Fallback)',
        pitch: `An interactive, gamified learning platform that teaches sustainability practices to K-12 students. Leveraging your ${skillset} skills, it provides schools with an affordable, scalable curriculum while operating within a ${budget} budget.`,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedIdea || !token) {
      closeModal();
      return;
    }

    try {
      const res = await fetch('/api/save-idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: generatedIdea.name,
          tagline: 'Generated from Dashboard Wizard',
          description: generatedIdea.pitch,
          estimatedCost: budget,
          firstStep: `Start with ${selectedIndustries.join(', ') || 'your selected industry'}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to save idea');
      }

      const newIdea = {
        id: data.ideaId || Date.now(),
        title: generatedIdea.name,
        description: generatedIdea.pitch,
        created_at: new Date().toISOString(),
      };

      setSavedIdeas((prev) => [newIdea, ...prev]);

      setRecentActivities((prev) => [
        {
          id: `idea-${newIdea.id}`,
          type: 'idea',
          title: `Saved "${generatedIdea.name}" idea`,
          time: 'Just now',
          icon: <Lightbulb className="w-4 h-4" />,
          color: 'text-amber-600',
          bg: 'bg-amber-100',
          actionUrl: '/profile?tab=ideas',
          external: false,
        },
        ...prev.slice(0, 5),
      ]);

      closeModal();
    } catch (error) {
      console.error('Error saving dashboard idea:', error);
      closeModal();
    }
  };

  const openActivity = (activity: ActivityItem) => {
    if (!activity.actionUrl) return;

    if (activity.external) {
      if (!token) return;
      window.open(`${activity.actionUrl}?token=${encodeURIComponent(token)}`, '_blank');
    } else {
      window.location.href = activity.actionUrl;
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(resetWizard, 300);
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedIndustries([]);
    setBudget('');
    setSkillset('');
    setGeneratedIdea(null);
    setIsGenerating(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-slate-500 mt-1">
            Here's what's happening with your ventures today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Idea
          </button>
          <Link
            to="/calculator"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Calculator className="w-4 h-4 mr-2" />
            Financial Plan
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Link
              to={stat.path}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-emerald-200 transition-all flex items-center gap-4 group block cursor-pointer"
            >
              <div className={`p-4 rounded-xl ${stat.color}`}>
                {stat.icon}
              </div>

              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>

              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="group flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-center"
            >
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Lightbulb className="w-6 h-6" />
              </div>
              <span className="font-medium text-slate-900">Generate New Idea</span>
              <span className="text-xs text-slate-500 mt-1">Use AI to brainstorm</span>
            </button>

            <Link
              to="/calculator"
              className="group flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
            >
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Calculator className="w-6 h-6" />
              </div>
              <span className="font-medium text-slate-900">Start Financial Plan</span>
              <span className="text-xs text-slate-500 mt-1">Estimate your costs</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
            <Link
              to="/downloads"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            <AnimatePresence initial={false}>
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors overflow-hidden cursor-pointer"
                    onClick={() => openActivity(activity)}
                  >
                    <div className={`${activity.bg} p-2 rounded-lg ${activity.color} shrink-0 mt-1`}>
                      {activity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{activity.title}</p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> {activity.time}
                      </p>
                    </div>
                    <button className="text-slate-400 hover:text-emerald-600 transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="p-6 text-sm text-slate-500">No recent activity yet.</div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative"
            >
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8 md:p-10 min-h-[400px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {step === 1 && !isGenerating && !generatedIdea && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="mb-2 text-sm font-semibold text-emerald-600 tracking-wider uppercase">
                        Step 1 of 3
                      </div>
                      <h2 className="text-3xl font-bold text-slate-900 mb-2">
                        What industries are you passionate about?
                      </h2>
                      <p className="text-slate-500 mb-8">
                        Select one or more areas that interest you to help us tailor ideas.
                      </p>

                      <div className="flex flex-wrap gap-3 mb-10">
                        {industriesList.map((ind) => (
                          <button
                            key={ind}
                            onClick={() => toggleIndustry(ind)}
                            className={`px-5 py-3 rounded-xl border text-sm font-medium transition-all ${
                              selectedIndustries.includes(ind)
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-slate-50'
                            }`}
                          >
                            {ind}
                          </button>
                        ))}
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => setStep(2)}
                          disabled={selectedIndustries.length === 0}
                          className="px-8 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                        >
                          Next <ArrowRight className="w-4 h-4 ml-2" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && !isGenerating && !generatedIdea && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button
                        onClick={() => setStep(1)}
                        className="text-sm text-slate-500 hover:text-slate-800 mb-6 flex items-center transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                      </button>
                      <div className="mb-2 text-sm font-semibold text-emerald-600 tracking-wider uppercase">
                        Step 2 of 3
                      </div>
                      <h2 className="text-3xl font-bold text-slate-900 mb-2">
                        What is your approximate starting budget?
                      </h2>
                      <p className="text-slate-500 mb-8">
                        This helps us ensure the ideas are realistic for your resources.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                        {budgetList.map((b) => (
                          <button
                            key={b}
                            onClick={() => setBudget(b)}
                            className={`p-5 rounded-xl border text-left transition-all ${
                              budget === b
                                ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                                : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`font-medium ${budget === b ? 'text-emerald-800' : 'text-slate-900'}`}>
                              {b}
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => setStep(3)}
                          disabled={!budget}
                          className="px-8 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                        >
                          Next <ArrowRight className="w-4 h-4 ml-2" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && !isGenerating && !generatedIdea && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button
                        onClick={() => setStep(2)}
                        className="text-sm text-slate-500 hover:text-slate-800 mb-6 flex items-center transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                      </button>
                      <div className="mb-2 text-sm font-semibold text-emerald-600 tracking-wider uppercase">
                        Step 3 of 3
                      </div>
                      <h2 className="text-3xl font-bold text-slate-900 mb-2">What is your 'Superpower'?</h2>
                      <p className="text-slate-500 mb-8">
                        Select your strongest skill to leverage in your new venture.
                      </p>

                      <div className="mb-10 relative">
                        <select
                          value={skillset}
                          onChange={(e) => setSkillset(e.target.value)}
                          className="w-full p-5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none text-lg shadow-sm"
                        >
                          <option value="" disabled>
                            Select a skill...
                          </option>
                          <option value="Coding">Coding / Engineering</option>
                          <option value="Marketing">Marketing / Sales</option>
                          <option value="Management">Management / Operations</option>
                          <option value="Design">Design / UX</option>
                        </select>
                        <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                          <ChevronDown className="w-6 h-6 text-slate-400" />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={handleGenerate}
                          disabled={!skillset}
                          className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center shadow-lg hover:shadow-emerald-500/30 active:scale-95"
                        >
                          <Sparkles className="w-5 h-5 mr-2" />
                          Generate My Idea
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {isGenerating && (
                    <motion.div
                      key="generating"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center justify-center py-12 text-center"
                    >
                      <div className="relative w-24 h-24 mb-8">
                        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                        <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-emerald-500 animate-pulse" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">Consulting Gemini AI...</h2>
                      <p className="text-slate-500 max-w-sm">
                        Crafting your custom startup plan based on your superpower in {skillset}.
                      </p>
                    </motion.div>
                  )}

                  {generatedIdea && !isGenerating && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="inline-flex items-center justify-center p-4 bg-emerald-100 rounded-2xl mb-6">
                        <Lightbulb className="w-8 h-8 text-emerald-600" />
                      </div>
                      <h2 className="text-3xl font-extrabold text-slate-900 mb-4">{generatedIdea.name}</h2>
                      <p className="text-lg text-slate-600 mb-8 leading-relaxed">{generatedIdea.pitch}</p>

                      <div className="bg-slate-50 rounded-xl p-5 mb-8 border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                          Based on your inputs
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedIndustries.map((ind) => (
                            <span
                              key={ind}
                              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 shadow-sm"
                            >
                              {ind}
                            </span>
                          ))}
                          <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 shadow-sm">
                            {budget}
                          </span>
                          <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 shadow-sm">
                            {skillset}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <button
                          onClick={handleSave}
                          className="flex-1 px-6 py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-md hover:shadow-lg"
                        >
                          Save to My Dashboard
                        </button>
                        <button
                          onClick={resetWizard}
                          className="px-6 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                        >
                          Try Again
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatTimeAgo(dateString?: string) {
  if (!dateString) return 'Recently';

  const now = new Date().getTime();
  const past = new Date(dateString).getTime();
  const diffMs = now - past;

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  return `${days} day ago`;
}