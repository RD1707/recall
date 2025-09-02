const FileProcessingService = require('./src/services/fileProcessingService');

async function testFileProcessing() {
    console.log('🧪 Testando FileProcessingService...\n');

    try {
        const testText = 'Este é um texto de teste para a plataforma Recall com processamento de arquivos DOCX e OCR.';
        const testFile = {
            buffer: Buffer.from(testText, 'utf8'),
            mimetype: 'text/plain',
            originalname: 'teste.txt',
            size: Buffer.byteLength(testText)
        };

        const result = await FileProcessingService.extractText(testFile);
        console.log('✅ Sucesso! Texto extraído:', result.text.substring(0, 100) + '...');
        console.log('📊 Estatísticas:');
        console.log('   - Caracteres originais:', result.originalLength);
        console.log('   - Caracteres finais:', result.text.length);
        console.log('   - Foi otimizado:', result.wasOptimized);
        
    } catch (error) {
        console.log('❌ Erro:', error.message);
    }

    await FileProcessingService.cleanup();
    console.log('\n✅ Teste concluído!');
}

if (require.main === module) {
    testFileProcessing().catch(console.error);
}

module.exports = testFileProcessing;
