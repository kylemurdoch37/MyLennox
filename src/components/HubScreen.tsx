import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Search, 
  ChevronRight, 
  Utensils, 
  ShoppingBag, 
  Stethoscope, 
  Coffee, 
  Film, 
  Dumbbell, 
  Store, 
  Palette,
  Clock,
  MapPin,
  Star,
  Phone,
  Globe,
  ArrowLeft,
  Info,
  Calendar,
  Navigation,
  ArrowUpDown,
  Filter,
  ExternalLink,
  ChevronDown,
  LayoutGrid,
  List,
  Train,
  Home
} from 'lucide-react';
import { User, Hub, HubService, mockHubs } from '../mockData';
import { cn } from '../lib/utils';

interface HubScreenProps {
  user: User;
}

const CATEGORIES = [
  { id: 'food', name: 'Food', icon: Utensils, count: 25, color: 'bg-orange-100 text-orange-600' },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag, count: 48, color: 'bg-blue-100 text-blue-600' },
  { id: 'services', name: 'Services', icon: Stethoscope, count: 12, color: 'bg-green-100 text-green-600' },
  { id: 'cafes', name: 'Cafés', icon: Coffee, count: 8, color: 'bg-amber-100 text-amber-600' },
  { id: 'entertainment', name: 'Entertainment', icon: Film, count: 6, color: 'bg-purple-100 text-purple-600' },
  { id: 'fitness', name: 'Fitness', icon: Dumbbell, count: 3, color: 'bg-red-100 text-red-600' },
  { id: 'convenience', name: 'Convenience', icon: Store, count: 4, color: 'bg-teal-100 text-teal-600' },
  { id: 'culture', name: 'Culture', icon: Palette, count: 5, color: 'bg-indigo-100 text-indigo-600' },
];

