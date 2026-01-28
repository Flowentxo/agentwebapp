'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    DollarSign,
    Zap,
    TrendingUp,
    AlertTriangle,
    Info,
    X,
    Clock,
    Activity,
    PieChart as PieChartIcon
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

// Types
interface BudgetData {
    limits: {
        monthlyTokens: number;
        monthlyCostUsd: number;
        dailyTokens: number;
        dailyCostUsd: number;
        maxTokensPerRequest: number;
        maxRequestsPerMinute: number;
    };
    usage: {
        monthlyTokens: number;
        monthlyCostUsd: number;
        dailyTokens: number;
        dailyCostUsd: number;
    };
    percentages: {
        monthlyTokens: number;
        monthlyCost: number;
        dailyTokens: number;
        dailyCost: number;
    };
    resets: {
        monthResetAt: string;
        dayResetAt: string;
    };
    isActive: boolean;
    plan: string;
}

interface Alert {
    id: string;
    type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    currentUsage?: any;
    limit?: any;
    createdAt: string;
}

interface RateLimitData {
    config: {
        maxRequestsPerMinute: number;
        maxRequestsPerHour: number;
        maxRequestsPerDay: number;
    };
    status: {
        minute: {
            allowed: boolean;
            limit: number;
            remaining: number;
            resetAt: string;
            percentage: number;
        };
        hour: {
            allowed: boolean;
            limit: number;
            remaining: number;
            resetAt: string;
            percentage: number;
        };
        day: {
            allowed: boolean;
            limit: number;
            remaining: number;
            resetAt: string;
            percentage: number;
        };
    };
}

// Mock data for charts if API is empty
const MOCK_DAILY_USAGE = [
    { name: 'Mon', tokens: 4000, cost: 0.08 },
    { name: 'Tue', tokens: 3000, cost: 0.06 },
    { name: 'Wed', tokens: 2000, cost: 0.04 },
    { name: 'Thu', tokens: 2780, cost: 0.05 },
    { name: 'Fri', tokens: 1890, cost: 0.03 },
    { name: 'Sat', tokens: 2390, cost: 0.04 },
    { name: 'Sun', tokens: 3490, cost: 0.07 },
];

