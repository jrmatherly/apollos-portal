import { User, KeyRound, Bell, Palette, Lock } from 'lucide-react';

export function Settings() {
  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <header className="mb-10">
        <h2 className="text-3xl font-bold tracking-tight text-text-primary">Settings</h2>
        <p className="text-text-secondary mt-2">Manage your organization's security preferences and global configurations.</p>
      </header>

      <div className="space-y-8">
        {/* Account Info Section */}
        <section className="bg-surface border border-surface-border rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-text-primary">
            <User className="w-5 h-5 text-primary" />
            Account Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Full Name</label>
                <div className="text-sm font-medium py-2 border-b border-surface-border text-text-primary">John Doe</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Email Address</label>
                <div className="text-sm font-medium py-2 border-b border-surface-border text-text-primary">john.doe@nexus.ai</div>
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <button className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-medium transition-colors">
                <Lock className="w-4 h-4" />
                Change password
              </button>
            </div>
          </div>
        </section>

        {/* Default Key Expiration */}
        <section className="bg-surface border border-surface-border rounded-lg p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-text-primary">
              <KeyRound className="w-5 h-5 text-primary" />
              Default Key Expiration
            </h3>
            <p className="text-sm text-text-secondary mt-1">Set the mandatory rotation cycle for all generated API keys.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="relative flex items-center p-4 cursor-pointer rounded-md border border-primary bg-primary/5 hover:bg-primary/10 transition-all group">
              <input type="radio" name="expiry" className="w-4 h-4 text-primary border-surface-border focus:ring-primary bg-transparent" defaultChecked />
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-primary">30 Days</span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-wider">Most Secure</span>
                </div>
                <p className="text-xs text-text-secondary">Strict enterprise compliance</p>
              </div>
            </label>
            <label className="relative flex items-center p-4 cursor-pointer rounded-md border border-surface-border hover:bg-surface-border/50 transition-all">
              <input type="radio" name="expiry" className="w-4 h-4 text-primary border-surface-border focus:ring-primary bg-transparent" />
              <div className="ml-4 flex-1">
                <span className="text-sm font-semibold text-text-primary">60 Days</span>
                <p className="text-xs text-text-secondary">Standard rotation period</p>
              </div>
            </label>
            <label className="relative flex items-center p-4 cursor-pointer rounded-md border border-surface-border hover:bg-surface-border/50 transition-all">
              <input type="radio" name="expiry" className="w-4 h-4 text-primary border-surface-border focus:ring-primary bg-transparent" />
              <div className="ml-4 flex-1">
                <span className="text-sm font-semibold text-text-primary">90 Days</span>
                <p className="text-xs text-text-secondary">Quarterly rotation</p>
              </div>
            </label>
            <label className="relative flex items-center p-4 cursor-pointer rounded-md border border-surface-border hover:bg-surface-border/50 transition-all">
              <input type="radio" name="expiry" className="w-4 h-4 text-primary border-surface-border focus:ring-primary bg-transparent" />
              <div className="ml-4 flex-1">
                <span className="text-sm font-semibold text-text-primary">180 Days</span>
                <p className="text-xs text-text-secondary">Maximum allowed duration</p>
              </div>
            </label>
          </div>
        </section>

        {/* Email Notifications */}
        <section className="bg-surface border border-surface-border rounded-lg p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-text-primary">
              <Bell className="w-5 h-5 text-primary" />
              Expiry Alerts
            </h3>
            <p className="text-sm text-text-secondary mt-1">Receive automated warnings before API keys expire.</p>
          </div>
          <div className="divide-y divide-surface-border">
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium text-text-primary">14-day warning</p>
                <p className="text-xs text-text-secondary">Early notice for key replacement</p>
              </div>
              <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-primary focus:outline-none">
                <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
              </button>
            </div>
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium text-text-primary">7-day warning</p>
                <p className="text-xs text-text-secondary">Standard rotation reminder</p>
              </div>
              <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-primary focus:outline-none">
                <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
              </button>
            </div>
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium text-text-primary">3-day warning</p>
                <p className="text-xs text-text-secondary">Urgent notice for expiring keys</p>
              </div>
              <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-surface-border focus:outline-none">
                <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
              </button>
            </div>
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium text-text-primary">1-day final warning</p>
                <p className="text-xs text-text-secondary">Critical alert for immediate action</p>
              </div>
              <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-primary focus:outline-none">
                <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
              </button>
            </div>
          </div>
        </section>

        {/* Theme Preference */}
        <section className="bg-surface border border-surface-border rounded-lg p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-text-primary">
              <Palette className="w-5 h-5 text-primary" />
              Theme Preference
            </h3>
            <p className="text-sm text-text-secondary mt-1">Customize the portal appearance for your session.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="cursor-pointer group">
              <div className="aspect-video rounded-md bg-white border border-surface-border p-2 mb-2 flex flex-col gap-1 overflow-hidden ring-primary group-hover:ring-2 transition-all">
                <div className="w-full h-2 bg-gray-100 rounded"></div>
                <div className="w-2/3 h-2 bg-gray-50 rounded"></div>
                <div className="mt-auto flex gap-1">
                  <div className="w-3 h-3 bg-gray-100 rounded"></div>
                  <div className="w-3 h-3 bg-gray-100 rounded"></div>
                </div>
              </div>
              <p className="text-xs font-medium text-center text-text-primary">Light Mode</p>
            </div>
            <div className="cursor-pointer group">
              <div className="aspect-video rounded-md bg-[#0A0F1E] border border-primary p-2 mb-2 flex flex-col gap-1 overflow-hidden ring-2 ring-primary transition-all shadow-[0_0_15px_-5px_rgba(99,102,241,0.4)]">
                <div className="w-full h-2 bg-[#111827] rounded"></div>
                <div className="w-2/3 h-2 bg-[#111827] rounded"></div>
                <div className="mt-auto flex gap-1">
                  <div className="w-3 h-3 bg-primary/20 rounded"></div>
                  <div className="w-3 h-3 bg-[#111827] rounded"></div>
                </div>
              </div>
              <p className="text-xs font-medium text-center text-primary">Dark Mode</p>
            </div>
            <div className="cursor-pointer group">
              <div className="aspect-video rounded-md bg-gradient-to-br from-white to-[#0A0F1E] border border-surface-border p-2 mb-2 flex flex-col gap-1 overflow-hidden group-hover:ring-2 ring-primary transition-all">
                <div className="w-full h-2 bg-gray-400/20 rounded"></div>
                <div className="w-2/3 h-2 bg-gray-400/20 rounded"></div>
                <div className="mt-auto flex gap-1">
                  <div className="w-3 h-3 bg-gray-400/20 rounded"></div>
                  <div className="w-3 h-3 bg-gray-400/20 rounded"></div>
                </div>
              </div>
              <p className="text-xs font-medium text-center text-text-primary">System Default</p>
            </div>
          </div>
        </section>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-6">
          <button className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">Discard changes</button>
          <button className="bg-primary hover:opacity-90 text-white px-6 py-2 rounded-md font-semibold text-sm transition-all shadow-lg shadow-primary/20">Save Configuration</button>
        </div>
      </div>
    </div>
  );
}
