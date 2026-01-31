import * as XLSX from 'xlsx';

export interface ParsedFile {
    text: string;
    images: string[];
    type: string;
}

/**
 * Parse Excel file
 */
export async function parseExcel(file: File): Promise<ParsedFile> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });

                let allText = '';

                // Process all sheets
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    allText += `\n\n=== Sheet: ${sheetName} ===\n`;
                    jsonData.forEach((row: any) => {
                        allText += row.join('\t') + '\n';
                    });
                });

                resolve({
                    text: allText,
                    images: [],
                    type: 'excel'
                });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = reject;
        reader.readAsBinaryString(file);
    });
}

/**
 * Parse PDF file (client-side)
 */
export async function parsePDF(file: File): Promise<ParsedFile> {
    // For PDF parsing, we'll send to server-side API
    // This is a placeholder that returns the file for server processing
    return {
        text: '', // Will be filled by server
        images: [],
        type: 'pdf'
    };
}

/**
 * Parse image file
 */
export async function parseImage(file: File): Promise<ParsedFile> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const base64 = (e.target?.result as string).split(',')[1];
            resolve({
                text: `[Image file: ${file.name}]`,
                images: [base64],
                type: 'image'
            });
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Parse CSV file
 */
export async function parseCSV(file: File): Promise<ParsedFile> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const text = e.target?.result as string;
            resolve({
                text,
                images: [],
                type: 'csv'
            });
        };

        reader.onerror = reject;
        reader.readAsText(file);
    });
}

/**
 * Parse text file
 */
export async function parseText(file: File): Promise<ParsedFile> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const text = e.target?.result as string;
            resolve({
                text,
                images: [],
                type: 'text'
            });
        };

        reader.onerror = reject;
        reader.readAsText(file);
    });
}

/**
 * Resizes and compresses an image file to a base64 string using HTML Canvas.
 * Max width/height is 1500px, JPEG format with 0.7 quality.
 */
const imageFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 1500; // Resize to max 1500px to avoid payload limits

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Compress to JPEG with 0.7 quality
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                // Remove prefix "data:image/jpeg;base64,"
                resolve(dataUrl.split(',')[1]);
            };
            img.onerror = reject;
            if (e.target?.result) {
                img.src = e.target.result as string;
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * Main file parser - routes to appropriate parser
 */
export async function parseFile(file: File): Promise<ParsedFile> {
    const extension = file.name.split('.').pop()?.toLowerCase();

    switch (extension) {
        case 'xlsx':
        case 'xls':
            return parseExcel(file);

        case 'pdf':
            return parsePDF(file);

        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
            return parseImage(file);

        case 'csv':
            return parseCSV(file);

        case 'txt':
            return parseText(file);

        default:
            throw new Error(`Unsupported file type: ${extension}`);
    }
}

/**
 * Validate file before processing
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'text/csv',
        'text/plain'
    ];

    if (file.size > maxSize) {
        return { valid: false, error: '파일 크기는 10MB를 초과할 수 없습니다.' };
    }

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|pdf|jpg|jpeg|png|gif|webp|csv|txt)$/i)) {
        return { valid: false, error: '지원하지 않는 파일 형식입니다.' };
    }

    return { valid: true };
}
