'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Mail, Eye, EyeOff, ArrowRight, Shield, Sparkles, Zap } from 'lucide-react';
import { notionQuery, DB_USERS } from '@/lib/notion';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [particles, setParticles] = useState<any[]>([]);

    useEffect(() => {
        // Generate floating particles
        const newParticles = Array.from({ length: 20 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 4 + 2,
            duration: Math.random() * 10 + 10,
            delay: Math.random() * 5
        }));
        setParticles(newParticles);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await notionQuery(DB_USERS, {
                filter: {
                    property: 'Email',
                    title: {
                        equals: email
                    }
                }
            });

            if (!res.results || res.results.length === 0) {
                setError('등록되지 않은 이메일입니다.');
                setLoading(false);
                return;
            }

            const user = res.results[0];
            const storedPasswordHash = user.properties.PasswordHash?.rich_text?.[0]?.plain_text || '';

            if (storedPasswordHash !== password) {
                setError('비밀번호가 일치하지 않습니다.');
                setLoading(false);
                return;
            }

            const userName = user.properties.Name?.rich_text?.[0]?.plain_text || 'User';
            const userRole = user.properties.Role?.select?.name || 'User';

            localStorage.setItem('ynk_erp_user', JSON.stringify({
                email,
                name: userName,
                role: userRole,
                loginTime: new Date().toISOString()
            }));

            router.push('/');
        } catch (err: any) {
            console.error('Login error:', err);
            setError('로그인 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 25%, #2d1b4e 50%, #1a1f3a 75%, #0a0e27 100%)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Animated Gradient Background */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `
                    radial-gradient(circle at 20% 50%, rgba(0, 112, 243, 0.15) 0%, transparent 50%),
                    radial-gradient(circle at 80% 80%, rgba(0, 223, 216, 0.15) 0%, transparent 50%),
                    radial-gradient(circle at 40% 20%, rgba(121, 40, 202, 0.1) 0%, transparent 50%)
                `,
                animation: 'gradientShift 15s ease-in-out infinite'
            }} />

            {/* Floating Particles */}
            {particles.map(p => (
                <div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        background: 'rgba(255, 255, 255, 0.3)',
                        borderRadius: '50%',
                        animation: `float ${p.duration}s ease-in-out infinite`,
                        animationDelay: `${p.delay}s`,
                        boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
                    }}
                />
            ))}

            <style>{`
                @keyframes gradientShift {
                    0%, 100% { opacity: 0.6; transform: scale(1); }
                    50% { opacity: 0.9; transform: scale(1.1); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0) translateX(0); }
                    25% { transform: translateY(-20px) translateX(10px); }
                    50% { transform: translateY(-40px) translateX(-10px); }
                    75% { transform: translateY(-20px) translateX(5px); }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(30px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(0, 112, 243, 0.3), 0 0 40px rgba(0, 223, 216, 0.2); }
                    50% { box-shadow: 0 0 30px rgba(0, 112, 243, 0.5), 0 0 60px rgba(0, 223, 216, 0.3); }
                }
                @keyframes shimmer {
                    0% { background-position: -1000px 0; }
                    100% { background-position: 1000px 0; }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .login-card {
                    animation: slideIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .neon-text {
                    text-shadow: 
                        0 0 10px rgba(0, 223, 216, 0.8),
                        0 0 20px rgba(0, 223, 216, 0.6),
                        0 0 30px rgba(0, 112, 243, 0.4),
                        0 0 40px rgba(0, 112, 243, 0.2);
                }
            `}</style>

            <div className="login-card" style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                maxWidth: '480px',
                padding: '3.5rem',
                background: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(30px)',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '32px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                animation: 'glow 3s ease-in-out infinite'
            }}>
                {/* Logo & Title */}
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100px',
                        height: '100px',
                        background: 'linear-gradient(135deg, #0070f3, #00dfd8, #7928ca)',
                        borderRadius: '24px',
                        marginBottom: '1.5rem',
                        boxShadow: '0 12px 40px rgba(0, 112, 243, 0.4), 0 0 60px rgba(0, 223, 216, 0.3)',
                        position: 'relative',
                        animation: 'glow 2s ease-in-out infinite'
                    }}>
                        <Shield size={50} color="white" style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' }} />
                        <Sparkles size={20} color="white" style={{ position: 'absolute', top: '10px', right: '10px', opacity: 0.8 }} />
                    </div>

                    <h1 className="neon-text" style={{
                        fontSize: '2.5rem',
                        fontWeight: 900,
                        background: 'linear-gradient(135deg, #fff 0%, #00dfd8 50%, #0070f3 100%)',
                        backgroundSize: '200% auto',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '0.5rem',
                        letterSpacing: '2px',
                        animation: 'shimmer 3s linear infinite'
                    }}>
                        YNK ERP
                    </h1>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'linear-gradient(90deg, rgba(0,112,243,0.2), rgba(0,223,216,0.2))',
                        padding: '8px 20px',
                        borderRadius: '20px',
                        border: '1px solid rgba(0, 223, 216, 0.3)',
                        marginBottom: '1rem'
                    }}>
                        <Zap size={16} color="#00dfd8" />
                        <span style={{
                            color: '#00dfd8',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}>
                            Enterprise System
                        </span>
                    </div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '1rem', fontWeight: 500 }}>
                        통합 관리 시스템에 로그인하세요
                    </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Email Input */}
                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            color: 'rgba(255, 255, 255, 0.8)',
                            marginBottom: '0.75rem',
                            letterSpacing: '0.5px'
                        }}>
                            이메일
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={20} style={{
                                position: 'absolute',
                                left: '18px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'rgba(0, 223, 216, 0.6)'
                            }} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                                style={{
                                    width: '100%',
                                    padding: '16px 20px 16px 52px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '2px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '14px',
                                    color: 'white',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'all 0.3s',
                                    fontWeight: 500
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#00dfd8';
                                    e.target.style.boxShadow = '0 0 20px rgba(0, 223, 216, 0.3)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            color: 'rgba(255, 255, 255, 0.8)',
                            marginBottom: '0.75rem',
                            letterSpacing: '0.5px'
                        }}>
                            비밀번호
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={20} style={{
                                position: 'absolute',
                                left: '18px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'rgba(0, 112, 243, 0.6)'
                            }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{
                                    width: '100%',
                                    padding: '16px 52px 16px 52px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '2px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '14px',
                                    color: 'white',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'all 0.3s',
                                    fontWeight: 500
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#0070f3';
                                    e.target.style.boxShadow = '0 0 20px rgba(0, 112, 243, 0.3)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '18px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(255, 255, 255, 0.4)',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'color 0.3s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            padding: '14px',
                            background: 'rgba(255, 59, 48, 0.15)',
                            border: '2px solid rgba(255, 59, 48, 0.4)',
                            borderRadius: '12px',
                            color: '#ff6b6b',
                            fontSize: '0.9rem',
                            textAlign: 'center',
                            fontWeight: 600,
                            boxShadow: '0 0 20px rgba(255, 59, 48, 0.2)'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '18px',
                            background: loading ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #0070f3 0%, #00dfd8 100%)',
                            border: 'none',
                            borderRadius: '14px',
                            color: 'white',
                            fontSize: '1.1rem',
                            fontWeight: 800,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            transition: 'all 0.3s',
                            boxShadow: loading ? 'none' : '0 8px 24px rgba(0, 112, 243, 0.4), 0 0 40px rgba(0, 223, 216, 0.2)',
                            letterSpacing: '1px',
                            textTransform: 'uppercase'
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.currentTarget.style.transform = 'translateY(-3px)';
                                e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 112, 243, 0.5), 0 0 50px rgba(0, 223, 216, 0.3)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = loading ? 'none' : '0 8px 24px rgba(0, 112, 243, 0.4), 0 0 40px rgba(0, 223, 216, 0.2)';
                        }}
                    >
                        {loading ? (
                            <>
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    border: '3px solid rgba(255,255,255,0.3)',
                                    borderTop: '3px solid white',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }} />
                                로그인 중...
                            </>
                        ) : (
                            <>
                                로그인
                                <ArrowRight size={22} />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div style={{
                    marginTop: '2.5rem',
                    paddingTop: '2rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    textAlign: 'center'
                }}>
                    <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.85rem', fontWeight: 500 }}>
                        © 2026 YNK Global. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
