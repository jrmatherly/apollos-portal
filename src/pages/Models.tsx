import { Filter, Plus, Search, Info } from 'lucide-react';

export function Models() {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            System Live
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">Available Models</h1>
          <p className="text-text-secondary max-w-2xl text-lg">
            Enterprise-grade model registry and technical specifications for production LLM deployments.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-surface border border-surface-border px-4 py-2 rounded-md text-sm font-medium hover:bg-surface-border/50 transition-colors text-text-primary">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 bg-primary px-4 py-2 rounded-md text-sm font-bold text-white shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
            <Plus className="w-4 h-4" />
            Request Access
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center mb-8">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4" />
            <input 
              className="w-full bg-surface border border-surface-border rounded-lg py-3 pl-12 pr-4 text-text-primary focus:ring-2 focus:ring-primary/50 outline-none placeholder:text-text-secondary" 
              placeholder="Search by model name, provider, or capabilities..." 
              type="text"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <span className="px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider cursor-pointer">All Providers</span>
          <span className="px-4 py-2 rounded-full bg-surface border border-surface-border text-text-secondary text-xs font-bold uppercase tracking-wider cursor-pointer hover:border-primary/50 hover:text-text-primary transition-colors">OpenAI</span>
          <span className="px-4 py-2 rounded-full bg-surface border border-surface-border text-text-secondary text-xs font-bold uppercase tracking-wider cursor-pointer hover:border-primary/50 hover:text-text-primary transition-colors">Anthropic</span>
          <span className="px-4 py-2 rounded-full bg-surface border border-surface-border text-text-secondary text-xs font-bold uppercase tracking-wider cursor-pointer hover:border-primary/50 hover:text-text-primary transition-colors">Meta</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* GPT-4o */}
        <div className="bg-surface border border-surface-border rounded-xl overflow-hidden flex flex-col hover:border-primary/40 transition-all group">
          <div className="p-6 flex-1">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors">GPT-4o</h3>
                <p className="text-text-secondary text-xs font-mono mt-1">openai/gpt-4o-latest</p>
              </div>
              <span className="bg-surface-border/50 text-text-primary text-[10px] px-2 py-1 rounded font-bold uppercase tracking-tighter border border-surface-border">OpenAI</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold border border-primary/20">CHAT</span>
              <span className="bg-secondary/10 text-secondary text-[10px] px-2 py-0.5 rounded-full font-bold border border-secondary/20">VISION</span>
              <span className="bg-warning/10 text-warning text-[10px] px-2 py-0.5 rounded-full font-bold border border-warning/20">AUDIO</span>
            </div>
            <div className="space-y-3 pt-4 border-t border-surface-border">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-xs uppercase tracking-wider font-semibold">Context Window</span>
                <span className="text-text-primary font-mono text-sm">128,000</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-xs uppercase tracking-wider font-semibold">Input Cost</span>
                <span className="text-text-primary font-mono text-sm">$5.00 / 1M</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-xs uppercase tracking-wider font-semibold">Output Cost</span>
                <span className="text-text-primary font-mono text-sm">$15.00 / 1M</span>
              </div>
            </div>
          </div>
          <div className="bg-surface-border/10 p-4 border-t border-surface-border flex gap-2">
            <button className="flex-1 bg-primary py-2 rounded-md text-xs font-bold text-white hover:brightness-110">PROMPT</button>
            <button className="px-3 bg-surface border border-surface-border rounded-md text-text-secondary hover:text-text-primary">
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Claude 3.5 Sonnet */}
        <div className="bg-surface border border-surface-border rounded-xl overflow-hidden flex flex-col hover:border-primary/40 transition-all group">
          <div className="p-6 flex-1">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors">Claude 3.5 Sonnet</h3>
                <p className="text-text-secondary text-xs font-mono mt-1">anthropic/claude-3-5-sonnet</p>
              </div>
              <span className="bg-surface-border/50 text-text-primary text-[10px] px-2 py-1 rounded font-bold uppercase tracking-tighter border border-surface-border">Anthropic</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold border border-primary/20">CHAT</span>
              <span className="bg-secondary/10 text-secondary text-[10px] px-2 py-0.5 rounded-full font-bold border border-secondary/20">VISION</span>
            </div>
            <div className="space-y-3 pt-4 border-t border-surface-border">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-xs uppercase tracking-wider font-semibold">Context Window</span>
                <span className="text-text-primary font-mono text-sm">200,000</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-xs uppercase tracking-wider font-semibold">Input Cost</span>
                <span className="text-text-primary font-mono text-sm">$3.00 / 1M</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-xs uppercase tracking-wider font-semibold">Output Cost</span>
                <span className="text-text-primary font-mono text-sm">$15.00 / 1M</span>
              </div>
            </div>
          </div>
          <div className="bg-surface-border/10 p-4 border-t border-surface-border flex gap-2">
            <button className="flex-1 bg-primary py-2 rounded-md text-xs font-bold text-white hover:brightness-110">PROMPT</button>
            <button className="px-3 bg-surface border border-surface-border rounded-md text-text-secondary hover:text-text-primary">
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Llama 3 70B */}
        <div className="bg-surface border border-surface-border rounded-xl overflow-hidden flex flex-col hover:border-primary/40 transition-all group">
          <div className="p-6 flex-1">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors">Llama 3 70B</h3>
                <p className="text-text-secondary text-xs font-mono mt-1">meta/llama-3-70b-instruct</p>
              </div>
              <span className="bg-surface-border/50 text-text-primary text-[10px] px-2 py-1 rounded font-bold uppercase tracking-tighter border border-surface-border">Meta</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold border border-primary/20">CHAT</span>
              <span className="bg-text-secondary/10 text-text-secondary text-[10px] px-2 py-0.5 rounded-full font-bold border border-text-secondary/20">OSS</span>
            </div>
            <div className="space-y-3 pt-4 border-t border-surface-border">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-xs uppercase tracking-wider font-semibold">Context Window</span>
                <span className="text-text-primary font-mono text-sm">8,192</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-xs uppercase tracking-wider font-semibold">Input Cost</span>
                <span className="text-text-primary font-mono text-sm">$0.60 / 1M</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-xs uppercase tracking-wider font-semibold">Output Cost</span>
                <span className="text-text-primary font-mono text-sm">$0.60 / 1M</span>
              </div>
            </div>
          </div>
          <div className="bg-surface-border/10 p-4 border-t border-surface-border flex gap-2">
            <button className="flex-1 bg-primary py-2 rounded-md text-xs font-bold text-white hover:brightness-110">PROMPT</button>
            <button className="px-3 bg-surface border border-surface-border rounded-md text-text-secondary hover:text-text-primary">
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gemini 1.5 Pro */}
        <div className="bg-surface border border-surface-border rounded-xl overflow-hidden flex flex-col hover:border-primary/40 transition-all group">
          <div className="p-6 flex-1">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors">Gemini 1.5 Pro</h3>
                <p className="text-text-secondary text-xs font-mono mt-1">google/gemini-1.5-pro</p>
              </div>
              <span className="bg-surface-border/50 text-text-primary text-[10px] px-2 py-1 rounded font-bold uppercase tracking-tighter border border-surface-border">Google</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold border border-primary/20">CHAT</span>
              <span className="bg-secondary/10 text-secondary text-[10px] px-2 py-0.5 rounded-full font-bold border border-secondary/20">VISION</span>
              <span className="bg-purple-500/10 text-purple-500 text-[10px] px-2 py-0.5 rounded-full font-bold border border-purple-500/20">VIDEO</span>
            </div>
            <div className="space-y-3 pt-4 border-t border-surface-border">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-xs uppercase tracking-wider font-semibold">Context Window</span>
                <span className="text-text-primary font-mono text-sm">1,000,000</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-xs uppercase tracking-wider font-semibold">Input Cost</span>
                <span className="text-text-primary font-mono text-sm">$3.50 / 1M</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-xs uppercase tracking-wider font-semibold">Output Cost</span>
                <span className="text-text-primary font-mono text-sm">$10.50 / 1M</span>
              </div>
            </div>
          </div>
          <div className="bg-surface-border/10 p-4 border-t border-surface-border flex gap-2">
            <button className="flex-1 bg-primary py-2 rounded-md text-xs font-bold text-white hover:brightness-110">PROMPT</button>
            <button className="px-3 bg-surface border border-surface-border rounded-md text-text-secondary hover:text-text-primary">
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
