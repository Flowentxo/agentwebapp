
import React from 'react';
import { motion } from 'framer-motion';
import { Download, ExternalLink, CheckCircle, Clock } from 'lucide-react';

export const BillingHistory = () => {
    const transactions = [
        { id: 'INV-2024-001', date: 'Oct 24, 2024', amount: '$29.00', status: 'Paid', plan: 'Pro Plan' },
        { id: 'INV-2024-002', date: 'Sep 24, 2024', amount: '$29.00', status: 'Paid', plan: 'Pro Plan' },
        { id: 'INV-2024-003', date: 'Aug 24, 2024', amount: '$20.00', status: 'Paid', plan: 'Credit Top-up' },
    ];

    return (
        <div className="p-6 rounded-2xl border border-white/10 bg-card/5 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Billing History</h3>
                <button className="text-sm text-white/60 hover:text-white flex items-center gap-1 transition-colors">
                    View All <ExternalLink className="w-3 h-3" />
                </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/5">
                <table className="w-full text-left text-sm">
                    <thead className="bg-card/5 text-white/60">
                        <tr>
                            <th className="p-4 font-medium">Invoice</th>
                            <th className="p-4 font-medium">Date</th>
                            <th className="p-4 font-medium">Amount</th>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-card/5 transition-colors">
                                <td className="p-4">
                                    <div className="font-medium text-white">{tx.plan}</div>
                                    <div className="text-xs text-white/40">{tx.id}</div>
                                </td>
                                <td className="p-4 text-white/80">{tx.date}</td>
                                <td className="p-4 text-white font-medium">{tx.amount}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-1.5">
                                        {tx.status === 'Paid' ? (
                                            <>
                                                <CheckCircle className="w-3.5 h-3.5 text-violet-400" />
                                                <span className="text-violet-400 text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/10">Paid</span>
                                            </>
                                        ) : (
                                            <>
                                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                                <span className="text-amber-400 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10">Pending</span>
                                            </>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <button className="p-2 hover:bg-card/10 rounded-lg transition-colors text-white/60 hover:text-white">
                                        <Download className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
