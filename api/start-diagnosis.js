import fetch from 'node-fetch';

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

// ユーザーごとのセッションデータを保持
const userSessions = {};

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { userId, message } = req.body;
        
        // userIdとmessageが送信されていない場合はエラーメッセージを返す
        if (!userId || !message) {
            return res.status(400).json({ error: "userIdとmessageが必要です。" });
        }

        // セッションが存在しない場合
        if (!userSessions[userId]) {
            return res.status(400).json({ error: "診断がまだ開始されていません。" });
        }

        const session = userSessions[userId];
        session.answers.push(message);

        // 次の質問を送る
        const nextQuestionIndex = session.answers.length;
        if (nextQuestionIndex < session.questions.length) {
            return res.json({
                reply: `${nextQuestionIndex + 1}番目の質問:\n${session.questions[nextQuestionIndex]}`
            });
        } else {
            try {
                const diagnosisPrompt = `
                以下の質問と回答に基づき、ユーザーの行動原理を支える「Hidden Config」を解析し、最適な「Installed Religion」を表示してください。

                【診断ルール】
                - 以下のリストから最も適したものを1つ選択してください。
                【リスト】
                - "イスラム教", "ヒンドゥー教", "仏教", "シク教", "ユダヤ教", "道教", "バハーイ教", "神道", "ゾロアスター教", "シャーマニズム", "サタニズム", "クリスチャン・サイエンス", "ムスリム・シーア派", "ムスリム・スンニ派", "モルモン教", "アフリカ伝統宗教", "カバラ", "ヴィシュヌ教", "ジャイナ教", "ローマカトリック", "プロテスタント", "アングリカン教", "ニコラウス主義", "メソポタミア宗教", "エジプト神殿信仰", "アステカ宗教", "インカ宗教", "ノルディック宗教", "シュメール宗教", "アニミズム", "ヘブライ宗教", "タオイ", "ナバホ教", "ケルト宗教", "バーニズム", "ザラスシュトラ教", "インディアン宗教", "チベット仏教", "スピリチュアリズム", "サンテリア", "ヴードゥー", "オリシャ信仰", "ウィッカ"  

                質問と回答:
                ${session.questions.map((q, i) => `Q: ${q}\nA: ${session.answers[i]}`).join('\n')}

                【出力フォーマット】
                - **診断結果:** 「Installed Religion: ○○」
                - **診断レポート:**
                  - ○○がどのような信念体系であるかを日本語で簡潔に説明してください。
                  - なぜユーザーのHidden Configに適合するのかを論理的に説明してください。
                  - その宗教の歴史的背景および社会文化的影響を簡潔に提示してください。
                - **ユーザーの行動傾向分析:**
                  - 回答内容から導き出せるユーザーの行動原理、思想的傾向を記述してください。
                  - 「信仰」「秩序」「自由」「合理」「霊性」などの軸で分類し、どの特性が強いか示してください。
                `;

                const diagnosisResponse = await fetch(MISTRAL_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'mistral-medium',
                        messages: [{ role: 'user', content: diagnosisPrompt }]
                    })
                });

                const diagnosisData = await diagnosisResponse.json();
                if (!diagnosisResponse.ok) {
                    console.error("🚨 診断APIエラー:", diagnosisData);
                    throw new Error(diagnosisData.error || 'Mistral API error');
                }

                // 診断結果を取得
                const diagnosisResult = diagnosisData.choices[0].message.content.trim();

                // 診断結果を返す
                res.json({
                    reply: `診断が完了しました！\n\n${diagnosisResult}`
                });

                // 診断結果をセッションに保存（任意）
                session.diagnosis = diagnosisResult;

            } catch (error) {
                console.error("🚨 診断処理エラー:", error);
                res.status(500).json({ error: error.message });
            }
        }
    } else {
        res.status(405).json({ error: "メソッドが許可されていません。" });
    }
}
