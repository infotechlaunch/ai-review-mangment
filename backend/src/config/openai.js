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
 * @param {object} settings - Tone settings { style, keywords, maxLength }
 * @returns {Promise<string>} Generated reply
 */
const generateReply = async (reviewText, rating, businessName = 'our business', settings = {}) => {
    try {
        const {
            style = 'professional',
            keywords = '',
            maxLength = 200
        } = settings;

        const prompt = `You are a professional customer service representative for ${businessName}. 
Generate a ${style} and personalized response to the following customer review.

Review Rating: ${rating}/5
Review Text: "${reviewText}"

Guidelines:
- Tone: ${style}
- Max Length: ${maxLength} characters
- ${keywords ? `Include these keywords if natural: ${keywords}` : ''}
- Thank the customer for their feedback
- ${rating >= 4 ? 'Express appreciation for their positive experience' : 'Acknowledge their concerns and show empathy'}
- ${rating < 3 ? 'Apologize for any inconvenience and offer to make things right' : ''}
- Keep the response naturally flowing
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
