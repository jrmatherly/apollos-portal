import { Search, Plus, Rocket, Code, Database, Palette, MessageSquare } from 'lucide-react';

export function Teams() {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary">Team Management</h2>
          <p className="text-text-secondary mt-1">Manage cross-functional units and their LLM resource allocations.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary w-5 h-5" />
            <input 
              className="w-full pl-10 pr-4 py-2 bg-surface border border-surface-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm transition-all text-text-primary" 
              placeholder="Search teams..." 
              type="text"
            />
          </div>
          <button className="bg-primary hover:opacity-90 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-lg shadow-primary/20">
            <Plus className="w-5 h-5" />
            <span>Create Team</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Core Engine */}
        <div className="bg-surface border border-surface-border rounded-xl p-6 flex flex-col group hover:border-primary transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
              <Rocket className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-surface-border/50 px-2 py-1 rounded text-text-secondary">Active</span>
          </div>
          <h3 className="text-lg font-bold mb-1 text-text-primary">Core Engine</h3>
          <p className="text-sm text-text-secondary mb-6 flex items-center gap-1">
            12 Members
          </p>
          
          <div className="mb-6">
            <div className="flex justify-between text-[11px] font-bold mb-1.5 uppercase tracking-wide">
              <span className="text-text-secondary">Budget Utilized</span>
              <span className="text-secondary">42% (Healthy)</span>
            </div>
            <div className="w-full bg-surface-border/50 h-2 rounded-full overflow-hidden">
              <div className="bg-secondary h-full rounded-full" style={{ width: '42%' }}></div>
            </div>
          </div>

          <div className="mb-6 flex-1">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Models Available</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded bg-surface-border/30 text-[10px] font-medium text-text-primary">GPT-4o</span>
              <span className="px-2 py-1 rounded bg-surface-border/30 text-[10px] font-medium text-text-primary">Claude 3.5 Sonnet</span>
              <span className="px-2 py-1 rounded bg-surface-border/30 text-[10px] font-medium text-text-primary">Llama 3</span>
            </div>
          </div>

          <div className="pt-4 border-t border-surface-border flex gap-2">
            <button className="flex-1 py-2 rounded-lg bg-surface-border/30 hover:bg-surface-border/50 text-text-primary text-xs font-bold transition-colors">Manage</button>
            <button className="flex-1 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold transition-all">Analytics</button>
          </div>
        </div>

        {/* Platform Engineering */}
        <div className="bg-surface border border-surface-border rounded-xl p-6 flex flex-col group hover:border-primary transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Code className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-surface-border/50 px-2 py-1 rounded text-text-secondary">Active</span>
          </div>
          <h3 className="text-lg font-bold mb-1 text-text-primary">Platform Engineering</h3>
          <p className="text-sm text-text-secondary mb-6 flex items-center gap-1">
            8 Members
          </p>
          
          <div className="mb-6">
            <div className="flex justify-between text-[11px] font-bold mb-1.5 uppercase tracking-wide">
              <span className="text-text-secondary">Budget Utilized</span>
              <span className="text-warning">88% (Near Limit)</span>
            </div>
            <div className="w-full bg-surface-border/50 h-2 rounded-full overflow-hidden">
              <div className="bg-warning h-full rounded-full" style={{ width: '88%' }}></div>
            </div>
          </div>

          <div className="mb-6 flex-1">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Models Available</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded bg-surface-border/30 text-[10px] font-medium text-text-primary">GPT-4 Turbo</span>
              <span className="px-2 py-1 rounded bg-surface-border/30 text-[10px] font-medium text-text-primary">Mistral Large</span>
            </div>
          </div>

          <div className="pt-4 border-t border-surface-border flex gap-2">
            <button className="flex-1 py-2 rounded-lg bg-surface-border/30 hover:bg-surface-border/50 text-text-primary text-xs font-bold transition-colors">Manage</button>
            <button className="flex-1 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold transition-all">Analytics</button>
          </div>
        </div>

        {/* Data Science */}
        <div className="bg-surface border border-surface-border rounded-xl p-6 flex flex-col group hover:border-primary transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Database className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-surface-border/50 px-2 py-1 rounded text-text-secondary">Active</span>
          </div>
          <h3 className="text-lg font-bold mb-1 text-text-primary">Data Science</h3>
          <p className="text-sm text-text-secondary mb-6 flex items-center gap-1">
            15 Members
          </p>
          
          <div className="mb-6">
            <div className="flex justify-between text-[11px] font-bold mb-1.5 uppercase tracking-wide">
              <span className="text-text-secondary">Budget Utilized</span>
              <span className="text-secondary">14% (Healthy)</span>
            </div>
            <div className="w-full bg-surface-border/50 h-2 rounded-full overflow-hidden">
              <div className="bg-secondary h-full rounded-full" style={{ width: '14%' }}></div>
            </div>
          </div>

          <div className="mb-6 flex-1">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Models Available</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded bg-surface-border/30 text-[10px] font-medium text-text-primary">Claude 3 Opus</span>
              <span className="px-2 py-1 rounded bg-surface-border/30 text-[10px] font-medium text-text-primary">GPT-4o</span>
              <span className="px-2 py-1 rounded bg-surface-border/30 text-[10px] font-medium text-text-primary">Gemini 1.5 Pro</span>
              <span className="px-2 py-1 rounded bg-surface-border/30 text-[10px] font-medium text-text-primary">+2 more</span>
            </div>
          </div>

          <div className="pt-4 border-t border-surface-border flex gap-2">
            <button className="flex-1 py-2 rounded-lg bg-surface-border/30 hover:bg-surface-border/50 text-text-primary text-xs font-bold transition-colors">Manage</button>
            <button className="flex-1 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold transition-all">Analytics</button>
          </div>
        </div>

        {/* Product Design */}
        <div className="bg-surface border border-surface-border rounded-xl p-6 flex flex-col group hover:border-primary transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
              <Palette className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-surface-border/50 px-2 py-1 rounded text-text-secondary">Active</span>
          </div>
          <h3 className="text-lg font-bold mb-1 text-text-primary">Product Design</h3>
          <p className="text-sm text-text-secondary mb-6 flex items-center gap-1">
            4 Members
          </p>
          
          <div className="mb-6">
            <div className="flex justify-between text-[11px] font-bold mb-1.5 uppercase tracking-wide">
              <span className="text-text-secondary">Budget Utilized</span>
              <span className="text-secondary">5% (Healthy)</span>
            </div>
            <div className="w-full bg-surface-border/50 h-2 rounded-full overflow-hidden">
              <div className="bg-secondary h-full rounded-full" style={{ width: '5%' }}></div>
            </div>
          </div>

          <div className="mb-6 flex-1">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Models Available</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded bg-surface-border/30 text-[10px] font-medium text-text-primary">DALL-E 3</span>
              <span className="px-2 py-1 rounded bg-surface-border/30 text-[10px] font-medium text-text-primary">Midjourney API</span>
            </div>
          </div>

          <div className="pt-4 border-t border-surface-border flex gap-2">
            <button className="flex-1 py-2 rounded-lg bg-surface-border/30 hover:bg-surface-border/50 text-text-primary text-xs font-bold transition-colors">Manage</button>
            <button className="flex-1 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold transition-all">Analytics</button>
          </div>
        </div>

        {/* Customer Success */}
        <div className="bg-surface border border-surface-border rounded-xl p-6 flex flex-col group hover:border-primary transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-surface-border/50 px-2 py-1 rounded text-text-secondary">Active</span>
          </div>
          <h3 className="text-lg font-bold mb-1 text-text-primary">Customer Success</h3>
          <p className="text-sm text-text-secondary mb-6 flex items-center gap-1">
            24 Members
          </p>
          
          <div className="mb-6">
            <div className="flex justify-between text-[11px] font-bold mb-1.5 uppercase tracking-wide">
              <span className="text-text-secondary">Budget Utilized</span>
              <span className="text-warning">92% (Near Limit)</span>
            </div>
            <div className="w-full bg-surface-border/50 h-2 rounded-full overflow-hidden">
              <div className="bg-warning h-full rounded-full" style={{ width: '92%' }}></div>
            </div>
          </div>

          <div className="mb-6 flex-1">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Models Available</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded bg-surface-border/30 text-[10px] font-medium text-text-primary">GPT-4o</span>
              <span className="px-2 py-1 rounded bg-surface-border/30 text-[10px] font-medium text-text-primary">Claude 3.5 Sonnet</span>
            </div>
          </div>

          <div className="pt-4 border-t border-surface-border flex gap-2">
            <button className="flex-1 py-2 rounded-lg bg-surface-border/30 hover:bg-surface-border/50 text-text-primary text-xs font-bold transition-colors">Manage</button>
            <button className="flex-1 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold transition-all">Analytics</button>
          </div>
        </div>

        {/* Add New Card */}
        <div className="border-2 border-dashed border-surface-border rounded-xl p-6 flex flex-col items-center justify-center gap-4 text-text-secondary hover:text-primary hover:border-primary transition-all cursor-pointer group">
          <div className="w-16 h-16 rounded-full bg-surface-border/30 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <Plus className="w-8 h-8" />
          </div>
          <div className="text-center">
            <p className="font-bold text-sm text-text-primary group-hover:text-primary">Create New Team</p>
            <p className="text-xs mt-1">Invite members and assign models</p>
          </div>
        </div>
      </div>
    </div>
  );
}
