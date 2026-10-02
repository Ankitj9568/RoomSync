// tests/helpers/captcha.js - Solve the login/register human check in tests
// by answering the issued arithmetic question (no backdoors).
async function captchaSolution(agent) {
    const res = await agent.get('/api/auth/captcha');
    if (!res.body.success) throw new Error('Could not fetch captcha challenge');
    const { token, question } = res.body.data;
    const match = String(question).match(/What is (\d+) ([+\-×]) (\d+)\?/);
    if (!match) throw new Error(`Unparseable captcha question: ${question}`);
    const [, left, op, right] = match;
    const answer = op === '+' ? Number(left) + Number(right)
        : op === '-' ? Number(left) - Number(right)
        : Number(left) * Number(right);
    return { captchaToken: token, captchaAnswer: String(answer) };
}

module.exports = { captchaSolution };
