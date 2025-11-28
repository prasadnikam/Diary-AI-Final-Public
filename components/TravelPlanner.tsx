
import React, { useState } from 'react';
import { JournalEntry, Trip } from '../types';
import { extractTravelIntent, getTravelRecommendations } from '../services/geminiService';
import { Map, MapPin, Compass, Search, Loader2, Plane, ExternalLink, Calendar, Star, ArrowRight, Camera, ArrowLeft } from 'lucide-react';

interface TravelPlannerProps {
  entries: JournalEntry[];
}

export const TravelPlanner: React.FC<TravelPlannerProps> = ({ entries }) => {
  const [destinations, setDestinations] = useState<string[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  const handleAnalyzeDiary = async () => {
    setLoadingDestinations(true);
    try {
      const results = await extractTravelIntent(entries);
      setDestinations(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDestinations(false);
    }
  };

  const handlePlanTrip = async (destination: string) => {
    setLoadingTrip(true);
    setActiveTrip(null);
    setMobileView('detail');
    try {
      const trip = await getTravelRecommendations(destination);
      setActiveTrip(trip);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTrip(false);
    }
  };

  const handleBackToList = () => {
    setMobileView('list');
  };

  return (
    <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-2rem)] flex gap-0 overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-2xl relative">
      
      {/* Sidebar - Elegant & Minimal */}
      <div className={`${mobileView === 'list' ? 'flex' : 'hidden md:flex'} w-full md:w-80 flex-shrink-0 flex-col bg-slate-50/50 border-r border-slate-100 z-10 backdrop-blur-xl`}>
        <div className="p-8 pb-4">
          <h2 className="text-2xl font-serif font-bold text-slate-800 flex items-center gap-2 mb-1">
            <Compass className="w-6 h-6 text-emerald-600" />
            Wanderlust
          </h2>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Travel Planner</p>
        </div>

        <div className="px-6 pb-6">
          <div className="relative group">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Dream destination..."
              className="w-full bg-white border border-slate-200 rounded-full py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
              onKeyDown={(e) => e.key === 'Enter' && handlePlanTrip(searchQuery)}
            />
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-6">
          {/* Analyze Section */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-700 text-sm">Diary Insights</h3>
              <SparklesIcon className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Find travel inspiration hidden in your daily reflections.
            </p>
            <button
              onClick={handleAnalyzeDiary}
              disabled={loadingDestinations}
              className="w-full bg-slate-900 text-white hover:bg-slate-800 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {loadingDestinations ? <Loader2 className="w-4 h-4 animate-spin" /> : "Discover Ideas"}
            </button>
          </div>

          {/* Suggestions List */}
          {destinations.length > 0 && (
            <div>
              <h3 className="px-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recommended</h3>
              <div className="space-y-1">
                {destinations.map((dest, i) => (
                  <button
                    key={i}
                    onClick={() => handlePlanTrip(dest)}
                    className="w-full text-left p-3 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all group flex items-center justify-between"
                  >
                    <span className="font-serif text-slate-700 group-hover:text-emerald-700">{dest}</span>
                    <ArrowRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer info */}
        <div className="p-6 text-xs text-slate-400 border-t border-slate-100 text-center">
           Powered by Google Maps & Gemini
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`${mobileView === 'detail' ? 'flex' : 'hidden md:flex'} flex-1 relative bg-white overflow-hidden flex-col`}>
        {!activeTrip && !loadingTrip ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                   <Plane className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-2xl font-serif text-slate-700 mb-2">Ready for takeoff?</h3>
                <p className="text-slate-500 max-w-md text-center px-4">Select a destination or search for a place to generate a complete visual itinerary.</p>
            </div>
        ) : loadingTrip ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-50">
                <div className="relative">
                   <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <Plane className="w-6 h-6 text-emerald-500 animate-pulse" />
                   </div>
                </div>
                <h3 className="mt-6 text-lg font-serif text-slate-700">Curating your experience...</h3>
                <p className="text-sm text-slate-400 mt-2">Generating visuals & itinerary</p>
            </div>
        ) : activeTrip && (
            <div className="flex-1 overflow-y-auto scroll-smooth">
                {/* Hero Section */}
                <div className="relative h-[45vh] w-full group">
                    {/* Back Button for Mobile */}
                    <button 
                        onClick={handleBackToList}
                        className="absolute top-4 left-4 z-20 md:hidden p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    
                    {activeTrip.imageUrl ? (
                        <img 
                          src={activeTrip.imageUrl} 
                          alt={activeTrip.destination} 
                          className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-emerald-800 to-teal-900" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    <div className="absolute bottom-0 left-0 w-full p-6 md:p-12">
                        <div className="max-w-4xl mx-auto">
                           <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white/90 text-xs font-bold uppercase tracking-wider mb-4">
                              <MapPin className="w-3 h-3" />
                              Travel Guide
                           </div>
                           <h1 className="text-4xl md:text-7xl font-serif font-bold text-white mb-4 tracking-tight shadow-sm">
                              {activeTrip.destination}
                           </h1>
                           <div className="flex flex-wrap items-center gap-4 md:gap-6 text-white/80 text-sm font-medium">
                              <span className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> 5 Day Itinerary
                              </span>
                              <span className="flex items-center gap-2">
                                <Camera className="w-4 h-4" /> Scenic Spots
                              </span>
                              <span className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Top Rated
                              </span>
                           </div>
                        </div>
                    </div>
                </div>

                {/* Content Container */}
                <div className="max-w-4xl mx-auto px-6 py-8 md:px-8 md:py-12">
                    
                    {/* Intro / AI Description */}
                    <div className="mb-12 md:mb-16">
                       <div className="flex items-start gap-4">
                          <span className="text-4xl md:text-6xl font-serif text-emerald-200 leading-[0.5] font-bold">"</span>
                          <div className="prose prose-lg prose-slate text-slate-600 font-serif leading-relaxed">
                              {/* We render the text description cleanly */}
                              <p className="whitespace-pre-line">{activeTrip.description}</p>
                          </div>
                       </div>
                    </div>

                    {/* Places Grid */}
                    <div className="space-y-8">
                        <div className="flex items-end justify-between border-b border-slate-100 pb-4">
                           <h3 className="text-2xl font-serif font-bold text-slate-800">Curated Spots</h3>
                           <span className="text-sm text-slate-400">Google Maps Selection</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {activeTrip.places.map((place, idx) => (
                                <div key={idx} className="group bg-white rounded-2xl p-6 border border-slate-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                       <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                          <MapPin className="w-5 h-5" />
                                       </div>
                                       {place.rating && (
                                         <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-md text-xs font-bold">
                                            <Star className="w-3 h-3 fill-current" />
                                            {place.rating}
                                         </div>
                                       )}
                                    </div>
                                    
                                    <h4 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-emerald-700 transition-colors">
                                      {place.title}
                                    </h4>
                                    
                                    {place.address && (
                                      <p className="text-sm text-slate-500 mb-6 flex-1">{place.address}</p>
                                    )}
                                    
                                    <a 
                                        href={place.uri} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center justify-center w-full py-3 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold group-hover:bg-emerald-600 group-hover:text-white transition-all"
                                    >
                                        View on Map
                                        <ExternalLink className="w-4 h-4 ml-2" />
                                    </a>
                                </div>
                            ))}
                        </div>

                        {activeTrip.places.length === 0 && (
                            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <Map className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500">Explore the map links in the description above for exact locations.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M9 3v4" />
    <path d="M7 5h4" />
  </svg>
);
