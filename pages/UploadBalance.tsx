
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const UploadBalance: React.FC = () => {
    const [textData, setTextData] = useState('');
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [errorModalOpen, setErrorModalOpen] = useState(false);

    const parseTextData = () => {
        if (!textData.trim()) {
            alert("Please paste data first.");
            return;
        }

        const lines = textData.trim().split('\n');
        const parsed = lines.map((line, index) => {
            // Split by tab (Excel copy-paste typically uses tabs)
            const parts = line.split('\t');

            // Expected format: Name (ID Name) | Amount Dr. | Amount Cr.
            // Example: 10001 Pal Pashu ahaar | 21648 | (empty or value)

            if (parts.length < 2) return null;

            const nameCol = parts[0]?.trim() || '';
            const drCol = parts[1]?.trim() || '0';
            const crCol = parts[2]?.trim() || '0';

            // Extract ID from the start of the Name column
            // Regex to find leading number
            const idMatch = nameCol.match(/^(\d+)/);
            const id = idMatch ? parseInt(idMatch[1]) : null;

            const name = nameCol.replace(/^(\d+)\s*-?\s*/, '').trim();

            // Parse Amounts (remove commas, handle currency symbols if any)
            const cleanAmount = (val: string) => parseFloat(val.replace(/[₹,]/g, '') || '0');
            const dr = cleanAmount(drCol);
            const cr = cleanAmount(crCol);

            // Net Balance Calculation (assuming Dr is positive/receivable, Cr is negative/payable, OR implies Outstanding)
            // Usually "Amount Dr." in a ledger means user OWES us (Debit balance in our books).
            // "Amount Cr." means we OWE user or advance payment.
            // Let's assume Net Balance = Dr - Cr.
            const netBalance = dr - cr;

            return {
                originalName: nameCol,
                id,
                name,
                dr,
                cr,
                netBalance,
                status: id ? 'Valid' : 'Invalid ID'
            };
        }).filter(Boolean);

        setParsedData(parsed);
    };

    const handleUpload = async () => {
        if (parsedData.length === 0) return;
        if (!window.confirm(`Ready to update balances for ${parsedData.length} records?`)) return;

        setUploading(true);
        setUploadProgress(0);
        setLogs([]);
        const newLogs: string[] = [];

        try {
            // Process in batches or one by one
            let successCount = 0;
            let failCount = 0;

            for (const row of parsedData) {
                if (!row.id) {
                    newLogs.push(`Skipped: ${row.originalName} (No ID)`);
                    continue;
                }

                // Update Distributor_Master
                // We assume there is a column for balance. The user said "update the balance".
                // I will try to update 'outstanding_amount'. If it fails, I'll try to create it or inform user.
                // Since I can't modify schema dynamically easily without SQL, I'll assume the column exists or use a generic 'Open Remark' field temporarily if needed? 
                // No, user specifically asked for "balance". I will try to use a column named "outstanding_amount".

                // Check if row exists first (optional, but good for logs)

                const { error } = await supabase
                    .from('Distributor_Master')
                    .update({
                        // Update Fields
                        // Assuming 'outstanding_amount' column exists. If strictly following provided schema, we might need to overwrite a text field like 'Open Remark' 
                        // or user needs to run SQL. I'll stick to trying 'outstanding_amount'.
                        // Wait, looking at sample data, maybe I should just store Dr and Cr?
                        // "this menu will uodate the balance to the DBR master table"
                        // outstanding_amount: row.netBalance,
                        closing_balance: row.netBalance
                        // Added closing_balance to match user schema, keeping outstanding_amount just in case/legacy 
                    })
                    .eq('DB ID', row.id);

                if (error) {
                    console.error(`Error updating ID ${row.id}:`, error);
                    newLogs.push(`Failed: ${row.id} - ${error.message}`);
                    failCount++;
                } else {
                    successCount++;
                }
                setUploadProgress(prev => prev + 1);
            }

            setLogs(prev => [...prev, ...newLogs, `Completed: ${successCount} updated, ${failCount} failed.`]);
            if (successCount > 0) alert(`Successfully updated ${successCount} records.`);

        } catch (err) {
            console.error("Upload error:", err);
            alert("An unexpected error occurred.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn pb-20">
            <div className="flex items-center gap-4">
                <div className="size-14 bg-[var(--bg-panel)] rounded-2xl flex items-center justify-center text-[var(--color-primary)] shadow-sm border border-[var(--border-color)]">
                    <span className="material-symbols-outlined text-3xl">upload_file</span>
                </div>
                <div>
                    <h1 className="text-[var(--text-primary)] text-3xl font-black">Upload Balances</h1>
                    <p className="text-[var(--text-secondary)] font-bold uppercase tracking-widest text-xs mt-1">Bulk Update DBR Master Data</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="bg-[var(--bg-panel)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Paste Data</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                        Copy data from Excel (Name/ID, Dr, Cr) and paste below. The first column must contain the ID (e.g., "10001 Name").
                    </p>
                    <textarea
                        className="w-full h-64 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)] resize-none"
                        placeholder={`Paste format example:\n10001 Pal Pashu ahaar\t21648\t0\n10002 Mohan Khad Bhandar\t647037\t0`}
                        value={textData}
                        onChange={(e) => setTextData(e.target.value)}
                    />
                    <div className="flex gap-4 mt-4">
                        <button
                            onClick={parseTextData}
                            className="flex-1 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">analytics</span>
                            Process Data
                        </button>
                        <button
                            onClick={() => setTextData('')}
                            className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold transition-all"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* Preview Section */}
                <div className="bg-[var(--bg-panel)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-[var(--text-primary)]">Preview ({parsedData.length})</h3>
                        <div className="flex flex-col items-end gap-2">
                            <button
                                onClick={handleUpload}
                                disabled={parsedData.length === 0 || uploading}
                                className="px-6 py-2 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                            >
                                {uploading ? <span className="animate-spin size-4 border-2 border-white/30 border-t-white rounded-full"></span> : <span className="material-symbols-outlined">cloud_upload</span>}
                                Upload Updates
                            </button>
                        </div>
                    </div>

                    {uploading && (
                        <div className="mb-4 space-y-2 animate-fadeIn">
                            <div className="flex justify-between text-xs font-bold text-[var(--text-secondary)]">
                                <span>Uploading...</span>
                                <span>{Math.round((uploadProgress / parsedData.length) * 100)}% ({uploadProgress}/{parsedData.length})</span>
                            </div>
                            <div className="h-2 w-full bg-[var(--bg-primary)] rounded-full overflow-hidden border border-[var(--border-color)]">
                                <div
                                    className="h-full bg-[var(--color-primary)] transition-all duration-300 ease-out"
                                    style={{ width: `${(uploadProgress / parsedData.length) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-auto bg-[var(--bg-secondary)]/30 rounded-xl border border-[var(--border-color)] relative">
                        {parsedData.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] text-sm">
                                Process data to see preview here.
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="sticky top-0 bg-[var(--bg-panel)] z-10 border-b border-[var(--border-color)] shadow-sm">
                                    <tr>
                                        <th className="p-3 text-[var(--text-secondary)]">ID</th>
                                        <th className="p-3 text-[var(--text-secondary)]">Name</th>
                                        <th className="p-3 text-right text-[var(--text-secondary)]">Net Balance</th>
                                        <th className="p-3 text-[var(--text-secondary)]">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)]">
                                    {parsedData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-[var(--bg-primary)]">
                                            <td className="p-3 font-mono text-[var(--text-primary)]">{row.id || '-'}</td>
                                            <td className="p-3 text-[var(--text-primary)] max-w-[150px] truncate" title={row.name}>{row.name}</td>
                                            <td className={`p-3 text-right font-bold ${row.netBalance > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {row.netBalance.toLocaleString('en-IN')}
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${row.status === 'Valid' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Logs Console */}
            {logs.length > 0 && (
                <div className="bg-black/90 p-6 rounded-2xl border border-white/10 font-mono text-xs text-green-400 max-h-48 overflow-auto custom-scrollbar">
                    <h4 className="text-white font-bold mb-2 sticky top-0 bg-black/90 pb-2 border-b border-white/10">Upload Logs</h4>
                    {logs.map((log, i) => (
                        <div key={i}>{log}</div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UploadBalance;
