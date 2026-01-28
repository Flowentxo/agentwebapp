
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Plus, CreditCard, ArrowRight } from 'lucide-react';

export const CreditTopUp = () => {
    const [amount, setAmount] = useState<number>(20);
    const [customAmount, setCustomAmount] = useState<string>('');

    const presets = [10, 20, 50, 100];

    const handleTopUp = () => {
        const finalAmount = customAmount ? parseFloat(customAmount) : amount;
        console.log('Top up amount:', finalAmount);
        // TODO: Implement payment gateway
    };

    return (
        <div className="p-6 rounded-2xl border border-white/10 bg-card/5 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-violet-500/20">
                    <Wallet className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">Credit Balance</h3>
                    <p className="text-sm text-white/60">Manage your pay-as-you-go credits</p>
                </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-card/5 border border-white/5 mb-8">
                <span className="text-white/60">Current Balance</span>
                <span className="text-2xl font-bold text-violet-400">$12.50</span>
            </div>

            <div className="space-y-4">
                <label className="text-sm font-medium text-white/80">Select Amount</label>
                <div className="grid grid-cols-4 gap-3">
                    {presets.map((preset) => (
                        <button
                            key={preset}
                            onClick={() => {
                                setAmount(preset);
                                setCustomAmount('');
                            }}
                            className={`py-2 px-4 rounded-lg border transition-all ${amount === preset && !customAmount
                                    ? 'bg-violet-500/20 border-violet-500/50 text-violet-400'
                                    : 'bg-card/5 border-white/10 text-white/60 hover:bg-card/10'
                                }`}
                        >
                            ${preset}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                    <input
                        type="number"
                        placeholder="Custom Amount"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="w-full bg-card/5 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                    />
                </div>

                <button
                    onClick={handleTopUp}
                    className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white font-medium hover:shadow-lg hover:shadow-violet-500/20 transition-all flex items-center justify-center gap-2 group"
                >
                    <CreditCard className="w-4 h-4" />
                    Add Funds
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <p className="text-xs text-center text-white/40 mt-4">
                    Secure payment processing via Stripe. Credits never expire.
                </p>
            </div>
        </div>
    );
};
