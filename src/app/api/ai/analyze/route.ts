import { NextRequest, NextResponse } from 'next/server';
import { extractProducts, extractClientInfo } from '@/lib/aiService';

export const maxDuration = 60; // Set timeout to 60s for AI ops

export async function POST(request: NextRequest) {
    try {
        console.log('🚀 API Route: /api/ai/analyze caught request');

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const text = formData.get('text') as string;
        const imagesStr = formData.get('images') as string;
        const analysisType = formData.get('type') as string; // 'product' or 'client'

        console.log('📂 Form Data:', {
            fileType: file?.type,
            fileSize: file?.size,
            analysisType: analysisType || 'product'
        });

        // Prepare attachments
        let attachments: { data: string, mimeType: string }[] = [];

        // 1. Process File from FormData (Primary source)
        if (file) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const base64Data = buffer.toString('base64');

                // Determine mime type
                let mimeType = file.type;
                if (!mimeType || mimeType === 'application/octet-stream') {
                    if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
                    else if (file.name.match(/\.(jpg|jpeg)$/i)) mimeType = 'image/jpeg';
                    else if (file.name.endsWith('.png')) mimeType = 'image/png';
                }

                console.log(`📎 Processing file: ${file.name} (${mimeType})`);

                attachments.push({
                    data: base64Data,
                    mimeType: mimeType
                });
            } catch (e) {
                console.error('❌ File read failed:', e);
            }
        }

        // 2. Process Client-side parsed images (Legacy/Excel support)
        if (imagesStr) {
            try {
                const parsedImages: string[] = JSON.parse(imagesStr);
                parsedImages.forEach(imgData => {
                    attachments.push({
                        data: imgData,
                        mimeType: 'image/jpeg' // Assumed default from client
                    });
                });
                console.log(`🖼️ Added ${parsedImages.length} additional images`);
            } catch (e) {
                console.error('❌ JSON Parse Error for images:', e);
            }
        }

        if (attachments.length === 0 && !text) {
            return NextResponse.json(
                { error: '분석할 파일이나 텍스트가 없습니다.' },
                { status: 400 }
            );
        }

        // Branch logic based on type
        if (analysisType === 'client') {
            console.log('🤖 Calling extractClientInfo (Business Registration)...');
            try {
                const result = await extractClientInfo(text || '', attachments);
                console.log('✅ AI Client Analysis success');
                return NextResponse.json(result);
            } catch (error: any) {
                console.error('❌ Client extraction failed:', error);
                return NextResponse.json({ error: `AI 분석 에러: ${error.message}` }, { status: 500 });
            }
        } else {
            // Default: Product Extraction
            console.log('🤖 Calling extractProducts...');
            try {
                const result = await extractProducts(text || '', attachments);
                console.log('✅ AI Analysis Result:', result.products.length, 'products found');
                return NextResponse.json(result);
            } catch (aiError: any) {
                console.error('❌ extractProducts failed:', aiError);
                return NextResponse.json(
                    { error: `AI 분석 에러: ${aiError.message || JSON.stringify(aiError)}` },
                    { status: 500 }
                );
            }
        }

    } catch (error: any) {
        console.error('💥 Critical API Error:', error);
        return NextResponse.json(
            { error: `서버 내부 오류: ${error.message}` },
            { status: 500 }
        );
    }
}
