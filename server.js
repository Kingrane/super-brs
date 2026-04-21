import express from "express"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

import semesterListHandler from "./api/student/semester_list.js"
import studentIndexHandler from "./api/student/index.js"
import disciplineJournalHandler from "./api/student/discipline/journal.js"
import disciplineSubjectHandler from "./api/student/discipline/subject.js"
import studentProfileHandler from "./api/student/profile.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const port = process.env.PORT || 3000

app.use(express.static(join(__dirname, "public")))

function adaptHandler(handler) {
    return async (req, res) => {
        try {
            await handler(req, res)
        } catch (e) {
            if (!res.headersSent) {
                res.status(502).json({
                    error: "Upstream request failed",
                    details: e.message
                })
            }
        }
    }
}

app.all("/api/student/semester_list", adaptHandler(semesterListHandler))
app.all("/api/student/index", adaptHandler(studentIndexHandler))
app.all("/api/student/discipline/journal", adaptHandler(disciplineJournalHandler))
app.all("/api/student/discipline/subject", adaptHandler(disciplineSubjectHandler))
app.all("/api/student/profile", adaptHandler(studentProfileHandler))

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})
