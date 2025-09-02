const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const logger = require('../config/logger');

class FileProcessingService {
    constructor() {
        this.limits = {
            maxFileSize: 10 * 1024 * 1024, // 10MB
            maxTextLength: 100000,
            minTextLength: 50
        };
    }

    validateFile(file) {
        if (!file) throw new Error('Nenhum arquivo fornecido');
        if (file.size > this.limits.maxFileSize) {
            throw new Error('Arquivo muito grande. Tamanho máximo: 10MB');
        }
        return true;
    }

    cleanText(text) {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    async extractText(file) {
        this.validateFile(file);
        const { buffer, mimetype, originalname } = file;
        
        console.log(`🔄 Processando arquivo: ${originalname} (${mimetype})`);
        
        let extractedText;
        
        try {
            switch (mimetype) {
                case 'application/pdf':
                    const pdfData = await pdf(buffer);
                    extractedText = pdfData.text;
                    console.log(`✅ PDF processado: ${extractedText.length} caracteres`);
                    break;
                    
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    const docxResult = await mammoth.extractRawText({ buffer });
                    extractedText = docxResult.value;
                    console.log(`✅ DOCX processado: ${extractedText.length} caracteres`);
                    break;
                    
                case 'text/plain':
                case 'text/markdown':
                    extractedText = buffer.toString('utf-8');
                    console.log(`✅ Texto processado: ${extractedText.length} caracteres`);
                    break;
                    
                case 'image/jpeg':
                case 'image/jpg':
                case 'image/png':
                case 'image/webp':
                    console.log('🔍 Iniciando OCR...');
                    const startTime = Date.now();
                    const { data: { text } } = await Tesseract.recognize(buffer, 'por');
                    const processingTime = Date.now() - startTime;
                    extractedText = text;
                    console.log(`✅ OCR concluído em ${processingTime}ms: ${extractedText.length} caracteres`);
                    break;
                    
                default:
                    throw new Error(`Tipo de arquivo não suportado: ${mimetype}`);
            }

            // Validar texto extraído
            if (!extractedText || extractedText.trim().length < this.limits.minTextLength) {
                throw new Error(`Texto extraído é muito curto (mínimo ${this.limits.minTextLength} caracteres)`);
            }

            // Limpar e processar texto
            const cleanedText = this.cleanText(extractedText);
            const wasOptimized = cleanedText.length > this.limits.maxTextLength;
            const finalText = wasOptimized 
                ? cleanedText.substring(0, this.limits.maxTextLength) + '...'
                : cleanedText;
            
            console.log(`📊 Processamento concluído: ${originalname}`);
            console.log(`   - Texto original: ${extractedText.length} chars`);
            console.log(`   - Texto final: ${finalText.length} chars`);
            console.log(`   - Foi otimizado: ${wasOptimized ? 'Sim' : 'Não'}`);
            
            return {
                text: finalText,
                originalLength: extractedText.length,
                wasOptimized,
                processingInfo: {
                    filename: originalname,
                    mimetype,
                    extractedAt: new Date().toISOString()
                }
            };
            
        } catch (error) {
            console.error(`❌ Erro ao processar ${originalname}:`, error.message);
            throw new Error(`Erro ao processar ${originalname}: ${error.message}`);
        }
    }

    async cleanup() {
        console.log('🧹 FileProcessingService cleanup executado');
    }
}

module.exports = new FileProcessingService();