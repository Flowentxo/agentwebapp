
import React from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Shield, Star } from 'lucide-react';

interface PlanProps {
    name: string;
    price: string;
    period: string;
    features: string[];
    isPopular?: boolean;
    isCurrent?: boolean;
    color: string;
    onSelect: () => void;
}

const PlanCard = ({ name, price, period, features, isPopular, isCurrent, color, onSelect }: PlanProps) => (
    <motion.div
        whileHover={{ y: -5 }}
        className={`relative p-6 rounded-2xl border backdrop-blur-xl transition-all duration-300 flex flex-col h-full ${isCurrent
            ? 'border-green-500/50 bg-green-500/5 shadow-[0_0_30px_rgba(34,197,94,0.1)]'
            : isPopular
                ? `border-${color}-500/50 bg-${color}-500/5 shadow-[0_0_30px_rgba(139,92,246,0.1)]`
                : 'border-white/10 bg-card/5 hover:border-white/20'
            }`}
    >
        {isPopular && (
            <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium bg-${color}-500 text-white shadow-lg`}>
                Most Popular
            </div>
        )}
        {isCurrent && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium bg-green-500 text-white shadow-lg">
                Current Plan
            </div>
        )}

        <div className="mb-6 text-center">
            <h3 className="text-xl font-semibold text-white mb-2">{name}</h3>
            <div className="flex items-end justify-center gap-1">
                <span className="text-3xl font-bold text-white">{price}</span>
                <span className="text-white/60 mb-1">{period}</span>
            </div>
        </div>

        <div className="flex-1 space-y-4 mb-8">
            {features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                    <div className={`mt-1 p-0.5 rounded-full bg-${color}-500/20`}>
                        <Check className={`w-3 h-3 text-${color}-400`} />
                    </div>
                    <span className="text-sm text-white/80">{feature}</span>
                </div>
            ))}
        </div>

        <button
            onClick={onSelect}
            disabled={isCurrent}
            className={`w-full py-3 rounded-xl font-medium transition-all duration-300 ${isCurrent
                ? 'bg-card/10 text-white/40 cursor-default'
                : `bg-gradient-to-r from-${color}-600 to-${color}-500 hover:shadow-lg hover:shadow-${color}-500/25 text-white`
                }`}
        >
            {isCurrent ? 'Active Plan' : 'Upgrade Now'}
        </button>
    </motion.div>
);

export const SubscriptionPlans = () => {
    const handleSelect = (plan: string) => {
        console.log('Selected plan:', plan);
        // TODO: Implement checkout flow
    };

    return (
        <div className="space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">Choose Your Plan</h2>
                <p className="text-white/60">Scale your AI capabilities with our flexible pricing tiers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PlanCard
                    name="Starter"
                    price="$0"
                    period="/mo"
                    color="slate"
                    features={[
                        '10,000 Tokens / month',
                        'Access to GPT-3.5 Turbo',
                        'Basic Rate Limits',
                        'Community Support',
                        '7-day History Retention'
                    ]}
                    isCurrent={true}
                    onSelect={() => handleSelect('starter')}
                />

                <PlanCard
                    name="Pro"
                    price="$29"
                    period="/mo"
                    color="violet"
                    isPopular={true}
                    features={[
                        '1,000,000 Tokens / month',
                        'Access to GPT-4 & Claude 3',
                        'Priority Rate Limits',
                        'Email Support',
                        '30-day History Retention',
                        'Advanced Analytics'
                    ]}
                    onSelect={() => handleSelect('pro')}
                />

                <PlanCard
                    name="Enterprise"
                    price="$99"
                    period="/mo"
                    color="indigo"
                    features={[
                        'Unlimited Tokens (Pay-as-you-go)',
                        'Access to All Models',
                        'Custom Rate Limits',
                        '24/7 Dedicated Support',
                        'Unlimited History',
                        'SSO & Team Management',
                        'Custom SLAs'
                    ]}
                    onSelect={() => handleSelect('enterprise')}
                />
            </div>
        </div>
    );
};
