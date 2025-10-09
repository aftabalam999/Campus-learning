// Free local AI feedback server using Ollama
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// Ollama configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "llama2"; // or "mistral", "codellama", etc.

app.post("/api/smart-feedback", async (req, res) => {
    const { goalText, userId, context } = req.body;

    if (!goalText) {
        return res.status(400).json({ error: "Missing goalText" });
    }

    try {
        // Format context similar to the original
        let formattedContext = context || 'No additional context provided.';
        try {
            const ctx = typeof context === 'string' ? JSON.parse(context) : context;
            if (ctx && typeof ctx === 'object') {
                const parts = [];
                if (ctx.phase) parts.push(`- Phase: ${ctx.phase}`);
                if (ctx.topic) parts.push(`- Topic: ${ctx.topic}`);
                if (ctx.description) parts.push(`- Topic Description: ${ctx.description}`);
                if (ctx.keyTags) parts.push(`- Key Tags: ${Array.isArray(ctx.keyTags) ? ctx.keyTags.join(', ') : ctx.keyTags}`);
                if (ctx.deliverable) parts.push(`- Deliverable: ${ctx.deliverable}`);
                formattedContext = parts.join('\n') || formattedContext;
            }
        } catch (e) {
            // leave formattedContext as-is
        }

        const prompt = `You are an expert mentor. Read the student's goal and the context.

Student goal: "${goalText}"

Context:
${formattedContext}

Respond in short Markdown only. Do NOT use section headers.
1) Provide a single short sentence (one line) that states the main thing that is incorrect or missing in the goal. Keep this one line under ~25 words.
2) Provide up to 5 concise Socratic bullet questions (each 8-20 words) that guide the student to fix the goal.
Do NOT rewrite the goal or lecture. Keep total response under 200 words.`;

        console.log(`Sending request to Ollama (${DEFAULT_MODEL})...`);

        // Call Ollama API
        const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
            model: DEFAULT_MODEL,
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.7,
                top_p: 0.9,
                num_predict: 200 // Limit response length
            }
        }, {
            timeout: 30000 // 30 second timeout
        });

        if (response.data && response.data.response) {
            console.log("Ollama response received successfully");
            return res.json({
                feedback: response.data.response.trim(),
                model: DEFAULT_MODEL,
                provider: 'ollama'
            });
        } else {
            throw new Error('No response from Ollama');
        }

    } catch (error) {
        console.error('Ollama API error:', error.message);

        // Fallback to simple rule-based feedback if Ollama fails
        const fallbackFeedback = generateFallbackFeedback(goalText);
        return res.json({
            feedback: fallbackFeedback,
            model: 'fallback',
            provider: 'rule-based',
            note: 'AI service unavailable, using basic feedback'
        });
    }
});

// Simple rule-based fallback feedback
function generateFallbackFeedback(goalText) {
    const feedback = [];
    const goal = goalText.toLowerCase();

    // Check for SMART criteria basics
    if (!goal.includes('complete') && !goal.includes('finish') && !goal.includes('build') && !goal.includes('create')) {
        feedback.push("Consider making your goal more action-oriented with specific outcomes.");
    }

    if (!goal.includes('hour') && !goal.includes('minute') && !goal.includes('page') && !/\d+/.test(goal)) {
        feedback.push("Add measurable criteria to track your progress.");
    }

    // Add some helpful questions
    feedback.push("• What specific steps will you take to achieve this?");
    feedback.push("• How will you know when you've completed it?");
    feedback.push("• What resources or help do you need?");

    return feedback.join('\n\n');
}

// Health check endpoint
app.get("/api/health", async (req, res) => {
    try {
        // Check if Ollama is running
        const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
        res.json({
            status: 'healthy',
            ollama: 'connected',
            models: response.data.models?.map(m => m.name) || []
        });
    } catch (error) {
        res.json({
            status: 'degraded',
            ollama: 'disconnected',
            error: error.message,
            fallback: 'available'
        });
    }
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
    console.log(`Free AI Feedback API server running on port ${PORT}`);
    console.log(`Using Ollama at: ${OLLAMA_BASE_URL}`);
    console.log(`Default model: ${DEFAULT_MODEL}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});</content>
<parameter name="filePath">/Users/mubinmac/Documents/Codespace/Campus Learning Dashboard/scripts/freeFeedbackApiServer.js