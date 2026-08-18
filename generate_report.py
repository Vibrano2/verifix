#!/usr/bin/env python3
"""
Generate Week_2_Progress_Report.docx — short, layman's English, <1 page.
Uses only Python stdlib.
"""
import zipfile, os
from datetime import datetime

OUTPUT = "/home/linux/Desktop/techyjaunt/apps/verifix/Week_2_Progress_Report.docx"
today  = datetime.now().strftime("%B %d, %Y")

FONT         = "Calibri"
COLOR_NAVY   = "1F3864"
COLOR_BLUE   = "2E5FA3"
COLOR_BODY   = "222222"
COLOR_MUTED  = "555555"
BODY_SZ      = "22"   # 11pt
SMALL_SZ     = "20"   # 10pt
H1_SZ        = "40"   # 20pt
H2_SZ        = "26"   # 13pt

# ── helpers ─────────────────────────────────────────────────────────────────

def esc(t):
    return str(t).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace('"',"&quot;")

def rpr(bold=False, italic=False, color=COLOR_BODY, sz=BODY_SZ):
    s  = f'<w:rFonts w:ascii="{FONT}" w:hAnsi="{FONT}"/>'
    s += f'<w:sz w:val="{sz}"/><w:szCs w:val="{sz}"/>'
    s += f'<w:color w:val="{color}"/>'
    if bold:   s += '<w:b/><w:bCs/>'
    if italic: s += '<w:i/><w:iCs/>'
    return s

def r(text, **kw):
    return f'<w:r><w:rPr>{rpr(**kw)}</w:rPr><w:t xml:space="preserve">{esc(text)}</w:t></w:r>'

def p(*runs, before=0, after=100, jc=None):
    jc_xml = f'<w:jc w:val="{jc}"/>' if jc else ""
    pp = f'<w:pPr>{jc_xml}<w:spacing w:before="{before}" w:after="{after}"/></w:pPr>'
    return f'<w:p>{pp}{"".join(runs)}</w:p>'

def empty():
    return '<w:p><w:pPr><w:spacing w:before="0" w:after="60"/></w:pPr></w:p>'

def section_heading(text):
    rp = (f'<w:rFonts w:ascii="{FONT}" w:hAnsi="{FONT}"/>'
          f'<w:sz w:val="{H2_SZ}"/><w:szCs w:val="{H2_SZ}"/>'
          f'<w:color w:val="{COLOR_BLUE}"/><w:b/><w:bCs/>')
    pp = (f'<w:pPr>'
          f'<w:spacing w:before="180" w:after="60"/>'
          f'<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="{COLOR_BLUE}"/></w:pBdr>'
          f'</w:pPr>')
    return f'<w:p>{pp}<w:r><w:rPr>{rp}</w:rPr><w:t>{esc(text)}</w:t></w:r></w:p>'

def body_line(text, bold=False, italic=False, color=COLOR_BODY, before=0, after=80):
    return p(r(text, bold=bold, italic=italic, color=color), before=before, after=after)

def bullet_item(label, text):
    """Bold label + plain description on one line, with a bullet."""
    ind_left = 540
    pp = (f'<w:pPr>'
          f'<w:spacing w:before="0" w:after="60"/>'
          f'<w:ind w:left="{ind_left}" w:hanging="300"/>'
          f'</w:pPr>')
    rp_b = (f'<w:rFonts w:ascii="Symbol" w:hAnsi="Symbol"/>'
            f'<w:sz w:val="{BODY_SZ}"/><w:szCs w:val="{BODY_SZ}"/>'
            f'<w:color w:val="{COLOR_BLUE}"/>')
    r_dot  = f'<w:r><w:rPr>{rp_b}</w:rPr><w:t>•</w:t></w:r>'
    r_tab  = f'<w:r><w:tab/></w:r>'
    r_lbl  = r(label + " ", bold=True, color=COLOR_NAVY)
    r_txt  = r(text,        bold=False, color=COLOR_BODY)
    return f'<w:p>{pp}{r_dot}{r_tab}{r_lbl}{r_txt}</w:p>'

