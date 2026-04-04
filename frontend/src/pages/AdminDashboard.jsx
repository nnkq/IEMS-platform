import { useState, useEffect } from 'react';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('approval');
    const [expandedOrder, setExpandedOrder] = useState(null);

    const [pendingStores, setPendingStores] = useState([]);
    const [orders, setOrders] = useState([]);
    const [usersData, setUsersData] = useState({
        stats: { totalUsers: 0, totalPartners: 0, activeStores: 0, premiumSubscriptions: 0 },
        storesList: [],
        usersList: [] // Added usersList
    });
    const [packages, setPackages] = useState([]);
    const [currentPackage, setCurrentPackage] = useState("FREE"); // Default for sample
    const handleOpenPayment = (pkg) => alert(`Đăng ký gói ${pkg}`);
    const [revenueData, setRevenueData] = useState([]);
    const [revenueStats, setRevenueStats] = useState({ totalCommission: 0, totalPremium: 0, totalProfit: 0 });

    const API_BASE = 'http://localhost:5000/api/admin';

    useEffect(() => {
        console.log("AdminDashboard mounted, fetching all data...");
        fetchPendingStores();
        fetchOrders();
        fetchUsersAndPartners();
        fetchPackages();
        fetchRevenue();
    }, []);

    const fetchPendingStores = async () => {
        try {
            const res = await fetch(`${API_BASE}/pending-stores`);
            const data = await res.json();
            setPendingStores(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    const fetchOrders = async () => {
        try {
            const res = await fetch(`${API_BASE}/orders`);
            const data = await res.json();
            setOrders(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    const fetchUsersAndPartners = async () => {
        try {
            const res = await fetch(`${API_BASE}/users-partners`);
            if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
            const data = await res.json();
            console.log("Users and Partners Data:", data);
            if (data && data.stats) setUsersData(data);
        } catch (e) {
            console.error("Fetch Users/Partners Failed:", e);
        }
    };

    const fetchPackages = async () => {
        try {
            const res = await fetch(`${API_BASE}/packages`);
            const data = await res.json();
            setPackages(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    const fetchRevenue = async () => {
        try {
            const res = await fetch(`${API_BASE}/revenue`);
            const data = await res.json();
            if (res.ok) {
                setRevenueStats({ totalCommission: data.totalCommission || 0, totalPremium: data.totalPremium || 0, totalProfit: data.totalProfit || 0 });
                setRevenueData(data.chartData || []);
            }
        } catch (e) { console.error(e); }
    };

    const handleApprove = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn duyệt?")) return;
        try {
            const res = await fetch(`${API_BASE}/approve-store/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initialRating: 5.0 })
            });
            if (res.ok) {
                setPendingStores(s => s.filter(x => x.id !== id));
                fetchUsersAndPartners();
                alert('✅ Đã phê duyệt cửa hàng thành công!');
            } else alert('❌ Lỗi khi duyệt cửa hàng!');
        } catch (e) { console.error(e); }
    };

    const handleReject = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn từ chối?")) return;
        try {
            const res = await fetch(`${API_BASE}/reject-store/${id}`, { method: 'POST' });
            if (res.ok) {
                setPendingStores(s => s.filter(x => x.id !== id));
                fetchUsersAndPartners();
                alert('🚫 Đã từ chối cửa hàng này!');
            } else alert('❌ Lỗi khi từ chối!');
        } catch (e) { console.error(e); }
    };
    // đăng xuất
    const handleLogout = () => {
        if (window.confirm("Bạn có chắc chắn muốn đăng xuất hệ thống?")) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login';
        }
    };

    // ======= ICONS (inline SVG) =======
    const IconStore = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" /></svg>;
    const IconOrders = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>;
    const IconUsers = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>;
    const IconRevenue = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
    const IconCrown = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385c.148.621-.531 1.05-1.015.809l-4.73-2.365a.563.563 0 0 0-.528 0l-4.73 2.365c-.484.24-1.163-.188-1.015-.809l1.285-5.385a.563.563 0 0 0-.182-.557l-4.204-3.602c-.38-.325-.178-.948.321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>;
    const IconCheck = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 16, height: 16 }}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>;
    const IconMap = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>;
    const IconShield = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>;
    const IconExternal = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 13, height: 13 }}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>;
    const IconLogout = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>;
    const CheckIcon = ({ color = "#10b981" }) => (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke={color} style={{ width: "16px", height: "16px", marginRight: "8px", flexShrink: 0, marginTop: "2px" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
    );

    // ======= STYLES =======
    const s = {
        page: { display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: "'Inter', sans-serif" },
        sidebar: { width: 260, backgroundColor: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0 },
        sidebarLogo: { padding: '24px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 12 },
        logoBox: { width: 40, height: 40, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 },
        nav: { flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 },
        navLabel: { fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 1.5, textTransform: 'uppercase', padding: '12px 12px 6px' },
        navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', backgroundColor: active ? 'rgba(59,130,246,0.15)' : 'transparent', color: active ? '#60a5fa' : '#94a3b8', border: active ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent', transition: 'all 0.15s' }),
        navDot: (count) => ({ marginLeft: 'auto', backgroundColor: '#ef4444', color: 'white', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999, display: count > 0 ? 'inline' : 'none' }),
        sidebarFooter: { padding: '16px 20px', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 12 },
        avatar: { width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 },
        main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
        topbar: { backgroundColor: 'white', height: 60, padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' },
        content: { flex: 1, overflowY: 'auto', padding: 32 },
        card: { backgroundColor: 'white', borderRadius: 14, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
        statCard: { backgroundColor: 'white', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 16 },
        iconBox: (bg, color) => ({ width: 48, height: 48, borderRadius: 12, backgroundColor: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
        badge: (color, bg) => ({ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, color, backgroundColor: bg }),
        btn: (bg, color, border) => ({ padding: '8px 18px', borderRadius: 8, border: border || 'none', backgroundColor: bg, color, fontWeight: 600, cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'opacity 0.15s' }),
        table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
        th: { padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' },
        td: { padding: '14px 16px', borderBottom: '1px solid #f1f5f9', color: '#334155', verticalAlign: 'middle' },
        input: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#0f172a' },
    };

    const statusColor = (status) => {
        const map = {
            WAITING: { bg: '#fef3c7', color: '#d97706' }, IN_PROGRESS: { bg: '#dbeafe', color: '#2563eb' },
            COMPLETED: { bg: '#d1fae5', color: '#059669' }, CANCELLED: { bg: '#fee2e2', color: '#e11d48' },
        };
        return map[status] || { bg: '#f1f5f9', color: '#64748b' };
    };

    // ======= MINI BAR CHART (không cần recharts) =======
    const MiniChart = ({ data }) => {
        if (!data || data.length === 0) return null;
        const maxVal = Math.max(...data.map(d => Math.max(d.premium, d.commission)));
        return (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, padding: '0 4px', overflowX: 'auto' }}>
                {data.map((d, i) => (
                    <div key={i} style={{ flex: 1, minWidth: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 90 }}>
                            <div style={{ width: 8, height: `${(d.commission / maxVal) * 90}px`, backgroundColor: '#3b82f6', borderRadius: '3px 3px 0 0', transition: 'height 0.4s' }} title={`Hoa hồng: ${d.commission}`} />
                            <div style={{ width: 8, height: `${(d.premium / maxVal) * 90}px`, backgroundColor: '#f97316', borderRadius: '3px 3px 0 0', transition: 'height 0.4s' }} title={`Premium: ${d.premium}`} />
                        </div>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{d.name}</span>
                    </div>
                ))}
            </div>
        );
    };

    const menuItems = [
        { id: 'approval', label: 'Phê Duyệt Cửa Hàng', icon: <IconStore />, group: 'core', count: pendingStores.length },
        { id: 'orders', label: 'Quản Lý Đơn Hàng', icon: <IconOrders />, group: 'core' },
        { id: 'users', label: 'Người Dùng & Đối Tác', icon: <IconUsers />, group: 'ext' },
        { id: 'revenue', label: 'Báo cáo doanh thu', icon: <IconRevenue />, group: 'ext' },
        { id: 'packages', label: 'Gói quảng bá', icon: <IconCrown />, group: 'ext' },
    ];

    return (
        <div style={s.page}>
            {/* SIDEBAR */}
            <aside style={s.sidebar}>
                <div style={s.sidebarLogo}>
                    <div style={s.logoBox}>
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: 'white' }}>Admin Panel</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Hệ thống IEMS</div>
                    </div>
                </div>

                <nav style={s.nav}>
                    <div style={s.navLabel}>Quản lý cốt lõi</div>
                    {menuItems.filter(m => m.group === 'core').map(m => (
                        <div key={m.id} style={s.navItem(activeTab === m.id)} onClick={() => setActiveTab(m.id)}>
                            {m.icon}
                            <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{m.label}</span>
                            {m.count > 0 && <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999 }}>{m.count}</span>}
                        </div>
                    ))}
                    <div style={{ ...s.navLabel, marginTop: 8 }}>Hệ thống mở rộng</div>
                    {menuItems.filter(m => m.group === 'ext').map(m => (
                        <div key={m.id} style={s.navItem(activeTab === m.id)} onClick={() => setActiveTab(m.id)}>
                            {m.icon}
                            <span style={{ fontSize: 14, fontWeight: 500 }}>{m.label}</span>
                        </div>
                    ))}
                </nav>

                <div style={{ ...s.sidebarFooter, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={s.avatar}>AD</div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>Quản trị viên</div>
                            <div style={{ fontSize: 12, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
                                Đang hoạt động
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.15)',
                            color: '#f87171',
                            padding: '8px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            outline: 'none',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                            e.currentTarget.style.color = '#ef4444';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            e.currentTarget.style.color = '#f87171';
                        }}
                        title="Đăng xuất"
                    >
                        <IconLogout />
                    </button>
                </div>
            </aside>

            {/* MAIN */}
            <main style={s.main}>
                <header style={s.topbar}>
                    <div style={{ fontWeight: 700, fontSize: 17, color: '#0f172a' }}>Bảng Điều Khiển Hệ Thống</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </header>

                <div style={s.content}>

                    {/* ===== TAB 1: PHÊ DUYỆT ===== */}
                    {activeTab === 'approval' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
                                <div>
                                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Phê Duyệt Cửa Hàng</h1>
                                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Duyệt và kích hoạt đối tác tham gia hệ thống.</p>
                                </div>
                                <span style={s.badge('#2563eb', '#dbeafe')}>{pendingStores.length} chờ duyệt</span>
                            </div>

                            {pendingStores.length === 0 ? (
                                <div style={{ ...s.card, textAlign: 'center', padding: 60 }}>
                                    <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#059669' }}>
                                        <IconCheck />
                                    </div>
                                    <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>Đã duyệt xong!</h3>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Không có cửa hàng nào cần kiểm tra lúc này.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 20 }}>
                                    {pendingStores.map(store => (
                                        <div key={store.id} style={s.card}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                                <div>
                                                    <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        {store.name}
                                                        <span style={s.badge('#d97706', '#fef3c7')}>Chờ duyệt</span>
                                                    </h3>
                                                    <p style={{ margin: 0, fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <IconMap /> {store.address}
                                                    </p>
                                                    <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#475569' }}>
                                                        <strong>Người sở hữu:</strong> {store.owner} • {store.phone}
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={{ backgroundColor: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: '1px solid #e2e8f0' }}>
                                                <p style={{ margin: '0 0 8px', fontSize: 13, color: '#475569' }}><strong>Chuyên môn:</strong> {store.services || 'Chưa cập nhật'}</p>
                                                {store.mapsLink && (
                                                    <a href={store.mapsLink} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontWeight: 600 }}>
                                                        Kiểm tra Google Maps <IconExternal />
                                                    </a>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button onClick={() => handleReject(store.id)} style={{ ...s.btn('#fee2e2', '#b91c1c'), flex: 1, justifyContent: 'center', padding: '10px' }}>
                                                    Từ chối
                                                </button>
                                                <button onClick={() => handleApprove(store.id)} style={{ ...s.btn('#2563eb', 'white'), flex: 2, justifyContent: 'center', padding: '10px' }}>
                                                    <IconCheck /> Phê Duyệt & Kích Hoạt
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===== TAB 2: ĐƠN HÀNG ===== */}
                    {activeTab === 'orders' && (
                        <div>
                            <div style={{ marginBottom: 24 }}>
                                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Quản Lý Tiến Trình (Orders)</h1>
                                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Theo dõi tiến trình từ lúc AI phân tích đến khi hoàn tất báo giá và bàn giao.</p>
                            </div>
                            <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
                                {orders.length === 0 ? (
                                    <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Chưa có đơn hàng/yêu cầu nào.</div>
                                ) : (
                                    <table style={s.table}>
                                        <thead>
                                            <tr>
                                                <th style={s.th}>Mã YC/Đơn</th>
                                                <th style={s.th}>Khách Hàng</th>
                                                <th style={s.th}>Thiết Bị & Chẩn Đoán AI</th>
                                                <th style={s.th}>Cửa Hàng</th>
                                                <th style={s.th}>Trạng Thái</th>
                                                <th style={{ ...s.th, textAlign: 'right' }}>Chi tiết</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders.map(order => {
                                                const { bg, color } = statusColor(order.status);
                                                return (
                                                    <div key={order.id} style={{ display: 'contents' }}>
                                                        <tr style={{ backgroundColor: expandedOrder === order.id ? '#f0f9ff' : 'white' }}
                                                            onMouseEnter={e => { if (expandedOrder !== order.id) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                                            onMouseLeave={e => { if (expandedOrder !== order.id) e.currentTarget.style.backgroundColor = 'white'; }}>
                                                            <td style={s.td}>
                                                                <div style={{ fontWeight: 700, color: '#2563eb' }}>{order.id}</div>
                                                                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{order.date}</div>
                                                            </td>
                                                            <td style={s.td}>
                                                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{order.customer}</div>
                                                            </td>
                                                            <td style={s.td}>
                                                                <div style={{ fontWeight: 600, color: '#334155' }}>{order.device}</div>
                                                                <div style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: '#64748b' }} title={order.aiAnalysis}>{order.aiAnalysis}</div>
                                                                <div style={{ fontSize: 12, color: '#d97706', marginTop: 2, fontWeight: 500 }}>AI tính: {order.aiEstimatedPrice}</div>
                                                            </td>
                                                            <td style={s.td}>{order.store}</td>
                                                            <td style={s.td}><span style={s.badge(color, bg)}>{order.status}</span></td>
                                                            <td style={{ ...s.td, textAlign: 'right' }}>
                                                                <button onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} style={{ ...s.btn('transparent', '#2563eb', '1px solid #bfdbfe'), backgroundColor: expandedOrder === order.id ? '#eff6ff' : 'transparent' }}>
                                                                    {expandedOrder === order.id ? 'Đóng' : 'Xem Tracking'}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                        {expandedOrder === order.id && (
                                                            <tr key={order.id + '-expand'}>
                                                                <td colSpan={6} style={{ padding: 24, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                                    <div style={{ display: 'flex', gap: 32 }}>
                                                                        <div style={{ flex: 1 }}>
                                                                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, marginBottom: 16 }}>Tiến trình xử lý</div>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                                                                {order.timeline?.map((item, idx) => (
                                                                                    <div key={idx} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                                                                                        <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: item.completed ? '#dbeafe' : '#f1f5f9', color: item.completed ? '#2563eb' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                                            {item.completed ? <IconCheck /> : <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#cbd5e1', display: 'block' }} />}
                                                                                        </div>
                                                                                        <div>
                                                                                            <div style={{ fontWeight: 600, fontSize: 14, color: item.completed ? '#0f172a' : '#94a3b8' }}>{item.step}</div>
                                                                                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{item.detail} • {item.time}</div>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                        <div style={{ width: 220, backgroundColor: 'white', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0' }}>
                                                                            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 12 }}>Tài khoản đối soát</div>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                                                                                <span style={{ color: '#64748b' }}>Khách trả thật:</span>
                                                                                <span style={{ fontWeight: 600 }}>{Number(order.total).toLocaleString()}đ</span>
                                                                            </div>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                                                                                <span style={{ color: '#64748b' }}>Đối tác nhận:</span>
                                                                                <span style={{ fontWeight: 600 }}>{(order.total - order.commission).toLocaleString()}đ</span>
                                                                            </div>
                                                                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                                                                <span style={{ color: '#2563eb', fontWeight: 600 }}>Hoa hồng IEMS:</span>
                                                                                <span style={{ color: '#2563eb', fontWeight: 700 }}>+{Number(order.commission).toLocaleString()}đ</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ===== TAB 3: NGƯỜI DÙNG & ĐỐI TÁC ===== */}
                    {activeTab === 'users' && (
                        <div>
                            <div style={{ marginBottom: 24 }}>
                                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Người Dùng & Đối Tác</h1>
                                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Danh sách tổng hợp tài khoản Hệ thống.</p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                                <div style={s.statCard}>
                                    <div style={s.iconBox('#dbeafe', '#2563eb')}><IconUsers /></div>
                                    <div>
                                        <div style={{ fontSize: 13, color: '#64748b' }}>Tổng Người Dùng</div>
                                        <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{usersData.stats.totalUsers}</div>
                                    </div>
                                </div>
                                <div style={s.statCard}>
                                    <div style={s.iconBox('#f3e8ff', '#9333ea')}><IconUsers /></div>
                                    <div>
                                        <div style={{ fontSize: 13, color: '#64748b' }}>Tổng Đối Tác</div>
                                        <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{usersData.stats.totalPartners}</div>
                                    </div>
                                </div>
                                <div style={s.statCard}>
                                    <div style={s.iconBox('#d1fae5', '#059669')}><IconStore /></div>
                                    <div>
                                        <div style={{ fontSize: 13, color: '#64748b' }}>Cửa Hàng Active</div>
                                        <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{usersData.stats.activeStores}</div>
                                    </div>
                                </div>
                                <div style={s.statCard}>
                                    <div style={s.iconBox('#fef3c7', '#d97706')}><IconCrown /></div>
                                    <div>
                                        <div style={{ fontSize: 13, color: '#64748b' }}>Gói Premium</div>
                                        <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{usersData.stats.premiumSubscriptions}</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ ...s.card, padding: 0, overflow: 'hidden', marginBottom: 24 }}>
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Danh Sách Đối Tác Cửa Hàng (Stores)</span>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    {usersData.storesList.length === 0 ? (
                                        <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Chưa có đối tác nào.</div>
                                    ) : (
                                        <table style={s.table}>
                                            <thead>
                                                <tr>
                                                    <th style={s.th}>Store ID</th>
                                                    <th style={s.th}>Thông tin Cửa hàng & Chủ</th>
                                                    <th style={s.th}>Hiệu Suất Kinh Doanh</th>
                                                    <th style={s.th}>Gói Dịch Vụ</th>
                                                    <th style={{ ...s.th, textAlign: 'right' }}>Trạng Thái</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {usersData.storesList.map(store => (
                                                    <tr key={store.id}
                                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
                                                        <td style={{ ...s.td, color: '#94a3b8', fontWeight: 600 }}>{store.id}</td>
                                                        <td style={s.td}>
                                                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{store.name}</div>
                                                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{store.owner} • {store.phone}</div>
                                                            <div style={{ fontSize: 12, color: '#94a3b8' }}>{store.email}</div>
                                                        </td>
                                                        <td style={s.td}>
                                                            <span style={{ color: '#f59e0b', fontWeight: 600 }}>★ {store.rating}</span>
                                                            <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 4 }}>({store.reviews} ĐG)</span>
                                                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Đã hoàn tất: <span style={{ fontWeight: 600 }}>{store.totalOrders} đơn</span></div>
                                                        </td>
                                                        <td style={s.td}>
                                                            <div style={{ color: store.package?.includes('Premium') ? '#ea580c' : '#475569', fontWeight: store.package?.includes('Premium') ? 600 : 400 }}>{store.package}</div>
                                                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>HSD: {store.packageExpiry}</div>
                                                        </td>
                                                        <td style={{ ...s.td, textAlign: 'right' }}>
                                                            <span style={s.badge(store.status === 'Active' ? '#059669' : '#d97706', store.status === 'Active' ? '#d1fae5' : '#fef3c7')}>{store.status}</span>
                                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Ngày ĐK: {store.joinedAt}</div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>

                            <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Danh Sách Người Dùng (Users)</span>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    {usersData.usersList?.length === 0 ? (
                                        <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Chưa có người dùng nào.</div>
                                    ) : (
                                        <table style={s.table}>
                                            <thead>
                                                <tr>
                                                    <th style={s.th}>User ID</th>
                                                    <th style={s.th}>Thông tin Tài Khoản</th>
                                                    <th style={s.th}>Số Yêu Cầu Đã Gửi</th>
                                                    <th style={{ ...s.th, textAlign: 'right' }}>Trạng Thái</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {usersData.usersList?.map(user => (
                                                    <tr key={user.id}>
                                                        <td style={{ ...s.td, color: '#94a3b8', fontWeight: 600 }}>{user.id}</td>
                                                        <td style={s.td}>
                                                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{user.name}</div>
                                                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{user.email} • {user.phone}</div>
                                                        </td>
                                                        <td style={s.td}><span style={{ fontWeight: 600, color: '#2563eb' }}>{user.totalRequests}</span> Yêu cầu</td>
                                                        <td style={{ ...s.td, textAlign: 'right' }}>
                                                            <span style={s.badge(user.status === 'ACTIVE' ? '#059669' : '#dc2626', user.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2')}>{user.status}</span>
                                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Tham gia: {user.joinedAt}</div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== TAB 4: DOANH THU ===== */}
                    {activeTab === 'revenue' && (
                        <div>
                            <div style={{ marginBottom: 24 }}>
                                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Báo Cáo Doanh Thu (7 Ngày)</h1>
                                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Tổng quan doanh thu thực tế ghi nhận từ Hoa Hồng Đơn và Gói Dịch Vụ.</p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                                <div style={s.card}>
                                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Tổng Lợi Nhuận Hoa Hồng (10%)</div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{Number(revenueStats.totalCommission).toLocaleString()}đ</div>
                                    <div style={{ fontSize: 13, color: '#059669', marginTop: 6 }}>Từ các đơn hàng hoàn tất</div>
                                </div>
                                <div style={s.card}>
                                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Doanh Thu Gói Premium & Cọc</div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{Number(revenueStats.totalPremium).toLocaleString()}đ</div>
                                    <div style={{ fontSize: 13, color: '#059669', marginTop: 6 }}>Từ các thanh toán đã ghi nhận</div>
                                </div>
                                <div style={{ ...s.card, backgroundColor: '#2563eb', border: 'none' }}>
                                    <div style={{ fontSize: 13, color: '#bfdbfe', marginBottom: 8 }}>Tổng Doanh Thu Hệ Thống</div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: 'white' }}>{Number(revenueStats.totalProfit).toLocaleString()}đ</div>
                                    <div style={{ fontSize: 13, color: '#93c5fd', marginTop: 6 }}>Biên lợi nhuận gộp</div>
                                </div>
                            </div>
                            <div style={s.card}>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 20 }}>Biểu đồ Doanh Thu Hoa Hồng (7 ngày qua)</div>
                                <MiniChart data={revenueData} />
                            </div>
                        </div>
                    )}

                    {/* ===== TAB 5: QUẢN LÝ GÓI QUẢNG BÁ (DÀNH CHO ADMIN) ===== */}
                    {activeTab === 'packages' && (
                        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
                                <div>
                                    <h1 style={{ color: "#0f172a", margin: 0, fontSize: "28px", fontWeight: "bold" }}>Quản Lý Gói Quảng Bá</h1>
                                    <p style={{ color: "#64748b", margin: "4px 0 0" }}>Cấu hình đặc quyền và theo dõi số lượng cửa hàng đăng ký.</p>
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ ...s.badge('#2563eb', '#dbeafe'), padding: '8px 16px' }}>
                                        Tổng doanh thu: {Number(revenueStats.totalPremium).toLocaleString()}đ
                                    </div>
                                </div>
                            </div>

                            <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", borderRadius: "20px", padding: "32px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px", boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.4)", border: "1px solid #334155" }}>
                                <div>
                                    <span style={{ backgroundColor: "rgba(251, 191, 36, 0.15)", color: "#fbbf24", padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", letterSpacing: "1.5px", border: "1px solid rgba(251, 191, 36, 0.3)" }}>THỐNG KÊ HỆ THỐNG</span>
                                    <h2 style={{ margin: "16px 0 8px 0", fontSize: "32px", color: "white", display: "flex", alignItems: "center", gap: "12px" }}>
                                        <svg fill="currentColor" viewBox="0 0 24 24" style={{ width: "36px", height: "36px", color: "#fbbf24" }}><path d="M11.644 1.59a.75.75 0 0 1 .712 0l9.75 5.25a.75.75 0 0 1 0 1.32l-9.75 5.25a.75.75 0 0 1-.712 0l-9.75-5.25a.75.75 0 0 1 0-1.32l9.75-5.25Z" /><path d="m3.265 10.602 7.667 4.128a1.25 1.25 0 0 0 1.136 0l7.667-4.128A1.251 1.251 0 0 0 21 10.601V15c0 .385-.224.734-.572.895l-7.833 3.613a1.455 1.455 0 0 1-1.19 0L3.572 15.895A.996.996 0 0 1 3 15v-4.399c0-.41.25-.783.621-.958l.644-.316Z" /></svg>
                                        Dịch Vụ Premium
                                    </h2>
                                    <p style={{ margin: 0, color: "#cbd5e1", fontSize: "15px" }}>Đang có <b style={{ color: '#fbbf24' }}>{usersData.stats.premiumSubscriptions}</b> cửa hàng đang được hưởng đặc quyền hiển thị.</p>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <button onClick={() => setActiveTab('users')} style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", padding: "14px 28px", borderRadius: "12px", fontWeight: "bold", fontSize: "14px", cursor: "pointer", transition: '0.2s' }}>
                                        Quản lý Đối tác
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
                                {packages.map((pkg, idx) => {
                                    const isFree = pkg.price === "Miễn phí";
                                    const isStorePremium = pkg.name.includes("Uy tín");
                                    const isStrategic = pkg.name.includes("Chiến lược");

                                    // Mapping colors based on package name or idx
                                    let accentColor = "#64748b";
                                    let borderColor = "#e2e8f0";
                                    let subHeading = "Top Search";

                                    if (isStorePremium) { accentColor = "#3b82f6"; borderColor = "#3b82f6"; subHeading = "Verified Store"; }
                                    if (isStrategic) { accentColor = "#d97706"; borderColor = "#fbbf24"; subHeading = "Premium Partner"; }

                                    return (
                                        <div key={pkg.id} style={{ backgroundColor: "white", borderRadius: "20px", padding: "32px", border: `2px solid ${borderColor}`, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)", position: "relative" }}>
                                            <h3 style={{ margin: "0 0 8px 0", color: accentColor, fontSize: "18px", fontWeight: "bold" }}>{subHeading}</h3>
                                            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a", marginBottom: "8px" }}>{pkg.name}</div>
                                            <div style={{ color: "#64748b", marginBottom: "24px", fontWeight: 600 }}>{pkg.price}</div>
                                            <div style={{ height: "1px", backgroundColor: "#f1f5f9", margin: "20px 0" }}></div>
                                            
                                            <div style={{ backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 24 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                                    <span style={{ color: '#64748b', fontSize: 13 }}>Cửa hàng đang sử dụng:</span>
                                                    <span style={{ fontWeight: 800, color: '#2563eb' }}>{pkg.activeStores}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#64748b', fontSize: 13 }}>Tốc độ phản hồi AI:</span>
                                                    <span style={{ fontWeight: 700, color: pkg.jobDelayMinutes === 0 ? '#059669' : '#d97706', fontSize: 13 }}>{pkg.delayLabel}</span>
                                                </div>
                                            </div>

                                            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px 0", display: "flex", flexDirection: "column", gap: "16px", color: "#475569", fontSize: "14px" }}>
                                                <li style={{ display: "flex" }}><CheckIcon color={accentColor} /> Tên cửa hàng lên top tìm kiếm</li>
                                                <li style={{ display: "flex" }}><CheckIcon color={accentColor} /> Hiển thị đặc biệt trên Map</li>
                                                {isFree ? (
                                                    <li style={{ display: "flex", color: "#cbd5e1" }}><svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" style={{ width: "16px", height: "16px", marginRight: "8px", flexShrink: 0, marginTop: "2px" }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg> Huy hiệu Xác thực</li>
                                                ) : (
                                                    <li style={{ display: "flex" }}><CheckIcon color={accentColor} /> {isStrategic ? "Viền phát sáng Bản đồ" : "Huy hiệu Xác thực xanh"}</li>
                                                )}
                                            </ul>
                                            
                                            <button style={{ width: "100%", padding: "12px", borderRadius: "10px", backgroundColor: isFree ? "#f8fafc" : accentColor, color: isFree ? "#64748b" : "white", border: isFree ? '1px solid #e2e8f0' : "none", fontWeight: "bold", cursor: "pointer", transition: '0.2s' }}>
                                                Thiết Lập Đặc Quyền
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ===== PHẦN MỚI: DANH SÁCH CHI TIẾT CỬA HÀNG ĐANG SỬ DỤNG ===== */}
                            <div style={{ marginTop: 48 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <h3 style={{ margin: 0, fontSize: 20, color: '#0f172a', fontWeight: 700 }}>Danh Sách Đối Soát Gói Dịch Vụ</h3>
                                    <span style={s.badge('#3b82f6', '#eff6ff')}>{usersData.storesList.length} Cửa hàng Active</span>
                                </div>
                                
                                <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
                                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Theo dõi biến động đăng ký</span>
                                        <span style={{ fontSize: 13, color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>Tải báo cáo CSV</span>
                                    </div>
                                    
                                    <table style={s.table}>
                                        <thead>
                                            <tr>
                                                <th style={s.th}>Cửa Hàng</th>
                                                <th style={s.th}>Gói Quảng Bá</th>
                                                <th style={s.th}>Hiệu Lực</th>
                                                <th style={s.th}>Doanh Thu Thu Được</th>
                                                <th style={{ ...s.th, textAlign: 'right' }}>Hành Động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usersData.storesList.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Chưa có cửa hàng nào đăng ký.</td>
                                                </tr>
                                            ) : (
                                                usersData.storesList.map(store => {
                                                    const isPremium = store.package?.includes('Premium') || store.package?.includes('Uy tín');
                                                    return (
                                                        <tr key={store.id} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
                                                            <td style={s.td}>
                                                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{store.name}</div>
                                                                <div style={{ fontSize: 12, color: '#94a3b8' }}>ID: {store.id} • {store.owner}</div>
                                                            </td>
                                                            <td style={s.td}>
                                                                <span style={{ 
                                                                    ...s.badge(isPremium ? '#d97706' : '#64748b', isPremium ? '#fffbeb' : '#f1f5f9'), 
                                                                    border: isPremium ? '1px solid #fde68a' : 'none' 
                                                                }}>
                                                                    {store.package}
                                                                </span>
                                                            </td>
                                                            <td style={s.td}>
                                                                <div style={{ fontWeight: 600 }}>Hết hạn: {store.packageExpiry}</div>
                                                                <div style={{ fontSize: 11, color: '#94a3b8' }}>Ngày ĐK: {store.joinedAt}</div>
                                                            </td>
                                                            <td style={s.td}>
                                                                <div style={{ fontWeight: 800, color: '#059669' }}>
                                                                    {isPremium ? (store.package?.includes('Chiến lược') ? '1,000,000đ' : '500,000đ') : '0đ'}
                                                                </div>
                                                                <div style={{ fontSize: 11, color: '#94a3b8' }}>Đã thanh toán</div>
                                                            </td>
                                                            <td style={{ ...s.td, textAlign: 'right' }}>
                                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                                    <button style={{ ...s.btn('#f1f5f9', '#475569'), padding: '6px 12px', fontSize: 12 }}>Gia hạn</button>
                                                                    <button style={{ ...s.btn('#eff6ff', '#2563eb'), padding: '6px 12px', fontSize: 12 }}>Sửa</button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}