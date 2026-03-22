import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  Calculator,
  Info,
  Download,
  Save,
  CheckCircle2,
  PieChart,
  Briefcase,
  Zap,
  ShieldAlert,
  Loader2
} from 'lucide-react';

const CURRENCY_SYMBOL = '$';

interface TooltipProps {
  text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <Info className="w-4 h-4 text-slate-400 cursor-help ml-2 hover:text-emerald-500 transition-colors" />
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-xl z-10 text-center"
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function CostCalculator() {
  const { token } = useAuth();

  const [oneTimeCosts, setOneTimeCosts] = useState({
    incorporation: 500,
    branding: 1000,
    equipment: 2500,
    inventory: 0,
  });

  const [monthlyCosts, setMonthlyCosts] = useState({
    rent: 0,
    software: 150,
    marketing: 500,
    salaries: 0,
  });

  const [reserveFund, setReserveFund] = useState(2000);
  const [runwayMonths, setRunwayMonths] = useState(6);

  const [toast, setToast] = useState({ show: false, message: '' });
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isSavingEstimate, setIsSavingEstimate] = useState(false);

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const handleOneTimeChange = (key: keyof typeof oneTimeCosts, value: string) => {
    const num = parseInt(value.replace(/\D/g, ''), 10) || 0;
    setOneTimeCosts((prev) => ({ ...prev, [key]: num }));
  };

  const handleMonthlyChange = (key: keyof typeof monthlyCosts, value: string) => {
    const num = parseInt(value.replace(/\D/g, ''), 10) || 0;
    setMonthlyCosts((prev) => ({ ...prev, [key]: num }));
  };

  const handleReserveChange = (value: string) => {
    const num = parseInt(value.replace(/\D/g, ''), 10) || 0;
    setReserveFund(num);
  };

  const totalOneTime = useMemo(
    () => Object.values(oneTimeCosts).reduce((a: number, b: number) => a + b, 0),
    [oneTimeCosts]
  );

  const totalMonthly = useMemo(
    () => Object.values(monthlyCosts).reduce((a: number, b: number) => a + b, 0),
    [monthlyCosts]
  );

  const totalRunway = totalMonthly * runwayMonths;
  const grandTotal = totalOneTime + totalRunway + reserveFund;

