const { CohereClient } = require('cohere-ai');

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY,
});

const generateFlashcardsFromText = async (textContent, count = 5, type = 'Pergunta e Resposta') => {
    
    let promptInstruction = '';
    if (type === 'Múltipla Escolha') {
        promptInstruction = `Cada flashcard deve ser um objeto com as chaves "question", "options" (um array de 4 strings), e "answer" (a string da resposta correta).`;
    } else {
        promptInstruction = `Cada flashcard deve ser um objeto com as chaves "question" e "answer".`;
    }
    
    const message = `
        Baseado no texto a seguir, gere ${count} flashcards no formato de um array JSON.
        ${promptInstruction}
        A pergunta deve ser clara e direta, e a resposta deve ser concisa.
        Não inclua nenhuma explicação ou texto adicional fora do array JSON.

        Texto: "${textContent}"

        JSON:
    `;

    try {
        const response = await cohere.chat({
            model: 'command-r', 
            message: message,
            temperature: 0.3, 
        });

        const cleanedResponse = response.text
            .trim()
            .replace(/^```json\s*/, '') 
            .replace(/```$/, '');      

        const flashcards = JSON.parse(cleanedResponse);

        if (!Array.isArray(flashcards)) {
            throw new Error("A resposta da IA não é um array JSON válido.");
        }

        return flashcards;

    } catch (error) {
        console.error("Erro detalhado da API Cohere ao gerar flashcards:", error);
        return null;
    }
};

const getExplanationForFlashcard = async (question, answer) => {
    const message = `
        Com base na seguinte pergunta e resposta de um flashcard, explique o conceito principal de forma clara, concisa e didática, como se fosse para um estudante.
        A explicação deve ter no máximo 3 ou 4 frases. Não comece com "A resposta está correta porque..." ou algo semelhante. Vá direto ao ponto.

        Pergunta: "${question}"
        Resposta: "${answer}"

        Explicação:
    `;

    try {
        const response = await cohere.chat({
            model: 'command-r',
            message: message,
            temperature: 0.5,
        });

        return response.text.trim();

    } catch (error) {
        console.error("Erro ao gerar explicação da Cohere:", error);
        return null;
    }
};

const generateStudyInsight = async (performanceData) => {
    if (!performanceData || performanceData.length === 0) {
        return "Continue a estudar! Ainda não temos dados suficientes para analisar o seu desempenho em detalhe.";
    }

    const topics = performanceData.map(d => `- **${d.deck_title}** (com aproximadamente ${Math.round(d.error_rate)}% de erro)`).join('\n');

    const message = `
        Aja como um tutor de estudos amigável e motivador. Com base nos seguintes dados de desempenho de um utilizador, onde ele está a ter mais dificuldade, gere um insight construtivo e uma sugestão de estudo.
        O texto deve ser curto (2-3 parágrafos), encorajador e prático. Não use jargões.

        Dados de desempenho:
        O utilizador está a errar mais nos seguintes tópicos:
        ${topics}

        Insight Gerado:
    `;

    try {
        const response = await cohere.chat({
            model: 'command-r',
            message: message,
            temperature: 0.6,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Erro ao gerar insight da Cohere:", error);
        return "Não foi possível gerar um insight neste momento. Continue com o bom trabalho!";
    }
};

module.exports = {
    generateFlashcardsFromText,
    getExplanationForFlashcard,
    generateStudyInsight, 
};