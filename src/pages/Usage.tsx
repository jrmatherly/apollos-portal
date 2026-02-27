import { Calendar, Download, Search, TrendingUp, Minus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <header className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold text-text-primary">Usage Analytics</h2>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-surface-border rounded-md text-sm font-medium text-text-secondary hover:bg-surface-border/50 transition-all">
            <Calendar className="w-4 h-4" />
            Last 30 Days
          </button>
          <button className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white rounded-md text-sm font-semibold shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative min-w-[180px]">
          <label className="absolute -top-2 left-2 px-1 bg-bg-primary text-[10px] text-text-secondary font-bold uppercase tracking-wider">Model</label>
          <select className="w-full bg-surface border border-surface-border text-text-primary text-sm rounded-md py-2 px-3 focus:ring-primary focus:border-primary outline-none">
            <option>All Models</option>
            <option>GPT-4o</option>
            <option>Claude 3.5 Sonnet</option>
            <option>Gemini 1.5 Pro</option>
          </select>
        </div>
        <div className="relative min-w-[180px]">
          <label className="absolute -top-2 left-2 px-1 bg-bg-primary text-[10px] text-text-secondary font-bold uppercase tracking-wider">API Key</label>
          <select className="w-full bg-surface border border-surface-border text-text-primary text-sm rounded-md py-2 px-3 focus:ring-primary focus:border-primary outline-none">
            <option>All Keys</option>
            <option>Production-Main</option>
            <option>Staging-Test</option>
            <option>Dev-Personal</option>
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2 bg-surface p-1 rounded-md border border-surface-border">
          <button className="px-3 py-1 text-xs font-medium rounded bg-surface-border/50 text-text-primary shadow-sm">Tokens</button>
          <button className="px-3 py-1 text-xs font-medium text-text-secondary hover:text-text-primary">Requests</button>
          <button className="px-3 py-1 text-xs font-medium text-text-secondary hover:text-text-primary">Costs</button>
        </div>
      </div>

      <div className="bg-surface border border-surface-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-widest">Token Consumption</h3>
            <p className="text-2xl font-bold font-mono text-primary mt-1">2,042,593 <span className="text-xs font-sans text-text-secondary">Total Tokens</span></p>
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
                contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--surface-border)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <Area type="monotone" dataKey="claude" stroke="var(--secondary)" fillOpacity={1} fill="url(#colorClaudeUsage)" strokeWidth={2} />
              <Area type="monotone" dataKey="gpt4" stroke="var(--primary)" fillOpacity={1} fill="url(#colorGpt4Usage)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface border border-surface-border p-6 rounded-xl hover:border-surface-border/80 transition-colors">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Input Tokens</p>
          <p className="text-3xl font-bold font-mono text-text-primary">842,105</p>
          <div className="mt-4 flex items-center text-secondary gap-1 text-xs">
            <TrendingUp className="w-3 h-3" />
            <span>12.4% vs last mo</span>
          </div>
        </div>
        <div className="bg-surface border border-surface-border p-6 rounded-xl hover:border-surface-border/80 transition-colors">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Output Tokens</p>
          <p className="text-3xl font-bold font-mono text-text-primary">1,200,488</p>
          <div className="mt-4 flex items-center text-secondary gap-1 text-xs">
            <TrendingUp className="w-3 h-3" />
            <span>8.2% vs last mo</span>
          </div>
        </div>
        <div className="bg-surface border border-surface-border p-6 rounded-xl hover:border-surface-border/80 transition-colors">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Total Cost</p>
          <p className="text-3xl font-bold font-mono text-text-primary">$4,282.50</p>
          <div className="mt-4 flex items-center text-destructive gap-1 text-xs">
            <TrendingUp className="w-3 h-3" />
            <span>24.1% vs last mo</span>
          </div>
        </div>
        <div className="bg-surface border border-surface-border p-6 rounded-xl hover:border-surface-border/80 transition-colors">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Avg Cost/Req</p>
          <p className="text-3xl font-bold font-mono text-text-primary">$0.04</p>
          <div className="mt-4 flex items-center text-text-secondary gap-1 text-xs">
            <Minus className="w-3 h-3" />
            <span>No change</span>
          </div>
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
              <tr className="hover:bg-surface-border/10 transition-colors group">
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
              <tr className="hover:bg-surface-border/10 transition-colors group">
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
              <tr className="hover:bg-surface-border/10 transition-colors group">
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
              <tr className="hover:bg-surface-border/10 transition-colors group">
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