export function BudgetUsage() {
    const [budget, setBudget] = useState<BudgetData | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [rateLimit, setRateLimit] = useState<RateLimitData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Parallel fetching for performance
            const [budgetRes, rateLimitRes] = await Promise.all([
                fetch('/api/budget'),
                fetch('/api/budget/rate-limits')
            ]);

            if (budgetRes.ok) {
                const data = await budgetRes.json();
                setBudget(data.data.budget);
                setAlerts(data.data.alerts || []);
            } else {
                throw new Error('Failed to fetch budget data');
            }

            if (rateLimitRes.ok) {
                const data = await rateLimitRes.json();
                setRateLimit(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('Could not load budget information. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    const dismissAlert = async (alertId: string) => {
        try {
            await fetch('/api/budget/alerts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alertId }),
            });
            setAlerts(alerts.filter((a) => a.id !== alertId));
        } catch (error) {
            console.error('Failed to dismiss alert:', error);
        }
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 75) return 'bg-orange-500';
        if (percentage >= 50) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-500/10 border-red-500/20 text-red-600';
            case 'warning': return 'bg-orange-500/10 border-orange-500/20 text-orange-600';
            default: return 'bg-blue-500/10 border-blue-500/20 text-blue-600';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (error || !budget) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mb-4 opacity-20" />
                <p>{error || 'No budget data available'}</p>
                <button
                    onClick={fetchData}
                    className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 p-1"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-500">
                        Budget & Usage
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Monitor your API consumption and limits in real-time
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium uppercase tracking-wider border border-primary/20">
                        {budget.plan} Plan
                    </span>
                    <button
                        onClick={fetchData}
                        className="p-2 hover:bg-secondary/50 rounded-full transition-colors text-muted-foreground hover:text-foreground"
                        title="Refresh Data"
                    >
                        <Activity className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Alerts Section */}
            {alerts.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                >
                    {alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`p-4 border rounded-xl ${getSeverityColor(alert.severity)} flex items-start gap-3 backdrop-blur-sm`}
                        >
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <div className="flex-1">
                                <p className="font-medium text-sm">{alert.message}</p>
                                {alert.currentUsage && (
                                    <p className="text-xs mt-1 opacity-80">
                                        Current: {alert.currentUsage.tokens?.toLocaleString()} tokens
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => dismissAlert(alert.id)}
                                className="text-current hover:opacity-70 transition-opacity"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    title="Monthly Cost"
                    value={`$${budget.usage.monthlyCostUsd.toFixed(2)}`}
                    limit={`$${budget.limits.monthlyCostUsd.toFixed(2)}`}
                    percentage={budget.percentages.monthlyCost}
                    icon={<DollarSign className="h-5 w-5 text-green-500" />}
                    color="green"
                />
                <KpiCard
                    title="Monthly Tokens"
                    value={budget.usage.monthlyTokens.toLocaleString()}
                    limit={budget.limits.monthlyTokens.toLocaleString()}
                    percentage={budget.percentages.monthlyTokens}
                    icon={<Zap className="h-5 w-5 text-violet-500" />}
                    color="violet"
                />
                <KpiCard
                    title="Daily Cost"
                    value={`$${budget.usage.dailyCostUsd.toFixed(2)}`}
                    limit={`$${budget.limits.dailyCostUsd.toFixed(2)}`}
                    percentage={budget.percentages.dailyCost}
                    icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
                    color="blue"
                />
                <KpiCard
                    title="Daily Tokens"
                    value={budget.usage.dailyTokens.toLocaleString()}
                    limit={budget.limits.dailyTokens.toLocaleString()}
                    percentage={budget.percentages.dailyTokens}
                    icon={<Activity className="h-5 w-5 text-orange-500" />}
                    color="orange"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Usage Chart */}
                <div className="lg:col-span-2 oracle-glass-card p-6 rounded-2xl border border-white/10 bg-card/5 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold flex items-center gap-2">
                            <BarChartIcon className="h-5 w-5 text-muted-foreground" />
                            Token Usage History
                        </h3>
                        <select className="bg-transparent border border-white/10 rounded-lg text-xs px-2 py-1 text-muted-foreground focus:outline-none focus:border-primary/50">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full" style={{ minHeight: 300 }}>
                        <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                            <BarChart data={MOCK_DAILY_USAGE}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(20, 20, 25, 0.9)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                    }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="tokens" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                                    {MOCK_DAILY_USAGE.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${0.5 + (index / 10)})`} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Rate Limits & Status */}
                <div className="space-y-6">
                    {/* Rate Limits Card */}
                    {rateLimit && (
                        <div className="oracle-glass-card p-6 rounded-2xl border border-white/10 bg-card/5 backdrop-blur-xl">
                            <h3 className="font-semibold flex items-center gap-2 mb-4">
                                <Clock className="h-5 w-5 text-muted-foreground" />
                                Rate Limits
                            </h3>
                            <div className="space-y-4">
                                <RateLimitItem
                                    label="Requests / Minute"
                                    current={rateLimit.status.minute.remaining}
                                    max={rateLimit.status.minute.limit}
                                    percentage={rateLimit.status.minute.percentage}
                                    resetTime={rateLimit.status.minute.resetAt}
                                />
                                <RateLimitItem
                                    label="Requests / Hour"
                                    current={rateLimit.status.hour.remaining}
                                    max={rateLimit.status.hour.limit}
                                    percentage={rateLimit.status.hour.percentage}
                                    resetTime={rateLimit.status.hour.resetAt}
                                />
                            </div>
                        </div>
                    )}

                    {/* System Status / Info */}
                    <div className="oracle-glass-card p-6 rounded-2xl border border-white/10 bg-card/5 backdrop-blur-xl">
                        <h3 className="font-semibold flex items-center gap-2 mb-4">
                            <Info className="h-5 w-5 text-muted-foreground" />
                            Plan Details
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-muted-foreground">Max Tokens / Req</span>
                                <span className="font-medium">{budget.limits.maxTokensPerRequest.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-muted-foreground">Daily Reset</span>
                                <span className="font-medium">
                                    {new Date(budget.resets.dayResetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-muted-foreground">Monthly Reset</span>
                                <span className="font-medium">
                                    {new Date(budget.resets.monthResetAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// Sub-components for cleaner code

function KpiCard({ title, value, limit, percentage, icon, color }: any) {
    return (
        <div className="oracle-glass-card p-5 rounded-2xl border border-white/10 bg-card/5 backdrop-blur-xl hover:bg-card/10 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg bg-${color}-500/10 text-${color}-500 group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${percentage > 90 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                    {percentage.toFixed(1)}%
                </span>
            </div>
            <div>
                <h4 className="text-muted-foreground text-xs uppercase tracking-wider font-medium mb-1">{title}</h4>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">{value}</span>
                    <span className="text-xs text-muted-foreground">/ {limit}</span>
                </div>
            </div>
            <div className="mt-3 h-1.5 w-full bg-card/5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percentage, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full bg-${color}-500`}
                />
            </div>
        </div>
    );
}

function RateLimitItem({ label, current, max, percentage, resetTime }: any) {
    return (
        <div>
            <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono text-xs opacity-80">{current} / {max}</span>
            </div>
            <div className="h-2 w-full bg-card/5 rounded-full overflow-hidden mb-1">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percentage, 100)}%` }}
                    className={`h-full rounded-full ${percentage > 90 ? 'bg-red-500' : 'bg-primary'}`}
                />
            </div>
            <div className="flex justify-end">
                <span className="text-[10px] text-muted-foreground">
                    Resets {new Date(resetTime).toLocaleTimeString()}
                </span>
            </div>
        </div>
    );
}

function BarChartIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="12" x2="12" y1="20" y2="10" />
            <line x1="18" x2="18" y1="20" y2="4" />
            <line x1="6" x2="6" y1="20" y2="16" />
        </svg>
    )
}
