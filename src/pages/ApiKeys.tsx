import { Copy, Plus, ChevronDown, ArrowDown } from 'lucide-react';
import { useState } from 'react';

const mockApiKeys = [
  {
    id: '1',
    key: 'sk-•••••••••8k2',
    alias: 'Production-Main',
    team: 'Core Engine',
    status: 'Active',
    created: 'Oct 12, 2023',
    expires: 'Never',
    spend: '$1,240.50',
    lastUsed: '2026-02-27T01:10:00-08:00',
  },
  {
    id: '2',
    key: 'sk-•••••••••f9w',
    alias: 'Dev-Test-Staging',
    team: 'Platform Eng',
    status: 'Expiring Soon',
    created: 'Jan 05, 2024',
    expires: '7 Days',
    spend: '$84.22',
    lastUsed: '2026-02-26T14:30:00-08:00',
  },
  {
    id: '3',
    key: 'sk-•••••••••3a1',
    alias: 'Analytics-Worker',
    team: 'Data Science',
    status: 'Active',
    created: 'Feb 18, 2024',
    expires: 'Mar 2025',
    spend: '$312.00',
    lastUsed: '2026-02-27T00:45:00-08:00',
  },
];

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function ApiKeys() {
  const [keys] = useState(() => 
    [...mockApiKeys].sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">API Keys</h1>
          <p className="text-text-secondary mt-1">Manage your keys and monitor authentication across your organization.</p>
        </div>
        <button className="bg-primary hover:opacity-90 text-white px-4 py-2.5 rounded-md font-medium transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2 w-full sm:w-auto">
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
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">Key</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">Alias</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">Team</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">Created</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">Expires</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
                    Last Used
                    <ArrowDown className="w-3 h-3" />
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">Spend</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {keys.map((key) => (
                  <tr key={key.id} className="hover:bg-surface-border/10 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-text-secondary tracking-widest">{key.key}</span>
                        <button className="text-text-secondary hover:text-text-primary transition-colors" title="Copy Key">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-text-primary whitespace-nowrap">{key.alias}</td>
                    <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{key.team}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        key.status === 'Active' 
                          ? 'bg-secondary/10 text-secondary border-secondary/20' 
                          : 'bg-warning/10 text-warning border-warning/20'
                      }`}>
                        {key.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{key.created}</td>
                    <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
                      <span className={key.status === 'Expiring Soon' ? 'text-warning/80' : ''}>
                        {key.expires}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{formatDate(key.lastUsed)}</td>
                    <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{key.spend}</td>
                    <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                      <button className="text-xs text-primary hover:underline font-medium">Rotate</button>
                      <button className="text-xs text-destructive/70 hover:text-destructive font-medium transition-colors">Revoke</button>
                    </td>
                  </tr>
                ))}
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
                    <th className="py-3 px-2 text-[11px] font-semibold text-text-secondary uppercase whitespace-nowrap">Key</th>
                    <th className="py-3 px-2 text-[11px] font-semibold text-text-secondary uppercase whitespace-nowrap">Alias</th>
                    <th className="py-3 px-2 text-[11px] font-semibold text-text-secondary uppercase whitespace-nowrap">Revoked Date</th>
                    <th className="py-3 px-2 text-[11px] font-semibold text-text-secondary uppercase whitespace-nowrap">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50">
                  <tr>
                    <td className="py-3 px-2 text-xs font-mono text-text-secondary whitespace-nowrap">sk-•••••••x2y</td>
                    <td className="py-3 px-2 text-xs text-text-secondary whitespace-nowrap">Legacy-Bot</td>
                    <td className="py-3 px-2 text-xs text-text-secondary whitespace-nowrap">Jan 02, 2024</td>
                    <td className="py-3 px-2 text-xs text-text-secondary whitespace-nowrap">Compromised</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 text-xs font-mono text-text-secondary whitespace-nowrap">sk-•••••••p0l</td>
                    <td className="py-3 px-2 text-xs text-text-secondary whitespace-nowrap">Temp-Testing</td>
                    <td className="py-3 px-2 text-xs text-text-secondary whitespace-nowrap">Dec 15, 2023</td>
                    <td className="py-3 px-2 text-xs text-text-secondary whitespace-nowrap">Expired</td>
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
