import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    TrendingUp, Users, Eye, MessageSquare, Download, DollarSign,
    BarChart3, Heart
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const GOLD = '#D4AF37';
const GOLD_LIGHT = '#F5E6A3';
const GOLD_DIM = '#8B7327';
const COLORS = [GOLD, '#C0C0C0', '#CD7F32', '#E5E4E2'];

const ranges = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: 'all', label: 'All Time' },
];

const StatCard = ({ icon: Icon, label, value, sub }) => (
    <div className="bg-obsidian border border-white/10 rounded-xl p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-white/50 text-sm">
            <Icon className="w-4 h-4 text-gold" />
            {label}
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {sub && <div className="text-sm text-white/40">{sub}</div>}
    </div>
);

const ChartCard = ({ title, children }) => (
    <div className="bg-obsidian border border-white/10 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">{title}</h3>
        {children}
    </div>
);

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-black border border-white/20 rounded-lg p-3 text-sm">
            <p className="text-white/60 mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }} className="font-medium">
                    {p.name}: ${Number(p.value).toFixed(2)}
                </p>
            ))}
        </div>
    );
};

export default function AnalyticsDashboard() {
    const { user } = useAuth();
    const [range, setRange] = useState('30d');
    const [revenue, setRevenue] = useState(null);
    const [subscribers, setSubscribers] = useState(null);
    const [topContent, setTopContent] = useState(null);
    const [engagement, setEngagement] = useState(null);
    const [messageStats, setMessageStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        const token = localStorage.getItem('kod_token');
        const headers = { Authorization: `Bearer ${token}` };
        setLoading(true);
        try {
            const [rev, subs, top, eng, msg] = await Promise.all([
                axios.get(`${API}/analytics/revenue?range=${range}`, { headers }),
                axios.get(`${API}/analytics/subscribers?range=${range}`, { headers }),
                axios.get(`${API}/analytics/top-content?range=${range}`, { headers }),
                axios.get(`${API}/analytics/engagement?range=${range}`, { headers }),
                axios.get(`${API}/analytics/messages-stats?range=${range}`, { headers }),
            ]);
            setRevenue(rev.data);
            setSubscribers(subs.data);
            setTopContent(top.data);
            setEngagement(eng.data);
            setMessageStats(msg.data);
        } catch (err) {
            console.error('Analytics fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleExport = () => {
        window.open(`${API}/analytics/export?range=${range}`, '_blank');
    };

    const pieData = revenue?.totals ? [
        { name: 'Subscriptions', value: revenue.totals.subscriptions },
        { name: 'Tips', value: revenue.totals.tips },
        { name: 'PPV', value: revenue.totals.ppv },
    ].filter(d => d.value > 0) : [];

    const demoPie = engagement?.demographics ? [
        { name: 'New', value: engagement.demographics.new_viewers },
        { name: 'Returning', value: engagement.demographics.returning_viewers },
    ].filter(d => d.value > 0) : [];

    return (
        <div className="min-h-screen bg-black">
            <Navbar />
            <div className="pt-20 pb-12 px-4 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-heading gold-text">Analytics</h1>
                        <p className="text-white/50 mt-1">Track your performance and earnings</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Range selector */}
                        <div className="flex bg-obsidian border border-white/10 rounded-lg overflow-hidden">
                            {ranges.map(r => (
                                <button
                                    key={r.value}
                                    onClick={() => setRange(r.value)}
                                    className={`px-3 py-2 text-sm transition-colors ${
                                        range === r.value
                                            ? 'bg-gold text-black font-semibold'
                                            : 'text-white/60 hover:text-white'
                                    }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 border border-gold/50 text-gold rounded-lg hover:bg-gold/10 transition-colors text-sm"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Stat Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <StatCard
                                icon={DollarSign}
                                label="Total Revenue"
                                value={`$${(revenue?.totals?.total || 0).toFixed(2)}`}
                                sub={`Tips: $${(revenue?.totals?.tips || 0).toFixed(2)}`}
                            />
                            <StatCard
                                icon={Users}
                                label="Active Subscribers"
                                value={subscribers?.total_subscribers || 0}
                                sub={`+${subscribers?.new_in_period || 0} this period`}
                            />
                            <StatCard
                                icon={Eye}
                                label="Engagement Rate"
                                value={`${engagement?.engagement_rate || 0}%`}
                                sub={`${engagement?.total_views || 0} total views`}
                            />
                            <StatCard
                                icon={MessageSquare}
                                label="Response Rate"
                                value={`${messageStats?.response_rate || 0}%`}
                                sub={`${messageStats?.total_conversations || 0} conversations`}
                            />
                        </div>

                        {/* Revenue Chart */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                            <ChartCard title="Revenue Over Time">
                                <div className="lg:col-span-2">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={revenue?.daily || []}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 11 }} />
                                            <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Area type="monotone" dataKey="subscriptions" stackId="1" stroke={GOLD} fill={GOLD} fillOpacity={0.3} name="Subscriptions" />
                                            <Area type="monotone" dataKey="tips" stackId="1" stroke={GOLD_LIGHT} fill={GOLD_LIGHT} fillOpacity={0.2} name="Tips" />
                                            <Area type="monotone" dataKey="ppv" stackId="1" stroke={GOLD_DIM} fill={GOLD_DIM} fillOpacity={0.2} name="PPV" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </ChartCard>

                            {/* Earnings Breakdown Pie */}
                            <ChartCard title="Earnings Breakdown">
                                {pieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                {pieData.map((_, i) => (
                                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[300px] flex items-center justify-center text-white/30">No revenue data</div>
                                )}
                            </ChartCard>
                        </div>

                        {/* Subscribers + Demographics */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                            <ChartCard title="Subscriber Growth">
                                <div className="lg:col-span-2">
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={subscribers?.daily || []}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 11 }} />
                                            <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Bar dataKey="new_subscribers" fill={GOLD} name="New Subscribers" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </ChartCard>

                            <ChartCard title="Viewer Demographics">
                                {demoPie.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie data={demoPie} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                <Cell fill={GOLD} />
                                                <Cell fill="#C0C0C0" />
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[250px] flex items-center justify-center text-white/30">No data</div>
                                )}
                            </ChartCard>
                        </div>

                        {/* Top Content */}
                        <ChartCard title="Top Performing Content">
                            {topContent?.content?.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10 text-white/50">
                                                <th className="text-left py-3 px-2">#</th>
                                                <th className="text-left py-3 px-2">Content</th>
                                                <th className="text-right py-3 px-2">Views</th>
                                                <th className="text-right py-3 px-2">Reactions</th>
                                                <th className="text-right py-3 px-2">Tips</th>
                                                <th className="text-right py-3 px-2">Engagement</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topContent.content.map((c, i) => {
                                                const views = c.view_count || 0;
                                                const reactions = c.reaction_count || 0;
                                                const eng = views > 0 ? ((reactions / views) * 100).toFixed(1) : '0.0';
                                                return (
                                                    <tr key={c.id || i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                        <td className="py-3 px-2 text-gold font-semibold">{i + 1}</td>
                                                        <td className="py-3 px-2 text-white max-w-[200px] truncate">
                                                            {c.caption || c.text || c.title || 'Untitled'}
                                                        </td>
                                                        <td className="py-3 px-2 text-right text-white/70">{views.toLocaleString()}</td>
                                                        <td className="py-3 px-2 text-right text-white/70">{reactions.toLocaleString()}</td>
                                                        <td className="py-3 px-2 text-right text-gold">${(c.tip_total || 0).toFixed(2)}</td>
                                                        <td className="py-3 px-2 text-right text-white/70">{eng}%</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="h-32 flex items-center justify-center text-white/30">No content data yet</div>
                            )}
                        </ChartCard>
                    </>
                )}
            </div>
        </div>
    );
}
