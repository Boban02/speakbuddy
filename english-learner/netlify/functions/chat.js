exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let messages, userApiKey;
    try {
        ({ messages, userApiKey } = JSON.parse(event.body));
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
    }

    const apiKey = userApiKey || process.env.GROQ_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'No API key configured. Go to Settings to add your Groq API key.' })
        };
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.7,
            max_tokens: 200
        })
    });

    const data = await groqResponse.json();
    return {
        statusCode: groqResponse.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    };
};
