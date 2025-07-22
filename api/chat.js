export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { userId, message } = req.body;
    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    res.status(200).json({ reply: `診断メッセージ: ${message}` });
}
