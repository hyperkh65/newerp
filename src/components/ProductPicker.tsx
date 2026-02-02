'use client';

import React, { useState, useEffect } from 'react';
import { Search, Box } from 'lucide-react';
import { notionQuery, DB_PRODUCTS } from '@/lib/notion';
import Modal from './Modal';

interface Product {
    id: string;
    code: string;
    name: string;
    category: string;
    maker: string;
    supplier: string;
    detail: string;
    cost: number;
    material: string;
    size: string;
    converter: string;
    image: string;
    voltage?: string;
    watts?: string;
    luminousEff?: string;
    lumenOutput?: string;
    cct?: string;
    specFiles?: { name: string; url: string }[];
    isInventory?: boolean;
}

interface ProductPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (product: Product) => void;
}

export default function ProductPicker({ isOpen, onClose, onSelect }: ProductPickerProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    useEffect(() => {
        if (isOpen) fetchProducts();
    }, [isOpen]);

    async function fetchProducts() {
        try {
            setLoading(true);
            // '재고대상' 체크박스가 있는 것으로 가정하고 필터링 (없으면 전체 로드)
            const res = await notionQuery(DB_PRODUCTS, {
                sorts: [{ property: 'ProductName', direction: 'ascending' }],
                // filter: { property: 'InventoryTarget', checkbox: { equals: true } } // 주석 해제하여 활성화 가능
            });
            const data = res.results.map((r: any) => {
                const p = r.properties;

                // 관련 서류 수집
                const specFiles: { name: string; url: string }[] = [];
                ['FileSpec', 'FileEMI', 'FileEfficiency', 'FileKSKC', 'FileEtc'].forEach(key => {
                    const files = p[key]?.files || [];
                    files.forEach((f: any) => {
                        specFiles.push({ name: f.name || key, url: f.external?.url || f.file?.url });
                    });
                });

                return {
                    id: r.id,
                    code: p.ProductCode?.rich_text?.[0]?.plain_text || '-',
                    name: p.ProductName?.rich_text?.[0]?.plain_text || p.이름?.title?.[0]?.plain_text || '이름 없음',
                    category: p.Category?.rich_text?.[0]?.plain_text || '',
                    maker: p.Maker?.rich_text?.[0]?.plain_text || '',
                    supplier: p.Supplier?.rich_text?.[0]?.plain_text || '',
                    detail: p.Detail?.rich_text?.[0]?.plain_text || '',
                    cost: p.Cost?.number || 0,
                    material: p.Material?.rich_text?.[0]?.plain_text || '',
                    size: p.Size?.rich_text?.[0]?.plain_text || '',
                    converter: p.Converter?.rich_text?.[0]?.plain_text || '',
                    image: p.Image?.files?.[0]?.external?.url || p.Image?.files?.[0]?.file?.url || '',
                    voltage: p.Voltage?.rich_text?.[0]?.plain_text || '-',
                    watts: p.Watts?.rich_text?.[0]?.plain_text || '-',
                    luminousEff: p.LuminousEff?.rich_text?.[0]?.plain_text || '-',
                    lumenOutput: p.LumenOutput?.rich_text?.[0]?.plain_text || '-',
                    cct: p.CCT?.rich_text?.[0]?.plain_text || '-',
                    specFiles,
                    isInventory: p.InventoryTarget?.checkbox === true
                };
            });
            setProducts(data);
        } catch (e) {
            console.error('제품 로드 실패:', e);
        } finally {
            setLoading(false);
        }
    }

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => {
        const s = search.toLowerCase();
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        // 1. Exact match priority
        if (aName === s && bName !== s) return -1;
        if (bName === s && aName !== s) return 1;

        // 2. Starts with priority
        const aStarts = aName.startsWith(s);
        const bStarts = bName.startsWith(s);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;

        return 0;
    });

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="재고 관리 제품 선택" size="lg">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                        <input
                            placeholder="제품명 또는 코드 검색..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 0.6rem 0.6rem 2.2rem', borderRadius: '8px', color: 'white' }}
                        />
                    </div>
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center' }}>제품 정보를 불러오는 중...</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                            {filtered.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => { setSelectedProduct(p); setIsDetailModalOpen(true); }}
                                    className="glass"
                                    style={{
                                        padding: '12px',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        gap: '12px',
                                        alignItems: 'center'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                                >
                                    <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', flexShrink: 0, overflow: 'hidden' }}>
                                        {p.image ? <img src={p.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Box size={24} style={{ margin: '18px', opacity: 0.2 }} />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</h4>
                                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0 0' }}>{p.code}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            {/* Product Detail & Confirmation Modal */}
            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="제품 상세 사양 확인">
                {selectedProduct && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                            <div style={{ width: '180px', height: '180px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', flexShrink: 0 }}>
                                {selectedProduct.image ? <img src={selectedProduct.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Box size={40} style={{ margin: '70px', opacity: 0.1 }} />}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>{selectedProduct.name}</h3>
                                <p style={{ color: '#0070f3', fontWeight: 600, marginBottom: '1rem' }}>{selectedProduct.code}</p>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                                    <div style={{ color: 'rgba(255,255,255,0.5)' }}>제조사: <span style={{ color: 'white' }}>{selectedProduct.maker || '-'}</span></div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)' }}>공급사: <span style={{ color: 'white' }}>{selectedProduct.supplier || '-'}</span></div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)' }}>단가: <span style={{ color: 'white' }}>₩{selectedProduct.cost.toLocaleString()}</span></div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)' }}>재질: <span style={{ color: 'white' }}>{selectedProduct.material || '-'}</span></div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>상세 설명</h4>
                            <div className="glass" style={{ padding: '1rem', borderRadius: '10px', fontSize: '0.85rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>
                                {selectedProduct.detail || '상세 사양 정보가 없습니다.'}
                            </div>
                        </div>

                        {selectedProduct.specFiles && selectedProduct.specFiles.length > 0 && (
                            <div>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>관련 파일 및 사양서</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {selectedProduct.specFiles.map((file, idx) => (
                                        <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', fontSize: '0.75rem', color: 'white', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <Box size={12} /> {file.name}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button onClick={() => setIsDetailModalOpen(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600 }}>닫기</button>
                            <button
                                onClick={() => { onSelect(selectedProduct); setIsDetailModalOpen(false); onClose(); }}
                                style={{ flex: 2, padding: '0.8rem', borderRadius: '12px', background: 'var(--accent-gradient)', color: 'white', fontWeight: 700 }}
                            >
                                이 제품으로 등록
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}
