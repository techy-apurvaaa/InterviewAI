const PDFDocument = require("pdfkit");

/**
 * Builds a clean, ATS-friendly, single-column resume PDF and streams it to `outputStream`.
 *
 * Layout notes (why the old version overlapped):
 *  - every block is positioned with an explicit x / y and measured with heightOfString(),
 *    so text can never run into the next block;
 *  - dates are drawn on the same baseline as the role (right aligned) instead of
 *    moving the cursor backwards;
 *  - bullets use a hanging indent (marker + wrapped text column);
 *  - page breaks are decided BEFORE a block is drawn, so headings never get orphaned;
 *  - only glyphs available in the built-in Helvetica font are emitted (no broken ✓ / emoji).
 *
 * @param {Object} resumeData - structured resume data
 * @param {stream.Writable} outputStream - Express response or file stream
 */
function buildResumePdf(resumeData = {}, outputStream) {
    const MARGIN = { top: 44, bottom: 54, left: 48, right: 48 };

    const doc = new PDFDocument({
        size: "A4",
        margins: { ...MARGIN },
        bufferPages: true,
        info: {
            Title: `${resumeData.name || "Candidate"} - Resume`,
            Author: resumeData.name || "Candidate",
            Subject: resumeData.title || "Resume",
        },
    });

    doc.pipe(outputStream);

    // ── palette ──
    const C = {
        ink: "#0f172a",
        accent: "#1d4ed8",
        text: "#1f2937",
        muted: "#6b7280",
        rule: "#d1d5db",
    };

    const PAGE_W = doc.page.width;
    const PAGE_H = doc.page.height;
    const LEFT = MARGIN.left;
    const WIDTH = PAGE_W - MARGIN.left - MARGIN.right;
    const BOTTOM = PAGE_H - MARGIN.bottom; // lowest y content may reach
    const BULLET_INDENT = 14;

    // ── helpers ──
    // Built-in PDF fonts only cover WinAnsi: swap/strip anything outside it.
    const clean = (value) =>
        String(value ?? "")
            .replace(/[\u2192\u21D2]/g, "->")
            .replace(/\u2265/g, ">=")
            .replace(/\u2264/g, "<=")
            .replace(/[\u2713\u2714]/g, "")
            .replace(/[\u00A0\u202F]/g, " ")
            .replace(/[^\x09\x0A\x20-\x7E\u00A1-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC\u2122]/g, "")
            .replace(/[ \t]+/g, " ")
            .trim();

    const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []).map(clean).filter(Boolean);

    const setFont = (name, size) => doc.font(name).fontSize(size);

    const heightOf = (text, width, font, size, lineGap = 0) => {
        setFont(font, size);
        return doc.heightOfString(text, { width, lineGap });
    };

    const ensureSpace = (needed) => {
        if (doc.y + needed > BOTTOM) {
            doc.addPage();
            doc.y = MARGIN.top;
        }
    };

    // write text at an explicit position without ever auto-paginating or moving the cursor sideways
    const write = (text, x, y, opts = {}) => {
        doc.text(text, x, y, { lineBreak: opts.width !== undefined, ...opts });
    };

    const sectionHeader = (title, minFollowing = 46) => {
        ensureSpace(30 + minFollowing);
        doc.y += 14;
        const y = doc.y;
        setFont("Helvetica-Bold", 10.5).fillColor(C.accent);
        write(title.toUpperCase(), LEFT, y, { characterSpacing: 1.1, lineBreak: false });
        const ruleY = y + 16;
        doc.save().moveTo(LEFT, ruleY).lineTo(LEFT + WIDTH, ruleY).lineWidth(0.8).strokeColor(C.rule).stroke().restore();
        doc.y = ruleY + 8;
    };

    // bullet with hanging indent; returns nothing, advances doc.y
    const bullet = (text, { size = 9.5, gap = 2.2, after = 3 } = {}) => {
        const textX = LEFT + BULLET_INDENT;
        const textW = WIDTH - BULLET_INDENT;
        const h = heightOf(text, textW, "Helvetica", size, gap);
        ensureSpace(h + after);
        const y = doc.y;
        doc.save().circle(LEFT + 4, y + size * 0.52, 1.5).fillColor(C.accent).fill().restore();
        setFont("Helvetica", size).fillColor(C.text);
        write(text, textX, y, { width: textW, lineGap: gap });
        doc.y = y + h + after;
    };

    // one row: bold left text + right aligned muted text on the same baseline
    const splitRow = (left, right, { leftFont = "Helvetica-Bold", leftSize = 10.5, rightSize = 9, leftColor = C.ink } = {}) => {
        const rightW = right ? Math.min(150, doc.font("Helvetica-Oblique").fontSize(rightSize).widthOfString(right) + 2) : 0;
        const leftW = WIDTH - rightW - (rightW ? 10 : 0);
        const h = heightOf(left, leftW, leftFont, leftSize, 1);
        const y = doc.y;
        setFont(leftFont, leftSize).fillColor(leftColor);
        write(left, LEFT, y, { width: leftW, lineGap: 1 });
        if (right) {
            setFont("Helvetica-Oblique", rightSize).fillColor(C.muted);
            write(right, LEFT + WIDTH - rightW, y + 1, { width: rightW, align: "right", lineBreak: false });
        }
        doc.y = y + h;
    };

    const paragraph = (text, { size = 9.5, color = C.text, gap = 2.4, after = 0, font = "Helvetica" } = {}) => {
        const h = heightOf(text, WIDTH, font, size, gap);
        ensureSpace(h + after);
        const y = doc.y;
        setFont(font, size).fillColor(color);
        write(text, LEFT, y, { width: WIDTH, lineGap: gap, align: "left" });
        doc.y = y + h + after;
    };

    // ───────────────────────── HEADER ─────────────────────────
    const name = clean(resumeData.name) || "Candidate Name";
    const title = clean(resumeData.title);
    const contact = [resumeData.email, resumeData.phone, resumeData.location, resumeData.linkedin, resumeData.github]
        .map(clean)
        .filter(Boolean);

    let y = MARGIN.top;
    const headerLine = (text, font, size, color, after) => {
        const h = heightOf(text, WIDTH, font, size);
        setFont(font, size).fillColor(color);
        write(text, LEFT, y, { width: WIDTH });
        y += h + after;
    };

    headerLine(name, "Helvetica-Bold", 25, C.ink, 3);
    if (title) headerLine(title, "Helvetica", 12.5, C.accent, 5);
    if (contact.length) headerLine(contact.join("   |   "), "Helvetica", 9.5, C.muted, 6);
    doc.y = y;

    doc.save().moveTo(LEFT, doc.y).lineTo(LEFT + WIDTH, doc.y).lineWidth(2).strokeColor(C.accent).stroke().restore();
    doc.y += 4;

    // ───────────────────────── SUMMARY ─────────────────────────
    const summary = clean(resumeData.summary);
    if (summary) {
        sectionHeader("Professional Summary", 40);
        paragraph(summary, { size: 10, gap: 2.8 });
    }

    // ───────────────────────── SKILLS ─────────────────────────
    const skills = toList(resumeData.skills);
    if (skills.length) {
        sectionHeader("Core Skills", 30);
        const COLS = 3;
        const colW = WIDTH / COLS;
        const size = 9.5;
        const rowH = size + 6;
        for (let i = 0; i < skills.length; i += COLS) {
            const row = skills.slice(i, i + COLS);
            // allow a skill to wrap onto 2 lines inside its column
            const heights = row.map((s) => heightOf(s, colW - BULLET_INDENT - 6, "Helvetica", size, 1.5));
            const h = Math.max(rowH, ...heights) ;
            ensureSpace(h);
            const y = doc.y;
            row.forEach((skill, idx) => {
                const x = LEFT + idx * colW;
                doc.save().circle(x + 4, y + size * 0.52, 1.5).fillColor(C.accent).fill().restore();
                setFont("Helvetica", size).fillColor(C.text);
                write(skill, x + BULLET_INDENT, y, { width: colW - BULLET_INDENT - 6, lineGap: 1.5 });
            });
            doc.y = y + h;
        }
    }

    // ───────────────────────── EXPERIENCE ─────────────────────────
    const experience = (Array.isArray(resumeData.experience) ? resumeData.experience : []).filter((e) => e && (e.role || e.company));
    if (experience.length) {
        sectionHeader("Professional Experience", 70);
        experience.forEach((exp, idx) => {
            const highlights = toList(exp.highlights);
            const firstBullet = highlights[0] ? heightOf(highlights[0], WIDTH - BULLET_INDENT, "Helvetica", 9.5, 2.2) : 0;
            ensureSpace(34 + firstBullet);
            if (idx > 0) doc.y += 7;

            splitRow(clean(exp.role) || "Role", clean(exp.duration));
            if (exp.company) {
                doc.y += 1;
                paragraph(clean(exp.company), { size: 9.5, color: C.accent, font: "Helvetica-Oblique", after: 3 });
            } else {
                doc.y += 3;
            }
            highlights.forEach((h) => bullet(h));
        });
    }

    // ───────────────────────── PROJECTS ─────────────────────────
    const projects = (Array.isArray(resumeData.projects) ? resumeData.projects : []).filter((p) => p && p.name);
    if (projects.length) {
        sectionHeader("Projects", 60);
        projects.forEach((proj, idx) => {
            const tech = toList(proj.technologies).join(", ");
            const desc = clean(proj.description);
            const descH = desc ? heightOf(desc, WIDTH - BULLET_INDENT, "Helvetica", 9.5, 2.2) : 0;
            ensureSpace(32 + descH);
            if (idx > 0) doc.y += 6;

            splitRow(clean(proj.name), "", { leftSize: 10 });
            if (tech) {
                doc.y += 1;
                paragraph(tech, { size: 9, color: C.accent, font: "Helvetica-Oblique", after: 3 });
            } else {
                doc.y += 3;
            }
            if (desc) bullet(desc);
        });
    }

    // ───────────────────────── EDUCATION ─────────────────────────
    const education = (Array.isArray(resumeData.education) ? resumeData.education : []).filter((e) => e && (e.degree || e.institution));
    if (education.length) {
        sectionHeader("Education", 40);
        education.forEach((edu, idx) => {
            ensureSpace(32);
            if (idx > 0) doc.y += 6;
            splitRow(clean(edu.degree) || "Degree", clean(edu.year), { leftSize: 10 });
            if (edu.institution) {
                doc.y += 1;
                paragraph(clean(edu.institution), { size: 9.5, color: C.muted, after: 2 });
            }
        });
    }

    // ───────────────────────── STRENGTHS ─────────────────────────
    const strengths = toList(resumeData.strengths);
    if (strengths.length) {
        sectionHeader("Key Strengths", 36);
        strengths.forEach((s) => bullet(s));
    }

    // ───────────────────────── FOOTER (multi-page only) ─────────────────────────
    const range = doc.bufferedPageRange();
    if (range.count > 1) {
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            // footer sits inside the bottom margin: lift the margin so PDFKit does not open a new page
            const savedBottom = doc.page.margins.bottom;
            doc.page.margins.bottom = 0;
            setFont("Helvetica", 8).fillColor(C.muted);
            doc.text(`${name}  |  Page ${i + 1} of ${range.count}`, LEFT, PAGE_H - 30, {
                width: WIDTH,
                align: "center",
                lineBreak: false,
            });
            doc.page.margins.bottom = savedBottom;
        }
    }

    doc.end();
}

module.exports = { buildResumePdf };
