import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CSC_SERVICES = [
  { name: "Aadhaar Update", category: "Govt Services", defaultPrice: 50, taxRate: 0 },
  { name: "Pan Card Application", category: "Govt Services", defaultPrice: 150, taxRate: 0 },
  { name: "Passport Application", category: "Govt Services", defaultPrice: 1500, taxRate: 0 },
  { name: "Voter ID Service", category: "Govt Services", defaultPrice: 50, taxRate: 0 },
  { name: "Driving License", category: "Govt Services", defaultPrice: 250, taxRate: 0 },
  { name: "Bank Passbook Print", category: "Banking & Payments", defaultPrice: 20, taxRate: 0 },
  { name: "UPI Money Transfer", category: "Banking & Payments", defaultPrice: 20, taxRate: 0 },
  { name: "Xerox / Print (B&W)", category: "Miscellaneous", defaultPrice: 10, taxRate: 0 },
  { name: "Xerox / Print (Color)", category: "Miscellaneous", defaultPrice: 20, taxRate: 0 },
  { name: "Form Filling", category: "Miscellaneous", defaultPrice: 100, taxRate: 0 },
  { name: "Electricity Bill Pay", category: "Utility Bills", defaultPrice: 20, taxRate: 0 },
  { name: "Mobile/DTH Recharge", category: "Utility Bills", defaultPrice: 10, taxRate: 0 },
  { name: "Train Ticket Booking", category: "Travel", defaultPrice: 50, taxRate: 5, keywords: "train,irctc,railway,tatkal" },
  { name: "Bus Ticket Booking", category: "Travel", defaultPrice: 40, taxRate: 5, keywords: "bus,redbus,state transport,apsrtc" },
  { name: "Flight Ticket Booking", category: "Travel", defaultPrice: 200, taxRate: 5, keywords: "flight,air,airplane,airline,spicejet,indigo" },
  { name: "Ayushman Bharat Card", category: "Healthcare", defaultPrice: 50, taxRate: 0, keywords: "health,pmjay,medical" },
  { name: "e-Shram Card Registration", category: "Govt Services", defaultPrice: 50, taxRate: 0, keywords: "shramik,labour,worker" },
  { name: "PM Kisan eKYC", category: "Govt Services", defaultPrice: 50, taxRate: 0, keywords: "kisan,farmer,agriculture" },
  { name: "Income/Caste/Domicile Cert", category: "Govt Services", defaultPrice: 100, taxRate: 0, keywords: "certificate,edistrict,revenue" },
  { name: "Ration Card Service", category: "Govt Services", defaultPrice: 50, taxRate: 0, keywords: "ration,pds,food" },
  { name: "Jeevan Pramaan (Life Cert)", category: "Govt Services", defaultPrice: 50, taxRate: 0, keywords: "pension,veteran,jeevan" },
  { name: "Birth/Death Certificate", category: "Govt Services", defaultPrice: 100, taxRate: 0, keywords: "municipal,nagar,panchayat" },
  { name: "ITR Filing", category: "Financial Services", defaultPrice: 300, taxRate: 18, keywords: "tax,return,income tax" },
  { name: "GST Registration", category: "Financial Services", defaultPrice: 500, taxRate: 18, keywords: "gst,business,tax" },
  { name: "MSME / Udyam Registration", category: "Financial Services", defaultPrice: 150, taxRate: 0, keywords: "business,udyam,startup" },
  { name: "FSSAI Food License", category: "Financial Services", defaultPrice: 200, taxRate: 0, keywords: "food,hotel,restaurant" },
  { name: "FASTag Recharge/Issue", category: "Auto & Insurance", defaultPrice: 100, taxRate: 0, keywords: "toll,highway,car" },
  { name: "Vehicle Insurance", category: "Auto & Insurance", defaultPrice: 150, taxRate: 0, keywords: "motor,bike,car" },
  { name: "LIC Premium Payment", category: "Auto & Insurance", defaultPrice: 50, taxRate: 0, keywords: "life,insurance,installment" },
  { name: "Sarkari Job Form Fill", category: "Education", defaultPrice: 100, taxRate: 0, keywords: "upsc,ssc,police,exam" },
  { name: "Scholarship Form", category: "Education", defaultPrice: 50, taxRate: 0, keywords: "school,college,student" },
  { name: "EPFO / PF Claims", category: "Govt Services", defaultPrice: 150, taxRate: 0, keywords: "pf,provident,pension,epfo" },
  { name: "Digital Signature Cert (DSC)", category: "Govt Services", defaultPrice: 1500, taxRate: 18, keywords: "dsc,signature,token" },
  { name: "E-Stamp / Franking", category: "Govt Services", defaultPrice: 100, taxRate: 0, keywords: "stamp,franking,affidavit" },
  { name: "Trade License / Shop Act", category: "Govt Services", defaultPrice: 250, taxRate: 0, keywords: "shop,trade,license,municipal" },
  { name: "AEPS Cash Withdrawal", category: "Banking & Payments", defaultPrice: 20, taxRate: 0, keywords: "aeps,aadhaar,cash,atm" },
  { name: "Domestic Money Transfer", category: "Banking & Payments", defaultPrice: 50, taxRate: 0, keywords: "money,transfer,remittance,dmt" },
  { name: "Credit Card Bill Payment", category: "Banking & Payments", defaultPrice: 30, taxRate: 0, keywords: "credit card,bill,payment" },
  { name: "Courier Booking", category: "Miscellaneous", defaultPrice: 50, taxRate: 5, keywords: "courier,post,package,parcel" },
  { name: "New DTH Connection", category: "Utility Bills", defaultPrice: 1500, taxRate: 18, keywords: "dth,tv,tata play,airtel" },
  { name: "New SIM Activation", category: "Utility Bills", defaultPrice: 250, taxRate: 0, keywords: "sim,mobile,number,mnp" },
  { name: "Urgent Passport Photos", category: "Miscellaneous", defaultPrice: 50, taxRate: 0, keywords: "photo,camera,print" },
  { name: "Lamination", category: "Miscellaneous", defaultPrice: 20, taxRate: 0, keywords: "laminate,plastic,cover" },
  { name: "Spiral Binding", category: "Miscellaneous", defaultPrice: 50, taxRate: 0, keywords: "binding,book,spiral" },
  { name: "Resume / CV Designing", category: "Miscellaneous", defaultPrice: 100, taxRate: 0, keywords: "resume,cv,bio data,job" },
  { name: "Color Scanning", category: "Miscellaneous", defaultPrice: 10, taxRate: 0, keywords: "scan,pdf,document" },
];