def hrule():
    pp = (f'<w:pPr>'
          f'<w:spacing w:before="100" w:after="100"/>'
          f'<w:pBdr>'
          f'<w:top w:val="single" w:sz="6" w:space="1" w:color="{COLOR_BLUE}"/>'
          f'</w:pBdr>'
          f'</w:pPr>')
    return f'<w:p>{pp}</w:p>'

# ── document body ───────────────────────────────────────────────────────────

def body():
    P = []

    # ── HEADER BLOCK ────────────────────────────────────────────────────────
    # Project / title
    rp_title = (f'<w:rFonts w:ascii="{FONT}" w:hAnsi="{FONT}"/>'
                f'<w:sz w:val="{H1_SZ}"/><w:szCs w:val="{H1_SZ}"/>'
                f'<w:color w:val="{COLOR_NAVY}"/><w:b/><w:bCs/>')
    P.append(f'<w:p>'
             f'<w:pPr><w:spacing w:before="0" w:after="80"/></w:pPr>'
             f'<w:r><w:rPr>{rp_title}</w:rPr><w:t>Week 2 Progress Report</w:t></w:r>'
             f'</w:p>')

    rp_sub = (f'<w:rFonts w:ascii="{FONT}" w:hAnsi="{FONT}"/>'
              f'<w:sz w:val="{BODY_SZ}"/><w:szCs w:val="{BODY_SZ}"/>'
              f'<w:color w:val="{COLOR_MUTED}"/><w:i/><w:iCs/>')
    P.append(f'<w:p>'
             f'<w:pPr><w:spacing w:before="0" w:after="40"/></w:pPr>'
             f'<w:r><w:rPr>{rp_sub}</w:rPr>'
             f'<w:t>Project: Artiva Artisan Marketplace Platform   |   Date: {today}</w:t>'
             f'</w:r></w:p>')

    P.append(hrule())

    # ── OVERVIEW ─────────────────────────────────────────────────────────────
    P.append(section_heading("Overview"))
    P.append(body_line(
        "Week 2 focused on building the core features that make the Artiva platform work "
        "from start to finish — from a user creating an account all the way through to hiring "
        "an artisan, making a payment, and completing a job. "
        "The main areas of work were account registration, artisan onboarding, "
        "job posting, artisan matching, and payments.",
        after=60
    ))

    # ── WHAT WAS COMPLETED ───────────────────────────────────────────────────
    P.append(section_heading("What Was Completed"))

    P.append(body_line("Account Registration & Sign-In", bold=True, color=COLOR_NAVY, before=60, after=40))
    P.append(bullet_item("Phone registration:",
        "Users can register using their phone number and receive a one-time code to verify their identity."))
    P.append(bullet_item("Account activation:",
        "Once the code is confirmed, the account is created and the user can sign in to the platform."))

    P.append(body_line("Artisan Onboarding", bold=True, color=COLOR_NAVY, before=80, after=40))
    P.append(bullet_item("Profile setup:",
        "Artisans can complete their profile by providing their trade, location, and a short description."))
    P.append(bullet_item("Document submission:",
        "Artisans can upload their ID documents and work photos directly through the platform."))
    P.append(bullet_item("Verification queue:",
        "After submitting their information, artisans are placed in a queue awaiting admin review."))

    P.append(body_line("Admin Verification", bold=True, color=COLOR_NAVY, before=80, after=40))
    P.append(bullet_item("Review process:",
        "An admin can view all submitted artisan profiles, review their documents, "
        "and either approve or reject each application."))
    P.append(bullet_item("Access control:",
        "Only approved artisans can be presented to clients when a job is posted."))

    P.append(body_line("Job Posting & Artisan Matching", bold=True, color=COLOR_NAVY, before=80, after=40))
    P.append(bullet_item("Job creation:",
        "Clients can post a job by describing the type of work needed, the location, and urgency."))
    P.append(bullet_item("Automatic matching:",
        "The platform finds the best available, approved artisans for the job and presents up to five options, "
        "ranked by experience and reputation."))

    P.append(body_line("Payments", bold=True, color=COLOR_NAVY, before=80, after=40))
    P.append(bullet_item("Full payment upfront:",
        "Clients pay the full job amount through Paystack before the artisan's contact details are shared."))
    P.append(bullet_item("Payment held securely:",
        "Once payment is confirmed, the money is held by the platform until the job is finished."))
    P.append(bullet_item("Contact reveal:",
        "The artisan's contact details are only shared with the client after payment is successfully confirmed."))

    P.append(body_line("Job Completion & Payment Release", bold=True, color=COLOR_NAVY, before=80, after=40))
    P.append(bullet_item("Completing a job:",
        "When the client confirms the work is done, the platform releases the payment to the artisan."))
    P.append(bullet_item("Service fee:",
        "The platform keeps a 10% service fee; the artisan receives the remaining 90%."))
    P.append(bullet_item("Ratings:",
        "After a job is complete, clients can leave a rating for the artisan."))

    # ── OVERALL PROGRESS ─────────────────────────────────────────────────────
    P.append(section_heading("Overall Progress"))
    P.append(body_line(
        "By the end of Week 2, the Artiva platform supports the full journey from user registration "
        "to job completion and payment — entirely through the backend. "
        "The core workflows for clients, artisans, and admins are now in place and functioning. "
        "This provides a solid foundation for the next phase of development.",
        after=80
    ))

    # ── FOOTER ───────────────────────────────────────────────────────────────
    P.append(hrule())
    rp_foot = (f'<w:rFonts w:ascii="{FONT}" w:hAnsi="{FONT}"/>'
               f'<w:sz w:val="{SMALL_SZ}"/><w:szCs w:val="{SMALL_SZ}"/>'
               f'<w:color w:val="999999"/><w:i/><w:iCs/>')
    P.append(f'<w:p>'
             f'<w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="0"/></w:pPr>'
             f'<w:r><w:rPr>{rp_foot}</w:rPr>'
             f'<w:t>Artiva Platform — Week 2 Progress Report — {today}</w:t>'
             f'</w:r></w:p>')

    return "".join(P)

