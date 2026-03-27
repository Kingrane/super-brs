import { gradeFetch } from "../_gradeFetch.js";

export default async function handler(req, res) {
    if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

    const token = req.query.token;
    const semesterID = req.query.SemesterID;

    if (!token) return res.status(400).json({ error: "token is required" });

    const qs = new URLSearchParams({ token });
    if (semesterID) qs.set("SemesterID", String(semesterID));

    try {
        const { res: up, text } = await gradeFetch("/student?" + qs.toString(), { method: "GET" });

        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(up.status).send(text);
    } catch (e) {
        // AbortError -> timeout
        return res.status(502).json({ error: "Upstream request failed", details: e.message });
    }
}