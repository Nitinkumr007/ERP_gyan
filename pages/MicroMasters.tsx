import React from 'react';

const MicroMasters: React.FC = () => {
    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-forest-900 dark:text-white mb-6">Micro Masters</h1>
            <div className="p-8 rounded-2xl bg-white dark:bg-white/5 border border-forest-900/10 dark:border-white/10 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">dataset</span>
                <h2 className="text-xl font-bold text-gray-500">Feature Coming Soon</h2>
                <p className="text-gray-400">The Micro Masters module is currently under development.</p>
            </div>
        </div>
    );
};

export default MicroMasters;
