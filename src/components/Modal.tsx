'use client';

import React from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    if (!isOpen) return null;

    const sizeClass = styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`];

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div
                className={`${styles.modalContent} ${sizeClass}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.modalHeader}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{title}</h3>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className={styles.modalBody}>
                    {children}
                </div>
            </div>
        </div>
    );
}