export const HubScreen: React.FC<HubScreenProps> = ({ user }) => {
  const [selectedHubId, setSelectedHubId] = useState<string>(mockHubs.find(h => h.name === user.address.hub)?.id || mockHubs[0].id);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<HubService | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFloorPlan, setShowFloorPlan] = useState(false);
  const [showHubSelector, setShowHubSelector] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const currentHub = mockHubs.find(h => h.id === selectedHubId) || mockHubs[0];

  const filteredServices = currentHub.services.filter(s => {
    const matchesCategory = selectedCategory ? s.category === selectedCategory : true;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const allHubServices = mockHubs.flatMap(h => h.services.map(s => ({ ...s, hubName: h.name, hubId: h.id })));
  const crossHubSearchResults = searchQuery.length > 2 ? allHubServices.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  ) : [];

  const featuredServices = currentHub.services.filter(s => s.isOpen).slice(0, 4);

  const renderHubSelector = () => (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Select a Hub</h3>
          <button onClick={() => setShowHubSelector(false)} className="text-slate-400 hover:text-slate-600">
            <ArrowLeft size={24} />
          </button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
          {mockHubs.map((hub) => (
            <button
              key={hub.id}
              onClick={() => {
                setSelectedHubId(hub.id);
                setShowHubSelector(false);
                setSelectedCategory(null);
                setSelectedService(null);
              }}
              className={cn(
                "w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between group",
                selectedHubId === hub.id 
                  ? "bg-teal-50 border-teal-200 ring-1 ring-teal-200" 
                  : "bg-white border-slate-100 hover:border-teal-100"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  selectedHubId === hub.id ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600"
                )}>
                  <Building2 size={24} />
                </div>
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    {hub.name}
                    {hub.isResidence && (
                      <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Home</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {hub.retailerCount} retailers • {hub.travelTime}
                  </div>
                </div>
              </div>
              {selectedHubId === hub.id && (
                <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center text-white">
                  <ChevronRight size={16} />
                </div>
              )}
            </button>
          ))}
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <button 
            onClick={() => {
              setShowComparison(true);
              setShowHubSelector(false);
            }}
            className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
          >
            <ArrowUpDown size={18} />
            Compare All Hubs
          </button>
        </div>
      </motion.div>
    </div>
  );

  const renderComparison = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto"
    >
      <div className="p-4 sticky top-0 bg-slate-50/80 backdrop-blur-md z-10 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setShowComparison(false)} className="p-2 bg-white rounded-full shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-black italic tracking-tighter uppercase">Compare All Hubs</h2>
          <div className="w-10" />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['All', 'Fashion', 'Food', 'Services'].map(cat => (
            <button key={cat} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${cat === 'All' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-8">
        <section>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Overview</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hub</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Retailers</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Food</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Fashion</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Travel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {mockHubs.map(hub => (
                    <tr 
                      key={hub.id} 
                      onClick={() => {
                        setSelectedHubId(hub.id);
                        setShowComparison(false);
                      }}
                      className={`active:bg-slate-50 transition-colors ${hub.id === selectedHubId ? 'bg-teal-50/30' : ''}`}
                    >
                      <td className="p-4">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                          {hub.name.replace(' Hub', '')}
                          {hub.isResidence && <Home size={10} className="text-teal-600" />}
                        </div>
                      </td>
                      <td className="p-4 text-center text-xs font-bold text-slate-600">{hub.retailerCount}</td>
                      <td className="p-4 text-center text-xs font-bold text-slate-600">{hub.stats?.food}</td>
                      <td className="p-4 text-center text-xs font-bold text-slate-600">{hub.stats?.fashion}</td>
                      <td className="p-4">
                        <div className="text-[10px] font-bold text-teal-600 whitespace-nowrap">
                          {hub.travelTime}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Unique Highlights</h3>
          <div className="space-y-4">
            {mockHubs.filter(h => h.highlights && h.highlights.length > 0).map(hub => (
              <div key={hub.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-black italic uppercase tracking-tight text-slate-900">{hub.name}</h4>
                  <div className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">Exclusive Brands</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hub.highlights?.map(h => (
                    <div key={h} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg">
                      {h}
                    </div>
                  ))}
                  {hub.exclusiveBrands?.map(b => (
                    <div key={b} className="text-[10px] font-bold bg-teal-600 text-white px-3 py-1.5 rounded-lg">
                      {b}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );

  const renderLanding = () => (
    <div className="space-y-6 pb-20">
      {/* Hub Selector Header */}
      <div className="bg-slate-900 text-white -mx-4 -mt-4 p-6 rounded-b-[32px] shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black tracking-tighter italic">HUB SERVICES</h1>
          <button 
            onClick={() => setSearchQuery('')}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <Search size={20} />
          </button>
        </div>

        <div className="bg-white text-slate-900 rounded-2xl p-5 shadow-inner border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={14} className="text-teal-600" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Viewing Hub:</span>
          </div>
          
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">{currentHub.name}</h2>
            <button 
              onClick={() => setShowHubSelector(true)}
              className="text-xs font-bold text-teal-600 flex items-center gap-1 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100"
            >
              Change Hub <ChevronDown size={14} />
            </button>
          </div>

          <div className="h-px bg-slate-100 my-4" />

          <div className="flex items-center gap-3">
            {currentHub.isResidence && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">
                <Home size={12} />
                You live here
              </div>
            )}
            <div className="text-xs font-bold text-slate-500">
              {currentHub.retailerCount} retailers
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-green-600">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Open Now
            </div>
          </div>
        </div>
      </div>

      {/* Browse Other Hubs - Horizontal Scroll */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Browse Other Hubs</h3>
          <button 
            onClick={() => setShowComparison(true)}
            className="text-[10px] font-black text-teal-600 uppercase tracking-widest hover:underline"
          >
            Compare All
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          {mockHubs.filter(h => h.id !== selectedHubId).map(hub => (
            <button
              key={hub.id}
              onClick={() => setSelectedHubId(hub.id)}
              className="flex-shrink-0 w-32 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:border-teal-200 hover:shadow-md transition-all text-left"
            >
              <div className="text-xs font-bold text-slate-900 mb-1 line-clamp-1">{hub.name.replace(' Hub', '')}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-3">Hub</div>
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-600">{hub.retailerCount} retailers</div>
                <div className="text-[10px] font-medium text-teal-600 flex items-center gap-1">
                  <Train size={10} />
                  {hub.travelTime.split(' ')[0]} min
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Balloch Hub Special Highlights */}
      {selectedHubId === 'balloch' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">Hub Exclusive</span>
            </div>
            <h3 className="text-2xl font-black italic tracking-tighter mb-2 uppercase">American Retail Corridor</h3>
            <p className="text-sm text-blue-100 mb-4 leading-relaxed">
              Experience the only full-scale American retail experience in Lennox. Exclusive brands unavailable elsewhere in the UK or Europe.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {['Target', 'Chick-fil-A', 'Wendy\'s', 'Dave & Buster\'s'].map(brand => (
                <div key={brand} className="bg-white/10 backdrop-blur-sm rounded-xl p-2 text-center text-xs font-bold border border-white/10">
                  {brand}
                </div>
              ))}
            </div>
            <button 
              onClick={() => setSelectedCategory('shopping')}
              className="w-full mt-4 bg-white text-blue-700 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
            >
              Explore Level 2 & 3
            </button>
          </div>
        </motion.div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text"
          placeholder="Search shops, restaurants, services..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Cross-Hub Search Results */}
      {searchQuery.length > 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Search Results</h3>
            <span className="text-[10px] font-bold text-slate-400">{crossHubSearchResults.length} found across all hubs</span>
          </div>
          <div className="space-y-3">
            {crossHubSearchResults.map((result: any) => (
              <button
                key={`${result.hubId}-${result.id}`}
                onClick={() => {
                  setSelectedHubId(result.hubId);
                  setSelectedService(result);
                  setSearchQuery('');
                }}
                className="w-full bg-white border border-slate-100 rounded-xl p-3 flex gap-4 text-left hover:border-teal-200 transition-colors shadow-sm"
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={result.image} alt={result.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-0.5">
                    <h4 className="font-bold text-slate-900 truncate">{result.name}</h4>
                    <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded whitespace-nowrap">{result.hubName}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-1 truncate">{result.description}</p>
                  <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
                    <span className="flex items-center gap-1"><MapPin size={10} /> L{result.level}</span>
                    <span className="text-teal-600 font-bold">{result.priceRange}</span>
                    {result.isExclusive && <span className="text-amber-600 font-bold uppercase tracking-tighter">Exclusive</span>}
                  </div>
                </div>
              </button>
            ))}
            {crossHubSearchResults.length === 0 && (
              <div className="p-8 text-center bg-white border border-slate-100 rounded-2xl">
                <Search size={32} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm text-slate-500">No results found for "{searchQuery}"</p>
              </div>
            )}
          </div>
          <div className="h-px bg-slate-200 my-6" />
        </div>
      )}

      {/* Balloch Special: American Corridor */}
      {selectedHubId === 'balloch' && !searchQuery && null}

      {/* Categories Grid */}
      {!searchQuery && (
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 px-1">Browse by Category</h3>
          <div className="grid grid-cols-4 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-14 h-14 rounded-2xl ${cat.color} flex items-center justify-center shadow-sm group-active:scale-95 transition-transform`}>
                  <cat.icon size={24} />
                </div>
                <div className="text-center">
                  <div className="text-[11px] font-bold text-slate-800 leading-tight">{cat.name}</div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {cat.id === 'food' ? currentHub.stats.food : cat.id === 'fashion' ? currentHub.stats.fashion : cat.count}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Featured / Open Now */}
      {!searchQuery && (
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Featured / Open Now</h3>
            <button className="text-xs font-bold text-teal-600 hover:text-teal-700">View All</button>
          </div>
          <div className="space-y-3">
            {featuredServices.map((service) => (
              <button
                key={service.id}
                onClick={() => setSelectedService(service)}
                className="w-full bg-white border border-slate-100 rounded-xl p-3 flex gap-4 text-left hover:border-teal-200 transition-colors shadow-sm"
              >
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={service.image} alt={service.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-0.5">
                    <h4 className="font-bold text-slate-900 truncate">{service.name}</h4>
                    {service.isExclusive && (
                      <div className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
                        <Star size={10} fill="currentColor" />
                        <span>EXCLUSIVE</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-1 truncate">{service.description}</p>
                  <div className="flex items-center gap-3 text-[10px] font-medium text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      Level {service.level}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {service.hours}
                    </span>
                    <span className="text-teal-600 font-bold">{service.priceRange}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hub Info Links */}
      {!searchQuery && (
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setShowFloorPlan(true)}
            className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-teal-200 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
              <Navigation size={20} />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900">Floor Plan</div>
              <div className="text-[10px] text-slate-400">Navigate the Hub</div>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-teal-200 transition-colors">
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
              <Calendar size={20} />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900">Events</div>
              <div className="text-[10px] text-slate-400">What's on today</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );

  const renderCategory = (catId: string) => {
    const category = CATEGORIES.find(c => c.id === catId);
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedCategory(null)}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{category?.name}</h2>
              <p className="text-sm text-slate-500">{currentHub.name} • {filteredServices.length} stores</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600"
            >
              {viewMode === 'grid' ? <List size={20} /> : <LayoutGrid size={20} />}
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['All', 'Open Now', 'Price', 'Rating', 'Exclusive'].map((filter) => (
            <button key={filter} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 whitespace-nowrap">
              {filter}
            </button>
          ))}
        </div>

        <div className={cn("grid gap-4", viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
          {filteredServices.map((service) => (
            <div key={service.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm group">
              <div className="h-40 relative overflow-hidden">
                <img src={service.image} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-bold text-amber-500 shadow-sm">
                  <Star size={12} fill="currentColor" />
                  <span>{service.rating}</span>
                </div>
                {service.isExclusive && (
                  <div className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                    Exclusive
                  </div>
                )}
                {service.isOpen && (
                  <div className="absolute bottom-3 left-3 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                    Open Now
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{service.name}</h3>
                    <p className="text-xs text-slate-500">{service.tags.join(' • ')}</p>
                  </div>
                  <div className="text-teal-600 font-bold">{service.priceRange}</div>
                </div>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{service.description}</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedService(service)}
                    className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors"
                  >
                    View Details
                  </button>
                  <button className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-teal-600 transition-colors">
                    <Star size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderServiceDetail = (service: HubService) => (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setSelectedService(null)}
          className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex gap-2">
          <button className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600">
            <Star size={20} />
          </button>
          <button className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600">
            <Globe size={20} />
          </button>
        </div>
      </div>

      <div className="rounded-3xl overflow-hidden h-64 shadow-lg">
        <img src={service.image} alt={service.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">{service.name}</h1>
          {service.isExclusive && (
            <div className="bg-amber-50 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-100">
              EXCLUSIVE
            </div>
          )}
          {service.specialInfo?.includes('Michelin') && (
            <div className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded border border-red-100">
              MICHELIN
            </div>
          )}
        </div>
        <p className="text-slate-500 text-sm mb-4">{service.tags.join(' • ')} • Level {service.level}, {currentHub.name}</p>
        
        <div className="flex items-center gap-6 mb-6">
          <div>
            <div className="flex items-center gap-1 text-amber-500 mb-0.5">
              <Star size={16} fill="currentColor" />
              <span className="font-bold text-slate-900">{service.rating}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{service.reviews} Reviews</div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div>
            <div className="font-bold text-slate-900 mb-0.5">{service.priceRange}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Price Range</div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div>
            <div className="font-bold text-green-600 mb-0.5">Open</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Until 10 PM</div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 space-y-4">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-slate-400 mt-0.5" />
            <p className="text-sm text-slate-600 leading-relaxed">{service.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-slate-400" />
            <div className="text-sm text-slate-600 font-medium">{service.hours}</div>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={18} className="text-slate-400" />
            <div className="text-sm text-slate-600 font-medium">{service.phone}</div>
          </div>
          {service.brandOrigin && (
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-slate-400" />
              <div className="text-sm text-slate-600 font-medium">Origin: {service.brandOrigin}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className="py-4 bg-teal-600 text-white rounded-2xl font-bold shadow-lg shadow-teal-900/20 hover:bg-teal-700 transition-all flex items-center justify-center gap-2">
          <Calendar size={18} />
          Book Now
        </button>
        <button className="py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
          <Navigation size={18} />
          Directions
        </button>
      </div>

      {service.specialInfo && (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
          <Star size={20} className="text-amber-500 flex-shrink-0" />
          <div>
            <div className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-0.5">Special Note</div>
            <p className="text-sm text-amber-800">{service.specialInfo}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderFloorPlan = () => (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setShowFloorPlan(false)}
          className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-slate-900">Hub Floor Plan</h2>
        <div className="w-10" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['L1', 'L2', 'L3', 'B1 Metro', 'L7 (Home)'].map((level) => (
          <button key={level} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${level === 'L1' ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            {level}
          </button>
        ))}
      </div>

      <div className="aspect-square bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="w-full h-full grid grid-cols-8 grid-rows-8">
            {Array.from({ length: 64 }).map((_, i) => (
              <div key={i} className="border border-slate-400" />
            ))}
          </div>
        </div>
        
        {/* Mock Floor Plan Shapes */}
        <div className="relative w-full h-full p-8">
          <div className="absolute top-1/4 left-1/4 w-1/4 h-1/4 bg-blue-100 border-2 border-blue-300 rounded-lg flex items-center justify-center text-[10px] font-bold text-blue-600">7-Eleven</div>
          <div className="absolute top-1/4 right-1/4 w-1/4 h-1/3 bg-green-100 border-2 border-green-300 rounded-lg flex items-center justify-center text-[10px] font-bold text-green-600 text-center">Tesco<br/>Metro</div>
          <div className="absolute bottom-1/4 left-1/3 w-1/3 h-1/4 bg-amber-100 border-2 border-amber-300 rounded-full flex items-center justify-center text-[10px] font-bold text-amber-600">Central Atrium</div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="w-4 h-4 bg-teal-600 rounded-full animate-ping absolute inset-0" />
              <div className="w-4 h-4 bg-teal-600 rounded-full relative border-2 border-white shadow-lg" />
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">YOU ARE HERE</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-blue-400" />
          <span className="text-xs font-medium text-slate-600">Shopping</span>
        </div>
        <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-orange-400" />
          <span className="text-xs font-medium text-slate-600">Food</span>
        </div>
        <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="text-xs font-medium text-slate-600">Services</span>
        </div>
        <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-teal-400" />
          <span className="text-xs font-medium text-slate-600">Lifts / Metro</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-14">
      <AnimatePresence mode="wait">
        {showHubSelector && renderHubSelector()}
        
        {showComparison ? (
          <motion.div
            key="comparison"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderComparison()}
          </motion.div>
        ) : showFloorPlan ? (
          <motion.div
            key="floorplan"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderFloorPlan()}
          </motion.div>
        ) : selectedService ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderServiceDetail(selectedService)}
          </motion.div>
        ) : selectedCategory ? (
          <motion.div
            key="category"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderCategory(selectedCategory)}
          </motion.div>
        ) : (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderLanding()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
