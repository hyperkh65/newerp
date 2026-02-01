'use client';

import React, { useState, useEffect } from 'react';
import {
    Calculator, Plus, Search, FileText, Trash2, Printer,
    ChevronRight, User, Building, MapPin, Mail, Phone,
    TrendingUp, ArrowLeft, Filter, Download, CheckCircle, Package, X, ShoppingCart
} from 'lucide-react';
import Modal from '@/components/Modal';
import ProductPicker from '@/components/ProductPicker';
import QuotePicker from '@/components/QuotePicker';
import {
    notionQuery, notionCreate, notionUpdate, notionDelete,
    DB_SALES, DB_CLIENTS, DB_PRODUCTS,
    RT, TITLE, num, dateISO, select
} from '@/lib/notion';
import { getSettings } from '@/lib/settings';

// 매출 품목 타입
interface SalesItem {
    id: string | number;
    product: string;
    specification: string;
    qty: number;
    unitPrice: number;
    amount: number;
}

// 매출 데이터 타입 (그룹화된 데이터)
interface SalesRecord {
    code: string;
    date: string;
    customer: string;
    saleType: string;
    salesperson: string;
    poNo: string;
    items: SalesItem[];
    netAmount: number;
    vat: number;
    totalAmount: number;
}

export default function SalesManagementPage() {
    const [sales, setSales] = useState<SalesRecord[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'create' | 'print'>('list');

    // 검색 및 필터 상태
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const [form, setForm] = useState<{
        code: string;
        date: string;
        customer: string;
        saleType: string;
        salesperson: string;
        poNo: string;
        vatEnabled: boolean;
        items: SalesItem[];
    }>({
        code: 'S' + new Date().toISOString().substring(0, 10).replace(/-/g, '') + '-001',
        date: new Date().toISOString().substring(0, 10),
        customer: '',
        saleType: '내자',
        salesperson: '',
        poNo: '',
        vatEnabled: true,
        items: [{
            id: Date.now(),
            product: '',
            specification: '',
            qty: 1,
            unitPrice: 0,
            amount: 0
        }]
    });

    const [printData, setPrintData] = useState<SalesRecord | null>(null);
    const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
    const [isQuotePickerOpen, setIsQuotePickerOpen] = useState(false);
    const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);
    const [company, setCompany] = useState(getSettings());

    useEffect(() => {
        fetchInitialData();
        setCompany(getSettings());
    }, []);

    async function fetchInitialData() {
        try {
            setLoading(true);
            const [sRes, cRes] = await Promise.all([
                notionQuery(DB_SALES, { sorts: [{ property: 'Date', direction: 'descending' }] }),
                notionQuery(DB_CLIENTS)
            ]);

            const grouped: { [key: string]: SalesRecord } = {};
            sRes.results.forEach((r: any) => {
                const p = r.properties;
                const code = p.code?.rich_text?.[0]?.plain_text || p.Name?.title?.[0]?.plain_text || 'Unknown';

                if (!grouped[code]) {
                    grouped[code] = {
                        code,
                        date: p.Date?.date?.start || '-',
                        customer: p.Customer?.rich_text?.[0]?.plain_text || '-',
                        saleType: p.SaleType?.select?.name || '내자',
                        salesperson: p.Salesperson?.rich_text?.[0]?.plain_text || '-',
                        poNo: p.PoNo?.rich_text?.[0]?.plain_text || '-',
                        items: [],
                        netAmount: 0,
                        vat: 0,
                        totalAmount: 0
                    };
                }

                const qty = p.Quantity?.number || 0;
                const unitPrice = p.UnitPrice?.number || 0;
                const amount = p.Total?.number || (qty * unitPrice);

                grouped[code].items.push({
                    id: r.id,
                    product: p.Items?.rich_text?.[0]?.plain_text || '-',
                    specification: p.Specification?.rich_text?.[0]?.plain_text || '-',
                    qty,
                    unitPrice,
                    amount
                });

                grouped[code].netAmount += amount;
            });

            // VAT 및 합계 재계산 (내자일 경우 기본적으로 10% 가정, 혹은 저장된 합계 합산)
            Object.values(grouped).forEach(record => {
                if (record.saleType === '내자') {
                    record.vat = Math.floor(record.netAmount * 0.1);
                    record.totalAmount = record.netAmount + record.vat;
                } else {
                    record.vat = 0;
                    record.totalAmount = record.netAmount;
                }
            });

            setSales(Object.values(grouped));
            setClients(cRes.results);
        } catch (e) {
            console.error('초기 데이터 로드 실패:', e);
        } finally {
            setLoading(false);
        }
    }

    const onQuoteSelect = (quote: any) => {
        const newItems: SalesItem[] = quote.items.map((it: any) => {
            // 상세 사양 결합
            const specParts = [
                it.description,
                it.voltage !== '-' ? it.voltage : '',
                it.watts !== '-' ? it.watts : '',
                it.luminousEff !== '-' ? it.luminousEff : '',
                it.lumenOutput !== '-' ? it.lumenOutput : '',
                it.cct !== '-' ? it.cct : ''
            ].filter(Boolean);

            return {
                id: Date.now() + Math.random(),
                product: it.product,
                specification: specParts.join(' / '),
                qty: it.qty,
                unitPrice: 0,
                amount: 0
            };
        });

        setForm(prev => ({
            ...prev,
            customer: quote.client,
            items: newItems
        }));
        setIsQuotePickerOpen(false);
        setView('create'); // 불러오기 성공 시 작성 화면으로 전환
        alert(`${quote.no} 견적 내용이 불러와졌습니다. (가격은 0으로 설정되었습니다)`);
    };

    const addItem = () => {
        setForm({
            ...form,
            items: [...form.items, {
                id: Date.now(),
                product: '',
                specification: '',
                qty: 1,
                unitPrice: 0,
                amount: 0
            }]
        });
    };

    const removeItem = (idx: number) => {
        if (form.items.length <= 1) return;
        setForm({
            ...form,
            items: form.items.filter((_, i) => i !== idx)
        });
    };

    const updateItem = (idx: number, updates: Partial<SalesItem>) => {
        const newItems = [...form.items];
        newItems[idx] = { ...newItems[idx], ...updates };
        if (updates.qty !== undefined || updates.unitPrice !== undefined) {
            newItems[idx].amount = newItems[idx].qty * newItems[idx].unitPrice;
        }
        setForm({ ...form, items: newItems });
    };

    const calculateTotals = () => {
        const net = form.items.reduce((acc, it) => acc + it.amount, 0);
        const vat = form.vatEnabled && form.saleType === '내자' ? Math.floor(net * 0.1) : 0;
        return { net, vat, total: net + vat };
    };

    const handleCreateSales = async () => {
        if (!form.customer || form.items.some(it => !it.product)) {
            return alert('거래처와 품목 정보를 모두 입력하세요.');
        }

        try {
            setLoading(true);
            const { net, vat, total } = calculateTotals();

            for (let i = 0; i < form.items.length; i++) {
                const item = form.items[i];
                await notionCreate(DB_SALES, {
                    Name: TITLE(form.code + '_' + (i + 1)),
                    code: RT(form.code),
                    Date: dateISO(form.date),
                    Customer: RT(form.customer),
                    Items: RT(item.product),
                    Specification: RT(item.specification),
                    SaleType: select(form.saleType),
                    ExchangeRate: num(1),
                    Quantity: num(item.qty),
                    UnitPrice: num(item.unitPrice),
                    Total: num(item.amount), // 항목별 공급가액 저장
                    Salesperson: RT(form.salesperson),
                    PoNo: RT(form.poNo)
                });
            }
            alert('매출 ' + form.items.length + '건이 등록되었습니다.');
            setView('list');
            fetchInitialData();
            // 기본값 리셋
            setForm({
                ...form,
                code: 'S' + new Date().toISOString().substring(0, 10).replace(/-/g, '') + '-00' + (sales.length + 2),
                customer: '',
                poNo: '',
                items: [{ id: Date.now(), product: '', specification: '', qty: 1, unitPrice: 0, amount: 0 }]
            });
        } catch (e: any) {
            alert('저장 실패: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = (s: SalesRecord) => {
        setPrintData(s);
        setCompany(getSettings());
        setView('print');
        setTimeout(() => window.print(), 500);
    };

    const filteredSales = sales.filter(s => {
        const matchesSearch = s.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCustomer = filterCustomer === '' || s.customer === filterCustomer;
        const matchesDate = (!filterStartDate || s.date >= filterStartDate) &&
            (!filterEndDate || s.date <= filterEndDate);
        return matchesSearch && matchesCustomer && matchesDate;
    });

    const totals = calculateTotals();

    if (view === 'print' && printData) {
        return (
            <div id="print-area" style={{ padding: '0', background: 'white', color: 'black', minHeight: '100vh', fontFamily: '"Noto Sans KR", sans-serif' }}>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');
                    @media print { 
                        /* Hide everything by default */
                        body * { visibility: hidden !important; }
                        aside, header, nav, .sidebar, [role="complementary"] { display: none !important; }
                        
                        /* Show only the print area */
                        #print-area, #print-area * { visibility: visible !important; } 
                        
                        /* EXPLICITLY HIDE no-print elements even inside print-area */
                        .no-print, .no-print * { 
                            visibility: hidden !important; 
                            display: none !important; 
                        }

                        #print-area { 
                            position: absolute !important; 
                            left: 0 !important; 
                            top: 0 !important; 
                            width: 100% !important; 
                            margin: 0 !important;
                            padding: 0 !important; 
                            background: white !important;
                            z-index: 9999 !important;
                        } 
                        
                        /* Multi-page support */
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        thead { display: table-header-group; }
                        tfoot { display: table-footer-group; }                        
                        @page { size: auto; margin: 15mm; }
                    }
                    .statement-table th { background: #f8fafc !important; color: #1e293b !important; border: 1px solid #cbd5e1; font-weight: 700; font-size: 11px; height: 35px; }
                    .statement-table td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 2px solid #1e293b; }
                    .info-box { padding: 12px; border: 1px solid #cbd5e1; }
                `}</style>

                <div style={{ padding: '30px 40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', position: 'relative' }}>
                        {company.logoUrl && (
                            <img src={company.logoUrl} alt="Logo" style={{ height: '70px', maxWidth: '180px', objectFit: 'contain' }} />
                        )}
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, textDecoration: 'underline', textUnderlineOffset: '8px', letterSpacing: '10px', margin: 0 }}>거 래 명 세 표</h1>
                            <p style={{ marginTop: '8px', fontSize: '1rem' }}>No: {printData.code}</p>
                        </div>
                    </div>

                    <div className="info-grid">
                        <div className="info-box" style={{ borderRight: '2px solid #1e293b' }}>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>공급받는자 (BUYER)</p>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{printData.customer} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>貴下</span></h2>
                            <div style={{ marginTop: '12px', fontSize: '0.85rem', lineHeight: '1.7' }}>
                                <p>일자: <strong>{printData.date}</strong></p>
                                <p>P.O No: <strong>{printData.poNo}</strong></p>
                            </div>
                        </div>
                        <div className="info-box">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>공급자 (SELLER)</p>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 5px 0' }}>{company.name}</h2>
                                    <div style={{ fontSize: '0.8rem', lineHeight: '1.5' }}>
                                        <p>등록번호: {company.bizNo}</p>
                                        <p>대표자: {company.ceo} (인)</p>
                                        <p>주소: {company.address}</p>
                                        <p>업태: {company.bizType || '도소매'} / 종목: {company.bizItem || '전자부품, 조명기구'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <table className="statement-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '25px' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '5%' }}>No</th>
                                <th style={{ width: '40%' }}>품명 및 규격</th>
                                <th style={{ width: '10%' }}>수량</th>
                                <th style={{ width: '15%' }}>단가</th>
                                <th style={{ width: '15%' }}>공급가액</th>
                                <th style={{ width: '15%' }}>비고</th>
                            </tr>
                        </thead>
                        <tbody>
                            {printData.items.map((item, idx) => (
                                <tr key={idx} style={{ height: '30px' }}>
                                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                    <td>
                                        <span style={{ fontWeight: 600 }}>{item.product}</span>
                                        <span style={{ marginLeft: '10px', color: '#64748b', fontSize: '10px' }}>{item.specification}</span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{item.qty.toLocaleString()}</td>
                                    <td style={{ textAlign: 'right' }}>{item.unitPrice.toLocaleString()}</td>
                                    <td style={{ textAlign: 'right' }}>{item.amount.toLocaleString()}</td>
                                    <td style={{ textAlign: 'center' }}>{printData.saleType}</td>
                                </tr>
                            ))}
                            {/* 빈 행 채우기 (최소 10줄) */}
                            {Array.from({ length: Math.max(0, 10 - printData.items.length) }).map((_, i) => (
                                <tr key={'empty-' + i} style={{ height: '30px' }}>
                                    <td></td><td></td><td></td><td></td><td></td><td></td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ height: '35px', background: '#f8fafc' }}>
                                <td colSpan={2} style={{ textAlign: 'center', fontWeight: 700 }}>소 계 (SUB TOTAL)</td>
                                <td colSpan={1} style={{ textAlign: 'center' }}>{printData.items.reduce((a, b) => a + b.qty, 0).toLocaleString()}</td>
                                <td colSpan={2} style={{ textAlign: 'right', fontWeight: 600 }}>₩{printData.netAmount.toLocaleString()}</td>
                                <td></td>
                            </tr>
                            <tr style={{ height: '35px', background: '#f8fafc' }}>
                                <td colSpan={2} style={{ textAlign: 'center', fontWeight: 700 }}>부가가치세 (VAT 10%)</td>
                                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>₩{printData.vat.toLocaleString()}</td>
                                <td></td>
                            </tr>
                            <tr style={{ height: '45px', background: '#f1f5f9' }}>
                                <td colSpan={2} style={{ textAlign: 'center', fontWeight: 900, fontSize: '14px' }}>합 계 금액 (GRAND TOTAL)</td>
                                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 900, fontSize: '16px', color: '#1e293b' }}>
                                    ₩{printData.totalAmount.toLocaleString()}
                                </td>
                                <td style={{ textAlign: 'center', fontSize: '10px' }}>{printData.saleType === '내자' ? 'VAT포함' : '영세/비과세'}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginTop: '25px' }}>
                        <div style={{ padding: '15px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                            <p style={{ fontSize: '0.85rem', marginBottom: '8px', color: '#64748b' }}>[입금계좌 안내]</p>
                            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{company.bank}</p>
                        </div>
                        <div style={{ padding: '15px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', minHeight: '100px' }}>
                            <p style={{ fontSize: '1.2rem', fontWeight: 900, zIndex: 2 }}>위 금액을 정히 영수(청구)함.</p>
                            {company.stampUrl && (
                                <img
                                    src={company.stampUrl}
                                    alt="Stamp"
                                    style={{
                                        position: 'absolute',
                                        right: '10%',
                                        width: '160px',
                                        height: '160px',
                                        opacity: 0.4,
                                        zIndex: 1,
                                        transform: 'rotate(-5deg)',
                                        pointerEvents: 'none',
                                        bottom: '10px'
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                        본 명세표는 영수증을 대신할 수 없습니다. / 문의: {company.tel} / {company.email}
                    </div>
                </div>

                <div className="no-print" style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '15px' }}>
                    <button onClick={() => setView('list')} style={{ background: '#475569', color: 'white', padding: '12px 25px', borderRadius: '30px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                        <ArrowLeft size={18} /> 목록으로 돌아가기
                    </button>
                    <button onClick={() => {
                        const originalTitle = document.title;
                        document.title = `${printData.date}_거래명세표_${printData.code}`;
                        window.print();
                        document.title = originalTitle;
                    }} style={{ background: 'linear-gradient(135deg, #0070f3 0%, #00a6fb 100%)', color: 'white', padding: '12px 40px', borderRadius: '30px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, boxShadow: '0 4px 15px rgba(0,112,243,0.3)' }}>
                        <Printer size={18} /> 거래명세표 인쇄하기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
                        <div style={{ padding: '8px', background: 'rgba(0, 255, 136, 0.1)', borderRadius: '10px' }}>
                            <TrendingUp size={24} style={{ color: '#00ff88' }} />
                        </div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: 0 }}>매출 등록 시스템</h2>
                    </div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>복수 품목 등록 및 부가세 자동 계산 지원</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => setIsQuotePickerOpen(true)}
                        style={{ background: 'rgba(0,112,243,0.1)', border: '1px solid rgba(0,112,243,0.3)', padding: '0.8rem 1.5rem', borderRadius: '14px', color: '#0070f3', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                    >
                        <ShoppingCart size={18} /> 견적 불러오기 (자동입력)
                    </button>
                    {view === 'list' && (
                        <button
                            onClick={() => {
                                const newCode = 'S' + new Date().toISOString().substring(0, 10).replace(/-/g, '') + '-' + Math.floor(Date.now() / 1000).toString().slice(-3);
                                setForm({
                                    code: newCode,
                                    date: new Date().toISOString().substring(0, 10),
                                    customer: '',
                                    saleType: '내자',
                                    salesperson: '',
                                    poNo: '',
                                    vatEnabled: true,
                                    items: [{ id: Date.now(), product: '', specification: '', qty: 1, unitPrice: 0, amount: 0 }]
                                });
                                setView('create');
                            }}
                            style={{
                                background: 'linear-gradient(135deg, #00ff88 0%, #00bd68 100%)',
                                border: 'none', padding: '0.8rem 2rem', borderRadius: '14px',
                                color: 'black', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px',
                                boxShadow: '0 4px 15px rgba(0, 255, 136, 0.2)'
                            }}
                        >
                            <Plus size={20} /> 신규 매출 등록
                        </button>
                    )}
                </div>
            </header>

            {view === 'create' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* 기본 정보 */}
                    <div className="glass" style={{ padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={18} /> 기본 정보
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>매출 코드 (등록번호)</label>
                                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontWeight: 700 }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>매출 일자</label>
                                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', colorScheme: 'dark' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>거래처</label>
                                <select value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}>
                                    <option value="">-- 거래처 선택 --</option>
                                    {clients.map(c => <option key={c.id} value={c.properties.ClientName.title[0].plain_text}>{c.properties.ClientName.title[0].plain_text}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>P.O No. / 담당자</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input value={form.poNo} onChange={e => setForm({ ...form, poNo: e.target.value })} placeholder="PO#" style={{ flex: 1, padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }} />
                                    <input value={form.salesperson} onChange={e => setForm({ ...form, salesperson: e.target.value })} placeholder="담당자" style={{ width: '80px', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 품목 리스트 */}
                    <div className="glass" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Package size={18} /> 매출 품목 상세
                            </h3>
                            <button onClick={addItem} style={{ background: 'rgba(0, 112, 243, 0.1)', border: '1px solid #0070f3', padding: '6px 15px', borderRadius: '8px', color: '#0070f3', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Plus size={14} /> 품목 추가
                            </button>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textAlign: 'left' }}>
                                    <th style={{ padding: '10px' }}>제품명</th>
                                    <th style={{ padding: '10px' }}>규격 (Specification)</th>
                                    <th style={{ padding: '10px', width: '100px' }}>수량</th>
                                    <th style={{ padding: '10px', width: '150px' }}>단가</th>
                                    <th style={{ padding: '10px', width: '150px', textAlign: 'right' }}>금액</th>
                                    <th style={{ padding: '10px', width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {form.items.map((item, idx) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '12px 10px' }}>
                                            <button
                                                onClick={() => { setActiveItemIdx(idx); setIsProductPickerOpen(true); }}
                                                style={{ width: '100%', textAlign: 'left', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: item.product ? 'white' : 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}
                                            >
                                                {item.product || '제품 선택...'}
                                            </button>
                                        </td>
                                        <td style={{ padding: '12px 10px' }}>
                                            <input value={item.specification} onChange={e => updateItem(idx, { specification: e.target.value })} style={{ width: '100%', padding: '0.6rem', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }} />
                                        </td>
                                        <td style={{ padding: '12px 10px' }}>
                                            <input type="number" value={item.qty} onChange={e => updateItem(idx, { qty: Number(e.target.value) })} style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', textAlign: 'right' }} />
                                        </td>
                                        <td style={{ padding: '12px 10px' }}>
                                            <input type="number" value={item.unitPrice} onChange={e => updateItem(idx, { unitPrice: Number(e.target.value) })} style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', textAlign: 'right' }} />
                                        </td>
                                        <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, fontSize: '0.95rem' }}>
                                            ₩{item.amount.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px 10px' }}>
                                            <button onClick={() => removeItem(idx)} style={{ color: 'rgba(255,77,79,0.5)', border: 'none', background: 'none' }}><X size={18} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* 하단 집계 */}
                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '2rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>거래 구분</label>
                                    <select value={form.saleType} onChange={e => setForm({ ...form, saleType: e.target.value })} style={{ padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }}>
                                        <option value="내자">내자 (VAT 10%)</option>
                                        <option value="외자">외자 (VAT 0%)</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '25px' }}>
                                    <input type="checkbox" checked={form.vatEnabled} onChange={e => setForm({ ...form, vatEnabled: e.target.checked })} id="vat-toggle" />
                                    <label htmlFor="vat-toggle" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>부가세 포함 계산</label>
                                </div>
                            </div>

                            <div style={{ textAlign: 'right', width: '300px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>공급가액 (Net)</span>
                                    <span style={{ fontWeight: 600 }}>₩{totals.net.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>부가가치세 (VAT)</span>
                                    <span style={{ fontWeight: 600 }}>₩{totals.vat.toLocaleString()}</span>
                                </div>
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 800, color: '#00ff88' }}>총 합계 (GRAND TOTAL)</span>
                                    <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#00ff88' }}>₩{totals.total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginBottom: '3rem' }}>
                        <button onClick={() => setView('list')} style={{ padding: '0.8rem 3rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 600 }}>취소</button>
                        <button onClick={handleCreateSales} disabled={loading} style={{ background: 'linear-gradient(135deg, #00ff88 0%, #00bd68 100%)', padding: '0.8rem 5rem', borderRadius: '14px', color: 'black', fontWeight: 900, boxShadow: '0 4px 20px rgba(0, 255, 136, 0.3)', opacity: loading ? 0.6 : 1 }}>
                            {loading ? '등록 중...' : '매출 확정 및 등록'}
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* 필터 섹션 */}
                    <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, minWidth: '250px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>검색</label>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="등록번호 또는 거래처명 검색..." style={{ width: '100%', padding: '0.65rem 0.65rem 0.65rem 2.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }} />
                            </div>
                        </div>
                        <div style={{ width: '200px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>거래처별</label>
                            <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} style={{ width: '100%', padding: '0.65rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }}>
                                <option value="">전체 거래처</option>
                                {clients.map(c => <option key={c.id} value={c.properties.ClientName.title[0].plain_text}>{c.properties.ClientName.title[0].plain_text}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>날짜 범위</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} style={{ padding: '0.65rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', colorScheme: 'dark' }} />
                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>~</span>
                                <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} style={{ padding: '0.65rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', colorScheme: 'dark' }} />
                            </div>
                        </div>
                        <button onClick={() => { setSearchTerm(''); setFilterCustomer(''); setFilterStartDate(''); setFilterEndDate(''); }} style={{ padding: '0.65rem 1.2rem', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>초기화</button>
                    </div>

                    {/* 집계 카드 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                        <div className="glass" style={{ padding: '1.5rem', borderLeft: '4px solid #00ff88' }}>
                            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>총 매출액 (조회기간)</p>
                            <h4 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#00ff88' }}>
                                ₩{filteredSales.reduce((a, b) => a + b.totalAmount, 0).toLocaleString()}
                            </h4>
                        </div>
                        <div className="glass" style={{ padding: '1.5rem', borderLeft: '4px solid #0070f3' }}>
                            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>총 매출 건수</p>
                            <h4 style={{ fontSize: '1.4rem', fontWeight: 900 }}>{filteredSales.length}건</h4>
                        </div>
                    </div>

                    <div className="glass" style={{ padding: '1rem', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                        <th style={{ padding: '1rem' }}>등록번호</th>
                                        <th style={{ padding: '1rem' }}>매출일자</th>
                                        <th style={{ padding: '1rem' }}>거래처</th>
                                        <th style={{ padding: '1rem' }}>품목수</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>총 공급가액</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>합계 (VAT포함)</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>관리</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={7} style={{ padding: '5rem', textAlign: 'center', opacity: 0.5 }}>데이터를 불러오는 중...</td></tr>
                                    ) : filteredSales.length === 0 ? (
                                        <tr><td colSpan={7} style={{ padding: '5rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>조회된 매출 데이터가 없습니다.</td></tr>
                                    ) : filteredSales.map((s) => (
                                        <tr key={s.code} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '1rem', fontWeight: 700, fontSize: '0.85rem' }}>{s.code}</td>
                                            <td style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>{s.date}</td>
                                            <td style={{ padding: '1rem', fontWeight: 600 }}>{s.customer}</td>
                                            <td style={{ padding: '1rem' }}>{s.items.length}개 품목</td>
                                            <td style={{ padding: '1rem', textAlign: 'right', color: 'rgba(255,255,255,0.7)' }}>₩{s.netAmount.toLocaleString()}</td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <div style={{ color: '#00ff88', fontWeight: 900, fontSize: '1rem' }}>₩{s.totalAmount.toLocaleString()}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>VAT: ₩{s.vat.toLocaleString()}</div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button onClick={() => handlePrint(s)} title="명세서 인쇄" style={{ padding: '8px', background: 'rgba(0,112,243,0.1)', border: 'none', borderRadius: '8px', color: '#0070f3' }}><Printer size={16} /></button>
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('이 등록번호(' + s.code + ')의 모든 매출 필드를 삭제하시겠습니까?')) {
                                                                for (const item of s.items) await notionDelete(item.id as string);
                                                                fetchInitialData();
                                                            }
                                                        }}
                                                        title="전체 삭제" style={{ padding: '8px', background: 'rgba(255,77,79,0.1)', border: 'none', borderRadius: '8px', color: '#ff4d4f' }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <ProductPicker
                isOpen={isProductPickerOpen}
                onClose={() => { setIsProductPickerOpen(false); setActiveItemIdx(null); }}
                onSelect={(p) => {
                    if (activeItemIdx !== null) {
                        updateItem(activeItemIdx, {
                            product: p.name,
                            specification: p.detail || '-',
                            unitPrice: p.cost || 0
                        });
                    }
                    setIsProductPickerOpen(false);
                    setActiveItemIdx(null);
                }}
            />
            <QuotePicker isOpen={isQuotePickerOpen} onClose={() => setIsQuotePickerOpen(false)} onSelect={onQuoteSelect} />
        </div>
    );
}
