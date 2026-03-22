import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lightbulb, Calculator, BookOpen, ArrowRight, CheckCircle2 } from 'lucide-react';
import SuccessStoriesCarousel from '../components/SuccessStoriesCarousel';

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Public Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-600 p-2 rounded-xl">
                <Lightbulb className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900 tracking-tight">
                StartupGuide
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-slate-600 hover:text-slate-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="bg-emerald-600 text-white hover:bg-emerald-700 px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm hover:shadow-md"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100/50 via-white to-white -z-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-tight">
              Turn Your Vision into a <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Venture</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              The all-in-one platform for aspiring entrepreneurs. Generate ideas, calculate costs, and find government schemes to launch your startup with confidence.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/signup"
                className="bg-emerald-600 text-white hover:bg-emerald-700 px-8 py-4 rounded-full text-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                Get Started <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Success Stories Carousel */}
      <section className="py-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 text-center">
          <h2 className="text-3xl font-bold text-slate-900">Success Stories</h2>
          <p className="text-slate-600 mt-2">See how others turned their ideas into reality</p>
        </div>
        <SuccessStoriesCarousel />
      </section>

      {/* Mission Section */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-sm font-bold tracking-widest text-emerald-600 uppercase mb-4">Our Mission</h2>
          <p className="text-3xl md:text-4xl font-medium text-slate-900 leading-snug">
            "Democratizing entrepreneurship by providing the tools, data, and guidance needed to launch with confidence."
          </p>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              <p className="text-slate-600">Remove the guesswork from starting a business.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              <p className="text-slate-600">Provide accurate financial forecasting.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              <p className="text-slate-600">Connect founders with vital funding opportunities.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Overview */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Everything you need to start</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Powerful tools designed specifically for early-stage founders and aspiring entrepreneurs.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
                <Lightbulb className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">AI Idea Generator</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Stuck for ideas? Our AI analyzes market trends, your skills, and capital to suggest viable business concepts tailored to you.
              </p>
              <Link to="/signup" className="text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1">
                Try it out <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Calculator className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Startup Cost Calculator</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Plan your finances before you spend a dime. Estimate initial investments, operational costs, and projected runway.
              </p>
              <Link to="/signup" className="text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1">
                Calculate costs <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <BookOpen className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Gov Schemes Directory</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Don't miss out on free money. Discover grants, subsidies, and support programs available for your specific business type.
              </p>
              <Link to="/signup" className="text-purple-600 font-medium hover:text-purple-700 flex items-center gap-1">
                Find schemes <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="h-6 w-6 text-emerald-500" />
                <span className="font-bold text-xl text-white tracking-tight">
                  StartupGuide
                </span>
              </div>
              <p className="text-slate-400 max-w-sm">
                Empowering the next generation of founders with data, tools, and guidance.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Tools</h4>
              <ul className="space-y-2">
                <li><Link to="/signup" className="hover:text-white transition-colors">Idea Generator</Link></li>
                <li><Link to="/signup" className="hover:text-white transition-colors">Cost Calculator</Link></li>
                <li><Link to="/signup" className="hover:text-white transition-colors">Gov Schemes</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Account</h4>
              <ul className="space-y-2">
                <li><Link to="/login" className="hover:text-white transition-colors">Log in</Link></li>
                <li><Link to="/signup" className="hover:text-white transition-colors">Sign up</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-sm text-slate-500 flex flex-col md:flex-row justify-between items-center">
            <p>&copy; {new Date().getFullYear()} StartupGuide. All rights reserved.</p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