# ── docx structure ───────────────────────────────────────────────────────────

CONTENT_TYPES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>'

RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'

WORD_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>'

SETTINGS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="720"/></w:settings>'

STYLES = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="{FONT}" w:hAnsi="{FONT}" w:cs="{FONT}"/>
        <w:sz w:val="{BODY_SZ}"/><w:szCs w:val="{BODY_SZ}"/>
        <w:color w:val="{COLOR_BODY}"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr><w:spacing w:before="0" w:after="80"/></w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
</w:styles>'''

def document_xml(body_content):
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            mc:Ignorable="">
  <w:body>
    {body_content}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1080" w:right="1260" w:bottom="1080" w:left="1260"
               w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>'''

# ── build ─────────────────────────────────────────────────────────────────────

def build():
    doc = document_xml(body())
    with zipfile.ZipFile(OUTPUT, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml",          CONTENT_TYPES)
        zf.writestr("_rels/.rels",                  RELS)
        zf.writestr("word/_rels/document.xml.rels", WORD_RELS)
        zf.writestr("word/document.xml",            doc)
        zf.writestr("word/styles.xml",              STYLES)
        zf.writestr("word/settings.xml",            SETTINGS)
    size = os.path.getsize(OUTPUT)
    print(f"✅ {OUTPUT}")
    print(f"   {size:,} bytes  ({size/1024:.1f} KB)")

if __name__ == "__main__":
    build()
