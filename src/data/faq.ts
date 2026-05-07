// src/data/faq.ts
// Static service-FAQ content surfaced at /help. Authored as operator reference
// (what the desk reads aloud to a walk-in customer), not as in-app help.
// Currency was normalized from the source PDF (₹ prefix, no trailing rupee
// glyphs). Phone/WhatsApp/Email placeholders were stripped — those values
// live in the center profile (Settings) and shouldn't be duplicated here.

import {
  Info,
  CreditCard,
  FileText,
  Plane,
  Printer,
  Briefcase,
  Scale,
  Wallet,
  ShieldCheck,
  Train,
  GraduationCap,
  Sparkles,
  Receipt,
  Lock,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

export interface FaqEntry {
  /** Stable id used as URL anchor and React key. */
  id: string;
  q: string;
  /** Lead paragraph rendered above any bullet list. */
  a: string;
  /** Optional bulleted list rendered after `a`. */
  bullets?: string[];
  /** Optional trailing paragraph after the bullet list. */
  aTail?: string;
  tags?: string[];
}

export interface FaqCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  entries: FaqEntry[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "about",
    name: "About the Kendra",
    icon: Info,
    description: "Shop info, hours, languages, and how to place orders.",
    entries: [
      {
        id: "q1",
        q: "What is Sarathi Digital Seva Kendra?",
        a: "We are an authorized digital service centre at Bhayandar East offering over 80 government, compliance, business, and documentation services under one roof. We are an extension of the Common Services Centre (CSC) network and Digital India initiative, serving citizens, small businesses, traders, students, and senior citizens.",
      },
      {
        id: "q2",
        q: "What are your shop timings?",
        a: "We are open Monday to Saturday, 9:00 AM to 9:00 PM. We are closed on Sundays and major public holidays. For urgent work on Sundays, you may message us on WhatsApp and we will respond if available.",
      },
      {
        id: "q3",
        q: "Where is your shop located?",
        a: "Shop No. 14, Rashmi Laxmi Sadan, Near Bhayandar East Station, Thane, Maharashtra 401105. We are a 2-minute walk from the station east exit.",
      },
      {
        id: "q4",
        q: "Do I need to make an appointment?",
        a: "No appointment is needed for walk-in services like printing, photo, Aadhaar updates, document submission, and bill payments. For consultations (tax, business, astrology) and on-site visits (Vastu), we recommend calling or messaging us first to confirm availability.",
      },
      {
        id: "q5",
        q: "Which languages do you serve customers in?",
        a: "We assist customers in Hindi, Marathi, Gujarati, and English. Document drafts and reports can be prepared in any of these four languages on request.",
      },
      {
        id: "q6",
        q: "Do you accept WhatsApp orders?",
        a: "Yes. You can send us your documents and request on WhatsApp. We will:",
        bullets: [
          "Confirm what is needed and quote the final price",
          "Process the request and notify you when ready",
          "You can pick it up from the shop, or request home delivery (within 1 km, ₹50)",
        ],
        aTail:
          "WhatsApp ordering is especially helpful for senior citizens, busy professionals, and customers who want to avoid the queue.",
      },
      {
        id: "q7",
        q: "Are your service charges different from government fees?",
        a: "Yes. Government fees (paid to UIDAI, Income Tax Department, RTO, etc.) are official charges fixed by the government. Our service charge is a separate fee for processing your application, document handling, and the time we save you. Both are clearly mentioned on our charge sheet.",
      },
      {
        id: "q8",
        q: "Why should I come to you instead of doing it myself online?",
        a: "We add value in three ways:",
        bullets: [
          "Time saved — you don't navigate confusing government portals or stand in queues",
          "Accuracy — common mistakes (wrong document size, missing field, incorrect category) are filtered out before submission, reducing rejection risk",
          "Follow-up — we track status, handle re-submissions if needed, and inform you when documents arrive",
        ],
        aTail:
          "For simple tasks (mobile recharge, PNR check), self-service is fine. For anything involving government processing, our experience usually saves you more than our service charge.",
      },
    ],
  },
  {
    id: "aadhaar-pan",
    name: "Aadhaar & PAN",
    icon: CreditCard,
    description: "Updates, corrections, linking, downloads.",
    entries: [
      {
        id: "q9",
        q: "What documents do I need to bring for an Aadhaar update?",
        a: "Bring originals AND a photocopy of:",
        bullets: [
          "Existing Aadhaar card",
          "Proof of the change you want — for address: electricity bill, rent agreement, passport; for name: gazette notification, marriage certificate; for DOB: birth certificate, school leaving certificate, or passport",
          "Mobile number registered with Aadhaar (for OTP verification)",
        ],
      },
      {
        id: "q10",
        q: "How long does an Aadhaar update take?",
        a: "Updates are submitted on the same day. UIDAI normally processes them within 7–30 days. You will receive an SMS on your registered mobile when the update is approved. We can help you check status at any time for ₹20.",
      },
      {
        id: "q11",
        q: "I lost my Aadhaar card. What should I do?",
        a: "You don't need a physical Aadhaar — the digital e-Aadhaar download works everywhere. We can download and print a fresh color copy on Aadhaar paper for ₹30. If you want a PVC plastic card, we can also order one through UIDAI for ₹50 (delivered to your address in 5–10 days).",
      },
      {
        id: "q12",
        q: "I have not linked my PAN with Aadhaar. Will my PAN become inactive?",
        a: "Yes. Under current rules, an unlinked PAN becomes inoperative, which means it cannot be used for filing ITR, opening bank accounts, or large transactions. We strongly recommend linking immediately. We charge ₹100 for the linking service. Late fee (currently ₹1,000 as per Income Tax Department) is paid by the customer separately.",
      },
      {
        id: "q13",
        q: "How long does a new PAN card take?",
        a: "Different timelines depending on your need:",
        bullets: [
          "e-PAN (digital, downloadable PDF) — usually within 24–48 hours",
          "Physical PAN card — delivered by NSDL/UTIITSL to your address in 10–15 working days",
          "PAN correction — usually 10–20 days",
        ],
        aTail: "We will give you a tracking number so you can check status.",
      },
      {
        id: "q14",
        q: "What documents are required for a new PAN card?",
        a: "You will need:",
        bullets: [
          "Aadhaar card (original + photocopy)",
          "Two passport-size photographs (we can take these on the spot for ₹50)",
          "Proof of date of birth — birth certificate, school leaving, or passport",
          "If applying as a minor — parent's PAN and Aadhaar",
          "Signature on white paper (we'll guide you on the box size)",
        ],
      },
    ],
  },
  {
    id: "id-certificates",
    name: "ID & Certificates",
    icon: FileText,
    description: "Voter ID, birth, death, marriage, caste, income, domicile, PCC.",
    entries: [
      {
        id: "q15",
        q: "How do I apply for a new Voter ID?",
        a: "Bring the following:",
        bullets: [
          "Aadhaar card or any photo ID proof",
          "Proof of address (Aadhaar, passport, electricity bill, rent agreement, ration card)",
          "One passport-size color photograph",
          "Date of birth proof (Aadhaar, birth certificate, school leaving certificate)",
        ],
        aTail:
          "We file Form 6 online for you. Voter ID is generally issued within 30 days. You can collect the digital e-EPIC immediately once approved.",
      },
      {
        id: "q16",
        q: "How long does it take to get a birth or death certificate?",
        a: "If the birth/death is recent (within 21 days of event), the certificate is generally issued within 7–10 working days through MBMC. If the event is older than a year, it requires additional documentation and verification, and may take 30–60 days. We will guide you through the exact process based on your case.",
      },
      {
        id: "q17",
        q: "What is the difference between a Marriage Certificate and Marriage Registration?",
        a: "These are two different things:",
        bullets: [
          "Marriage Registration is the legal process where you register your marriage with the Sub-Registrar's office. This involves multiple visits, witness signatures, and stamp duty.",
          "Marriage Certificate is the document issued AFTER registration. If you are already married but never registered, you need to do registration first to get a certificate.",
        ],
        aTail:
          "Our ₹999 Marriage Registration package handles the full process including documentation, appointment booking, and certificate issuance.",
      },
      {
        id: "q18",
        q: "What documents are needed for a Caste / Income / Domicile certificate?",
        a: "Common documents required:",
        bullets: [
          "Aadhaar card and PAN card",
          "Proof of address (utility bill, rent agreement)",
          "School leaving certificate (showing caste / community)",
          "Father's or relative's caste certificate (for caste certificates)",
          "Salary slip / Form 16 / IT returns (for income certificate)",
          "Ration card (helpful for domicile)",
          "Two passport-size photographs",
        ],
        aTail:
          "Processing time is typically 15–21 working days through Maharashtra's e-District portal.",
      },
      {
        id: "q19",
        q: "Do you provide a Police Clearance Certificate (PCC)?",
        a: "Yes. PCC is required for visa applications, certain jobs, and immigration. We assist with form filling, document collation, and submission via Passport Seva Kendra or local police station. The customer must personally attend the police verification visit. Total time: 15–30 days depending on background verification.",
      },
    ],
  },
  {
    id: "passport-rto",
    name: "Passport & RTO",
    icon: Plane,
    description: "New passport, renewal, driving license, RC transfer.",
    entries: [
      {
        id: "q20",
        q: "What is the difference between Normal and Tatkal passport?",
        a: "Two main differences:",
        bullets: [
          "Time — Normal takes 15–30 working days; Tatkal is delivered in 1–3 working days after police verification",
          "Cost — Tatkal costs an additional ₹2,000 over normal fees",
        ],
        aTail:
          "Tatkal is recommended only if you have urgent travel and the standard timeline won't work for you.",
      },
      {
        id: "q21",
        q: "What documents are needed for a new passport?",
        a: "You will need:",
        bullets: [
          "Aadhaar card (mandatory)",
          "PAN card or other photo ID",
          "Proof of address (Aadhaar, electricity bill, rent agreement, passbook)",
          "Date of birth proof (Aadhaar, birth certificate, school leaving)",
          "For minors — parents' passports and consent form",
          "For married applicants — spouse's passport copy or marriage certificate (optional but helpful)",
        ],
        aTail:
          "We help you book your Passport Seva Kendra (PSK) appointment online. You must personally attend the PSK visit and police verification.",
      },
      {
        id: "q22",
        q: "Why do RTO fees say 'as per RTO' on your charge sheet?",
        a: "Because government RTO fees vary by vehicle category (2-wheeler, 4-wheeler, commercial), age of vehicle, late fees, and the specific Maharashtra RTO office. We always confirm the exact fee with you before processing. Our service charge is fixed and transparent.",
      },
      {
        id: "q23",
        q: "I want to transfer my vehicle's RC to a new owner. What is the process?",
        a: "RC Transfer requires:",
        bullets: [
          "Form 29 and Form 30 (we provide and fill these)",
          "Original RC book",
          "Valid PUC certificate",
          "Insurance certificate",
          "Seller's and buyer's Aadhaar and PAN",
          "If hypothecated — NOC from the bank/financier",
          "Vehicle photographs (chassis number, engine number, vehicle)",
        ],
        aTail:
          "We file the transfer online and assist with the RTO visit if required. Time: 7–15 working days.",
      },
      {
        id: "q24",
        q: "Do I have to physically visit the RTO?",
        a: "It depends on the service. Many services (RC duplicate, address change, hypothecation removal) are now fully online and don't need a visit. Driving license tests, biometric capture for new licenses, and some RC transfers do require physical attendance. We will tell you upfront whether you need to visit.",
      },
    ],
  },
  {
    id: "print-photo",
    name: "Print, Scan & Photo",
    icon: Printer,
    description: "Photocopies, color print, lamination, passport photos, banners.",
    entries: [
      {
        id: "q25",
        q: "What are your photocopy and printing rates?",
        a: "Our standard rates:",
        bullets: [
          "B&W printing: ₹3 per page (1–49 pages); ₹2 per page for bulk orders of 50+ pages",
          "Color printing: ₹15 per page (text); ₹20 per page (photo / heavy color)",
          "Scanning: ₹5 per page B&W, ₹10 per page color",
          "Lamination: ₹30 (A4), ₹50 (A3), ₹20 (ID card size)",
          "Spiral binding: ₹50 per booklet",
        ],
      },
      {
        id: "q26",
        q: "Can I print from my phone or pen drive?",
        a: "Yes. You can WhatsApp us your file, plug in your pen drive, or email us at our shop email. We accept PDF, Word, JPG, PNG, and most common formats. There is no extra charge for file handling — you pay only the per-page printing rate.",
      },
      {
        id: "q27",
        q: "How quickly can I get passport-size photos?",
        a: "Instant. Walk in, sit for the photo, and you will get 8 printed passport-size photos in about 5–10 minutes. The cost is ₹50 for 8 photos, or ₹80 for the combo with lamination of 2 photos.",
      },
      {
        id: "q28",
        q: "Do you make wedding cards, visiting cards, and banners?",
        a: "Yes. We offer:",
        bullets: [
          "Visiting cards — ₹150–500 for 100 cards depending on design and paper",
          "Wedding invitations — design + printing, including Bengali, Gujarati, Marathi, and English",
          "Flex banners — for shops, events, weddings (rates per square foot)",
          "Shop boards, party banners, posters, and brochures",
        ],
        aTail:
          "Please share your design ideas, text, and quantity on WhatsApp or in person, and we will give you a custom quote.",
      },
    ],
  },
  {
    id: "business-tax",
    name: "Business & Tax",
    icon: Briefcase,
    description: "GST, ITR, MSME, Shop Act, DSC, company registration.",
    entries: [
      {
        id: "q29",
        q: "I am opening a new shop. What registrations do I legally need in Maharashtra?",
        a: "For most small shops in Bhayandar, you typically need:",
        bullets: [
          "Shop Act (Gumasta) License — mandatory for any commercial establishment",
          "GST Registration — mandatory if turnover exceeds ₹40 lakh (₹20 lakh for services), or if you sell across states or on e-commerce",
          "Udyam / MSME Registration — free, gives access to MSME benefits and easier loans",
          "Professional Tax Registration — mandatory for most businesses in Maharashtra",
          "FSSAI Basic Registration — mandatory if you handle food (kirana, restaurant, sweet shop, dairy)",
        ],
        aTail:
          "Our 'New Business Starter Pack' (₹2,999) bundles GST + Shop Act + Udyam + DSC and saves ₹500 over individual prices.",
      },
      {
        id: "q30",
        q: "What documents do I need for GST registration?",
        a: "Mandatory documents:",
        bullets: [
          "PAN card of the proprietor / partners / company",
          "Aadhaar card of the proprietor / partners / directors",
          "Photograph of proprietor / partners / directors",
          "Proof of business address (electricity bill + rent agreement OR ownership document)",
          "Bank account details (cancelled cheque or bank statement)",
          "Business proof (Shop Act, registration certificate, partnership deed, etc.)",
          "Digital Signature Certificate (for companies and LLPs only)",
        ],
        aTail:
          "GSTIN is normally issued within 7 working days of complete document submission.",
      },
      {
        id: "q31",
        q: "How does monthly GST filing work? What if I miss a deadline?",
        a: "GST filings are based on your registration type:",
        bullets: [
          "Regular taxpayers — GSTR-1 (sales) and GSTR-3B (summary) filed monthly or quarterly",
          "Composition scheme — quarterly returns (GSTR-4) and annual statement",
        ],
        aTail:
          "If you miss a deadline, late fees apply (₹50/day for normal returns, ₹20/day for nil returns) and interest at 18% per annum on tax due. After non-filing for several months, your GSTIN can be suspended or cancelled. We send WhatsApp reminders to all our retainer clients before each due date so this doesn't happen.",
      },
      {
        id: "q32",
        q: "Do you offer a monthly GST retainer?",
        a: "Yes. Our monthly GST retainer starts at ₹500 per month per GSTIN. It includes:",
        bullets: [
          "Monthly GSTR-1 and GSTR-3B filing",
          "Reconciliation of sales/purchase data you provide",
          "Reminders before due dates",
          "Year-end annual return preparation (additional charge)",
        ],
        aTail:
          "Pricing depends on the volume and complexity of your transactions. We will quote after reviewing your last 1–2 months of sales/purchase data.",
      },
      {
        id: "q33",
        q: "What documents do I need for ITR filing?",
        a: "Common documents (we'll tell you exactly what applies to your case):",
        bullets: [
          "PAN and Aadhaar (linked)",
          "Form 16 (from employer) for salaried individuals",
          "Bank statements for the financial year",
          "Investment proofs — LIC, PPF, ELSS, NPS, FD, mutual funds, mediclaim, home loan certificate",
          "For business — books of accounts, GST returns, bank statements",
          "Capital gains — share/mutual fund statements, property sale documents",
          "Other income — interest certificates, rental income proofs, freelance/consulting invoices",
        ],
        aTail:
          "Recommended ITR filing window: April to July 31. Filing earlier reduces refund processing time.",
      },
      {
        id: "q34",
        q: "I received a notice from the Income Tax department. Can you help?",
        a: "Yes. Bring the notice (or send it on WhatsApp). We will read it, explain what is being asked, and prepare a reply with supporting documents. Our charge for notice reply ranges from ₹1,500 to ₹5,000 depending on complexity. Important: respond before the deadline mentioned in the notice — late responses can lead to penalties or assessment without your input.",
      },
      {
        id: "q35",
        q: "What is a Digital Signature Certificate (DSC) and do I need one?",
        a: "A DSC is a digital equivalent of your handwritten signature, used for filing online with the government. You need a DSC for: company registration, MCA filings (annual returns), GST registration for companies/LLPs, e-tendering, and trademark filing. We issue Class 3 DSCs valid for 2 years for ₹999–1,499 depending on the certifying authority. Processing time: same day to 24 hours.",
      },
    ],
  },
  {
    id: "documentation-legal",
    name: "Documentation & Legal",
    icon: Scale,
    description: "Affidavit, rent agreement, RTI, notary.",
    entries: [
      {
        id: "q36",
        q: "I need a rent agreement. What is the process?",
        a: "We draft and print a comprehensive rent agreement covering all standard clauses (rent, security deposit, maintenance, lock-in, termination, etc.). The process:",
        bullets: [
          "You provide tenant and landlord details, address, rent amount, duration",
          "We draft the agreement in 1–2 hours",
          "Both parties sign on stamp paper (we procure the appropriate denomination)",
          "For agreements over 11 months, registration at the Sub-Registrar is legally required (mandatory in Maharashtra)",
        ],
        aTail:
          "Drafting + printing: ₹999. Stamp duty and registration fees are paid by the customer (we calculate and inform). Notarization, if you choose, is additional.",
      },
      {
        id: "q37",
        q: "I need an affidavit. Can you help me draft it?",
        a: "Yes. Tell us what the affidavit is for (name change, lost document declaration, address change, gap year, etc.) and we will draft, print, and arrange notary stamping. Drafting + print is ₹200; notary fees and stamp paper are extra (around ₹100–300 depending on type).",
      },
      {
        id: "q38",
        q: "Can you file an RTI (Right to Information) application for me?",
        a: "Yes. You give us the details of what information you want and from which government department. We draft the RTI application and submit it. Cost: ₹100 service charge + ₹10 RTI fee (govt). Reply must come within 30 days as per RTI Act.",
      },
    ],
  },
  {
    id: "payment-banking",
    name: "Payment & Banking",
    icon: Wallet,
    description: "Bills, recharges, AEPS, money transfer, FASTag.",
    entries: [
      {
        id: "q39",
        q: "What is AEPS and how does it work?",
        a: "AEPS (Aadhaar Enabled Payment System) lets you withdraw or deposit cash using only your Aadhaar number and fingerprint. No card, no PIN. Useful when you have left your debit card behind or for accounts where you don't have a card. Charge: ₹10–50 per transaction depending on amount.",
      },
      {
        id: "q40",
        q: "Can I send money to someone via your shop?",
        a: "Yes. We offer Domestic Money Transfer (DMT) — you give us cash and recipient's bank details, and we transfer instantly via IMPS / NEFT. Identity proof (Aadhaar) is mandatory for the sender. Charge: ₹10–50 per transfer depending on amount, subject to per-day limits as per RBI rules.",
      },
      {
        id: "q41",
        q: "Do you sell FASTag?",
        a: "Yes. We issue FASTag for ₹150 (one-time setup) plus the wallet balance you choose to load. We also help with FASTag recharge (₹20 service charge), KYC update, and replacement of damaged tags.",
      },
    ],
  },
  {
    id: "insurance",
    name: "Insurance",
    icon: ShieldCheck,
    description: "Life, health, vehicle, claim support.",
    entries: [
      {
        id: "q42",
        q: "Do you sell insurance directly?",
        a: "We are partnered with leading insurance providers and assist customers with policy comparison, application, and renewal. We don't charge customers for selling — we earn commission from insurers. The ₹150–200 service charge listed on our charge sheet is for documentation help, not the policy itself.",
      },
      {
        id: "q43",
        q: "Can you help with insurance claims?",
        a: "Yes. We assist with claim documentation, form filling, photo/document upload, and follow-up with the insurer. We don't have direct authority to approve or reject claims — that's the insurance company's decision. Service charge: ₹500 per claim, regardless of outcome.",
      },
    ],
  },
  {
    id: "travel",
    name: "Travel & Railway",
    icon: Train,
    description: "Train, bus, hotel, flight bookings.",
    entries: [
      {
        id: "q44",
        q: "Do you book train tickets?",
        a: "Yes. We are an authorized IRCTC agent. Service charges are over and above IRCTC fees: ₹40 per sleeper ticket, ₹75 per AC 3T/2T, ₹150 for Tatkal. PNR check is ₹10. We'll print your e-ticket and give it to you, or send via WhatsApp.",
      },
      {
        id: "q45",
        q: "What is your refund policy on cancelled tickets?",
        a: "Cancellation refunds follow IRCTC / airline / bus operator rules — we have no control over their refund policies. Our service fee is non-refundable as it covers the booking work already done. We will help you process the cancellation for ₹50 per ticket.",
      },
    ],
  },
  {
    id: "schemes-education",
    name: "Schemes & Education",
    icon: GraduationCap,
    description: "PM Kisan, Ayushman, scholarships, ration card.",
    entries: [
      {
        id: "q46",
        q: "Can you help me apply for Ayushman Bharat / PM-JAY?",
        a: "Yes. To check eligibility and apply, bring:",
        bullets: [
          "Aadhaar card (of all family members)",
          "Ration card",
          "Income proof (if available)",
        ],
        aTail:
          "We check your eligibility on the PM-JAY portal, complete the application, and download your e-Ayushman card if approved. Service charge: ₹50.",
      },
      {
        id: "q47",
        q: "Can you help me apply for scholarships?",
        a: "Yes. We help with NSP (National Scholarship Portal) and Maharashtra state scholarships. You will need:",
        bullets: [
          "Bonafide certificate from your college / school",
          "Last year's marksheet",
          "Income certificate",
          "Caste / community certificate (for SC/ST/OBC scholarships)",
          "Bank account details (in student's name)",
          "Aadhaar (linked with bank and mobile)",
        ],
        aTail:
          "Service charge: ₹100 per application + ₹50 for document upload.",
      },
    ],
  },
  {
    id: "jyotish",
    name: "Sarathi Jyotish (Astrology)",
    icon: Sparkles,
    description: "Kundli, Milan, Muhurat, Vastu, consultations.",
    entries: [
      {
        id: "q48",
        q: "Are your astrology services part of Sarathi Digital Seva Kendra?",
        a: "Sarathi Jyotish operates from the same shop but is a separate service brand. Astrology is not a Common Services Centre / Digital India service — it is our own value-added offering. We have kept the two clearly branded so customers understand the distinction.",
      },
      {
        id: "q49",
        q: "What makes Sarathi Jyotish different from other astrologers?",
        a: "Three differences:",
        bullets: [
          "Software-backed accuracy — we use Swiss Ephemeris, the same astronomical engine used by professional astrologers worldwide. Charts are computed to high precision, no manual errors.",
          "Multiple systems — Vedic, KP, Lal Kitab, and Numerology under one roof. We use whichever method best fits your question.",
          "Reports in 4 languages — Hindi, Marathi, Gujarati, English. Most other astrologers serve only one or two languages.",
        ],
      },
      {
        id: "q50",
        q: "What information do you need to make a Kundli?",
        a: "We need:",
        bullets: [
          "Date of birth (DD/MM/YYYY)",
          "Time of birth (as accurate as possible — from hospital records or family memory)",
          "Place of birth (city / town / village)",
          "Full name and gender",
        ],
        aTail:
          "Birth time accuracy is critical. Even a few minutes' error can change the ascendant (lagna) and significantly affect predictions. If you don't know your exact time, we can help with birth time rectification using known life events (additional charge).",
      },
      {
        id: "q51",
        q: "How long does a Kundli or Kundli Milan report take?",
        a: "Standard turnaround:",
        bullets: [
          "Basic Janma Kundli (₹251) — same day or next day",
          "Detailed Kundli (₹501) — 1–2 days",
          "Kundli Milan (₹501–999) — 1–2 days",
          "Vastu site visit + report — 3–5 days after visit",
        ],
        aTail: "Express same-day delivery is available for ₹201 extra.",
      },
      {
        id: "q52",
        q: "Can you help me find an auspicious date for my marriage / business opening / new house?",
        a: "Yes. This is called Muhurat selection. We will analyze panchang, planetary positions, your kundli (if available), and provide 3 best dates with specific time windows and reasoning. Pricing varies: marriage/engagement ₹1,101; business/shop ₹751; gruhapravesh ₹751; vehicle purchase ₹501.",
      },
      {
        id: "q53",
        q: "Do you guarantee that the predictions will come true?",
        a: "No — and any astrologer who does is not being honest. Astrology is interpretive guidance based on traditional principles. It can highlight tendencies, favorable periods, and areas of caution, but it cannot guarantee outcomes. Always combine astrology with practical effort, professional advice (medical, legal, financial), and your own judgment.",
      },
      {
        id: "q54",
        q: "Are astrology readings confidential?",
        a: "Yes. Your birth details, kundli, and consultation contents are kept strictly confidential. We do not share or display any client information. Reports are delivered only to you (in person, WhatsApp, or email).",
      },
      {
        id: "q55",
        q: "Do you do gemstone / yantra / mantra recommendations?",
        a: "Yes. We give written recommendations for gemstones (with wearing instructions), yantras (planet-specific), and mantras (personalized japas). We do NOT sell the gemstones or yantras ourselves — you are free to purchase from your trusted vendor. We provide independent guidance only.",
      },
      {
        id: "q56",
        q: "Do you offer black magic removal, dosha removal, or guaranteed-result services?",
        a: "No. We do not offer any service that involves promises to remove evil eye, dosha, black magic, or guarantee outcomes through rituals. Such services are often misused by fraudsters to exploit vulnerable people. We focus only on traditional, ethical Vedic astrology and remedies.",
      },
    ],
  },
  {
    id: "payment-refund-pickup",
    name: "Payment, Refund & Pickup",
    icon: Receipt,
    description: "How to pay, refund policy, delivery options.",
    entries: [
      {
        id: "q57",
        q: "What payment methods do you accept?",
        a: "We accept:",
        bullets: [
          "Cash",
          "UPI (Google Pay, PhonePe, Paytm, BHIM)",
          "Debit and credit cards (for amounts above ₹500)",
          "Bank transfer / NEFT for retainer clients",
        ],
        aTail: "GST-registered customers can request a tax invoice.",
      },
      {
        id: "q58",
        q: "Do you ask for advance payment?",
        a: "It depends on the service:",
        bullets: [
          "Walk-in services (printing, photo, documentation, recharges) — pay on completion",
          "Government applications with fees (passport, RTO, certificates) — full govt fee + 50% service charge as advance; balance on completion",
          "Compliance work (GST, ITR, company registration) — 50% advance, balance on filing",
          "Astrology reports — full payment in advance",
        ],
        aTail:
          "We always issue a receipt / WhatsApp confirmation for any advance taken.",
      },
      {
        id: "q59",
        q: "What is your refund policy?",
        a: "Our refund policy depends on the stage of work:",
        bullets: [
          "If we have not started the work — full refund of service charge (govt fees already paid are non-refundable)",
          "If work is partially done — refund proportional to remaining work",
          "If work is complete and submitted to government — no refund (we have already done the work)",
          "If government rejects your application due to a fault on our side — we re-do for free",
          "If rejection is due to incorrect/missing documents from your side — we charge for redoing",
          "Astrology reports are non-refundable once delivered",
        ],
        aTail:
          "Government fees are paid directly to the government and are governed by their refund rules — usually non-refundable.",
      },
      {
        id: "q60",
        q: "Can I get my work done and delivered at home?",
        a: "Yes, for many services. WhatsApp us your documents, we process the work, and we offer:",
        bullets: [
          "Home delivery within 1 km of the shop — ₹50",
          "Home delivery within 1–3 km — ₹100",
          "Pickup of original documents (when needed) — same rates",
        ],
        aTail:
          "Home delivery is especially useful for senior citizens, people with mobility issues, and busy professionals.",
      },
    ],
  },
  {
    id: "privacy",
    name: "Privacy & Data Security",
    icon: Lock,
    description: "How we handle your documents and personal data.",
    entries: [
      {
        id: "q61",
        q: "How safe are my documents and personal information with you?",
        a: "We treat your data with strict confidentiality:",
        bullets: [
          "Aadhaar, PAN, and other ID copies are used only for the specific service you requested",
          "We do not share your data with any third party except the relevant government department or service provider for the work",
          "Digital documents are stored securely and deleted after the work is complete (except for compliance retainers where we need to keep records for filing purposes)",
          "Original documents are returned to you the same day in most cases",
          "Our staff are trained on confidentiality",
        ],
        aTail:
          "If you ever feel your data has been mishandled, please raise it with us immediately.",
      },
      {
        id: "q62",
        q: "Do you keep copies of my Aadhaar / PAN?",
        a: "We keep digital copies only as long as needed to complete your service. After completion, copies are securely deleted. For ongoing GST / ITR / compliance retainer clients, we maintain records as legally required by the government (typically 6–8 years for tax records). We never use your documents for any purpose beyond the service you have engaged us for.",
      },
      {
        id: "q63",
        q: "Will my information be shared with anyone?",
        a: "Only with the government department or service provider directly relevant to your work (e.g., UIDAI for Aadhaar, Income Tax Department for ITR, MCA for company registration, your chosen insurer for insurance). We do not sell, share, or distribute customer data for marketing or any other purpose.",
      },
    ],
  },
  {
    id: "complaints",
    name: "Complaints & Grievance",
    icon: MessageCircle,
    description: "How to raise a complaint or give feedback.",
    entries: [
      {
        id: "q64",
        q: "What if I am not happy with the service?",
        a: "Please raise it with us first — most issues are simple misunderstandings that can be resolved quickly. Steps:",
        bullets: [
          "Speak to the operator at the shop directly",
          "If unresolved, ask to speak with the proprietor",
          "Send a detailed complaint on WhatsApp with photos / receipts — we respond within 24 hours",
          "Email us at the shop email with subject 'Complaint' — written response within 48 hours",
        ],
        aTail:
          "We take customer feedback seriously. If we made a mistake, we will fix it. If a refund is due as per our refund policy, we will process it.",
      },
      {
        id: "q65",
        q: "What if my application is rejected by the government?",
        a: "Government rejections happen for many reasons. Our process:",
        bullets: [
          "We immediately inform you of the rejection and the reason",
          "If the rejection is due to our error (incorrect form, wrong category) — we re-file at no extra cost",
          "If the rejection is due to missing or incorrect documents from your side — we re-file at our service charge (govt fees may also be re-paid as per govt rules)",
          "If the rejection is due to genuine eligibility issues — we will guide you on alternatives, but a refund is not applicable",
        ],
        aTail:
          "We try our best to anticipate issues before submission, but no agent can guarantee government approval.",
      },
      {
        id: "q66",
        q: "Where else can I escalate if my issue is not resolved at your shop?",
        a: "For specific service issues, you can reach out to:",
        bullets: [
          "CSC related issues — CSC e-Governance Services India helpline (1800-3000-3468)",
          "UIDAI / Aadhaar issues — 1947 (toll-free)",
          "Income Tax issues — IT Department helpdesk (1800-103-0025)",
          "Consumer disputes — Maharashtra State Consumer Commission, online at consumerhelpline.gov.in",
        ],
        aTail:
          "For astrology-related concerns, please raise with us directly — we will work towards a fair resolution.",
      },
    ],
  },
];

// Total entries — used by the page header for a "{n} questions across {m} categories" badge.
export const FAQ_TOTAL_ENTRIES = FAQ_CATEGORIES.reduce(
  (sum, c) => sum + c.entries.length,
  0
);

// Build a lower-cased haystack per entry once at module scope so the search
// loop on every keystroke doesn't repeatedly toLowerCase the same strings.
export interface FaqIndexed extends FaqEntry {
  category: FaqCategory;
  haystack: string;
}

export const FAQ_INDEX: FaqIndexed[] = FAQ_CATEGORIES.flatMap((cat) =>
  cat.entries.map((e) => ({
    ...e,
    category: cat,
    haystack: [
      cat.name,
      e.q,
      e.a,
      ...(e.bullets ?? []),
      e.aTail ?? "",
      ...(e.tags ?? []),
    ]
      .join(" \n ")
      .toLowerCase(),
  }))
);
