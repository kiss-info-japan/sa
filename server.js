console.log("server.js 起動開始");

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ["http://192.168.10.117", "http://localhost:3000", "https://hidden-config.onrender.com"]
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send("サーバーが正常に動作しています！");
});

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
if (!MISTRAL_API_KEY) {
  console.error("MISTRAL_API_KEY が設定されていません！");
  process.exit(1);
}

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

const userSessions = {};

app.post('/start-diagnosis', async (req, res) => {
  const { userId } = req.body;
  console.log("POST /start-diagnosis", { userId });

  if (!userId) {
    return res.status(400).json({ error: "userId が必要です。" });
  }

  try {
    const questionPrompt = `
宗教観を診断するための質問を10個考えてください。
- 自由回答形式の質問にすること。
- 日本語で、不自然な言い回しにならないようにする。
- バラエティに富んだ質問を選ぶこと。
- 信仰、価値観、運命、神、死後の世界、魂などに関する知識がなく、価値観が決まり切っていないユーザーであっても、自らの価値観を改めて考えながら判断できるような質問にする。
- 質問以外のメッセージは送るな。
例:
1. あなたにとって「心が落ち着く瞬間」はどんなときですか？
2. 何か大きな困難に直面したとき、どんなふうに乗り越えようとしますか？
3. 何かを「正しい」「間違っている」と判断するとき、どんな基準を大切にしていますか？
4. 「目に見えないもの」に影響されることはあると思いますか？それはどんなものですか？
5. もし、今とは違う文化や時代に生まれていたら、あなたの価値観はどう変わると思いますか？
6. あなたが「これは絶対に守りたい」と思うルールや考え方は何ですか？
7. 誰かに助けてもらった経験があれば、それはどんな状況でしたか？
8. 逆に、誰かを助けた経験があれば、それはどんな状況でしたか？
9. 「運がいい」「運が悪い」と感じるのはどんなときですか？
10. 自分が大事にしている習慣や儀式のようなものはありますか？それはどんなものですか？
`;
    console.log("Mistralへ質問生成プロンプト送信");
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistral-medium',
        messages: [{ role: 'user', content: questionPrompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Mistral API エラー:", data);
      throw new Error(data.error || 'Mistral API error');
    }

    const questions = data.choices[0].message.content
      .split('\n')
      .map(q => q.replace(/^\d+\.\s*/, '').trim())
      .filter(q => q.length > 0);

    if (questions.length < 10) {
      return res.status(500).json({ error: "質問の生成に失敗しました。" });
    }

    userSessions[userId] = { questions, answers: [], currentIndex: 0 };

    res.json({ reply: `診断を開始\n${questions[0]}` });

  } catch (error) {
    console.error("サーバーエラー:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/chat', async (req, res) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: "userIdとmessageが必要です。" });
    }

    const session = userSessions[userId];
    if (!session) {
      return res.status(400).json({ error: "診断がまだ開始されていません。" });
    }

    if (session.currentIndex >= session.questions.length) {
      return res.json({
        reply: "すでにすべての質問に回答済みです。診断は完了しています。"
      });
    }

    // ユーザーの回答を記録し、インデックスを進める
    session.answers[session.currentIndex] = message;
    session.currentIndex++;

    // まだ質問が残っていれば次の質問を返す
    if (session.currentIndex < session.questions.length) {
      res.json({
        reply: session.questions[session.currentIndex]
      });
      return;
    }

    // 最後の質問回答後は先に「生成中」メッセージを返す
    res.json({ reply: "回答を生成中ですので1分ほどお待ちください..." });

    // 診断処理を非同期に実行（結果は session.diagnosis に保存）
    (async () => {
      try {
        const diagnosisPrompt = `
以下の質問と回答に基づき、ユーザーの行動原理を支える「Hidden Config」を解析し、「Installed Religion」を表示してください。

【診断ルール】
- 以下のリストからユーザーの思想と最も合致するものを1つ選択してください。
- 架空の宗教ではなく、必ず以下の【リスト】に追加してある実在する宗教から選んでください。
例：「無教」などは架空の宗教なのでダメ。
【リスト】
- "イスラム教", "ヒンドゥー教", "仏教", "シク教", "ユダヤ教", "道教", "バハーイ教", "神道", "ゾロアスター教", "シャーマニズム", "サタニズム", "クリスチャン・サイエンス", "ムスリム・シーア派", "ムスリム・スンニ派", "モルモン教", "アフリカ伝統宗教", "カバラ", "ヴィシュヌ教", "ジャイナ教", "ローマカトリック", "プロテスタント", "アングリカン教", "ニコラウス主義", "メソポタミア宗教", "エジプト神殿信仰", "アステカ宗教", "インカ宗教", "ノルディック宗教", "シュメール宗教", "アニミズム", "ヘブライ宗教", "タオイ", "ナバホ教", "ケルト宗教", "バーニズム", "ザラスシュトラ教", "インディアン宗教", "チベット仏教", "スピリチュアリズム", "サンテリア", "ヴードゥー", "オリシャ信仰", "ウィッカ"  

質問と回答:
${session.questions.map((q, i) => `Q: ${q}\nA: ${session.answers[i] || ''}`).join('\n')}
以下の形式でレシート風に整形して出力してください。全てプレーンテキストで、太字・見出し記法を使わないでください。各行は改行（\n）を使用し、全角ハイフンで罫線を引いてください。空白は␣で表記していますが、実際は半角スペースにしてください。

Hidden Config
␣
★診断結果★
Installed Religion
＜○○＞
␣
診断レポート:
○○がどのような信念体系であるかを日本語で簡潔に説明してください。
なぜユーザーのHidden Configに適合するのかを論理的に説明してください。
␣
《解説》
その宗教の信者の、世界人口に対する比率を提示してください。
その宗教が信じられている主な国や歴史的背景、および社会文化的影響を提示してください。
␣
《あなたの行動傾向分析》
回答内容から導き出せるユーザーの行動原理、思想的傾向を分析し、どんな性格なのかを言い当ててください。
フランクな口調で。（例：あなたは○○タイプ！）
␣
《相性》
ユーザーのHidden Configに基づき、どこの信者と相性がよくて、それはどのような理由かを診断し、3位までのランキングで提示してください。
フランクでお茶目なトーンで。
また、相性の悪い宗教も一つ提示してください。
␣
《おすすめ料理》
ユーザーのHidden Configに基づき、歴史や背景から導き出したその宗教にまつわる料理を教えてください。
レシピを詳細に紹介してください。
ユーザーに合わせてプラスワンポイントのユニークなアイデアも添えてください。
␣
《おすすめアイテム》
ユーザーのHidden Configに基づき、その宗教にまつわるユニークなアイテムを提示してください。
そして、そのアイテムに合わせた具体的なコーディネートを詳しく提案してください。
フランクな口調で
《有名人》
ユーザーの宗教を信仰している有名人（セレブや偉人）を紹介してください。



`;

        const diagnosisResponse = await fetch(MISTRAL_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MISTRAL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'mistral-medium',
            messages: [{ role: 'user', content: diagnosisPrompt }]
          })
        });

        const diagnosisData = await diagnosisResponse.json();

        if (!diagnosisResponse.ok) {
          console.error("診断APIエラー:", diagnosisData);
          return;
        }

        session.diagnosis = diagnosisData.choices[0].message.content.trim();
      } catch (error) {
        console.error("診断処理エラー:", error);
      }
    })();

  } catch (error) {
    console.error("エラー:", error);
    res.status(500).json({ error: error.message });
  }
});

// 診断結果取得API
app.get('/diagnosis', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userIdが必要です" });

  const session = userSessions[userId];
  if (!session || !session.diagnosis) {
    return res.json({ reply: "診断結果はまだ生成されていません。しばらくお待ちください。" });
  }

  res.json({ reply: session.diagnosis });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`サーバー起動完了: http://localhost:${PORT}`);
});
