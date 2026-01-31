'use client';

import React, { useState, useEffect } from 'react';
import {
    Users,
    Package,
    TrendingUp,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Calendar,
    Briefcase,
    Ship,
    LogOut,
    Plus,
    Trash2,
    FileText
} from 'lucide-react';
import AreaChart from '@/components/AreaChart';
import { notionQuery, notionCreate, notionDelete, DB_USERS, DB_PRODUCTS, DB_QUOTES, DB_CLIENTS, DB_SALES, DB_SCHEDULE, DB_HR, TITLE, RT } from '@/lib/notion';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState([
        { name: '전체 임직원', value: '0', change: '+0%', icon: Users, color: '#0070f3', link: '/hr' },
        { name: '등록 제품 수', value: '0', change: '+0%', icon: Package, color: '#00dfd8', link: '/products' },
        { name: '총 견적 건수', value: '0', change: '+0%', icon: DollarSign, color: '#7928ca', link: '/quotes' },
        { name: '총 거래처', value: '0', change: '+0%', icon: TrendingUp, color: '#ff0080', link: '/clients' },
    ]);
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [newSchedule, setNewSchedule] = useState({ title: '', date: '', remark: '' });

    useEffect(() => {
        // Check login
        const userData = localStorage.getItem('ynk_erp_user');
        if (!userData) {
            router.push('/login');
            return;
        }
        setUser(JSON.parse(userData));
        fetchDashboardData();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('ynk_erp_user');
        router.push('/login');
    };

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch all counts in parallel
            const [hrRes, prodsRes, quotesRes, clientsRes, salesRes, scheduleRes] = await Promise.all([
                notionQuery(DB_HR),
                notionQuery(DB_PRODUCTS),
                notionQuery(DB_QUOTES),
                notionQuery(DB_CLIENTS),
                notionQuery(DB_SALES, {
                    sorts: [{ property: 'Date', direction: 'descending' }],
                    page_size: 100
                }),
                notionQuery(DB_SCHEDULE, {
                    sorts: [{ property: 'date', direction: 'ascending' }],
                    page_size: 10
                })
            ]);

            console.log('API Responses:', {
                hrRes: hrRes.results?.length,
                prodsRes: prodsRes.results?.length,
                quotesRes: quotesRes.results?.length,
                clientsRes: clientsRes.results?.length,
                salesRes: salesRes.results?.length,
                scheduleRes: scheduleRes.results?.length
            });

            const hrCount = hrRes.results?.length || 0;
            const prodsCount = prodsRes.results?.length || 0;
            const quotesCount = quotesRes.results?.length || 0;
            const clientsCount = clientsRes.results?.length || 0;

            console.log('Counts:', { hrCount, prodsCount, quotesCount, clientsCount });

            setStats([
                { name: '전체 임직원', value: `${hrCount}`, change: '+12%', icon: Users, color: '#0070f3', link: '/hr' },
                { name: '등록 제품 수', value: `${prodsCount}`, change: '+5%', icon: Package, color: '#00dfd8', link: '/products' },
                { name: '총 견적 건수', value: `${quotesCount}`, change: '+18%', icon: DollarSign, color: '#7928ca', link: '/quotes' },
                { name: '총 거래처', value: `${clientsCount}`, change: '+8%', icon: TrendingUp, color: '#ff0080', link: '/clients' },
            ]);

            // Process Sales Analysis Data
            const monthlyData: { [key: string]: number } = {};
            salesRes.results?.forEach((r: any) => {
                const date = r.properties.Date?.date?.start || r.created_time;
                if (!date) return;
                const month = date.substring(0, 7); // YYYY-MM
                const amount = r.properties.Total?.number || r.properties.Amount?.number || 0;
                monthlyData[month] = (monthlyData[month] || 0) + amount;
            });

            const sortedMonths = Object.keys(monthlyData).sort().slice(-6); // Last 6 months
            const formattedChartData = sortedMonths.map(m => ({
                name: m.substring(5), // MM only
                value: Math.round(monthlyData[m] / 10000) // In 10k KRW
            }));

            if (formattedChartData.length === 0) {
                setChartData([
                    { name: '08', value: 4200 },
                    { name: '09', value: 5800 },
                    { name: '10', value: 5100 },
                    { name: '11', value: 7200 },
                    { name: '12', value: 8500 },
                    { name: '01', value: 9400 },
                ]);
            } else {
                setChartData(formattedChartData);
            }

            // Process Schedule Data
            const scheduleList = scheduleRes.results?.map((r: any) => ({
                id: r.id,
                title: r.properties.title?.title?.[0]?.plain_text || '제목 없음',
                date: r.properties.date?.date?.start || '',
                remark: r.properties.remark?.rich_text?.[0]?.plain_text || '',
                hasFile: r.properties.file?.files?.length > 0
            })) || [];
            setSchedules(scheduleList);

        } catch (e) {
            console.error('대시보드 로드 오류:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSchedule = async () => {
        if (!newSchedule.title || !newSchedule.date) {
            alert('제목과 날짜를 입력해주세요.');
            return;
        }

        try {
            await notionCreate(DB_SCHEDULE, {
                '이름': TITLE(newSchedule.title),
                title: TITLE(newSchedule.title),
                date: { date: { start: newSchedule.date } },
                remark: RT(newSchedule.remark)
            });

            setNewSchedule({ title: '', date: '', remark: '' });
            fetchDashboardData();
        } catch (e) {
            console.error('일정 추가 실패:', e);
            alert('일정 추가에 실패했습니다.');
        }
    };

    return (
        <div style={{ padding: '0 1rem' }}>
            <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(to right, #fff, rgba(255,255,255,0.5))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Dashboard Overview
                    </h1>
                    <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '1.1rem' }}>ERP 실시간 노션 데이터 연동 현황</p>
                </div>
                {user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>{user.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{user.role}</p>
                        </div>
                        <button onClick={handleLogout} style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                            <LogOut size={16} />
                            로그아웃
                        </button>
                    </div>
                )}
            </header>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                {stats.map((item, idx) => (
                    <div
                        key={idx}
                        className="glass"
                        onClick={() => router.push(item.link)}
                        style={{
                            padding: '1.5rem',
                            transition: 'transform 0.2s',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div style={{ padding: '0.75rem', borderRadius: '12px', background: `${item.color}20`, color: item.color }}>
                                <item.icon size={24} />
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: item.change.startsWith('+') ? '#00ff88' : '#ff4d4d', display: 'flex', alignItems: 'center', gap: '4px', background: item.change.startsWith('+') ? 'rgba(0,255,136,0.1)' : 'rgba(255,77,77,0.1)', padding: '4px 8px', borderRadius: '20px' }}>
                                {item.change.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {item.change}
                            </span>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>{item.name}</p>
                        <h4 style={{ fontSize: '2rem', fontWeight: 800 }}>{loading ? '...' : item.value}</h4>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                {/* Sales Chart */}
                <div className="glass" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>매출 분석</h3>
                            <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.4)' }}>최근 6개월 수주 현황 (단위: 만원)</p>
                        </div>
                        <select style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 12px', color: 'white', fontSize: '0.85rem' }}>
                            <option>최근 6개월</option>
                            <option>최근 1년</option>
                        </select>
                    </div>
                    <div style={{ height: '350px', width: '100%' }}>
                        <AreaChart data={chartData} color="#0070f3" />
                    </div>
                </div>

                {/* Schedule Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={18} color="#00dfd8" /> 주요 일정
                        </h3>

                        {/* Inline Add Form */}
                        <div style={{
                            marginBottom: '1.5rem',
                            padding: '1rem',
                            background: 'rgba(0, 112, 243, 0.05)',
                            border: '1px solid rgba(0, 112, 243, 0.2)',
                            borderRadius: '10px'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <input
                                    type="text"
                                    value={newSchedule.title}
                                    onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                                    placeholder="일정 제목"
                                    style={{
                                        padding: '0.6rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '6px',
                                        color: 'white',
                                        fontSize: '0.9rem'
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="date"
                                        value={newSchedule.date}
                                        onChange={(e) => setNewSchedule({ ...newSchedule, date: e.target.value })}
                                        style={{
                                            flex: 1,
                                            padding: '0.6rem',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '6px',
                                            color: 'white',
                                            fontSize: '0.85rem'
                                        }}
                                    />
                                    <button
                                        onClick={handleAddSchedule}
                                        style={{
                                            padding: '0.6rem 1.2rem',
                                            background: 'linear-gradient(135deg, #0070f3, #00dfd8)',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: 'white',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <Plus size={14} /> 추가
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={newSchedule.remark}
                                    onChange={(e) => setNewSchedule({ ...newSchedule, remark: e.target.value })}
                                    placeholder="비고 (선택사항)"
                                    style={{
                                        padding: '0.6rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '6px',
                                        color: 'white',
                                        fontSize: '0.85rem'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Schedule List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                            {loading ? (
                                <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>로딩 중...</p>
                            ) : schedules.length === 0 ? (
                                <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: '0.9rem' }}>등록된 일정이 없습니다</p>
                            ) : (
                                schedules.map((item) => (
                                    <div key={item.id} style={{
                                        display: 'flex',
                                        gap: '1rem',
                                        alignItems: 'flex-start',
                                        padding: '12px',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        transition: 'all 0.2s'
                                    }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    >
                                        <div style={{ width: '4px', height: '100%', minHeight: '32px', background: '#00dfd8', borderRadius: '2px' }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.title}</p>
                                                {item.hasFile && (
                                                    <FileText size={14} color="#00dfd8" title="파일 첨부됨" />
                                                )}
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
                                                📅 {item.date || '날짜 미정'}
                                            </p>
                                            {item.remark && (
                                                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>
                                                    {item.remark}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (confirm('이 일정을 삭제하시겠습니까?')) {
                                                    try {
                                                        await notionDelete(item.id);
                                                        fetchDashboardData();
                                                    } catch (e) {
                                                        alert('삭제 실패');
                                                    }
                                                }
                                            }}
                                            style={{
                                                padding: '6px',
                                                background: 'rgba(255,59,48,0.1)',
                                                border: '1px solid rgba(255,59,48,0.2)',
                                                borderRadius: '6px',
                                                color: '#ff3b30',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,59,48,0.2)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,59,48,0.1)'}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="glass" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Quick Actions</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <button style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <Package size={20} /> 제품 등록
                            </button>
                            <button style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <DollarSign size={20} /> 견적 작성
                            </button>
                            <button style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <Users size={20} /> 사원 관리
                            </button>
                            <button style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <Ship size={20} /> 수입 등록
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