const DEFAULT_FAQS = [
  { question: "How many days does a new PAN card take to arrive?", answer: "Usually 7-15 working days by post.", category: "General", tags: "pan, time, post" },
  { question: "What documents are needed for Udyam Registration?", answer: "Aadhaar linked with mobile and Bank details.", category: "Business", tags: "udyam, msme, business" },
  { question: "Can I update my Aadhaar details here?", answer: "We can only print Aadhaar. Demographic updates require visiting an official Aadhaar center with biometrics.", category: "General", tags: "aadhaar, update" },
  { question: "How long does Passport police verification take?", answer: "Usually 1-2 weeks after your appointment.", category: "General", tags: "passport, police, time" },
];

const DEFAULT_TEMPLATES = [
  { name: "Welcome & Estimate", channel: "whatsapp", body: "Hello! Welcome to our CSC Center. The estimated cost for your requested service is ₹{{amount}}. Please review." },
  { name: "Ready for Pickup", channel: "whatsapp", body: "Hi {{name}}, your documents / certificates are ready for pickup! Please visit our center between 9 AM and 6 PM." },
  { name: "Pending Documents", channel: "whatsapp", body: "Dear {{name}}, your application is pending due to missing documents. Please bring the following: {{documents}}." },
  { name: "Payment Received", channel: "whatsapp", body: "Thank you {{name}}! We have received your payment of ₹{{amount}} via {{payment_mode}}." },
];

const CHECKLIST_MAPPING: Record<string, string[]> = {
  "Pan Card Application": ["Aadhaar Card", "2 Passport Photos", "Signature/Thumb Print"],
  "Passport Application": ["Aadhaar Card", "10th Marksheet", "Voter ID / Bank Passbook", "4 Passport Photos"],
  "Driving License": ["Aadhaar Card", "Age Proof (10th/Birth Cert)", "Address Proof", "Blood Group Report"],
  "Train Ticket Booking": ["Passenger Names", "Passenger Ages", "Travel Dates"],
  "ITR Filing": ["Aadhaar Card", "PAN Card", "Bank Statement", "Form 16"],
  "GST Registration": ["PAN Card", "Aadhaar Card", "Shop Electricity Bill", "Rent Agreement", "Passport Photo"],
  "FSSAI Food License": ["Aadhaar Card", "Passport Photo", "Shop Details / NOC"],
  "EPFO / PF Claims": ["Aadhaar Linked with Mobile", "UAN Number", "Bank Passbook"],
};

export async function POST() {
  try {
    let newServicesCount = 0;
    for (const service of CSC_SERVICES) {
      const existing = await prisma.service.findFirst({ where: { name: service.name } });
      if (!existing) {
        await prisma.service.create({ data: service });
        newServicesCount++;
      }
    }

    let newFaqsCount = 0;
    for (const faq of DEFAULT_FAQS) {
      const existing = await prisma.faqEntry.findFirst({ where: { question: faq.question } });
      if (!existing) {
        await prisma.faqEntry.create({ data: faq });
        newFaqsCount++;
      }
    }

    let newTemplatesCount = 0;
    for (const template of DEFAULT_TEMPLATES) {
      const existing = await prisma.messageTemplate.findFirst({ where: { name: template.name } });
      if (!existing) {
        await prisma.messageTemplate.create({ data: template });
        newTemplatesCount++;
      }
    }

    let newChecklistsCount = 0;
    for (const [serviceName, documents] of Object.entries(CHECKLIST_MAPPING)) {
      const service = await prisma.service.findFirst({ where: { name: serviceName } });
      if (service) {
        for (const [index, doc] of documents.entries()) {
          const existing = await prisma.serviceChecklist.findFirst({
            where: { serviceId: service.id, documentName: doc }
          });
          if (!existing) {
            await prisma.serviceChecklist.create({
              data: { serviceId: service.id, documentName: doc, sortOrder: index, isRequired: true }
            });
            newChecklistsCount++;
          }
        }
      }
    }

    const messages = [];
    if (newServicesCount) messages.push(`${newServicesCount} Services`);
    if (newFaqsCount) messages.push(`${newFaqsCount} FAQs`);
    if (newTemplatesCount) messages.push(`${newTemplatesCount} Templates`);
    if (newChecklistsCount) messages.push(`${newChecklistsCount} Checklist Items`);

    if (messages.length > 0) {
      return NextResponse.json({ message: `Successfully seeded: ${messages.join(', ')}.`, seeded: true });
    } else {
      return NextResponse.json({ message: "All default data already exists. Skipped seed.", seeded: false });
    }
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Failed to seed default data" }, { status: 500 });
  }
}
