import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import {
  Lightbulb,
  Loader2,
  DollarSign,
  Briefcase,
  Star,
  Clock,
  ArrowRight,
  CheckCircle2,
  Terminal,
  Activity,
} from "lucide-react";

interface Idea {
  title: string;
  tagline: string;
  description: string;
  estimatedCost: string;
  firstStep: string;
}

export default function IdeaGenerator() {
  const { token } = useAuth();

  const [industry, setIndustry] = useState("");
  const [skills, setSkills] = useState("");
  const [budget, setBudget] = useState("Under $1k");
  const [timeCommitment, setTimeCommitment] = useState("Part-time");

  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: "",
  });
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(msg);
    setDebugLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  const testConnection = async () => {
    setDebugLogs([]);
    setError("");
    addLog("Starting backend health check...");

    try {
      addLog("Sending request to /api/health");
      const res = await fetch("/api/health");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Health check failed");
      }

      addLog(`✅ ${data.message || "Backend is running!"}`);
      showToast("Connection Successful!");
    } catch (err: any) {
      addLog(`❌ ERROR: ${err.message}`);
      setError(err.message || "Connection failed.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setIdeas([]);
    setDebugLogs([]);

    addLog(`Frontend received request with data: Industry=${industry}, Budget=${budget}`);

    try {
      addLog("Sending POST request to backend /api/ideas ...");

      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
        throw new Error(data.message || data.error || "Failed to generate ideas");
      }

      addLog(`✅ Successfully received ${data.ideas.length} ideas from backend`);
      setIdeas(data.ideas);
    } catch (err: any) {
      addLog(`❌ Error Details: ${err.message}`);
      console.error("Full Error Object:", err);
      setError(err.message || "An error occurred while generating ideas.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIdea = async (idea: Idea) => {
    if (!token) {
      showToast("Please login first to save ideas");
      return;
    }

    try {
      addLog(`Saving idea: ${idea.title}`);

      const res = await fetch("/api/save-idea", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: idea.title,
          tagline: idea.tagline,
          description: idea.description,
          estimatedCost: idea.estimatedCost,
          firstStep: idea.firstStep,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save idea");
      }

      addLog(`✅ Idea saved successfully: ${idea.title}`);
      showToast("Idea Saved to Dashboard!");
    } catch (error: any) {
      console.error("Save idea error:", error);
      addLog(`❌ Save failed: ${error.message}`);
      showToast(error.message || "Could not save idea");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-100 rounded-full mb-4">
          <Lightbulb className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
          AI Business Idea Generator
        </h1>
        <p className="text-lg text-slate-600">
          Discover your next big venture. Tell us about your passions, budget, and
          skills, and our AI will tailor startup ideas just for you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4">
          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sticky top-24">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Your Profile</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="industry"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Industry / Interests
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Star className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g., Sustainable fashion, EdTech"
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-colors sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="skills"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  User Skills
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Briefcase className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    id="skills"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="e.g., Web dev, Marketing, Sales"
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-colors sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="budget"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Investment Budget
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-slate-400" />
                  </div>
                  <select
                    id="budget"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="block w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-colors sm:text-sm appearance-none"
                  >
                    <option value="Under $1k">Under $1k</option>
                    <option value="$1k-$5k">$1k - $5k</option>
                    <option value="$5k-$20k">$5k - $20k</option>
                    <option value="$20k+">$20k+</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                    <svg
                      className="w-4 h-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      ></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Time Commitment
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center justify-center px-4 py-3 border rounded-xl cursor-pointer transition-all ${
                      timeCommitment === "Part-time"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="timeCommitment"
                      value="Part-time"
                      checked={timeCommitment === "Part-time"}
                      onChange={(e) => setTimeCommitment(e.target.value)}
                      className="sr-only"
                    />
                    <Clock className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">Part-time</span>
                  </label>

                  <label
                    className={`flex items-center justify-center px-4 py-3 border rounded-xl cursor-pointer transition-all ${
                      timeCommitment === "Full-time"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="timeCommitment"
                      value="Full-time"
                      checked={timeCommitment === "Full-time"}
                      onChange={(e) => setTimeCommitment(e.target.value)}
                      className="sr-only"
                    />
                    <Briefcase className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">Full-time</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-md text-base font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all hover:shadow-lg active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                    Analyzing Profile...
                  </>
                ) : (
                  <>
                    Generate Startup Ideas
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center text-slate-700 font-semibold text-sm">
                  <Terminal className="w-4 h-4 mr-2" />
                  Debug Terminal
                </div>
                <button
                  type="button"
                  onClick={testConnection}
                  className="text-xs flex items-center bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 font-medium"
                >
                  <Activity className="w-3 h-3 mr-1.5 text-blue-500" />
                  Test Connection
                </button>
              </div>

              <div className="bg-slate-900 p-4 h-48 overflow-y-auto font-mono text-xs text-emerald-400 space-y-1.5">
                {debugLogs.length === 0 ? (
                  <span className="text-slate-500">
                    Waiting for actions... Click 'Test Connection' to verify API.
                  </span>
                ) : (
                  debugLogs.map((log, i) => (
                    <div
                      key={i}
                      className={
                        log.includes("❌")
                          ? "text-red-400"
                          : log.includes("✅")
                          ? "text-emerald-400"
                          : "text-slate-300"
                      }
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-xl">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm animate-pulse"
                >
                  <div className="h-6 bg-slate-200 rounded-md w-3/4 mb-4"></div>
                  <div className="h-4 bg-slate-200 rounded-md w-full mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded-md w-5/6 mb-6"></div>
                  <div className="space-y-3">
                    <div className="h-10 bg-slate-100 rounded-xl w-full"></div>
                    <div className="h-10 bg-slate-100 rounded-xl w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : ideas.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {ideas.map((idea, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="bg-white rounded-[2rem] shadow-lg shadow-slate-200/40 border border-slate-100 p-8 flex flex-col h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-slate-900 mb-1 leading-tight">
                      {idea.title}
                    </h3>
                    <p className="text-emerald-600 font-medium text-sm mb-3">
                      {idea.tagline}
                    </p>
                    <p className="text-slate-600 mb-6 leading-relaxed">
                      {idea.description}
                    </p>

                    <div className="space-y-4 mb-8">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 bg-blue-100 p-1.5 rounded-lg text-blue-600">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Estimated Cost
                          </h4>
                          <p className="text-sm font-medium text-slate-800">
                            {idea.estimatedCost}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="mt-1 bg-amber-100 p-1.5 rounded-lg text-amber-600">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                            First Step
                          </h4>
                          <p className="text-sm font-medium text-slate-800">
                            {idea.firstStep}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSaveIdea(idea)}
                    className="w-full py-3 px-4 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-semibold rounded-xl border border-slate-200 hover:border-emerald-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Star className="w-4 h-4" /> Save to Dashboard
                  </button>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <Lightbulb className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Ready to brainstorm?
              </h3>
              <p className="text-slate-500 max-w-md">
                Fill out your profile on the left and click generate to see AI-powered
                startup ideas tailored specifically for you.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}