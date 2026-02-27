import { BarChart3, Key, Clock, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', gpt4: 4000, claude: 2400, llama: 2400 },
  { name: 'Tue', gpt4: 3000, claude: 1398, llama: 2210 },
  { name: 'Wed', gpt4: 2000, claude: 9800, llama: 2290 },
  { name: 'Thu', gpt4: 2780, claude: 3908, llama: 2000 },
  { name: 'Fri', gpt4: 1890, claude: 4800, llama: 2181 },
  { name: 'Sat', gpt4: 2390, claude: 3800, llama: 2500 },
  { name: 'Sun', gpt4: 3490, claude: 4300, llama: 2100 },
];

export function Dashboard() {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Dashboard Overview</h1>
          <p className="text-text-secondary mt-1 text-sm">Real-time usage and infrastructure health.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-surface text-text-primary px-4 py-2 rounded-md border border-surface-border text-sm font-medium hover:bg-surface-border/50 transition-colors">
            Export Report
          </button>
          <button className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
            + New API Key
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-surface border border-surface-border rounded-lg p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-text-secondary">Active Keys</span>
            <div className="flex items-center gap-1.5 bg-secondary/10 px-2 py-1 rounded-full border border-secondary/20">
              <span className="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
              <span className="text-[10px] uppercase font-bold text-secondary tracking-wider">Live</span>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold font-mono text-text-primary">24</span>
            <p className="text-xs text-text-secondary mt-1">Across 3 projects</p>
          </div>
        </div>

        <div className="bg-surface border border-surface-border rounded-lg p-5">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-medium text-text-secondary">Current Spend</span>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold font-mono text-text-primary">$4,282</span>
            <span className="text-xs text-text-secondary font-mono">/ $5.5k</span>
          </div>
          <div className="mt-4 h-1.5 w-full bg-surface-border rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: '78%' }}></div>
          </div>
        </div>

        <div className="bg-surface border border-surface-border rounded-lg p-5">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-medium text-text-secondary">Total Tokens</span>
            <select className="bg-surface border border-surface-border rounded text-[10px] font-bold text-text-secondary uppercase tracking-widest py-1 px-2 focus:ring-0 cursor-pointer">
              <option>7D</option>
              <option selected>30D</option>
              <option>90D</option>
            </select>
          </div>
          <div>
            <span className="text-3xl font-bold font-mono text-text-primary">1.2M</span>
            <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-secondary" />
              <span className="text-secondary font-medium">12.4%</span> increase
            </p>
          </div>
        </div>

        <div className="bg-surface border border-surface-border rounded-lg p-5">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-medium text-text-secondary">Next Expiry</span>
            <Clock className="w-5 h-5 text-text-secondary" />
          </div>
          <div className="mt-1">
            <div className="inline-flex items-center px-3 py-1 rounded-md bg-warning/10 border border-warning/20 text-warning mb-2">
              <span className="text-lg font-bold font-mono">02:14:45</span>
            </div>
            <p className="text-xs text-text-secondary">Key: <span className="font-mono text-text-primary">prod-main-v2</span></p>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-surface-border rounded-lg flex-1 flex flex-col overflow-hidden h-[400px]">
        <div className="px-6 py-4 border-b border-surface-border flex justify-between items-center">
          <h2 className="text-lg font-semibold text-text-primary">Daily Token Usage</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary"></span>
              <span className="text-xs text-text-secondary">GPT-4o</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-secondary"></span>
              <span className="text-xs text-text-secondary">Claude 3.5</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
              <span className="text-xs text-text-secondary">Llama 3</span>
            </div>
          </div>
        </div>
        <div className="flex-1 p-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGpt4" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorClaude" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--surface-border)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <Area type="monotone" dataKey="claude" stroke="var(--secondary)" fillOpacity={1} fill="url(#colorClaude)" strokeWidth={2} />
              <Area type="monotone" dataKey="gpt4" stroke="var(--primary)" fillOpacity={1} fill="url(#colorGpt4)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
