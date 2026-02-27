import { Calendar, Download, Search, TrendingUp, Minus, Loader2, ChevronDown, Check, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const data = [
  { name: 'Sep 01', gpt4: 4000, claude: 2400 },
  { name: 'Sep 05', gpt4: 3000, claude: 1398 },
  { name: 'Sep 10', gpt4: 2000, claude: 9800 },
  { name: 'Sep 15', gpt4: 2780, claude: 3908 },
  { name: 'Sep 20', gpt4: 1890, claude: 4800 },
  { name: 'Sep 25', gpt4: 2390, claude: 3800 },
  { name: 'Sep 30', gpt4: 3490, claude: 4300 },
];

export function Usage() {
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [isModelBreakdownLoading, setIsModelBreakdownLoading] = useState(true);
  const [isMetricsLoading, setIsMetricsLoading] = useState(true);
  const [isLogLoading, setIsLogLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [activeMetric, setActiveMetric] = useState<'Tokens' | 'Requests' | 'Costs'>('Tokens');

  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isKeyDropdownOpen, setIsKeyDropdownOpen] = useState(false);

  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const keyDropdownRef = useRef<HTMLDivElement>(null);

  const availableModels = ['GPT-4o', 'Claude 3.5 Sonnet', 'Gemini 1.5 Pro'];
  const availableKeys = ['Production-Main', 'Staging-Test', 'Dev-Personal'];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      if (keyDropdownRef.current && !keyDropdownRef.current.contains(event.target as Node)) {
        setIsKeyDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsChartLoading(true);
    setIsModelBreakdownLoading(true);
    setIsMetricsLoading(true);
    setIsLogLoading(true);

    const t1 = setTimeout(() => setIsMetricsLoading(false), 400);
    const t2 = setTimeout(() => setIsChartLoading(false), 800);
    const t3 = setTimeout(() => setIsModelBreakdownLoading(false), 1200);
    const t4 = setTimeout(() => setIsLogLoading(false), 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [dateRange]);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <header className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold text-text-primary">Usage Analytics</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none pl-9 pr-8 py-1.5 bg-surface border border-surface-border rounded-md text-sm font-medium text-text-secondary hover:bg-surface-border/50 transition-all focus:ring-primary focus:border-primary outline-none cursor-pointer"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="custom">Custom Range...</option>
            </select>
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>
          <button className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white rounded-md text-sm font-semibold shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5 relative min-w-[240px]" ref={modelDropdownRef}>
          <label className="text-[11px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1">
            Filter by Model
          </label>
          <div 
            className="w-full bg-surface border border-surface-border text-text-primary text-sm rounded-md py-2 px-3 cursor-pointer flex justify-between items-center hover:border-surface-border/80 transition-colors shadow-sm"
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
          >
            <span className="truncate pr-4 font-medium">
              {selectedModels.length === 0 ? 'All Models' : `${selectedModels.length} Models Selected`}
            </span>
            <ChevronDown className="w-4 h-4 text-text-secondary flex-shrink-0" />
          </div>
          <AnimatePresence>
            {isModelDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-2 w-full bg-surface border border-surface-border rounded-md shadow-xl z-20 py-1 max-h-60 overflow-y-auto"
              >
                {selectedModels.length > 0 && (
                  <div className="px-3 py-2 border-b border-surface-border flex justify-between items-center bg-surface-border/5">
                    <span className="text-xs text-text-secondary font-medium">{selectedModels.length} selected</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedModels([]); }} 
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                )}
                {availableModels.map(model => (
                  <label key={model} className="flex items-center px-3 py-2.5 hover:bg-surface-border/10 cursor-pointer gap-3 group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedModels.includes(model) ? 'bg-primary border-primary text-white' : 'border-surface-border group-hover:border-primary/50'}`}>
                      {selectedModels.includes(model) && <Check className="w-3 h-3" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={selectedModels.includes(model)}
                      onChange={() => {
                        if (selectedModels.includes(model)) setSelectedModels(selectedModels.filter(m => m !== model));
                        else setSelectedModels([...selectedModels, model]);
                      }}
                    />
                    <span className="text-sm text-text-primary">{model}</span>
                  </label>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-1.5 relative min-w-[240px]" ref={keyDropdownRef}>
          <label className="text-[11px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1">
            Filter by API Key
          </label>
          <div 
            className="w-full bg-surface border border-surface-border text-text-primary text-sm rounded-md py-2 px-3 cursor-pointer flex justify-between items-center hover:border-surface-border/80 transition-colors shadow-sm"
            onClick={() => setIsKeyDropdownOpen(!isKeyDropdownOpen)}
          >
            <span className="truncate pr-4 font-medium">
              {selectedKeys.length === 0 ? 'All Keys' : `${selectedKeys.length} Keys Selected`}
            </span>
            <ChevronDown className="w-4 h-4 text-text-secondary flex-shrink-0" />
          </div>
          <AnimatePresence>
            {isKeyDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-2 w-full bg-surface border border-surface-border rounded-md shadow-xl z-20 py-1 max-h-60 overflow-y-auto"
              >
                {selectedKeys.length > 0 && (
                  <div className="px-3 py-2 border-b border-surface-border flex justify-between items-center bg-surface-border/5">
                    <span className="text-xs text-text-secondary font-medium">{selectedKeys.length} selected</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedKeys([]); }} 
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                )}
                {availableKeys.map(key => (
                  <label key={key} className="flex items-center px-3 py-2.5 hover:bg-surface-border/10 cursor-pointer gap-3 group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedKeys.includes(key) ? 'bg-primary border-primary text-white' : 'border-surface-border group-hover:border-primary/50'}`}>
                      {selectedKeys.includes(key) && <Check className="w-3 h-3" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={selectedKeys.includes(key)}
                      onChange={() => {
                        if (selectedKeys.includes(key)) setSelectedKeys(selectedKeys.filter(k => k !== key));
                        else setSelectedKeys([...selectedKeys, key]);
                      }}
                    />
                    <span className="text-sm text-text-primary">{key}</span>
                  </label>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="ml-auto flex items-center p-1 bg-surface-border/10 rounded-lg border border-surface-border/50 shadow-inner">
          {['Tokens', 'Requests', 'Costs'].map((metric) => (
            <button
              key={metric}
              onClick={() => setActiveMetric(metric as any)}
              className={`relative px-5 py-2 text-xs font-bold rounded-md transition-all ${
                activeMetric === metric ? 'text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface-border/10'
              }`}
            >
              {activeMetric === metric && (
                <motion.div
                  layoutId="activeMetric"
                  className="absolute inset-0 bg-surface border border-surface-border rounded-md"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 tracking-wide">{metric}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-surface-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-widest">
              {activeMetric === 'Tokens' ? 'Token Consumption' : activeMetric === 'Requests' ? 'API Requests' : 'Total Costs'}
            </h3>
            <div className="flex items-baseline gap-3 mt-1">
              <p className="text-2xl font-bold font-mono text-primary">
                {activeMetric === 'Tokens' ? '2,042,593' : activeMetric === 'Requests' ? '14,205' : '$4,282.50'}
              </p>
              <div className="flex items-center text-secondary gap-1 text-xs font-medium bg-secondary/10 px-2 py-1 rounded-md border border-secondary/20">
                <TrendingUp className="w-3 h-3" />
                <span>14.5% vs previous period</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              <span className="text-xs text-text-secondary">GPT-4o</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="text-xs text-text-secondary">Claude 3.5</span>
            </div>
          </div>
        </div>
        <div className="h-[300px] w-full">
          {isChartLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-surface-border/5 rounded-lg animate-pulse">
              <Loader2 className="w-8 h-8 text-text-secondary animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGpt4Usage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorClaudeUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--surface-border)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500 }}
                  labelStyle={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}
                  cursor={{ stroke: 'var(--surface-border)', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="claude" stroke="var(--secondary)" fillOpacity={1} fill="url(#colorClaudeUsage)" strokeWidth={2} />
                <Area type="monotone" dataKey="gpt4" stroke="var(--primary)" fillOpacity={1} fill="url(#colorGpt4Usage)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Model Breakdown Table */}
      <div className="bg-surface border border-surface-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-surface-border">
          <h3 className="font-bold text-text-primary">Model Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-border/10 border-b border-surface-border">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Model</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right group/th cursor-help" title="Total number of tokens sent in requests">
                  <div className="flex items-center justify-end gap-1">
                    Input Tokens
                    <Info className="w-3 h-3 opacity-50 group-hover/th:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right group/th cursor-help" title="Total number of tokens generated in responses">
                  <div className="flex items-center justify-end gap-1">
                    Output Tokens
                    <Info className="w-3 h-3 opacity-50 group-hover/th:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right group/th cursor-help" title="Total cost incurred for this model">
                  <div className="flex items-center justify-end gap-1">
                    Total Cost
                    <Info className="w-3 h-3 opacity-50 group-hover/th:opacity-100 transition-opacity" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-surface-border/30">
              {isModelBreakdownLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-border/20 rounded animate-pulse w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-border/20 rounded animate-pulse w-20 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-border/20 rounded animate-pulse w-20 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-border/20 rounded animate-pulse w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : (
                <>
                  <tr className="hover:bg-surface-border/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        <span className="text-sm font-medium text-text-primary">GPT-4o</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-text-secondary">520,105</td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-text-secondary">800,488</td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-bold text-text-primary">$2,840.50</td>
                  </tr>
                  <tr className="hover:bg-surface-border/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-secondary"></span>
                        <span className="text-sm font-medium text-text-primary">Claude 3.5 Sonnet</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-text-secondary">210,000</td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-text-secondary">350,000</td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-bold text-text-primary">$1,120.00</td>
                  </tr>
                  <tr className="hover:bg-surface-border/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-warning"></span>
                        <span className="text-sm font-medium text-text-primary">Gemini 1.5 Pro</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-text-secondary">112,000</td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-text-secondary">50,000</td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-bold text-text-primary">$322.00</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface border border-surface-border p-6 rounded-xl hover:border-surface-border/80 transition-colors">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Input Tokens</p>
          {isMetricsLoading ? (
            <div className="h-9 bg-surface-border/20 rounded animate-pulse w-32 mt-1"></div>
          ) : (
            <>
              <p className="text-3xl font-bold font-mono text-text-primary">842,105</p>
              <div className="mt-4 flex items-center text-secondary gap-1 text-xs">
                <TrendingUp className="w-3 h-3" />
                <span>12.4% vs last mo</span>
              </div>
            </>
          )}
        </div>
        <div className="bg-surface border border-surface-border p-6 rounded-xl hover:border-surface-border/80 transition-colors">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Output Tokens</p>
          {isMetricsLoading ? (
            <div className="h-9 bg-surface-border/20 rounded animate-pulse w-32 mt-1"></div>
          ) : (
            <>
              <p className="text-3xl font-bold font-mono text-text-primary">1,200,488</p>
              <div className="mt-4 flex items-center text-secondary gap-1 text-xs">
                <TrendingUp className="w-3 h-3" />
                <span>8.2% vs last mo</span>
              </div>
            </>
          )}
        </div>
        <div className="bg-surface border border-surface-border p-6 rounded-xl hover:border-surface-border/80 transition-colors">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Total Cost</p>
          {isMetricsLoading ? (
            <div className="h-9 bg-surface-border/20 rounded animate-pulse w-32 mt-1"></div>
          ) : (
            <>
              <p className="text-3xl font-bold font-mono text-text-primary">$4,282.50</p>
              <div className="mt-4 flex items-center text-destructive gap-1 text-xs">
                <TrendingUp className="w-3 h-3" />
                <span>24.1% vs last mo</span>
              </div>
            </>
          )}
        </div>
        <div className="bg-surface border border-surface-border p-6 rounded-xl hover:border-surface-border/80 transition-colors group/card relative">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Avg Cost/Req</p>
            <div className="cursor-help" title="Calculated by dividing Total Cost by the Total Number of Requests in the selected period.">
              <Info className="w-4 h-4 text-text-secondary opacity-50 group-hover/card:opacity-100 transition-opacity" />
            </div>
          </div>
          {isMetricsLoading ? (
            <div className="h-9 bg-surface-border/20 rounded animate-pulse w-24 mt-1"></div>
          ) : (
            <>
              <p className="text-3xl font-bold font-mono text-text-primary">$0.04</p>
              <div className="mt-4 flex flex-col gap-1">
                <div className="flex items-center text-text-secondary gap-1 text-xs">
                  <Minus className="w-3 h-3" />
                  <span>No change vs last mo</span>
                </div>
                <div className="flex items-center text-warning gap-1 text-xs mt-1 pt-2 border-t border-surface-border/50">
                  <TrendingUp className="w-3 h-3" />
                  <span>+15% vs org average ($0.035)</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-surface border border-surface-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-surface-border flex items-center justify-between">
          <h3 className="font-bold text-text-primary">Recent Request Log</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4" />
              <input className="bg-bg-primary border border-surface-border rounded-md text-xs pl-9 py-2 w-64 focus:ring-primary focus:border-primary outline-none text-text-primary" placeholder="Search requests..." type="text"/>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-border/10 border-b border-surface-border">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Model</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Input Tokens</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Output Tokens</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {isLogLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-border/20 rounded animate-pulse w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-border/20 rounded animate-pulse w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-border/20 rounded animate-pulse w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-border/20 rounded animate-pulse w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-border/20 rounded animate-pulse w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : (
                <>
                  <tr className="hover:bg-surface-border/20 transition-colors group even:bg-surface-border/5">
                    <td className="px-6 py-4 text-xs font-mono text-text-secondary">2023-10-12 14:23:45</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        <span className="text-sm font-medium text-text-primary">GPT-4o</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-text-primary">1,240</td>
                    <td className="px-6 py-4 font-mono text-sm text-text-primary">3,502</td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-bold text-text-primary">$0.142</td>
                  </tr>
                  <tr className="hover:bg-surface-border/20 transition-colors group even:bg-surface-border/5">
                    <td className="px-6 py-4 text-xs font-mono text-text-secondary">2023-10-12 14:22:11</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-secondary"></span>
                        <span className="text-sm font-medium text-text-primary">Claude 3.5 Sonnet</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-text-primary">842</td>
                    <td className="px-6 py-4 font-mono text-sm text-text-primary">512</td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-bold text-text-primary">$0.041</td>
                  </tr>
                  <tr className="hover:bg-surface-border/20 transition-colors group even:bg-surface-border/5">
                    <td className="px-6 py-4 text-xs font-mono text-text-secondary">2023-10-12 14:19:55</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        <span className="text-sm font-medium text-text-primary">GPT-4o</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-text-primary">4,102</td>
                    <td className="px-6 py-4 font-mono text-sm text-text-primary">124</td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-bold text-text-primary">$0.126</td>
                  </tr>
                  <tr className="hover:bg-surface-border/20 transition-colors group even:bg-surface-border/5">
                    <td className="px-6 py-4 text-xs font-mono text-text-secondary">2023-10-12 14:15:32</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-warning"></span>
                        <span className="text-sm font-medium text-text-primary">Gemini 1.5 Pro</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-text-primary">552</td>
                    <td className="px-6 py-4 font-mono text-sm text-text-primary">2,110</td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-bold text-text-primary">$0.079</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
