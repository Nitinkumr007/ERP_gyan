
import React from 'react';


interface SettingsProps {
  toggleTheme?: () => void;
  currentTheme?: 'dark' | 'light';
}

const Settings: React.FC<SettingsProps> = ({ toggleTheme, currentTheme }) => {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ... tabs ... */}

      <div className="flex items-center gap-6 mb-8 border-b border-[var(--border-color)] overflow-x-auto pb-px">
        <button className="flex items-center gap-2 pb-4 border-b-2 border-[var(--color-primary)] text-[var(--color-primary)] font-medium whitespace-nowrap px-2">
          <span className="material-symbols-outlined text-[20px]">tune</span>
          Global Rules
        </button>
        <button className="flex items-center gap-2 pb-4 border-b-2 border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)] transition-all font-medium whitespace-nowrap px-2">
          <span className="material-symbols-outlined text-[20px]">account_tree</span>
          Workflows
        </button>
        <button className="flex items-center gap-2 pb-4 border-b-2 border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)] transition-all font-medium whitespace-nowrap px-2">
          <span className="material-symbols-outlined text-[20px]">payments</span>
          Financials
        </button>
        <button className="flex items-center gap-2 pb-4 border-b-2 border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)] transition-all font-medium whitespace-nowrap px-2">
          <span className="material-symbols-outlined text-[20px]">build</span>
          Maintenance
        </button>
        <button className="flex items-center gap-2 pb-4 border-b-2 border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)] transition-all font-medium whitespace-nowrap px-2">
          <span className="material-symbols-outlined text-[20px]">security</span>
          Security
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-20">
        <div className="bg-[var(--bg-panel)] rounded-2xl p-8 border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500">
              <span className="material-symbols-outlined">globe</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Global Logistics Rules</h3>
              <p className="text-xs text-[var(--text-secondary)]">Base configuration for orders and allocation.</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Min. Order Quantity (MOQ)</label>
                <div className="relative">
                  <input className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-2.5 px-4 text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all outline-none" placeholder="0" type="number" defaultValue="100" />
                  <span className="absolute right-4 top-2.5 text-[var(--text-muted)] text-sm">MT</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Max. Allocation</label>
                <div className="relative">
                  <input className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-2.5 px-4 text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all outline-none" placeholder="0" type="number" defaultValue="5000" />
                  <span className="absolute right-4 top-2.5 text-[var(--text-muted)] text-sm">MT</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Default Incoterms</label>
              <select className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-2.5 px-4 text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all outline-none">
                <option>FOB - Free on Board</option>
                <option selected>CIF - Cost, Insurance & Freight</option>
                <option>EXW - Ex Works</option>
              </select>
            </div>
            <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Strict Region Locking</p>
                <p className="text-xs text-[var(--text-secondary)]">Prevent cross-region order fulfillment</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input className="sr-only peer" type="checkbox" defaultChecked />
                <div className="w-11 h-6 bg-[var(--bg-primary)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)] border border-[var(--border-color)]"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-panel)] rounded-2xl p-8 border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-500">
              <span className="material-symbols-outlined">approval_delegation</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Demand Approval Workflows</h3>
              <p className="text-xs text-[var(--text-secondary)]">Configure authorization chains for demands.</p>
            </div>
          </div>
          <div className="space-y-6">
            {[
              { label: 'Manager Approval', sub: 'Required for all new demands', checked: true },
              { label: 'Finance Review', sub: 'Trigger for volume > 1000 MT', checked: true },
              { label: 'Legal Compliance Check', sub: 'For international high-risk zones', checked: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{item.sub}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input className="sr-only peer" type="checkbox" defaultChecked={item.checked} />
                  <div className="w-11 h-6 bg-[var(--bg-primary)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)] border border-[var(--border-color)]"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--bg-panel)] rounded-2xl p-8 border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500">
              <span className="material-symbols-outlined">account_balance</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Taxation Rules</h3>
              <p className="text-xs text-[var(--text-secondary)]">Regional tax calculations and defaults.</p>
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Base Corporate Tax Rate</label>
              <div className="relative">
                <input className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-2.5 px-4 text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all outline-none" type="number" defaultValue="21.5" />
                <span className="absolute right-4 top-2.5 text-[var(--text-muted)] text-sm">%</span>
              </div>
            </div>
          </div>
        </div>



        {/* Appearance Settings */}
        <div className="bg-[var(--bg-panel)] rounded-2xl p-8 border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-500">
              <span className="material-symbols-outlined">palette</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Appearance</h3>
              <p className="text-xs text-[var(--text-secondary)]">Customize your visual experience.</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Dark Mode</p>
                <p className="text-xs text-[var(--text-secondary)]">Toggle between light and dark themes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  className="sr-only peer"
                  type="checkbox"
                  checked={currentTheme === 'dark'}
                  onChange={toggleTheme}
                />
                <div className="w-11 h-6 bg-[var(--bg-primary)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)] border border-[var(--border-color)]"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-panel)] rounded-2xl p-8 border-l-4 border-l-red-500/50 border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500">
              <span className="material-symbols-outlined">dns</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">System Maintenance</h3>
              <p className="text-xs text-[var(--text-secondary)]">Schedule downtime and updates.</p>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Next Scheduled Window</label>
              <div className="flex gap-2">
                <input className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-2.5 px-4 text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all outline-none" type="date" defaultValue="2023-11-01" />
                <input className="w-1/3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-2.5 px-4 text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all outline-none" type="time" defaultValue="02:00" />
              </div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-red-500 mt-0.5">warning</span>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-red-500">Maintenance Mode</h4>
                  <p className="text-xs text-red-400/80 mb-3">This will disconnect all active distributors.</p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input className="sr-only peer" type="checkbox" />
                    <div className="w-11 h-6 bg-[var(--bg-primary)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500 border border-[var(--border-color)]"></div>
                    <span className="ml-3 text-xs font-medium text-[var(--text-muted)]">Inactive</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 right-0 left-72 p-6 bg-[var(--bg-panel)]/80 backdrop-blur-md border-t border-[var(--border-color)] z-50 flex justify-end">
        <button className="bg-[var(--color-primary)] text-white font-bold px-8 py-3 rounded-full hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">save</span>
          Save Configuration
        </button>
      </div>
    </div >
  );
};

export default Settings;
