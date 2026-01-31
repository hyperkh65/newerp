'use client';

import React, { useState, useEffect } from 'react';
import { Search, FileText, X, Check, Clock } from 'lucide-react';
import Modal from './Modal';
import { notionQuery, DB_QUOTES } from '@/lib/notion';

interface QuotePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (quote: any) => void;
}

export default function QuotePicker({ isOpen, onClose, onSelect }: QuotePickerProps) {
    const [quotes, setQuotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchQuotes();
        }
    }, [isOpen]);

    const fetchQuotes = async () => {
        try {
            setLoading(true);
            const res = await notionQuery(DB_QUOTES, {
                sorts: [{ property: 'Date', direction: 'descending' }]
            });

            const grouped: { [key: string]: any } = {};
            res.results.forEach((r: any) => {
                const props = r.properties;
                const no = props.EstimateNo1?.title?.[0]?.plain_text || props.EstimateNo?.rich_text?.[0]?.plain_text || 'Unknown';
                if (!grouped[no]) {
                    grouped[no] = {
                        no,
                        date: props.Date?.date?.start || '-',
                        client: props.Client?.rich_text?.[0]?.plain_text || props.Client?.title?.[0]?.plain_text || '-',
                        currency: props.Currency?.rich_text?.[0]?.plain_text || props.Currency?.select?.name || 'KRW',
                        items: []
                    };
                }
                grouped[no].items.push({
                    product: props.Product?.rich_text?.[0]?.plain_text || '-',
                    description: props.Description?.rich_text?.[0]?.plain_text || '',
                    voltage: props.Voltage?.rich_text?.[0]?.plain_text || '-',
                    watts: props.Watts?.rich_text?.[0]?.plain_text || '-',
                    luminousEff: props.LuminousEff?.rich_text?.[0]?.plain_text || '-',
                    lumenOutput: props.LumenOutput?.rich_text?.[0]?.plain_text || '-',
                    cct: props.CCT?.rich_text?.[0]?.plain_text || '-',
                    unit: props.Unit?.select?.name || 'PCS',
                    qty: props.Qty?.number || 0,
                    // Prices are deliberately not used for auto-fill as per user request
                });
            });

            setQuotes(Object.values(grouped));
        } catch (e) {
            console.error('Failed to fetch quotes:', e);
        } finally {
            setLoading(false);
        }
    };

    const filtered = quotes.filter(q =>
        q.no.toLowerCase().includes(search.toLowerCase()) ||
        q.client.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="견적 불러오기 (Import from Quote)" size="lg">
            <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '20px', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                    <input
                        placeholder="전공 번호 또는 업체명으로 검색..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 12px 12px 45px', color: 'white' }}
                    />
                </div>

                <div style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>견적 데이터를 불러오는 중...</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>검색 결과가 없습니다.</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, background: '#1a1a1a', zIndex: 1 }}>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textAlign: 'left' }}>
                                    <th style={{ padding: '15px' }}>Date</th>
                                    <th style={{ padding: '15px' }}>Quote No</th>
                                    <th style={{ padding: '15px' }}>Client</th>
                                    <th style={{ padding: '15px', textAlign: 'right' }}>Items</th>
                                    <th style={{ padding: '15px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((q, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '15px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>{q.date}</td>
                                        <td style={{ padding: '15px' }}>
                                            <div style={{ fontWeight: 700, color: 'white' }}>{q.no}</div>
                                        </td>
                                        <td style={{ padding: '15px', fontSize: '0.9rem', color: 'white' }}>{q.client}</td>
                                        <td style={{ padding: '15px', textAlign: 'right', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>{q.items.length} SKUs</td>
                                        <td style={{ padding: '15px', textAlign: 'right' }}>
                                            <button
                                                onClick={() => onSelect(q)}
                                                style={{ background: 'var(--accent-gradient)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                불러오기
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </Modal>
    );
}
