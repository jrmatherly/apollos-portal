import { Copy, Plus, ChevronDown } from 'lucide-react';

export function ApiKeys() {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">API Keys</h1>
          <p className="text-text-secondary mt-1">Manage your keys and monitor authentication across your organization.</p>
        </div>
        <button className="bg-primary hover:opacity-90 text-white px-4 py-2.5 rounded-md font-medium transition-all shadow-lg shadow-primary/10 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Generate New Key
        </button>
      </header>

      <section className="mb-10">
        <div className="bg-surface border border-surface-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-border/20 border-b border-surface-border">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Key</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Alias</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Team</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Expires</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Spend</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                <tr className="hover:bg-surface-border/10 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-text-secondary tracking-widest">sk-•••••••••8k2</span>
                      <button className="text-text-secondary hover:text-text-primary transition-colors" title="Copy Key">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-text-primary">Production-Main</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">Core Engine</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary border border-secondary/20">Active</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">Oct 12, 2023</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">Never</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">$1,240.50</td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button className="text-xs text-primary hover:underline font-medium">Rotate</button>
                    <button className="text-xs text-destructive/70 hover:text-destructive font-medium transition-colors">Revoke</button>
                  </td>
                </tr>
                <tr className="hover:bg-surface-border/10 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-text-secondary tracking-widest">sk-•••••••••f9w</span>
                      <button className="text-text-secondary hover:text-text-primary transition-colors" title="Copy Key">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-text-primary">Dev-Test-Staging</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">Platform Eng</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">Expiring Soon</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">Jan 05, 2024</td>
                  <td className="px-6 py-4 text-sm text-warning/80">7 Days</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">$84.22</td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button className="text-xs text-primary hover:underline font-medium">Rotate</button>
                    <button className="text-xs text-destructive/70 hover:text-destructive font-medium transition-colors">Revoke</button>
                  </td>
                </tr>
                <tr className="hover:bg-surface-border/10 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-text-secondary tracking-widest">sk-•••••••••3a1</span>
                      <button className="text-text-secondary hover:text-text-primary transition-colors" title="Copy Key">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-text-primary">Analytics-Worker</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">Data Science</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary border border-secondary/20">Active</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">Feb 18, 2024</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">Mar 2025</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">$312.00</td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button className="text-xs text-primary hover:underline font-medium">Rotate</button>
                    <button className="text-xs text-destructive/70 hover:text-destructive font-medium transition-colors">Revoke</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <details className="group border border-surface-border rounded-lg bg-surface-border/10">
          <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-border/20 transition-colors select-none">
            <div className="flex items-center gap-3">
              <ChevronDown className="w-5 h-5 text-text-secondary group-open:rotate-180 transition-transform" />
              <span className="text-sm font-medium text-text-primary">Revoked Keys History</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-surface-border text-text-secondary rounded-md border border-surface-border">12</span>
            </div>
          </summary>
          <div className="p-4 pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse opacity-60">
                <thead className="border-b border-surface-border">
                  <tr>
                    <th className="py-3 px-2 text-[11px] font-semibold text-text-secondary uppercase">Key</th>
                    <th className="py-3 px-2 text-[11px] font-semibold text-text-secondary uppercase">Alias</th>
                    <th className="py-3 px-2 text-[11px] font-semibold text-text-secondary uppercase">Revoked Date</th>
                    <th className="py-3 px-2 text-[11px] font-semibold text-text-secondary uppercase">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50">
                  <tr>
                    <td className="py-3 px-2 text-xs font-mono text-text-secondary">sk-•••••••x2y</td>
                    <td className="py-3 px-2 text-xs text-text-secondary">Legacy-Bot</td>
                    <td className="py-3 px-2 text-xs text-text-secondary">Jan 02, 2024</td>
                    <td className="py-3 px-2 text-xs text-text-secondary">Compromised</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 text-xs font-mono text-text-secondary">sk-•••••••p0l</td>
                    <td className="py-3 px-2 text-xs text-text-secondary">Temp-Testing</td>
                    <td className="py-3 px-2 text-xs text-text-secondary">Dec 15, 2023</td>
                    <td className="py-3 px-2 text-xs text-text-secondary">Expired</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-center">
              <button className="text-xs text-text-secondary hover:text-text-primary transition-colors underline decoration-surface-border underline-offset-4">View full history</button>
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}
