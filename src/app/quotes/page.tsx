'use client';

import React, { useState, useEffect } from 'react';
import { Quote, Plus, Search, FileText, Trash2, Printer, ChevronRight, Calculator, User, Building, MapPin, Mail, Phone, Box, ArrowLeft, Download, CheckCircle, Clock } from 'lucide-react';
import Modal from '@/components/Modal';
import ProductPicker from '@/components/ProductPicker';
import {
    notionQuery, notionCreate, notionUpdate, notionDelete,
    isWithinCurrentMonth, validatePeriod,
    DB_QUOTES, DB_CLIENTS, DB_PRODUCTS, RT, TITLE, num, dateISO, FILES, uploadFile
} from '@/lib/notion';
import { getSettings } from '@/lib/settings';

interface QuoteItem {
    id: number | string;
    product: string;
    description: string;
    voltage: string;
    watts: string;
    luminousEff: string;
    lumenOutput: string;
    cct: string;
    unit: string;
    unitPrice: number;
    qty: number;
    amount: number;
    remarks: string;
}

interface QuoteRecord {
    pageId: string;
    no: string;
    date: string;
    client: string;
    totalAmount: number;
    currency: string;
    items: QuoteItem[];
    generalInfo?: string;
    specialNotes?: string;
    attach1?: string;
    attach2?: string;
    attach3?: string;
    attacht1?: string;
    attacht2?: string;
    attacht3?: string;
    docType?: 'QUOTE' | 'PROFORMA';
    clientInfo?: {
        address: string;
        bizNo: string;
        ceo: string;
    };
}

const getCurrencySymbol = (cur: string) => {
    switch (cur) {
        case 'USD': return '$';
        case 'RMB': return '¥';
        case 'KRW': return '₩';
        default: return '';
    }
};

