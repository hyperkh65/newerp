'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Package,
    Receipt,
    UserCircle,
    Settings,
    Menu,
    ChevronLeft,
    FileText,
    Briefcase,
    Box,
    Ship,
    TrendingUp
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { clsx } from 'clsx';

const menuItems = [
    { name: '대시보드', icon: LayoutDashboard, href: '/' },
    { name: '인사 관리', icon: Users, href: '/hr' },
    { name: '거래처 관리', icon: Briefcase, href: '/clients' },
    { name: '제품 관리', icon: Box, href: '/products' },
    { name: '물류 / 재고', icon: Package, href: '/scm' },
    { name: '견적 / 계약', icon: FileText, href: '/quotes' },
    { name: '발주 관리', icon: Receipt, href: '/purchase-orders' },
    { name: '수입 관리', icon: Ship, href: '/imports' },
    { name: '회계 / 정산', icon: Receipt, href: '/accounting' },
    { name: '매출 관리', icon: TrendingUp, href: '/crm' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = React.useState(false);

    return (
        <aside
            className={styles.sidebar}
            style={{ width: collapsed ? '80px' : '260px' }}
        >
            <div className={styles.logoArea}>
                {!collapsed && (
                    <span className={`${styles.logoText} gradient-text`}>YNK ERP System</span>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={styles.collapseButton}
                >
                    {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            <nav className={styles.nav}>
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(styles.navItem, isActive && styles.active)}
                        >
                            <item.icon size={20} />
                            {!collapsed && <span>{item.name}</span>}
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.footer}>
                <Link
                    href="/settings"
                    className={clsx(styles.navItem, pathname === '/settings' && styles.active)}
                >
                    <Settings size={20} />
                    {!collapsed && <span>시스템 설정</span>}
                </Link>
            </div>
        </aside>
    );
}
