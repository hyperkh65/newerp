import React, { useState, useRef } from 'react';
import { Upload, FileText, X, BrainCircuit, Loader2 } from 'lucide-react';
import { parseFile, validateFile } from '@/lib/fileParser';
import { AIAnalysisResult } from '@/lib/aiService';

interface AIAssistantProps {
    onAnalyzeComplete: (result: AIAnalysisResult) => void;
}

export default function AIAssistant({ onAnalyzeComplete }: AIAssistantProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) await processFile(file);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) await processFile(file);
    };

    const processFile = async (file: File) => {
        // Validate
        const validation = validateFile(file);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }

        try {
            setAnalyzing(true);
            setProgress(10);
            setStatus('파일 읽는 중...');

            // 1. Parse File Locally
            const parsedData = await parseFile(file);

            setProgress(40);
            setStatus('AI 분석 중...');

            // 2. Send to AI API
            const formData = new FormData();
            formData.append('file', file);

            // Only send parsed text/images if it's NOT a raw image file
            // (Image files are handled directly by the server to save bandwidth)
            if (!file.type.startsWith('image/')) {
                formData.append('text', parsedData.text);
                if (parsedData.images.length > 0) {
                    formData.append('images', JSON.stringify(parsedData.images));
                }
            }

            const response = await fetch('/api/ai/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                // Parse detailed error message
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `서버 오류 (${response.status})`);
            }

            setProgress(90);
            setStatus('결과 처리 중...');

            const result: AIAnalysisResult = await response.json();

            setProgress(100);
            setStatus('완료!');

            // Short delay to show 100%
            setTimeout(() => {
                setAnalyzing(false);
                setProgress(0);
                setStatus('');
                onAnalyzeComplete(result);
            }, 500);

        } catch (error: any) {
            console.error('Processing failed:', error);
            // Show detailed error in alert
            alert(`분석 실패: ${error.message}`);
            setAnalyzing(false);
            setProgress(0);
            setStatus('');
        }
    };

    return (
        <div style={{
            width: '280px', // Fixed width sidebar
            background: 'rgba(255, 255, 255, 0.03)',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 10
        }}>
            {/* Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{
                        width: '32px', height: '32px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #0070f3, #00dfd8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <BrainCircuit size={18} color="white" />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>AI Assistant</h3>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                    견적서나 사양서를 업로드하면 AI가 자동으로 제품 정보를 추출합니다.
                </p>
            </div>

            {/* Content */}
            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Upload Zone */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        border: `2px dashed ${isDragging ? '#00dfd8' : 'rgba(255,255,255,0.2)'}`,
                        borderRadius: '12px',
                        background: isDragging ? 'rgba(0, 223, 216, 0.1)' : 'rgba(255,255,255,0.02)',
                        padding: '2rem 1rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        hidden
                        accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.csv"
                    />

                    {analyzing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <Loader2 size={32} className="spin" color="#00dfd8" />
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${progress}%`, height: '100%', background: '#00dfd8', transition: 'width 0.3s' }} />
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#00dfd8' }}>{status}</p>
                        </div>
                    ) : (
                        <>
                            <Upload size={32} color={isDragging ? '#00dfd8' : 'rgba(255,255,255,0.3)'} style={{ marginBottom: '10px' }} />
                            <p style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px' }}>파일 업로드</p>
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                PDF, Excel, 이미지<br />드래그 앤 드롭
                            </p>
                        </>
                    )}
                </div>

                {/* Features List */}
                <div style={{ marginTop: 'auto' }}>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '10px' }}>지원 기능</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#0070f3' }} /> 자동 제품 추출 (GPT-4o)</li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#00dfd8' }} /> 이미지 분석 및 스펙 정리</li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#7928ca' }} /> 일괄 등록 및 편집</li>
                    </ul>
                </div>
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