export default function QuotesPage() {
    const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'create' | 'print'>('list');
    const [search, setSearch] = useState('');

    const [form, setForm] = useState<{
        no: string;
        date: string;
        client: string;
        currency: string;
        generalInfo: string;
        specialNotes: string;
        attach1: string;
        attach2: string;
        attach3: string;
        attacht1: string;
        attacht2: string;
        attacht3: string;
        docType: 'QUOTE' | 'PROFORMA';
        items: QuoteItem[];
    }>({
        no: 'Q' + new Date().toISOString().substring(0, 10).replace(/-/g, '') + '-01',
        date: new Date().toISOString().substring(0, 10),
        client: '',
        currency: 'KRW',
        generalInfo: '',
        specialNotes: '',
        attach1: '',
        attach2: '',
        attach3: '',
        attacht1: '',
        attacht2: '',
        attacht3: '',
        docType: 'QUOTE',
        items: [{
            id: Date.now(),
            product: '', description: '',
            voltage: '-', watts: '-', luminousEff: '-',
            lumenOutput: '-', cct: '-', unit: 'PCS',
            unitPrice: 0, qty: 1, amount: 0, remarks: ''
        }]
    });

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(field);
        try {
            const data = await uploadFile(file);
            setForm(prev => ({ ...prev, [field]: data.url }));
        } catch (error) {
            console.error('File upload failed:', error);
            alert('파일 업로드 실패.');
        } finally {
            setUploading(null);
        }
    };

    const [printData, setPrintData] = useState<QuoteRecord | null>(null);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState<number | null>(null);
    const [company, setCompany] = useState(getSettings());
    const [editMode, setEditMode] = useState(false);
    const [currentQuoteNo, setCurrentQuoteNo] = useState<string | null>(null);
    const [uploading, setUploading] = useState<string | null>(null);

    useEffect(() => {
        fetchInitialData();
        setCompany(getSettings());
    }, []);

    async function fetchInitialData() {
        try {
            setLoading(true);
            const [qRes, cRes] = await Promise.all([
                notionQuery(DB_QUOTES, { sorts: [{ property: 'Date', direction: 'descending' }] }),
                notionQuery(DB_CLIENTS)
            ]);

            const groupedQuotes: { [key: string]: QuoteRecord } = {};
            qRes.results.forEach((r: any) => {
                const props = r.properties;
                const no = props.EstimateNo1?.title?.[0]?.plain_text || props.EstimateNo?.rich_text?.[0]?.plain_text || 'Unknown';
                if (!groupedQuotes[no]) {
                    groupedQuotes[no] = {
                        pageId: r.id,
                        no,
                        date: props.Date?.date?.start || '-',
                        client: props.Client?.rich_text?.[0]?.plain_text || props.Client?.title?.[0]?.plain_text || '-',
                        currency: props.Currency?.rich_text?.[0]?.plain_text || props.Currency?.select?.name || props.Currency?.title?.[0]?.plain_text || 'KRW',
                        totalAmount: 0,
                        items: [],
                        generalInfo: props.GeneralInfo?.rich_text?.[0]?.plain_text || props.generalInfo?.rich_text?.[0]?.plain_text || '',
                        specialNotes: props.SpecialNotes?.rich_text?.[0]?.plain_text || props.specialNotes?.rich_text?.[0]?.plain_text || '',
                        attach1: props.attach1?.files?.[0]?.external?.url || props.Attach1?.files?.[0]?.external?.url || props.attach1?.files?.[0]?.file?.url || props.Attach1?.files?.[0]?.file?.url || '',
                        attach2: props.attach2?.files?.[0]?.external?.url || props.Attach2?.files?.[0]?.external?.url || props.attach2?.files?.[0]?.file?.url || props.Attach2?.files?.[0]?.file?.url || '',
                        attach3: props.attach3?.files?.[0]?.external?.url || props.Attach3?.files?.[0]?.external?.url || props.attach3?.files?.[0]?.file?.url || props.Attach3?.files?.[0]?.file?.url || '',
                        attacht1: props.attacht1?.rich_text?.[0]?.plain_text || props.Attacht1?.rich_text?.[0]?.plain_text || '',
                        attacht2: props.attacht2?.rich_text?.[0]?.plain_text || props.Attacht2?.rich_text?.[0]?.plain_text || '',
                        attacht3: props.attacht3?.rich_text?.[0]?.plain_text || props.Attacht3?.rich_text?.[0]?.plain_text || '',
                        docType: no.startsWith('PI') ? 'PROFORMA' : 'QUOTE'
                    };
                }
                const amt = props.Amount?.number || 0;
                groupedQuotes[no].totalAmount += amt;
                groupedQuotes[no].items.push({
                    id: r.id,
                    product: props.Product?.rich_text?.[0]?.plain_text || '-',
                    description: props.Description?.rich_text?.[0]?.plain_text || '',
                    voltage: props.Voltage?.rich_text?.[0]?.plain_text || '-',
                    watts: props.Watts?.rich_text?.[0]?.plain_text || '-',
                    luminousEff: props.LuminousEff?.rich_text?.[0]?.plain_text || '-',
                    lumenOutput: props.LumenOutput?.rich_text?.[0]?.plain_text || '-',
                    cct: props.CCT?.rich_text?.[0]?.plain_text || '-',
                    unit: props.Unit?.select?.name || props.Unit?.rich_text?.[0]?.plain_text || 'PCS',
                    unitPrice: props.UnitPrice?.number || 0,
                    qty: props.Qty?.number || 0,
                    amount: amt,
                    remarks: props.Remarks?.rich_text?.[0]?.plain_text || ''
                });
            });

            setQuotes(Object.values(groupedQuotes));
            setClients(cRes.results);
        } catch (e) {
            console.error('데이터 로드 실패:', e);
        } finally {
            setLoading(false);
        }
    }

    const filteredQuotes = quotes.filter(q =>
        q.no.toLowerCase().includes(search.toLowerCase()) ||
        q.client.toLowerCase().includes(search.toLowerCase())
    );

    const addItem = () => setForm({
        ...form,
        items: [...form.items, {
            id: Date.now(), product: '', description: '',
            voltage: '-', watts: '-', luminousEff: '-',
            lumenOutput: '-', cct: '-', unit: 'PCS',
            unitPrice: 0, qty: 1, amount: 0, remarks: ''
        }]
    });

    const handleSave = async () => {
        if (!form.client) return alert('거래처를 선택하세요.');
        if (form.items.length === 0) return alert('최소 1개의 항목이 필요합니다.');

        // 당월 체크 (수정인 경우)
        if (form.items.some(it => it.id && typeof it.id === 'string')) {
            if (!validatePeriod(form.date)) return;
        }

        try {
            if (editMode && currentQuoteNo) {
                const toDelete = quotes.find(q => q.no === currentQuoteNo)?.items.map(it => it.id.toString()) || [];
                for (const pid of toDelete) await notionDelete(pid);
            }

            for (let i = 0; i < form.items.length; i++) {
                const item = form.items[i];
                await notionCreate(DB_QUOTES, {
                    EstimateNo1: TITLE(form.no),
                    index: RT(String(i + 1)),
                    Date: dateISO(form.date),
                    Client: RT(form.client),
                    Product: RT(item.product),
                    Description: RT(item.description),
                    Voltage: RT(item.voltage),
                    Watts: RT(item.watts),
                    LuminousEff: RT(item.luminousEff),
                    LumenOutput: RT(item.lumenOutput),
                    CCT: RT(item.cct),
                    Unit: { select: { name: item.unit } },
                    UnitPrice: num(item.unitPrice),
                    Qty: num(item.qty),
                    Amount: num(item.qty * item.unitPrice),
                    Currency: RT(form.currency),
                    Remarks: RT(item.remarks),
                    EstimateNo: RT(form.no),
                    GeneralInfo: RT(form.generalInfo),
                    SpecialNotes: RT(form.specialNotes),
                    attach1: FILES(form.attach1),
                    attach2: FILES(form.attach2),
                    attach3: FILES(form.attach3),
                    attacht1: RT(form.attacht1),
                    attacht2: RT(form.attacht2),
                    attacht3: RT(form.attacht3)
                });
            }
            alert('견적서가 저장되었습니다.');
            setView('list');
            setEditMode(false);
            fetchInitialData();
        } catch (e: any) {
            console.error('Save Error:', e);
            let msg = e.message;
            try {
                const errorObj = JSON.parse(e.message);
                if (errorObj.message) msg = errorObj.message;
            } catch (err) { }
            alert('저장 오류: ' + msg);
        }
    };

    const handleEdit = (q: QuoteRecord) => {
        setForm({
            no: q.no,
            date: q.date,
            client: q.client,
            currency: q.currency || 'KRW',
            generalInfo: q.generalInfo || '',
            specialNotes: q.specialNotes || '',
            attach1: q.attach1 || '',
            attach2: q.attach2 || '',
            attach3: q.attach3 || '',
            attacht1: q.attacht1 || '',
            attacht2: q.attacht2 || '',
            attacht3: q.attacht3 || '',
            docType: q.docType || 'QUOTE',
            items: q.items.map(it => ({ ...it }))
        });
        setEditMode(true);
        setCurrentQuoteNo(q.no);
        setView('create');
    };

    const onProductSelect = (p: any) => {
        if (activeIdx === null) return;
        const updated = [...form.items];
        updated[activeIdx] = {
            ...updated[activeIdx],
            product: p.name,
            description: p.detail,
            voltage: p.voltage || '-',
            watts: p.watts || '-',
            luminousEff: p.luminousEff || '-',
            lumenOutput: p.lumenOutput || '-',
            cct: p.cct || '-',
            unitPrice: p.cost || 0
        };
        setForm({ ...form, items: updated });
    };

    const handlePrint = (q: QuoteRecord) => {
        // 고객사 정보 매핑
        const clientDoc = clients.find(c => {
            const cName = c.properties.ClientName?.title?.[0]?.plain_text || c.properties.ClientName?.rich_text?.[0]?.plain_text;
            return cName === q.client;
        });

        const clientInfo = clientDoc ? {
            address: clientDoc.properties.Address?.rich_text?.[0]?.plain_text || clientDoc.properties['주소']?.rich_text?.[0]?.plain_text || '',
            bizNo: clientDoc.properties.BizNo?.rich_text?.[0]?.plain_text || clientDoc.properties['사업자번호']?.rich_text?.[0]?.plain_text || '',
            ceo: clientDoc.properties.CEO?.rich_text?.[0]?.plain_text || clientDoc.properties['대표자']?.rich_text?.[0]?.plain_text || ''
        } : undefined;

        setPrintData({ ...q, clientInfo });
        setCompany(getSettings());
        setView('print');
    };

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
                        tfoot { display: table-footer-group; }                        .appendix-page { page-break-before: always; padding: 50px 40px; background: white; color: black; }
                        .attach-item { margin-bottom: 40px; break-inside: avoid; }
                        .attach-img { max-width: 100%; height: auto; max-height: 480px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 15px; display: block; }
                        
                        @page { size: auto; margin: 10mm; }
                    }
                    .pi-table th { background: #1a202c !important; color: white !important; -webkit-print-color-adjust: exact; font-weight: 500; font-size: 11px; }
                    .pi-table td { font-size: 11px; border: 0.5px solid #e2e8f0; }
                    .pi-total-row { background: #f8fafc !important; -webkit-print-color-adjust: exact; }
                `}</style>

                <div style={{ padding: '20px 0' }}>
                    {/* Header Top Section */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', position: 'relative' }}>
                        {company.logoUrl && (
                            <img src={company.logoUrl} alt="Logo" style={{ height: '70px', maxWidth: '180px', objectFit: 'contain' }} />
                        )}
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '8px', margin: '0 0 10px 0', color: '#1a202c' }}>
                                {printData.docType === 'PROFORMA' ? 'PROFORMA INVOICE' : 'QUOTATION'}
                            </h1>
                            <div style={{ background: '#1a202c', height: '4px', width: '100px', margin: '0 auto 20px auto' }}></div>
                            <div style={{ fontSize: '1.1rem', color: '#4a5568' }}>
                                <p style={{ margin: '5px 0' }}>Ref No: <span style={{ fontWeight: 700, color: '#1a202c' }}>{printData.no}</span></p>
                                <p style={{ margin: '5px 0' }}>Date: <span style={{ fontWeight: 700, color: '#1a202c' }}>{printData.date}</span></p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: 'max-content', flexShrink: 0 }}>
                            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 10px 0', color: '#1a202c', whiteSpace: 'nowrap', display: 'inline-block' }}>{company.name}</h2>
                            <div style={{ fontSize: '0.9rem', color: '#4a5568', lineHeight: '1.5', position: 'relative' }}>
                                <p style={{ margin: '2px 0' }}>{company.address}</p>
                                <p style={{ margin: '2px 0' }}>
                                    CEO: {company.ceo} (인) | Biz No: {company.bizNo}
                                </p>
                                <p style={{ margin: '2px 0' }}>Tel: {company.tel} | Fax: {company.fax}</p>
                                <p style={{ margin: '2px 0' }}>Email: {company.email || ''}</p>
                            </div>
                        </div>
                    </div>

                    {/* Client Info Section */}
                    {/* ... (Client Info Section 생략 - 변경 없음) ... */}

                    {/* (Client Info Section 코드 블록이 너무 길어서 끊길 수 있으므로, 헤더 부분만 먼저 교체하고 하단은 별도로 교체하거나, 전체 구조가 파악되었으니 안전하게 부분 교체 진행) */}
                    {/* 여기서는 헤더 부분만 교체하고, 하단은 별도 청크로 처리하는 것이 안전함. 하지만 tool call은 한번에 하나의 파일만 건드려야 하므로, multi_replace 사용 불가. replace_file_content는 하나만 됨. */}
                    {/* 따라서 헤더 부분과 하단 부분을 포함할 수 없으므로(Client Info와 Table이 중간에 낌), 일단 헤더만 수정하고 다시 호출해서 하단 수정. */}
                    {/* 아, replace_file_content는 contiguous block만 가능하므로 2번 호출해야 함. */}
                    {/* 일단 이 툴 호출에서는 '헤더' 부분만 처리하고, 이어서 '하단' 처리. */}

                    {/* Client Info Section */}
                    <div style={{ display: 'flex', gap: '40px', marginBottom: '40px' }}>
                        <div style={{ flex: 1, padding: '20px', background: '#f8fafc', borderRadius: '8px', borderLeft: '6px solid #1a202c' }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '10px' }}>To (Receiver)</h3>
                            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a202c', margin: 0 }}>{printData.client} <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>貴下</span></p>

                            {printData.clientInfo && (
                                <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#4a5568', lineHeight: '1.4' }}>
                                    {printData.clientInfo.address && <p style={{ margin: '2px 0' }}>{printData.clientInfo.address}</p>}
                                    {printData.clientInfo.ceo && <p style={{ margin: '2px 0' }}>ATTN: {printData.clientInfo.ceo}</p>}
                                    {printData.clientInfo.bizNo && <p style={{ margin: '2px 0' }}>Biz No: {printData.clientInfo.bizNo}</p>}
                                </div>
                            )}

                            <p style={{ marginTop: '15px', fontSize: '1rem', color: '#1a202c', lineHeight: '1.6', fontWeight: 500 }}>
                                {printData.docType === 'PROFORMA'
                                    ? '당사 제품을 발주해 주셔서 대단히 감사합니다. 귀사의 발주 내용을 바탕으로 본 Proforma Invoice를 발행하오니, 명시된 조건과 품목을 확인해 주시기 바랍니다.'
                                    : '귀사의 무궁한 발전을 기원하며, 아래와 같이 견적드립니다.'}
                            </p>
                        </div>
                        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'right' }}>
                            <p style={{ fontSize: '1rem', color: '#718096', marginBottom: '5px' }}>Total Amount</p>
                            <p style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0070f3', margin: 0 }}>
                                {getCurrencySymbol(printData.currency)}{printData.totalAmount.toLocaleString()}
                            </p>
                            <p style={{ fontSize: '0.8rem', color: '#a0aec0' }}>(Including/Excluding VAT: See Below)</p>
                        </div>
                    </div>

                    {/* Table Section */}
                    <table className="pi-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                        <thead>
                            <tr style={{ height: '40px' }}>
                                <th style={{ width: '40px' }}>NO</th>
                                <th>DESCRIPTION / SPECIFICATION</th>
                                <th style={{ width: '160px' }}>TECHNICAL DETAIL</th>
                                <th style={{ width: '60px' }}>UNIT</th>
                                <th style={{ width: '60px' }}>QTY</th>
                                <th style={{ width: '110px' }}>UNIT PRICE</th>
                                <th style={{ width: '130px' }}>AMOUNT</th>
                                <th style={{ width: '120px' }}>REMARKS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {printData.items.map((it, i) => (
                                <tr key={i} style={{ height: '45px' }}>
                                    <td style={{ textAlign: 'center', color: '#718096' }}>{i + 1}</td>
                                    <td style={{ padding: '8px 12px' }}>
                                        <p style={{ fontWeight: 700, fontSize: '12px', marginBottom: '2px', color: '#1a202c' }}>{it.product}</p>
                                        <p style={{ fontSize: '10px', color: '#718096', margin: 0 }}>{it.description}</p>
                                    </td>
                                    <td style={{ textAlign: 'center', color: '#4a5568', lineHeight: '1.4' }}>
                                        {it.voltage} / {it.watts}<br />
                                        {it.luminousEff} / {it.cct}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{it.unit}</td>
                                    <td style={{ textAlign: 'center' }}>{it.qty}</td>
                                    <td style={{ textAlign: 'right', paddingRight: '10px' }}>{it.unitPrice.toLocaleString()}</td>
                                    <td style={{ textAlign: 'right', paddingRight: '10px', fontWeight: 700, color: '#1a202c' }}>{it.amount.toLocaleString()}</td>
                                    <td style={{ padding: '8px', color: '#718096', fontSize: '10px' }}>{it.remarks}</td>
                                </tr>
                            ))}
                            <tr className="pi-total-row" style={{ height: '50px' }}>
                                <td colSpan={6} style={{ textAlign: 'right', paddingRight: '15px', fontWeight: 800, fontSize: '13px', borderRight: 'none' }}>TOTAL AMOUNT ({printData.currency})</td>
                                <td style={{ textAlign: 'right', paddingRight: '10px', fontWeight: 900, fontSize: '15px', color: '#0070f3', borderLeft: 'none' }}>
                                    {getCurrencySymbol(printData.currency)}{printData.totalAmount.toLocaleString()}
                                </td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Bottom Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '30px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', minHeight: '120px' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0 0 10px 0', color: '#2d3748' }}>SPECIAL NOTES & TERMS</h4>
                                <div style={{ fontSize: '0.85rem', color: '#4a5568', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                    {printData.specialNotes || '1. Delivery: To be discussed after P.O\n2. Payment: Cash/Transfer\n3. Validity: 1 Month from the above date\n4. Tax: VAT 10% separate unless specified'}
                                </div>
                            </div>
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0 0 10px 0', color: '#2d3748' }}>BANK INFORMATION</h4>
                                {printData.currency === 'KRW' ? (
                                    <p style={{ fontSize: '0.9rem', color: '#1a202c', fontWeight: 600 }}>{company.bank}</p>
                                ) : (
                                    <div style={{ fontSize: '0.85rem', color: '#1a202c' }}>
                                        <p style={{ margin: '0 0 4px 0', fontWeight: 600 }}>{company.bankForeign1}</p>
                                        <p style={{ margin: 0 }}>{company.bankForeign2}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px' }}>
                                <p style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '10px', fontWeight: 700 }}>PREPARED BY</p>
                                <div style={{ height: '40px' }}></div>
                            </div>
                            <div style={{ border: '1px solid #1a202c', borderRadius: '8px', padding: '15px', background: '#f8fafc', position: 'relative', minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <p style={{ fontSize: '0.75rem', color: '#1a202c', marginBottom: '10px', fontWeight: 800 }}>AUTHORIZED APPROVAL</p>
                                <div style={{ textAlign: 'right', width: '100%', zIndex: 2 }}>
                                    <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700 }}>{company.name}</p>
                                    <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.5 }}>(Sign or Seal)</p>
                                </div>
                                {company.stampUrl && (
                                    <img
                                        src={company.stampUrl}
                                        style={{
                                            position: 'absolute',
                                            right: '10%',
                                            bottom: '5px',
                                            width: '320px',
                                            height: 'auto',
                                            opacity: 0.65,
                                            transform: 'rotate(-2deg)',
                                            zIndex: 1,
                                            pointerEvents: 'none'
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="no-print" style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '15px', zIndex: 100 }}>
                    <button onClick={() => setView('list')} style={{ background: '#4a5568', color: 'white', padding: '12px 25px', borderRadius: '30px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                        <ArrowLeft size={18} /> Exit Print Mode
                    </button>
                    <button onClick={() => {
                        const originalTitle = document.title;
                        document.title = `${printData.date || new Date().toISOString().split('T')[0]}_견적서_${printData.no}`;
                        window.print();
                        document.title = originalTitle;
                    }} style={{ background: 'var(--accent-gradient)', color: 'white', padding: '12px 35px', borderRadius: '30px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, boxShadow: '0 4px 15px rgba(0,112,243,0.3)' }}>
                        <Printer size={18} /> Print Document
                    </button>
                </div>

                {/* Appendix Page for Attachments */}
                {
                    (printData.attach1 || printData.attach2 || printData.attach3 || printData.attacht1 || printData.attacht2 || printData.attacht3) && (
                        <div className="appendix-page">
                            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1a202c', borderBottom: '4px solid #1a202c', paddingBottom: '12px', marginBottom: '40px', letterSpacing: '2px', textAlign: 'center' }}>ATTACHMENTS & SPECIFICATIONS</h2>

                            {[1, 2, 3].map(n => {
                                const img = (printData as any)[`attach${n}`];
                                const text = (printData as any)[`attacht${n}`];
                                if (!img && !text) return null;
                                return (
                                    <div key={n} className="attach-item">
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '15px', color: '#1a202c', borderLeft: '5px solid #0070f3', paddingLeft: '12px' }}>
                                            ATTACHMENT REF #{n}
                                        </h3>
                                        {img && <img src={img} className="attach-img" alt={`Attachment ${n}`} />}
                                        {text && (
                                            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem', lineHeight: '1.8', color: '#2d3748', whiteSpace: 'pre-wrap' }}>
                                                {text}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )
                }
            </div >
        );
    }

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                        <div style={{ padding: '8px', background: 'rgba(0,112,243,0.1)', borderRadius: '10px' }}>
                            <Quote size={24} style={{ color: '#0070f3' }} />
                        </div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>Quotation Manager</h2>
                    </div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '1rem' }}>Manage professional quotations with Notion DB synchronization</p>
                </div>
                {view === 'list' && (
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={() => {
                            const newNo = 'Q' + new Date().toISOString().substring(0, 10).replace(/-/g, '') + '-' + Math.floor(Date.now() / 1000).toString().slice(-4);
                            setForm({
                                no: newNo,
                                date: new Date().toISOString().substring(0, 10),
                                client: '',
                                currency: 'KRW',
                                generalInfo: '',
                                specialNotes: '',
                                attach1: '',
                                attach2: '',
                                attach3: '',
                                attacht1: '',
                                attacht2: '',
                                attacht3: '',
                                docType: 'QUOTE',
                                items: [{
                                    id: Date.now(),
                                    product: '', description: '',
                                    voltage: '-', watts: '-', luminousEff: '-',
                                    lumenOutput: '-', cct: '-', unit: 'PCS',
                                    unitPrice: 0, qty: 1, amount: 0, remarks: ''
                                }]
                            });
                            setEditMode(false);
                            setView('create');
                        }} style={{ background: 'var(--accent-gradient)', border: 'none', padding: '0.8rem 1.8rem', borderRadius: '14px', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,112,243,0.3)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            <Plus size={20} /> Create New Quote
                        </button>
                        <button onClick={() => {
                            const newNo = 'PI' + new Date().toISOString().substring(0, 10).replace(/-/g, '') + '-' + Math.floor(Date.now() / 1000).toString().slice(-4);
                            setForm({
                                no: newNo,
                                date: new Date().toISOString().substring(0, 10),
                                client: '',
                                currency: 'USD',
                                generalInfo: '',
                                specialNotes: '',
                                attach1: '',
                                attach2: '',
                                attach3: '',
                                attacht1: '',
                                attacht2: '',
                                attacht3: '',
                                docType: 'PROFORMA',
                                items: [{
                                    id: Date.now(),
                                    product: '', description: '',
                                    voltage: '-', watts: '-', luminousEff: '-',
                                    lumenOutput: '-', cct: '-', unit: 'PCS',
                                    unitPrice: 0, qty: 1, amount: 0, remarks: ''
                                }]
                            });
                            setEditMode(false);
                            setView('create');
                        }} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', padding: '0.8rem 1.8rem', borderRadius: '14px', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(118,75,162,0.3)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            <FileText size={20} /> PROFORMA Quote
                        </button>
                    </div>
                )}
            </header>

            {view === 'create' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass" style={{ padding: '2.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.25rem', marginBottom: '2.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Quote Reference</label>
                                <input value={form.no} readOnly style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, cursor: 'not-allowed' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Date</label>
                                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.8rem', color: 'white', colorScheme: 'dark' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Client (Receiver)</label>
                                <select value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.8rem', color: 'white', fontWeight: 600 }}>
                                    <option value="">-- Select Client --</option>
                                    {clients.map(c => <option key={c.id} value={c.properties.ClientName.title[0].plain_text}>{c.properties.ClientName.title[0].plain_text}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Currency</label>
                                <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.8rem', color: '#0070f3', fontWeight: 800 }}>
                                    <option value="KRW">KRW (₩)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="RMB">RMB (¥)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>General Condition</label>
                                <input value={form.generalInfo} onChange={e => setForm({ ...form, generalInfo: e.target.value })} placeholder="e.g. Nett 30 Days" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.8rem', color: 'white' }} />
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto', marginBottom: '2.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1600px' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <th style={{ padding: '15px' }}>Product</th>
                                        <th style={{ padding: '15px' }}>Spec/Detail</th>
                                        <th style={{ padding: '15px', width: '90px' }}>Volt</th>
                                        <th style={{ padding: '15px', width: '90px' }}>Watt</th>
                                        <th style={{ padding: '15px', width: '90px' }}>Eff</th>
                                        <th style={{ padding: '15px', width: '100px' }}>Lumen</th>
                                        <th style={{ padding: '15px', width: '100px' }}>CCT</th>
                                        <th style={{ padding: '15px', width: '90px' }}>Unit</th>
                                        <th style={{ padding: '15px', width: '120px', textAlign: 'right' }}>Price</th>
                                        <th style={{ padding: '15px', width: '80px', textAlign: 'right' }}>Qty</th>
                                        <th style={{ padding: '15px', width: '140px', textAlign: 'right' }}>Total</th>
                                        <th style={{ padding: '15px' }}>Remarks</th>
                                        <th style={{ padding: '15px', width: '40px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {form.items.map((it, idx) => (
                                        <tr key={it.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '12px' }}>
                                                <input value={it.product} onClick={() => { setActiveIdx(idx); setIsPickerOpen(true); }} readOnly placeholder="Click to select..." style={{ width: '100%', background: 'rgba(0,112,243,0.1)', border: '1px dashed rgba(0,112,243,0.3)', color: '#0070f3', fontWeight: 700, cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }} />
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <input value={it.description} onChange={e => {
                                                    const updated = [...form.items];
                                                    updated[idx].description = e.target.value;
                                                    setForm({ ...form, items: updated });
                                                }} style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontSize: '0.85rem' }} />
                                            </td>
                                            {['voltage', 'watts', 'luminousEff', 'lumenOutput', 'cct'].map(field => (
                                                <td key={field} style={{ padding: '12px' }}>
                                                    <input value={(it as any)[field]} onChange={e => {
                                                        const updated = [...form.items];
                                                        (updated[idx] as any)[field] = e.target.value;
                                                        setForm({ ...form, items: updated });
                                                    }} style={{ width: '100%', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', textAlign: 'center' }} />
                                                </td>
                                            ))}
                                            <td style={{ padding: '12px' }}>
                                                <select value={it.unit} onChange={e => {
                                                    const updated = [...form.items];
                                                    updated[idx].unit = e.target.value;
                                                    setForm({ ...form, items: updated });
                                                }} style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontSize: '0.8rem', textAlign: 'center' }}>
                                                    <option value="PCS">PCS</option>
                                                    <option value="SET">SET</option>
                                                    <option value="EA">EA</option>
                                                    <option value="UNIT">UNIT</option>
                                                    <option value="BOX">BOX</option>
                                                    <option value="M">M</option>
                                                </select>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <input type="number" value={it.unitPrice} onChange={e => {
                                                    const updated = [...form.items];
                                                    updated[idx].unitPrice = Number(e.target.value);
                                                    setForm({ ...form, items: updated });
                                                }} style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', textAlign: 'right', fontWeight: 700 }} />
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <input type="number" value={it.qty} onChange={e => {
                                                    const updated = [...form.items];
                                                    updated[idx].qty = Number(e.target.value);
                                                    setForm({ ...form, items: updated });
                                                }} style={{ width: '100%', background: 'transparent', border: 'none', color: '#00ff88', textAlign: 'right', fontWeight: 800 }} />
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: '#0070f3' }}>
                                                {getCurrencySymbol(form.currency)}{(it.qty * it.unitPrice).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <input value={it.remarks} onChange={e => {
                                                    const updated = [...form.items];
                                                    updated[idx].remarks = e.target.value;
                                                    setForm({ ...form, items: updated });
                                                }} placeholder="..." style={{ width: '100%', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }} />
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <button onClick={() => setForm({ ...form, items: form.items.filter(item => item.id !== it.id) })} style={{ color: '#ff4d4f', opacity: 0.5, border: 'none', background: 'transparent', cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                                <button onClick={addItem} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 20px', borderRadius: '10px', color: 'white', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Plus size={16} /> Add Item
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.8rem' }}>Special Instructions / Remarks</label>
                                <textarea value={form.specialNotes} onChange={e => setForm({ ...form, specialNotes: e.target.value })} placeholder="Enter terms, bank info, or specific conditions..." style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '1.2rem', color: 'white', height: '140px', resize: 'none', lineHeight: '1.6', fontSize: '0.9rem' }} />

                                <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                                    {[1, 2, 3].map(n => (
                                        <div key={n} className="glass" style={{ padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Attachment {n}</label>
                                                {(form as any)[`attach${n}`] && <button onClick={() => setForm({ ...form, [`attach${n}`]: '' })} style={{ background: 'rgba(255,75,75,0.1)', color: '#ff4b4b', border: 'none', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>Remove</button>}
                                            </div>
                                            <div style={{
                                                width: '100%', aspectRatio: '16/9', background: 'rgba(0,0,0,0.3)',
                                                borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                overflow: 'hidden', cursor: 'pointer', marginBottom: '15px', position: 'relative'
                                            }} onClick={() => !(form as any)[`attach${n}`] && document.getElementById(`file-quote-${n}`)?.click()}>
                                                {(form as any)[`attach${n}`] ? (
                                                    <img src={(form as any)[`attach${n}`]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ textAlign: 'center', opacity: 0.3 }}>
                                                        <Plus size={24} style={{ margin: '0 auto 5px' }} />
                                                        <p style={{ fontSize: '0.6rem' }}>Click to upload reference image</p>
                                                    </div>
                                                )}
                                                {uploading === `attach${n}` && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>Uploading...</div>}
                                                <input id={`file-quote-${n}`} type="file" hidden onChange={e => handleFileUpload(e, `attach${n}`)} />
                                            </div>
                                            <textarea
                                                placeholder="Enter purpose or reference description for this item..."
                                                value={(form as any)[`attacht${n}`]}
                                                onChange={e => setForm({ ...form, [`attacht${n}`]: e.target.value })}
                                                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '0.8rem', fontSize: '0.8rem', color: 'white', height: '80px', resize: 'none' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{ background: 'rgba(0,112,243,0.05)', border: '1px solid rgba(0,112,243,0.1)', borderRadius: '24px', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
                                <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>Grand Total Amount</p>
                                <h3 style={{ fontSize: '3.5rem', fontWeight: 950, color: '#0070f3', margin: 0, letterSpacing: '-2px' }}>
                                    {getCurrencySymbol(form.currency)}{form.items.reduce((acc, it) => acc + (it.qty * it.unitPrice), 0).toLocaleString()}
                                </h3>
                                <p style={{ marginTop: '10px', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Based on {form.items.length} items</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'flex-end', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <button onClick={() => setView('list')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem 2.5rem', borderRadius: '14px', color: 'white', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleSave} style={{ background: 'var(--accent-gradient)', border: 'none', padding: '1rem 4rem', borderRadius: '14px', color: 'white', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,112,243,0.4)' }}>
                                {editMode ? 'Update Quotation' : 'Save & Publish Quote'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="glass" style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                        <div style={{ position: 'relative', width: '450px' }}>
                            <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                            <input
                                type="text"
                                placeholder="Search by Quote No or Client..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem 1rem 1rem 3.2rem', borderRadius: '16px', color: 'white', fontSize: '0.95rem' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ padding: '10px 15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                                Total: <span style={{ color: 'white', fontWeight: 700 }}>{filteredQuotes.length}</span> Quotes
                            </div>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    <th style={{ padding: '1.2rem' }}>Quote Ref</th>
                                    <th style={{ padding: '1.2rem' }}>Date</th>
                                    <th style={{ padding: '1.2rem' }}>Client Name</th>
                                    <th style={{ padding: '1.2rem', textAlign: 'right' }}>Total Amount</th>
                                    <th style={{ padding: '1.2rem', width: '180px', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} style={{ padding: '5rem', textAlign: 'center', opacity: 0.5 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                            <div className="spinner"></div>
                                            <span>Synchronizing with Notion DB...</span>
                                        </div>
                                    </td></tr>
                                ) : filteredQuotes.length === 0 ? (
                                    <tr><td colSpan={5} style={{ padding: '5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No quotations found match your search.</td></tr>
                                ) : filteredQuotes.map((q) => (
                                    <tr key={q.pageId} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '1.5rem 1.2rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0070f3' }}></div>
                                                <span style={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>{q.no}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.5rem 1.2rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>{q.date}</td>
                                        <td style={{ padding: '1.5rem 1.2rem' }}>
                                            <div style={{ fontWeight: 700, color: 'white', marginBottom: '4px' }}>{q.client}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}><Box size={10} /> {q.items.length} Items included</div>
                                        </td>
                                        <td style={{ padding: '1.5rem 1.2rem', textAlign: 'right' }}>
                                            <div style={{ fontWeight: 950, color: '#0070f3', fontSize: '1.1rem' }}>{getCurrencySymbol(q.currency)}{q.totalAmount.toLocaleString()}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Currency: {q.currency}</div>
                                        </td>
                                        <td style={{ padding: '1.5rem 1.2rem' }}>
                                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                                <button onClick={() => handlePrint(q)} title="Print Document" style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: 'white', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}><Printer size={18} /></button>
                                                <button onClick={() => handleEdit(q)} title="Edit Details" style={{ padding: '10px', background: 'rgba(0,112,243,0.1)', border: '1px solid rgba(0,112,243,0.1)', borderRadius: '12px', color: '#0070f3', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,112,243,0.2)'; e.currentTarget.style.borderColor = 'rgba(0,112,243,0.3)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,112,243,0.1)'; e.currentTarget.style.borderColor = 'rgba(0,112,243,0.1)'; }}><ChevronRight size={18} /></button>
                                                <button onClick={async () => {
                                                    if (!validatePeriod(q.date)) return;
                                                    if (confirm('Are you sure to delete this quotation?')) { for (const it of q.items) await notionDelete(it.id.toString()); fetchInitialData(); }
                                                }} title="Delete" style={{ padding: '10px', background: 'rgba(255,77,79,0.1)', border: '1px solid rgba(255,77,79,0.1)', borderRadius: '12px', color: '#ff4d4f', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,77,79,0.2)'; e.currentTarget.style.borderColor = 'rgba(255,77,79,0.3)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,77,79,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,77,79,0.1)'; }}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <ProductPicker isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} onSelect={onProductSelect} />
        </div>
    );
}
