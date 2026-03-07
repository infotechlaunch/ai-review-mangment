const OpenAI = require('openai');

/**
 * OpenAI Configuration
 * Handles AI reply generation for reviews
 */

// Create client lazily so it always uses the current env var (survives hot reloads / late dotenv loading)
let _openai = null;
const getOpenAI = () => {
    if (!_openai || _openai.apiKey !== process.env.OPENAI_API_KEY) {
        _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _openai;
};

// Keep the named export for any direct usages elsewhere
const openai = { get chat() { return getOpenAI().chat; } };

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

        const completion = await getOpenAI().chat.completions.create({
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
        console.error('Error generating AI reply:', error.status, error.message);
        const detail = error.status === 401 ? 'Invalid API key.' : error.status === 429 ? 'Rate limit / quota exceeded.' : error.message;
        throw new Error(`Failed to generate AI reply: ${detail}`);
    }
};

/**
 * Generate a social media caption from a 5-star review
 * @param {string} reviewText - The review text
 * @param {string} reviewerName - The reviewer's name
 * @param {string} businessName - Name of the business
 * @returns {Promise<string>} Social media caption
 */
const generateSocialCaption = async (reviewText, reviewerName, businessName = 'our business') => {
    try {
        const prompt = `You are a social media manager for ${businessName}. 
A customer just left a 5-star review. Create an engaging social media post (suitable for both Facebook and Instagram) to share this review.

Reviewer: ${reviewerName}
Review: "${reviewText}"

Guidelines:
- Start with an attention-grabbing emoji headline (e.g. "⭐ Another 5-Star Review! 🔥")
- Include the review quote or highlight key praise
- Thank the reviewer by name (@${reviewerName})
- End with a warm closing line about the business
- Keep it under 300 characters
- Use 2-3 relevant emojis
- Do NOT use hashtags

Generate only the caption text, nothing else.`;

        const completion = await getOpenAI().chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'You are a social media manager who writes engaging posts to showcase positive customer reviews.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            max_tokens: 150,
        });

        const caption = completion.choices[0].message.content.trim();
        console.log(`✓ Generated social caption for review by ${reviewerName}`);
        return caption;
    } catch (error) {
        console.error('Error generating social caption:', error.message);
        // Fallback caption
        return `⭐ Another 5-Star Review!\n\n"${reviewText.substring(0, 100)}${reviewText.length > 100 ? '…' : ''}"\n\nThank you, @${reviewerName}! 😊`;
    }
};

/**
 * Analyze a review AND generate a reply in a single AI call using JSON mode.
 * Returns: { reply, sentimentResult, sentimentScore, emotionPrimary, topicPrimary }
 *
 * @param {string} reviewText
 * @param {number} rating  1–5
 * @param {string} reviewerName
 * @param {string} businessName
 * @param {object} settings  { style, keywords, maxLength, language }
 */
const analyzeAndGenerateReply = async (reviewText, rating, reviewerName = '', businessName = 'our business', settings = {}) => {
    const {
        style = 'professional',
        keywords = '',
        maxLength = 200,
        language = 'English',
    } = settings;

    const firstName = (reviewerName || '').split(' ')[0] || 'valued customer';

    const systemPrompt = `You are a professional, empathetic customer service representative for ${businessName}.
Tone: ${style}. ${keywords ? `Keywords to include naturally: ${keywords}.` : ''}
Max reply length: ${maxLength} characters. Respond in ${language}.
Always reply with a JSON object — no markdown, no extra text.`;

    const userPrompt = `A customer named "${firstName}" left this ${rating}-star review:
"${reviewText || '(no text)'}"

Generate a reply that:
1. Addresses ${firstName} by first name
2. Acknowledges the specific feedback
3. Stays on brand for ${businessName}
4. Does NOT offer discounts or refunds automatically
5. Ends with a warm closing

Also analyse the review sentiment.

Return ONLY a JSON object with exactly these keys:
{
  "reply": "<your reply text, max ${maxLength} chars>",
  "sentimentResult": "<one of: Positive, Negative, Neutral, Mixed>",
  "sentimentScore": <number -1.0 to 1.0>,
  "emotionPrimary": "<one of: happy, frustrated, disappointed, satisfied, angry, neutral, excited>",
  "topicPrimary": "<one of: food, service, pricing, ambience, staff, quality, other>"
}`;

    try {
        const completion = await getOpenAI().chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 400,
            response_format: { type: 'json_object' },
        });

        let parsed;
        try {
            parsed = JSON.parse(completion.choices[0].message.content.trim());
        } catch {
            // Fallback: extract JSON substring
            const raw = completion.choices[0].message.content;
            const match = raw.match(/\{[\s\S]*\}/);
            parsed = match ? JSON.parse(match[0]) : {};
        }

        return {
            reply: (parsed.reply || '').trim(),
            sentimentResult: parsed.sentimentResult || (rating >= 4 ? 'Positive' : rating <= 2 ? 'Negative' : 'Neutral'),
            sentimentScore: typeof parsed.sentimentScore === 'number' ? parsed.sentimentScore : (rating >= 4 ? 0.7 : rating <= 2 ? -0.7 : 0),
            emotionPrimary: parsed.emotionPrimary || 'neutral',
            topicPrimary: parsed.topicPrimary || 'other',
        };
    } catch (error) {
        console.error('analyzeAndGenerateReply error:', error.status, error.message);
        // Graceful fallback: use simple generateReply + rating-based sentiment
        const replyFallback = await generateReply(reviewText, rating, businessName, settings);
        return {
            reply: replyFallback,
            sentimentResult: rating >= 4 ? 'Positive' : rating <= 2 ? 'Negative' : 'Neutral',
            sentimentScore: rating >= 4 ? 0.7 : rating <= 2 ? -0.7 : 0,
            emotionPrimary: rating >= 4 ? 'happy' : rating <= 2 ? 'frustrated' : 'neutral',
            topicPrimary: 'other',
        };
    }
};

module.exports = {
    openai,
    generateReply,
    analyzeAndGenerateReply,
    generateSocialCaption,
};
