import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, HelpCircle } from 'lucide-react';

type Category = 'All' | 'Startup Basics' | 'Platform Help' | 'Legal & Funding';

interface FAQItem {
  id: string;
  category: Category;
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    id: '1',
    category: 'Startup Basics',
    question: 'I have an idea but no money. Where do I start?',
    answer:
      "Focus on validating your idea through customer interviews and use our 'Gov Schemes' section for seed funding.",
  },
  {
    id: '2',
    category: 'Startup Basics',
    question: 'Do I need to register a company immediately?',
    answer:
      'Not always. You can start as a sole proprietorship or wait until you have a Minimum Viable Product.',
  },
  {
    id: '3',
    category: 'Platform Help',
    question: 'How does the AI Idea Generator work?',
    answer:
      'It uses the Google Gemini API to analyze your skills and budget to suggest viable business models.',
  },
  {
    id: '4',
    category: 'Platform Help',
    question: 'Can I save my cost calculations for later?',
    answer:
      "Yes, once you hit 'Save,' it will appear in your Dashboard under 'Saved Plans'.",
  },
  {
    id: '5',
    category: 'Legal & Funding',
    question: "What is a 'Seed Fund'?",
    answer:
      "It is the initial capital used to start a business, often coming from the founders' assets or government grants.",
  },
  {
    id: '6',
    category: 'Legal & Funding',
    question: 'How do I apply for Government Schemes?',
    answer:
      "Click on any scheme in our 'Schemes' section to see the eligibility and the direct application link.",
  },
];

const categories: Category[] = ['All', 'Startup Basics', 'Platform Help', 'Legal & Funding'];

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = activeCategory === 'All' || faq.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-100 rounded-full mb-2">
          <HelpCircle className="w-8 h-8 text-emerald-600" />
        </div>

        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Frequently Asked Questions
        </h1>

        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Find answers to common questions about starting your business, using our platform,
          and securing funding.
        </p>
      </div>

      <div className="space-y-6">
        <div className="relative max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>

          <input
            type="text"
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base shadow-sm transition-shadow hover:shadow-md"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === category
                  ? 'bg-slate-900 text-white shadow-md scale-105'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredFaqs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredFaqs.map((faq) => (
              <div key={faq.id} className="group">
                <button
                  onClick={() => toggleAccordion(faq.id)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between focus:outline-none focus-visible:bg-slate-50 transition-colors hover:bg-slate-50/50"
                >
                  <span className="text-lg font-semibold text-slate-900 pr-8">
                    {faq.question}
                  </span>

                  <div
                    className={`flex-shrink-0 ml-4 p-1 rounded-full transition-colors ${
                      openId === faq.id
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                    }`}
                  >
                    <ChevronDown
                      className={`w-5 h-5 transition-transform duration-300 ease-in-out ${
                        openId === faq.id ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </div>
                </button>

                <AnimatePresence>
                  {openId === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden bg-slate-50/80"
                    >
                      <div className="px-6 pb-6 pt-2 text-slate-600 leading-relaxed border-l-4 border-emerald-500 ml-6 mb-4 bg-white p-4 rounded-r-xl shadow-sm">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-6">
            <Search className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No matching questions found</h3>
            <p className="mt-2 text-slate-500">
              We couldn't find any FAQs matching your search criteria.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('All');
              }}
              className="mt-6 px-4 py-2 bg-emerald-50 text-emerald-700 font-medium rounded-lg hover:bg-emerald-100 transition-colors"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}