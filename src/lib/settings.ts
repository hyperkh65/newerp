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
}

export const getSettings = (): CompanySettings => {
    if (typeof window === 'undefined') return COMPANY_INFO;
    const saved = localStorage.getItem('ynk_erp_settings');
    if (saved) {
        try {
            return { ...COMPANY_INFO, ...JSON.parse(saved) };
        } catch (e) {
            return COMPANY_INFO;
        }
    }
    return COMPANY_INFO;
};

export const saveSettings = (settings: CompanySettings) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('ynk_erp_settings', JSON.stringify(settings));
    }
};
