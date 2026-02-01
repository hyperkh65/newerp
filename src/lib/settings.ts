import { COMPANY_INFO } from './notion';

export interface CompanySettings {
    name: string;
    ceo: string;
    bizNo: string;
    address: string;
    tel: string;
    fax: string;
    email: string;
    bank: string;
    bankForeign1: string;
    bankForeign2: string;
    logoUrl: string;
    stampUrl: string;
    bizType: string;
    bizItem: string;
}

export const getSettings = (): CompanySettings => {
    const defaults = {
        ...COMPANY_INFO,
        bizType: '도소매',
        bizItem: '전자부품, 조명기구'
    };
    if (typeof window === 'undefined') return defaults;
    const saved = localStorage.getItem('ynk_erp_settings');
    if (saved) {
        try {
            return { ...defaults, ...JSON.parse(saved) };
        } catch (e) {
            return defaults;
        }
    }
    return defaults;
};

export const saveSettings = (settings: CompanySettings) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('ynk_erp_settings', JSON.stringify(settings));
    }
};
