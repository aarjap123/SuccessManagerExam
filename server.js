const express = require('express');
const os = require('os');
const path = require('path');

const app = express();
const PORT = 9090;

// JSON body parsing
app.use(express.json());

// In-memory stores (keyed by username)
const submissions = {};
const liveScores = {};

// --- API Endpoints ---

// POST /api/live-score — real-time score updates while user is typing
app.post('/api/live-score', (req, res) => {
    const { user, totalScore, maxScore, ownScore, ownMaxPts, otherScore, otherMaxPts,
            ownCorrect, ownTotal, otherCorrect, otherTotal, cellsFilled, totalCells, elapsed } = req.body;
    if (!user || !['sanjita', 'bimal'].includes(user)) {
        return res.status(400).json({ error: 'Invalid user' });
    }
    liveScores[user] = {
        user, totalScore, maxScore, ownScore, ownMaxPts, otherScore, otherMaxPts,
        ownCorrect, ownTotal, otherCorrect, otherTotal, cellsFilled, totalCells, elapsed,
        updatedAt: new Date().toISOString()
    };
    res.json({ ok: true });
});

// POST /api/submit — store a user's scored results
app.post('/api/submit', (req, res) => {
    const { user, totalScore, maxScore, ownScore, ownMaxPts, otherScore, otherMaxPts,
            ownCorrect, ownTotal, otherCorrect, otherTotal, time } = req.body;
    if (!user || !['sanjita', 'bimal'].includes(user)) {
        return res.status(400).json({ error: 'Invalid user' });
    }
    submissions[user] = {
        user, totalScore, maxScore, ownScore, ownMaxPts, otherScore, otherMaxPts,
        ownCorrect, ownTotal, otherCorrect, otherTotal, time,
        submittedAt: new Date().toISOString()
    };
    // Clear live score once submitted
    delete liveScores[user];
    console.log(`[SUBMIT] ${user} — ${totalScore}/${maxScore} in ${time}s`);
    res.json({ ok: true });
});

// GET /api/submissions — return all submissions + live scores
app.get('/api/submissions', (req, res) => {
    res.json({ submissions, liveScores });
});

// DELETE /api/submissions — clear all submissions (reset)
app.delete('/api/submissions', (req, res) => {
    for (const key of Object.keys(submissions)) { delete submissions[key]; }
    for (const key of Object.keys(liveScores)) { delete liveScores[key]; }
    console.log('[RESET] All submissions and live scores cleared');
    res.json({ ok: true });
});

// GET /api/export — download CSV summary
app.get('/api/export', (req, res) => {
    const users = Object.keys(submissions);
    if (users.length === 0) {
        return res.status(404).json({ error: 'No submissions to export' });
    }

    const lines = [];
    lines.push('User,Total Score,Max Score,Percent,Own Score,Own Max,Own Correct,Own Total Cells,Partner Score,Partner Max,Partner Correct,Partner Total Cells,Time (seconds),Submitted At');

    for (const u of ['sanjita', 'bimal']) {
        const s = submissions[u];
        if (!s) continue;
        const pct = Math.round((s.totalScore / s.maxScore) * 100);
        lines.push([
            s.user, s.totalScore, s.maxScore, pct + '%',
            s.ownScore, s.ownMaxPts, s.ownCorrect, s.ownTotal,
            s.otherScore, s.otherMaxPts, s.otherCorrect, s.otherTotal,
            s.time, s.submittedAt
        ].join(','));
    }

    // Add winner summary if both submitted
    if (submissions.sanjita && submissions.bimal) {
        lines.push('');
        const sa = submissions.sanjita;
        const bi = submissions.bimal;
        if (sa.totalScore > bi.totalScore) {
            lines.push(`Winner,Sanjita,by ${sa.totalScore - bi.totalScore} points`);
        } else if (bi.totalScore > sa.totalScore) {
            lines.push(`Winner,Bimal,by ${bi.totalScore - sa.totalScore} points`);
        } else {
            lines.push('Winner,Tie,');
        }
    }

    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="exam-results.csv"');
    res.send(csv);
});

// GET /dashboard — serve the dashboard page
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, '0.0.0.0', () => {
    const interfaces = os.networkInterfaces();
    let localIP = 'localhost';
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIP = iface.address;
                break;
            }
        }
    }

    console.log('\n========================================');
    console.log('  Success Manager Exam Server Running');
    console.log('========================================');
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Network: http://${localIP}:${PORT}`);
    console.log(`  Dashboard: http://localhost:${PORT}/dashboard`);
    console.log('========================================');
    console.log('  Share the Network URL with students');
    console.log('  on the same WiFi to access the exam.');
    console.log('========================================\n');
});
