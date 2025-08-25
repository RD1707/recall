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
    
    const prompt = `
        Baseado no texto a seguir, gere ${count} flashcards no formato de um array JSON.
        ${promptInstruction}
        A pergunta deve ser clara e direta, e a resposta deve ser concisa.
        Não inclua nenhuma explicação ou texto adicional fora do array JSON.

        Texto: "${textContent}"

        JSON:
    `;

    try {
        const response = await cohere.generate({
            model: 'command-r', 
            prompt: prompt,
            max_tokens: 1500, // Aumentado para acomodar mais cards
            temperature: 0.4, 
        });

        const jsonResponseText = response.generations[0].text.trim();

        const flashcards = JSON.parse(jsonResponseText);

        if (!Array.isArray(flashcards)) {
            throw new Error("A resposta da IA não é um array JSON válido.");
        }

        return flashcards;

    } catch (error) {
        console.error("Erro ao gerar ou processar flashcards da Cohere:", error);
        return null;
    }
};

module.exports = {
    generateFlashcardsFromText,
};