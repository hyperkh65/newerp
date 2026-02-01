'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Search, FileText, Trash2, Printer, ChevronRight, Calculator, User, Building, MapPin, Mail, Phone, Box, ArrowLeft, Download, CheckCircle, Package } from 'lucide-react';
import Modal from '@/components/Modal';
import ProductPicker from '@/components/ProductPicker';
import QuotePicker from '@/components/QuotePicker';
import {
    notionQuery, notionCreate, notionUpdate, notionDelete,
    isWithinCurrentMonth, validatePeriod,
    DB_PURCHASE_ORDERS, DB_CLIENTS, DB_PRODUCTS, RT, TITLE, num, dateISO, FILES, uploadFile
} from '@/lib/notion';
import { getSettings } from '@/lib/settings';

interface POItem {
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

interface PORecord {
    pageId: string;
    no: string;
    date: string;
    supplier: string;
    totalAmount: number;
    currency: string;
    items: POItem[];
    generalInfo?: string;
    specialNotes?: string;
    attach1?: string;
    attach2?: string;
    attach3?: string;
    attacht1?: string;
    attacht2?: string;
    attacht3?: string;
    root?: string;
    supplierDetail?: {
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

export default function PurchaseOrdersPage() {
    const [pos, setPos] = useState<PORecord[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'create' | 'print'>('list');
    const [search, setSearch] = useState('');
    const [form, setForm] = useState<{
        no: string;
        date: string;
        supplier: string;
        currency: string;
        generalInfo: string;
        specialNotes: string;
        attach1: string;
        attach2: string;
        attach3: string;
        attacht1: string;
        attacht2: string;
        attacht3: string;
        root: string;
        items: POItem[];
    }>({
        no: 'PO' + new Date().toISOString().substring(0, 10).replace(/-/g, '') + '-01',
        date: new Date().toISOString().substring(0, 10),
        supplier: '',
        currency: 'KRW',
        generalInfo: '',
        specialNotes: '',
        attach1: '',
        attach2: '',
        attach3: '',
        attacht1: '',
        attacht2: '',
        attacht3: '',
        root: '',
        items: [{
            id: Date.now(),
            product: '', description: '',
            voltage: '-', watts: '-', luminousEff: '-',
            lumenOutput: '-', cct: '-', unit: 'PCS',
            unitPrice: 0, qty: 1, amount: 0, remarks: ''
        }]
    });

    const [printData, setPrintData] = useState<PORecord | null>(null);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isQuotePickerOpen, setIsQuotePickerOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState<number | null>(null);
    const [company, setCompany] = useState(getSettings());
    const [editMode, setEditMode] = useState(false);
    const [currentPoNo, setCurrentPoNo] = useState<string | null>(null);
    const [uploading, setUploading] = useState<string | null>(null);
    const [isRootModalOpen, setIsRootModalOpen] = useState(false);

    useEffect(() => {
        fetchInitialData();
        setCompany(getSettings());
    }, []);

    async function fetchInitialData() {
        try {
            setLoading(true);
            const [poRes, sRes] = await Promise.all([
                notionQuery(DB_PURCHASE_ORDERS, { sorts: [{ property: 'Date', direction: 'descending' }] }),
                notionQuery(DB_CLIENTS)
            ]);

            const groupedPOs: { [key: string]: PORecord } = {};
            poRes.results.forEach((r: any) => {
                const props = r.properties;
                // 사용자의 스크린샷과 일치하는 속성명 우선 사용
                const no = props.PoNo?.rich_text?.[0]?.plain_text || props.PoNo1?.rich_text?.[0]?.plain_text || props.PoNo?.title?.[0]?.plain_text || 'Unknown';
                if (!groupedPOs[no]) {
                    groupedPOs[no] = {
                        pageId: r.id,
                        no,
                        date: props.Date?.date?.start || '-',
                        supplier: props.Supplier?.rich_text?.[0]?.plain_text || props.Supplier?.title?.[0]?.plain_text || '-',
                        currency: props.Currency?.rich_text?.[0]?.plain_text || props.Currency?.select?.name || props.Unit?.select?.name || 'KRW',
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
                        root: props.root?.files?.[0]?.external?.url || props.root?.files?.[0]?.file?.url || ''
                    };
                }
                const amt = props.Amount?.number || 0;
                groupedPOs[no].totalAmount += amt;
                groupedPOs[no].items.push({
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

            setPos(Object.values(groupedPOs));
            setSuppliers(sRes.results);
        } catch (e) {
            console.error('발주 데이터 로드 실패:', e);
        } finally {
            setLoading(false);
        }
    }

    const filteredPOs = pos.filter(p =>
        p.no.toLowerCase().includes(search.toLowerCase()) ||
        p.supplier.toLowerCase().includes(search.toLowerCase())
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

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(field);
        try {
            const { url } = await uploadFile(file);
            setForm(prev => ({ ...prev, [field]: url }));
        } catch (error) {
            console.error('File upload failed:', error);
            alert('파일 업로드 실패.');
        } finally {
            setUploading(null);
        }
    };

    const handleSave = async () => {
        if (!form.supplier) return alert('공급처를 선택하세요.');
        if (form.items.length === 0) return alert('최소 1개의 품목이 필요합니다.');

        // 당월 체크 (수정인 경우)
        if (editMode && currentPoNo) {
            if (!validatePeriod(form.date)) return;
        }

        try {
            if (editMode && currentPoNo) {
                const toDelete = pos.find(p => p.no === currentPoNo)?.items.map(it => it.id.toString()) || [];
                for (const pid of toDelete) await notionDelete(pid);
            }

            for (let i = 0; i < form.items.length; i++) {
                const item = form.items[i];
                await notionCreate(DB_PURCHASE_ORDERS, {
                    // 스크린샷 1: "Estimate No"가 제목 속성인 것으로 보임
                    "Estimate No": TITLE(form.supplier),
                    PoNo: RT(form.no),
                    index: RT(String(i + 1)),
                    Date: dateISO(form.date),
                    Supplier: RT(form.supplier),
                    Currency: RT(form.currency),
                    Product: RT(item.product),
                    Description: RT(item.description),
                    Voltage: RT(item.voltage),
                    Watts: RT(item.watts),
                    LuminousEff: RT(item.luminousEff),
                    LumenOutput: RT(item.lumenOutput),
                    CCT: RT(item.cct),
                    // 스크린샷 2: "Unit" 컬럼에 KRW, RMB이 저장되어 있음
                    Unit: { select: { name: form.currency } },
                    UnitPrice: num(item.unitPrice),
                    Qty: num(item.qty),
                    Amount: num(item.qty * item.unitPrice),
                    Remarks: RT(item.remarks),
                    GeneralInfo: RT(form.generalInfo),
                    SpecialNotes: RT(form.specialNotes),
                    attach1: FILES(form.attach1),
                    attach2: FILES(form.attach2),
                    attach3: FILES(form.attach3),
                    attacht1: RT(form.attacht1),
                    attacht2: RT(form.attacht2),
                    attacht3: RT(form.attacht3),
                    root: FILES(form.root)
                });
            }
            alert('발주서가 저장되었습니다.');
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

    const handleEdit = (p: PORecord) => {
        setForm({
            no: p.no,
            date: p.date,
            supplier: p.supplier,
            currency: p.currency || 'KRW',
            generalInfo: p.generalInfo || '',
            specialNotes: p.specialNotes || '',
            attach1: p.attach1 || '',
            attach2: p.attach2 || '',
            attach3: p.attach3 || '',
            attacht1: p.attacht1 || '',
            attacht2: p.attacht2 || '',
            attacht3: p.attacht3 || '',
            root: p.root || '',
            items: p.items.map(it => ({ ...it }))
        });
        setEditMode(true);
        setCurrentPoNo(p.no);
        setView('create');
    };

    const onProductSelect = (p: any) => {
        if (activeIdx === null) return;
        const updated = [...form.items];
        updated[activeIdx] = {
            ...updated[activeIdx],
            product: p.name,
            description: p.detail || '',
            voltage: p.voltage || '-',
            watts: p.watts || '-',
            luminousEff: p.efficiency || '-',
            lumenOutput: p.lumen || '-',
            cct: p.cct || '-',
            unit: p.unit || 'PCS'
        };
        setForm({ ...form, items: updated });
        setIsPickerOpen(false);
    };

    const onQuoteSelect = (quote: any) => {
        const newItems = quote.items.map((it: any) => ({
            id: Date.now() + Math.random(),
            product: it.product,
            description: it.description,
            voltage: it.voltage,
            watts: it.watts,
            luminousEff: it.luminousEff,
            lumenOutput: it.lumenOutput,
            cct: it.cct,
            unit: it.unit,
            unitPrice: 0, // 가격은 직접 입력하도록 0으로 설정
            qty: it.qty,
            amount: 0,
            remarks: ''
        }));

        setForm(prev => ({
            ...prev,
            supplier: quote.client, // 견적 업체명을 공급업체명으로 권장
            currency: quote.currency,
            items: newItems
        }));
        setIsQuotePickerOpen(false);
        setView('create'); // 불러오기 성공 시 작성 화면으로 전환
        alert(`${quote.no} 견적 내용이 불러와졌습니다. (가격은 0으로 설정되었습니다)`);
    };
    const handlePrint = (p: PORecord) => {
        // 공급업체 정보 매핑
        const supDoc = suppliers.find(s => {
            const sName = s.properties.ClientName?.title?.[0]?.plain_text || s.properties.ClientName?.rich_text?.[0]?.plain_text;
            return sName === p.supplier;
        });

        const supplierDetail = supDoc ? {
            address: supDoc.properties.Address?.rich_text?.[0]?.plain_text || supDoc.properties['주소']?.rich_text?.[0]?.plain_text || '',
            bizNo: supDoc.properties.BizNo?.rich_text?.[0]?.plain_text || supDoc.properties['사업자번호']?.rich_text?.[0]?.plain_text || '',
            ceo: supDoc.properties.CEO?.rich_text?.[0]?.plain_text || supDoc.properties['대표자']?.rich_text?.[0]?.plain_text || ''
        } : undefined;

        setPrintData({ ...p, supplierDetail });
        setCompany(getSettings());
        setView('print');
        // window.print calls are removed to allow rendering first
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
                        .attach-img { max-width: 100%; height: auto; max-height: 480px; border: 1px solid #dcdde1; border-radius: 8px; margin-bottom: 15px; display: block; }

                        @page { size: auto; margin: 15mm; }
                    }
                    .pi-table th { background: #2c3e50 !important; color: white !important; -webkit-print-color-adjust: exact; font-weight: 500; font-size: 11px; text-align: center; }
                    .pi-table td { font-size: 11px; border: 0.5px solid #dcdde1; }
                    .pi-total-row { background: #f5f6fa !important; -webkit-print-color-adjust: exact; }
                `}</style>

                <div style={{ padding: '50px 40px' }}>
                    {/* Header Top Section */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', position: 'relative' }}>
                        {company.logoUrl && (
                            <img src={company.logoUrl} alt="Logo" style={{ height: '70px', maxWidth: '180px', objectFit: 'contain' }} />
                        )}
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <h1 style={{ fontSize: '3.2rem', fontWeight: 900, letterSpacing: '4px', margin: '0 0 10px 0', color: '#2c3e50' }}>PURCHASE ORDER</h1>
                            <div style={{ background: '#e67e22', height: '6px', width: '120px', margin: '0 auto 20px auto' }}></div>
                            <div style={{ fontSize: '1.1rem', color: '#2f3640' }}>
                                <p style={{ margin: '5px 0' }}>P.O No: <span style={{ fontWeight: 700, color: '#c23616' }}>{printData.no}</span></p>
                                <p style={{ margin: '5px 0' }}>Date: <span style={{ fontWeight: 700 }}>{printData.date}</span></p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', position: 'relative' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 5px 0' }}>{company.name}</h2>
                            <div style={{ fontSize: '0.85rem', color: '#353b48', lineHeight: '1.4', position: 'relative' }}>
                                <p style={{ margin: '2px 0' }}>{company.address}</p>
                                <p style={{ margin: '2px 0' }}>Tel: {company.tel} | Fax: {company.fax}</p>
                                <p style={{ margin: '2px 0' }}>
                                    CEO: {company.ceo} (인)
                                </p>
                                <p style={{ margin: '2px 0' }}>Biz No: {company.bizNo}</p>
                                <p style={{ margin: '2px 0' }}>Email: {company.email || ''}</p>
                            </div>
                        </div>
                    </div>

                    {/* Parties Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
                        <div style={{ border: '1px solid #dcdde1', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ background: '#2c3e50', color: 'white', padding: '8px 15px', fontSize: '0.9rem', fontWeight: 700 }}>SUPPLIER (VENDER)</div>
                            <div style={{ padding: '15px' }}>
                                <p style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 10px 0' }}>{printData.supplier} <span style={{ fontSize: '1rem', fontWeight: 400 }}>貴下</span></p>

                                {printData.supplierDetail && (
                                    <div style={{ marginBottom: '10px', fontSize: '0.9rem', color: '#555', lineHeight: '1.4' }}>
                                        {printData.supplierDetail.address && <p style={{ margin: '2px 0' }}>{printData.supplierDetail.address}</p>}
                                        {printData.supplierDetail.ceo && <p style={{ margin: '2px 0' }}>ATTN: {printData.supplierDetail.ceo}</p>}
                                        {printData.supplierDetail.bizNo && <p style={{ margin: '2px 0' }}>Biz No: {printData.supplierDetail.bizNo}</p>}
                                    </div>
                                )}

                                <p style={{ fontSize: '0.9rem', color: '#353b48', lineHeight: '1.6' }}>상기 물품을 아래와 같이 발주하오니,<br />납기 내에 입고될 수 있도록 협조 바랍니다.</p>
                            </div>
                        </div>
                        <div style={{ border: '1px solid #dcdde1', borderRadius: '4px', overflow: 'hidden', background: '#f5f6fa' }}>
                            <div style={{ background: '#353b48', color: 'white', padding: '8px 15px', fontSize: '0.9rem', fontWeight: 700 }}>SHIP TO (DESTINATION)</div>
                            <div style={{ padding: '15px' }}>
                                <p style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 5px 0' }}>{company.name}</p>
                                <p style={{ fontSize: '0.85rem', color: '#353b48' }}>{company.address}</p>
                                <p style={{ fontSize: '0.85rem', color: '#353b48', marginTop: '5px' }}>Attention: Purchase Dept.</p>
                            </div>
                        </div>
                    </div>

                    {/* Table Section */}
                    <table className="pi-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                        <thead>
                            <tr style={{ height: '35px' }}>
                                <th style={{ width: '40px' }}>NO</th>
                                <th>ITEM DESCRIPTION / SPECIFICATIONS</th>
                                <th style={{ width: '150px' }}>TECH. DATA</th>
                                <th style={{ width: '60px' }}>UNIT</th>
                                <th style={{ width: '60px' }}>QTY</th>
                                <th style={{ width: '110px' }}>PRICE</th>
                                <th style={{ width: '130px' }}>AMOUNT</th>
                                <th style={{ width: '120px' }}>REMARKS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {printData.items.map((it, i) => (
                                <tr key={i} style={{ height: '40px' }}>
                                    <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                    <td style={{ padding: '8px 12px' }}>
                                        <p style={{ fontWeight: 700, fontSize: '11px', margin: '0 0 2px 0' }}>{it.product}</p>
                                        <p style={{ fontSize: '9px', color: '#7f8c8d', margin: 0 }}>{it.description}</p>
                                    </td>
                                    <td style={{ textAlign: 'center', fontSize: '10px' }}>{it.voltage} / {it.watts} / {it.cct}</td>
                                    <td style={{ textAlign: 'center' }}>{it.unit}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{it.qty}</td>
                                    <td style={{ textAlign: 'right', paddingRight: '10px' }}>{it.unitPrice.toLocaleString()}</td>
                                    <td style={{ textAlign: 'right', paddingRight: '10px', fontWeight: 800 }}>{it.amount.toLocaleString()}</td>
                                    <td style={{ padding: '8px', fontSize: '9px', color: '#7f8c8d' }}>{it.remarks}</td>
                                </tr>
                            ))}
                            <tr className="pi-total-row" style={{ height: '45px' }}>
                                <td colSpan={6} style={{ textAlign: 'right', paddingRight: '20px', fontWeight: 800, fontSize: '12px' }}>GRAND TOTAL AMOUNT ({printData.currency})</td>
                                <td style={{ textAlign: 'right', paddingRight: '10px', fontWeight: 900, fontSize: '14px', color: '#c23616' }}>
                                    {getCurrencySymbol(printData.currency)}{printData.totalAmount.toLocaleString()}
                                </td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Bottom Conditions Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0 0 10px 0', borderBottom: '1.5px solid #2c3e50', display: 'inline-block' }}>TERMS & CONDITIONS</h4>
                                <div style={{ fontSize: '0.85rem', color: '#2f3640', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                                    {printData.specialNotes || '1. Delivery Date: As per mutual agreement\n2. Quality: Must pass incoming QC inspection\n3. Payment: Net 30 days after invoice received\n4. Documents: Delivery note and Invoice required upon delivery'}
                                </div>
                            </div>
                            <div style={{ padding: '15px', background: '#f5f6fa', borderRadius: '4px', border: '1px solid #dcdde1' }}>
                                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 5px 0', color: '#7f8c8d' }}>BUYER'S BANK INFORMATION</h4>
                                {printData.currency === 'KRW' ? (
                                    <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>{company.bank}</p>
                                ) : (
                                    <div style={{ fontSize: '0.85rem' }}>
                                        <p style={{ margin: '0 0 2px 0', fontWeight: 600 }}>{company.bankForeign1}</p>
                                        <p style={{ margin: 0 }}>{company.bankForeign2}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ border: '1px solid #dcdde1', borderRadius: '4px', padding: '15px', position: 'relative', minHeight: '150px' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7f8c8d', marginBottom: '40px' }}>AUTHORIZED SIGNATURE</p>
                            <div style={{ textAlign: 'center', position: 'absolute', bottom: '20px', left: '0', userSelect: 'none', width: '100%', zIndex: 2 }}>
                                <div style={{ height: '1px', background: '#2c3e50', width: '80%', margin: '0 auto 10px auto' }}></div>
                                <p style={{ fontSize: '0.8rem', fontWeight: 800 }}>{company.name}</p>
                            </div>
                            {company.stampUrl && (
                                <img
                                    src={company.stampUrl}
                                    alt="Stamp"
                                    style={{
                                        position: 'absolute',
                                        right: '5%',
                                        bottom: '5px',
                                        width: '320px',
                                        height: 'auto',
                                        opacity: 0.65,
                                        zIndex: 1,
                                        transform: 'rotate(-2deg)',
                                        pointerEvents: 'none'
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Appendix Page for Attachments */}
                {(printData.attach1 || printData.attach2 || printData.attach3) && (
                    <div className="appendix-page">
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '2px', margin: '0 0 30px 0', color: '#2c3e50', textAlign: 'center' }}>ATTACHMENTS</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                            {[1, 2, 3].map(n => {
                                const attachUrl = (printData as any)[`attach${n}`];
                                const attachText = (printData as any)[`attacht${n}`];
                                return attachUrl && (
                                    <div key={n} className="attach-item">
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 15px 0', color: '#353b48' }}>Attachment {n}</h3>
                                        <img src={attachUrl} alt={`Attachment ${n}`} className="attach-img" />
                                        {attachText && <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: '1.5' }}>{attachText}</p>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="no-print" style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '15px', zIndex: 100 }}>
                    <button onClick={() => setView('list')} style={{ background: '#2c3e50', color: 'white', padding: '12px 25px', borderRadius: '30px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                        <ArrowLeft size={18} /> Exit
                    </button>
                    <button onClick={() => {
                        const originalTitle = document.title;
                        document.title = `${printData.date || new Date().toISOString().split('T')[0]}_발주서_${printData.no}`;
                        window.print();
                        document.title = originalTitle;
                    }} style={{ background: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)', color: 'white', padding: '12px 35px', borderRadius: '30px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, boxShadow: '0 4px 15px rgba(211,84,0,0.3)' }}>
                        <Printer size={18} /> Print Purchase Order
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                        <div style={{ padding: '8px', background: 'rgba(230,126,34,0.1)', borderRadius: '10px' }}>
                            <ShoppingCart size={24} style={{ color: '#e67e22' }} />
                        </div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>Purchase Orders</h2>
                    </div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '1rem' }}>Procurement management and supply chain tracking</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => setIsQuotePickerOpen(true)}
                        style={{ background: 'rgba(0,112,243,0.1)', border: '1px solid rgba(0,112,243,0.3)', padding: '0.8rem 1.5rem', borderRadius: '14px', color: '#0070f3', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                    >
                        <ShoppingCart size={18} /> 견적 불러오기 (자동입력)
                    </button>
                    {view === 'list' && (
                        <button onClick={() => {
                            const newNo = 'PO' + new Date().toISOString().substring(0, 10).replace(/-/g, '') + '-' + Math.floor(Date.now() / 1000).toString().slice(-4);
                            setForm({
                                no: newNo,
                                date: new Date().toISOString().substring(0, 10),
                                supplier: '',
                                currency: 'KRW',
                                generalInfo: '',
                                specialNotes: '',
                                attach1: '',
                                attach2: '',
                                attach3: '',
                                attacht1: '',
                                attacht2: '',
                                attacht3: '',
                                root: '',
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
                        }} style={{ background: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)', border: 'none', padding: '0.8rem 1.8rem', borderRadius: '14px', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(211,84,0,0.3)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            <Plus size={20} /> Create New P.O
                        </button>
                    )}
                </div>
            </header>

            {view === 'create' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Customer PO Root Buffer Section */}
                    <div className="glass" style={{ padding: '1.5rem 2.5rem', border: '1px solid rgba(230,126,34,0.3)', background: 'rgba(230,126,34,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ padding: '12px', background: 'rgba(230,126,34,0.2)', borderRadius: '12px' }}>
                                <FileText size={24} style={{ color: '#e67e22' }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: '0 0 4px 0' }}>Customer P.O (Reference Source)</h3>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>가급적 고객사 발주서를 먼저 업로드하여 데이터의 근거를 확보해 주세요. (내부 보관용)</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <button
                                onClick={() => setIsQuotePickerOpen(true)}
                                style={{ background: 'rgba(0,112,243,0.1)', border: '1px solid rgba(0,112,243,0.3)', padding: '10px 20px', borderRadius: '12px', color: '#0070f3', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <ShoppingCart size={18} /> 견적 불러오기 (자동입력)
                            </button>
                            {form.root ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,255,136,0.1)', padding: '8px 15px', borderRadius: '10px', border: '1px solid rgba(0,255,136,0.2)' }}>
                                    <CheckCircle size={16} style={{ color: '#00ff88' }} />
                                    <span style={{ fontSize: '0.85rem', color: '#00ff88', fontWeight: 600 }}>File Attached</span>
                                    <button onClick={() => setForm({ ...form, root: '' })} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', marginLeft: '5px' }}>×</button>
                                </div>
                            ) : (
                                <button onClick={() => setIsRootModalOpen(true)} style={{ background: '#e67e22', border: 'none', padding: '10px 25px', borderRadius: '12px', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(230,126,34,0.3)' }}>
                                    Click to Upload Reference
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="glass" style={{ padding: '2.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.25rem', marginBottom: '2.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>P.O Number</label>
                                <input value={form.no} readOnly style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, cursor: 'not-allowed' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Issue Date</label>
                                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.8rem', color: 'white', colorScheme: 'dark' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Supplier (Vender)</label>
                                <select value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.8rem', color: 'white', fontWeight: 600 }}>
                                    <option value="">-- Select Supplier --</option>
                                    {suppliers.map(s => <option key={s.id} value={s.properties.ClientName.title[0].plain_text}>{s.properties.ClientName.title[0].plain_text}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Currency</label>
                                <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.8rem', color: '#e67e22', fontWeight: 800 }}>
                                    <option value="KRW">KRW (₩)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="RMB">RMB (¥)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Shipping Condition</label>
                                <input value={form.generalInfo} onChange={e => setForm({ ...form, generalInfo: e.target.value })} placeholder="e.g. FOB China" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.8rem', color: 'white' }} />
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto', marginBottom: '2.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1600px' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <th style={{ padding: '15px' }}>Product</th>
                                        <th style={{ padding: '15px' }}>Description/Detail</th>
                                        <th style={{ padding: '15px', width: '90px' }}>Volt</th>
                                        <th style={{ padding: '15px', width: '90px' }}>Watt</th>
                                        <th style={{ padding: '15px', width: '90px' }}>Eff</th>
                                        <th style={{ padding: '15px', width: '100px' }}>Lumen</th>
                                        <th style={{ padding: '15px', width: '100px' }}>CCT</th>
                                        <th style={{ padding: '15px', width: '90px' }}>Unit</th>
                                        <th style={{ padding: '15px', width: '120px', textAlign: 'right' }}>Cost</th>
                                        <th style={{ padding: '15px', width: '80px', textAlign: 'right' }}>Qty</th>
                                        <th style={{ padding: '15px', width: '140px', textAlign: 'right' }}>Amount</th>
                                        <th style={{ padding: '15px' }}>Remarks</th>
                                        <th style={{ padding: '15px', width: '40px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {form.items.map((it, idx) => (
                                        <tr key={it.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '12px' }}>
                                                <input value={it.product} onClick={() => { setActiveIdx(idx); setIsPickerOpen(true); }} readOnly placeholder="Select Product..." style={{ width: '100%', background: 'rgba(230,126,34,0.1)', border: '1px dashed rgba(230,126,34,0.3)', color: '#e67e22', fontWeight: 700, cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }} />
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
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: '#e67e22' }}>
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
                                                <button onClick={() => setForm({ ...form, items: form.items.filter(item => item.id !== it.id) })} style={{ color: '#ff4d4f', opacity: 0.5, border: 'none', background: 'transparent', cursor: 'pointer' }}>
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
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.8rem' }}>Purchase Notes / Terms</label>
                                <textarea value={form.specialNotes} onChange={e => setForm({ ...form, specialNotes: e.target.value })} placeholder="Enter specific ordering conditions or quality requirements..." style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '1.2rem', color: 'white', height: '140px', resize: 'none', lineHeight: '1.6', fontSize: '0.9rem' }} />

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
                                            }} onClick={() => !(form as any)[`attach${n}`] && document.getElementById(`file-po-${n}`)?.click()}>
                                                {(form as any)[`attach${n}`] ? (
                                                    <img src={(form as any)[`attach${n}`]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <label style={{ cursor: 'pointer', textAlign: 'center' }}>
                                                        <Plus size={24} style={{ color: 'rgba(255,255,255,0.2)' }} />
                                                        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>Upload Image</p>
                                                        <input type="file" hidden onChange={e => handleFileUpload(e, `attach${n}`)} disabled={!!uploading} />
                                                    </label>
                                                )}
                                                {uploading === `attach${n}` && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>Uploading...</div>}
                                                {(form as any)[`attach${n}`] && (
                                                    <button onClick={() => setForm({ ...form, [`attach${n}`]: '' })} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(255,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>×</button>
                                                )}
                                            </div>
                                            <input
                                                placeholder="Purpose/Instruction..."
                                                value={(form as any)[`attacht${n}`]}
                                                onChange={e => setForm({ ...form, [`attacht${n}`]: e.target.value })}
                                                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.75rem', color: 'white' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{ background: 'rgba(230,126,34,0.05)', border: '1px solid rgba(230,126,34,0.1)', borderRadius: '24px', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
                                <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '10px' }}>Total Purchase Amount</p>
                                <h3 style={{ fontSize: '3.5rem', fontWeight: 950, color: '#e67e22', margin: 0, letterSpacing: '-2px' }}>
                                    {getCurrencySymbol(form.currency)}{form.items.reduce((acc, it) => acc + (it.qty * it.unitPrice), 0).toLocaleString()}
                                </h3>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'flex-end', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <button onClick={() => setView('list')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem 2.5rem', borderRadius: '14px', color: 'white', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleSave} style={{ background: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)', border: 'none', padding: '1rem 4rem', borderRadius: '14px', color: 'white', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(211,84,0,0.4)' }}>
                                {editMode ? 'Update P.O' : 'Save & Issue P.O'}
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
                                placeholder="Search by P.O No or Supplier..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem 1rem 1rem 3.2rem', borderRadius: '16px', color: 'white', fontSize: '0.95rem' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ padding: '10px 15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                                Active Orders: <span style={{ color: '#e67e22', fontWeight: 700 }}>{filteredPOs.length}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    <th style={{ padding: '1.2rem' }}>P.O Reference</th>
                                    <th style={{ padding: '1.2rem' }}>Order Date</th>
                                    <th style={{ padding: '1.2rem' }}>Supplier Name</th>
                                    <th style={{ padding: '1.2rem', textAlign: 'right' }}>Order Total</th>
                                    <th style={{ padding: '1.2rem', width: '180px', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} style={{ padding: '5rem', textAlign: 'center', opacity: 0.5 }}>Loading procurement data...</td></tr>
                                ) : filteredPOs.length === 0 ? (
                                    <tr><td colSpan={5} style={{ padding: '5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No purchase orders found.</td></tr>
                                ) : filteredPOs.map((p) => (
                                    <tr key={p.pageId} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '1.5rem 1.2rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e67e22' }}></div>
                                                <span style={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>{p.no}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.5rem 1.2rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>{p.date}</td>
                                        <td style={{ padding: '1.5rem 1.2rem' }}>
                                            <div style={{ fontWeight: 700, color: 'white', marginBottom: '4px' }}>{p.supplier}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}><Package size={10} /> {p.items.length} SKUs</div>
                                        </td>
                                        <td style={{ padding: '1.5rem 1.2rem', textAlign: 'right' }}>
                                            <div style={{ fontWeight: 950, color: '#e67e22', fontSize: '1.1rem' }}>{getCurrencySymbol(p.currency)}{p.totalAmount.toLocaleString()}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Status: Issued</div>
                                        </td>
                                        <td style={{ padding: '1.5rem 1.2rem' }}>
                                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                                <button onClick={() => handlePrint(p)} style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: 'white', cursor: 'pointer' }}><Printer size={18} /></button>
                                                <button onClick={() => handleEdit(p)} style={{ padding: '10px', background: 'rgba(230,126,34,0.1)', border: '1px solid rgba(230,126,34,0.1)', borderRadius: '12px', color: '#e67e22', cursor: 'pointer' }}><ChevronRight size={18} /></button>
                                                <button onClick={async () => {
                                                    if (!validatePeriod(p.date)) return;
                                                    if (confirm('Are you sure you want to delete this order?')) { for (const it of p.items) await notionDelete(it.id.toString()); fetchInitialData(); }
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
            <QuotePicker isOpen={isQuotePickerOpen} onClose={() => setIsQuotePickerOpen(false)} onSelect={onQuoteSelect} />

            <Modal isOpen={isRootModalOpen} onClose={() => setIsRootModalOpen(false)} title="Reference Document Upload">
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <div style={{ padding: '20px', background: 'rgba(230,126,34,0.1)', borderRadius: '20px', display: 'inline-flex', marginBottom: '20px' }}>
                        <FileText size={48} style={{ color: '#e67e22' }} />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white', marginBottom: '10px' }}>고객사 발주서 업로드</h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: '1.6', marginBottom: '30px' }}>
                        발주서 작성의 근거가 되는 고객사 발주서(Reference PO)를 업로드해 주세요.<br />
                        업로드된 파일은 내부 관리용으로만 사용되며 출력물에는 포함되지 않습니다.
                    </p>

                    <div style={{ padding: '40px', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '20px', position: 'relative', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }} onClick={() => document.getElementById('root-upload-input')?.click()}>
                        {uploading === 'root' ? (
                            <div style={{ color: '#e67e22', fontWeight: 700 }}>Uploading...</div>
                        ) : form.root ? (
                            <div style={{ color: '#00ff88', fontWeight: 700 }}>
                                <CheckCircle size={32} style={{ margin: '0 auto 10px auto' }} />
                                발주서 업로드 완료
                            </div>
                        ) : (
                            <>
                                <Plus size={32} style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto 10px auto' }} />
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>클릭하여 파일 선택 (PDF, JPG, PNG 등)</div>
                            </>
                        )}
                        <input id="root-upload-input" type="file" hidden onChange={e => {
                            handleFileUpload(e, 'root');
                            setTimeout(() => setIsRootModalOpen(false), 2000);
                        }} disabled={!!uploading} />
                    </div>

                    <button onClick={() => setIsRootModalOpen(false)} style={{ marginTop: '30px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 40px', borderRadius: '14px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                        {form.root ? 'Close' : 'Cancel'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
