const OpenAI = require('openai');

/**
 * OpenAI Configuration
 * Handles AI reply generation for reviews
 */

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate AI reply for a review
 * @param {string} reviewText - The review text
 * @param {number} rating - The review rating (1-5)
 * @param {string} businessName - Name of the business
 * @returns {Promise<string>} Generated reply
 */
const generateReply = async (reviewText, rating, businessName = 'our business') => {
    try {
        const prompt = `You are a professional customer service representative for ${businessName}. 
Generate a polite, professional, and personalized response to the following customer review.

Review Rating: ${rating}/5
Review Text: "${reviewText}"

Guidelines:
- Be professional and courteous
- Thank the customer for their feedback
- ${rating >= 4 ? 'Express appreciation for their positive experience' : 'Acknowledge their concerns and show empathy'}
- ${rating < 3 ? 'Apologize for any inconvenience and offer to make things right' : ''}
- Keep the response concise (2-3 sentences)
- Use a warm, friendly tone
- Do not use generic templates

Generate only the reply text, without any labels or prefixes.`;

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a professional customer service representative who writes thoughtful, personalized responses to customer reviews.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 200,
        });

        const reply = completion.choices[0].message.content.trim();
        console.log(`✓ Generated AI reply for ${rating}-star review`);

        return reply;

    } catch (error) {
        console.error('Error generating AI reply:', error.message);
        throw new Error('Failed to generate AI reply. Please check your OpenAI API key and quota.');
    }
};

module.exports = {
    openai,
    generateReply,
};
