import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const GRADE_ORIGIN = "https://grade.sfedu.ru";
const API_BASE = "/api/v1";

async function gradeFetch(path) {
    const url = GRADE_ORIGIN + API_BASE + path;
    const controller = new AbortController();
    const timeoutMs = 12_000;
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            redirect: "follow",
            signal: controller.signal,
            headers: {
                "user-agent": "grade-student-web/0.1",
            }
        });
        const text = await res.text();
        return { status: res.status, text };
    } finally {
        clearTimeout(t);
    }
}

app.use(express.static(join(__dirname, 'public')));

app.get('/api/student/semester_list', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "token is required" });
    
    try {
        const { status, text } = await gradeFetch("/student/semester_list?token=" + encodeURIComponent(token));
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.status(status).send(text);
    } catch (e) {
        res.status(502).json({ error: "Upstream request failed", details: e.message });
    }
});

app.get('/api/student/index', async (req, res) => {
    const { token, SemesterID } = req.query;
    if (!token) return res.status(400).json({ error: "token is required" });
    
    try {
        let path = "/student?token=" + encodeURIComponent(token);
        if (SemesterID) path += "&SemesterID=" + encodeURIComponent(SemesterID);
        const { status, text } = await gradeFetch(path);
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.status(status).send(text);
    } catch (e) {
        res.status(502).json({ error: "Upstream request failed", details: e.message });
    }
});

app.get('/api/student/discipline/journal', async (req, res) => {
    const { token, id } = req.query;
    if (!token) return res.status(400).json({ error: "token is required" });
    if (!id) return res.status(400).json({ error: "id is required" });
    
    try {
        const { status, text } = await gradeFetch("/student/discipline/journal?token=" + encodeURIComponent(token) + "&id=" + encodeURIComponent(id));
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.status(status).send(text);
    } catch (e) {
        res.status(502).json({ error: "Upstream request failed", details: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});