  const oneTimePct = grandTotal > 0 ? (totalOneTime / grandTotal) * 100 : 0;
  const runwayPct = grandTotal > 0 ? (totalRunway / grandTotal) * 100 : 0;
  const reservePct = grandTotal > 0 ? (reserveFund / grandTotal) * 100 : 0;

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
  };

  const buildEstimatePayload = () => {
    return {
      title: `Startup Cost Estimate - ${new Date().toLocaleDateString()}`,
      currencySymbol: CURRENCY_SYMBOL,
      oneTimeCosts,
      monthlyCosts,
      reserveFund,
      runwayMonths,
      totalOneTime,
      totalMonthly,
      totalRunway,
      grandTotal,
    };
  };

  const handleDownloadPdf = async () => {
  if (!token) {
    showToast('Please login first');
    return;
  }

  try {
    setIsDownloadingPdf(true);

    // Step 1: generate PDF on backend
    const generateRes = await fetch('/api/generate-cost-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(buildEstimatePayload()),
    });

    const generateData = await generateRes.json();

    if (!generateRes.ok) {
      throw new Error(generateData.message || 'Failed to generate PDF');
    }

    if (!generateData.downloadId) {
      throw new Error('Download ID not received from server');
    }

    // Step 2: fetch actual PDF file with Authorization header
    const fileRes = await fetch(`/api/downloads/${generateData.downloadId}/file`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!fileRes.ok) {
      let message = 'Failed to download PDF file';
      try {
        const errorData = await fileRes.json();
        message = errorData.message || message;
      } catch {
        // ignore json parse error
      }
      throw new Error(message);
    }

    const blob = await fileRes.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `startup-cost-estimate-${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);

    showToast('PDF downloaded successfully');
  } catch (error: any) {
    console.error('PDF download failed:', error);
    showToast(error.message || 'Failed to generate PDF');
  } finally {
    setIsDownloadingPdf(false);
  }
};

  const handleSaveEstimate = async () => {
    if (!token) {
      showToast('Please login first');
      return;
    }

    try {
      setIsSavingEstimate(true);

      const payload = buildEstimatePayload();

      const content = `
Startup Cost Estimate

Generated On: ${new Date().toLocaleString()}

One-Time Costs
- Incorporation & Legal: ${CURRENCY_SYMBOL}${formatCurrency(oneTimeCosts.incorporation)}
- Branding & Website: ${CURRENCY_SYMBOL}${formatCurrency(oneTimeCosts.branding)}
- Equipment & Hardware: ${CURRENCY_SYMBOL}${formatCurrency(oneTimeCosts.equipment)}
- Initial Inventory: ${CURRENCY_SYMBOL}${formatCurrency(oneTimeCosts.inventory)}
- Total One-Time Costs: ${CURRENCY_SYMBOL}${formatCurrency(totalOneTime)}

Monthly Operating Costs
- Rent & Utilities: ${CURRENCY_SYMBOL}${formatCurrency(monthlyCosts.rent)}
- Software Subscriptions: ${CURRENCY_SYMBOL}${formatCurrency(monthlyCosts.software)}
- Marketing & Ads: ${CURRENCY_SYMBOL}${formatCurrency(monthlyCosts.marketing)}
- Salaries & Wages: ${CURRENCY_SYMBOL}${formatCurrency(monthlyCosts.salaries)}
- Monthly Total: ${CURRENCY_SYMBOL}${formatCurrency(totalMonthly)}
- Runway Months: ${runwayMonths}
- Runway Total: ${CURRENCY_SYMBOL}${formatCurrency(totalRunway)}

Safety Net
- Reserve Fund: ${CURRENCY_SYMBOL}${formatCurrency(reserveFund)}

Grand Total Required
- ${CURRENCY_SYMBOL}${formatCurrency(grandTotal)}
      `.trim();

      const fileBlob = new Blob([content], { type: 'text/plain' });
      const reader = new FileReader();

      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert file'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
      });

      reader.readAsDataURL(fileBlob);
      const fileData = await base64Promise;

      const res = await fetch('/api/save-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: payload.title,
          fileName: `startup-cost-estimate-${Date.now()}.txt`,
          fileData,
          mimeType: 'text/plain',
          sourceType: 'cost-calculator',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to save estimate');
      }

      showToast('Saved to downloads successfully!');
    } catch (error: any) {
      console.error('Save estimate failed:', error);
      showToast(error.message || 'Failed to save estimate');
    } finally {
      setIsSavingEstimate(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-50 flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-full mb-4">
          <Calculator className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
          Startup Cost Calculator
        </h1>
        <p className="text-lg text-slate-600">
          Estimate your initial capital requirements and plan your runway with precision.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                <Zap className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">One-Time Costs</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  key: 'incorporation',
                  label: 'Incorporation & Legal',
                  tooltip: 'LLC formation, licenses, permits, and initial legal consultation.',
                },
                {
                  key: 'branding',
                  label: 'Branding & Website',
                  tooltip: 'Logo design, domain registration, and initial website development.',
                },
                {
                  key: 'equipment',
                  label: 'Equipment & Hardware',
                  tooltip: 'Laptops, specialized machinery, office furniture.',
                },
                {
                  key: 'inventory',
                  label: 'Initial Inventory',
                  tooltip: 'Cost of goods needed before making your first sale.',
                },
              ].map((item) => (
                <div key={item.key}>
                  <div className="flex items-center mb-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      {item.label}
                    </label>
                    <Tooltip text={item.tooltip} />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-medium">{CURRENCY_SYMBOL}</span>
                    </div>
                    <input
                      type="text"
                      value={formatCurrency(oneTimeCosts[item.key as keyof typeof oneTimeCosts])}
                      onChange={(e) =>
                        handleOneTimeChange(
                          item.key as keyof typeof oneTimeCosts,
                          e.target.value
                        )
                      }
                      className="block w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors text-slate-900 font-medium"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Subtotal (One-Time)</span>
              <span className="text-xl font-bold text-slate-900">
                {CURRENCY_SYMBOL}
                {formatCurrency(totalOneTime)}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                <Briefcase className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Monthly Operating Costs</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  key: 'rent',
                  label: 'Rent & Utilities',
                  tooltip: 'Office space, co-working membership, internet, electricity.',
                },
                {
                  key: 'software',
                  label: 'Software Subscriptions',
                  tooltip: 'SaaS tools, hosting, email marketing, CRM.',
                },
                {
                  key: 'marketing',
                  label: 'Marketing & Ads',
                  tooltip: 'Monthly ad spend, social media management, content creation.',
                },
                {
                  key: 'salaries',
                  label: 'Salaries & Wages',
                  tooltip: 'Founder draw, employee salaries, contractor fees.',
                },
              ].map((item) => (
                <div key={item.key}>
                  <div className="flex items-center mb-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      {item.label}
                    </label>
                    <Tooltip text={item.tooltip} />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-medium">{CURRENCY_SYMBOL}</span>
                    </div>
                    <input
                      type="text"
                      value={formatCurrency(monthlyCosts[item.key as keyof typeof monthlyCosts])}
                      onChange={(e) =>
                        handleMonthlyChange(
                          item.key as keyof typeof monthlyCosts,
                          e.target.value
                        )
                      }
                      className="block w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors text-slate-900 font-medium"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <label className="block text-sm font-semibold text-slate-900">
                    Months of Runway
                  </label>
                  <Tooltip text="How many months of expenses you want to save up before generating revenue." />
                </div>
                <span className="text-lg font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                  {runwayMonths} Months
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="24"
                value={runwayMonths}
                onChange={(e) => setRunwayMonths(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                <span>1 mo</span>
                <span>12 mo</span>
                <span>24 mo</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
              <span className="text-slate-500 font-medium">
                Subtotal ({runwayMonths} Months)
              </span>
              <span className="text-xl font-bold text-slate-900">
                {CURRENCY_SYMBOL}
                {formatCurrency(totalRunway)}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Safety Net</h2>
            </div>

            <div>
              <div className="flex items-center mb-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Reserve Fund
                </label>
                <Tooltip text="Emergency cash for unexpected expenses. Recommended: 10-20% of total." />
              </div>
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-slate-400 font-medium">{CURRENCY_SYMBOL}</span>
                </div>
                <input
                  type="text"
                  value={formatCurrency(reserveFund)}
                  onChange={(e) => handleReserveChange(e.target.value)}
                  className="block w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors text-slate-900 font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="bg-slate-900 rounded-[2rem] shadow-xl p-8 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500 rounded-full blur-3xl opacity-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-emerald-500 rounded-full blur-3xl opacity-20 pointer-events-none" />

            <div className="relative z-10">
              <h3 className="text-lg font-medium text-slate-300 mb-2">Total Capital Needed</h3>
              <div className="text-5xl md:text-6xl font-extrabold tracking-tight mb-8">
                {CURRENCY_SYMBOL}
                {formatCurrency(grandTotal)}
              </div>

              <div className="mb-8">
                <div className="flex justify-between text-sm font-medium text-slate-300 mb-3">
                  <span>Budget Allocation</span>
                  <PieChart className="w-4 h-4" />
                </div>
                <div className="h-4 flex rounded-full overflow-hidden bg-slate-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${oneTimePct}%` }}
                    transition={{ duration: 0.5 }}
                    className="bg-emerald-500 h-full"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${runwayPct}%` }}
                    transition={{ duration: 0.5 }}
                    className="bg-blue-500 h-full"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${reservePct}%` }}
                    transition={{ duration: 0.5 }}
                    className="bg-amber-500 h-full"
                  />
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-slate-300">One-Time Costs</span>
                    </div>
                    <span className="font-semibold">{oneTimePct.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-slate-300">Runway ({runwayMonths}mo)</span>
                    </div>
                    <span className="font-semibold">{runwayPct.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="text-slate-300">Safety Net</span>
                    </div>
                    <span className="font-semibold">{reservePct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-800">
                <button
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isDownloadingPdf ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download Estimate as PDF
                    </>
                  )}
                </button>

                <button
                  onClick={handleSaveEstimate}
                  disabled={isSavingEstimate}
                  className="w-full py-4 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSavingEstimate ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save to Profile
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}