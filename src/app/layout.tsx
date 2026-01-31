'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { usePathname } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';

    return (
        <html lang="ko">
            <body className={inter.className}>
                {isLoginPage ? (
                    children
                ) : (
                    <div className="layout-wrapper" style={{ display: 'flex', minHeight: '100vh' }}>
                        <Sidebar />
                        <main style={{
                            flex: 1,
                            height: '100vh',
                            overflowY: 'auto',
                            background: 'radial-gradient(circle at top right, rgba(0, 112, 243, 0.05), transparent)'
                        }}>
                            <header style={{
                                padding: '1.5rem 2rem',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                position: 'sticky',
                                top: 0,
                                zIndex: 10,
                                background: 'rgba(0,0,0,0.5)',
                                backdropFilter: 'blur(10px)'
                            }}>
                                <div>
                                    <h1 style={{ fontSize: '1rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.6)' }}>
                                        지능형 경영 통합 시스템
                                    </h1>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{
                                        fontSize: '0.85rem',
                                        color: 'rgba(255,255,255,0.5)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff88' }}></span>
                                        시스템 정상
                                    </div>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: 'var(--accent-gradient)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold'
                                    }}>
                                        AD
                                    </div>
                                </div>
                            </header>
                            <div style={{ padding: '2rem' }}>
                                {children}
                            </div>
                        </main>
                    </div>
                )}
            </body>
        </html>
    );
}
