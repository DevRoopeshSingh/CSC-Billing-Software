// ─── Agent Tool Registry ─────────────────────────────────────────────────────
// Defines all tools that an LLM agent can call. In Phase 1 this is just the
// manifest (schema definitions). In Phase 2, each tool gets a live handler
// function that calls the corresponding API endpoint internally.

export interface AgentToolParameter {
  type: string;
  description: string;
  enum?: string[];
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, AgentToolParameter>;
    required: string[];
  };
  allowedAgents: ("copilot" | "external")[];
  riskLevel: "read" | "write" | "destructive";
}

export const AGENT_TOOLS: AgentToolDefinition[] = [
  // ─── Read Tools ──────────────────────────────────────────────────────────
  {
    name: "search_customers",
    description: "Search for customers by name or mobile number. Returns matching customer records.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Name or mobile number to search for" },
      },
      required: ["search"],
    },
    allowedAgents: ["copilot"],
    riskLevel: "read",
  },
  {
    name: "get_customer_history",
    description: "Get a customer's complete invoice history including totals and dates. Requires the customer ID.",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "number", description: "The customer's ID" },
      },
      required: ["customerId"],
    },
    allowedAgents: ["copilot"],
    riskLevel: "read",
  },
  {
    name: "search_invoices",
    description: "Search invoices by customer name/mobile, invoice ID, status (PAID/PENDING/CANCELLED), or date range.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Search by customer name, mobile, or invoice number" },
        status: { type: "string", description: "Filter by status", enum: ["PAID", "PENDING", "CANCELLED", "ALL"] },
        start: { type: "string", description: "Start date in YYYY-MM-DD format" },
        end: { type: "string", description: "End date in YYYY-MM-DD format" },
      },
      required: [],
    },
    allowedAgents: ["copilot"],
    riskLevel: "read",
  },
  {
    name: "search_services",
    description: "Search the service catalog by name, category, or keyword aliases. Returns service name, price, and tax rate.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Search by service name or keyword" },
        category: { type: "string", description: "Filter by category", enum: ["Govt Services", "Banking", "Education", "Utility", "Other"] },
      },
      required: [],
    },
    allowedAgents: ["copilot", "external"],
    riskLevel: "read",
  },
  {
    name: "get_service_checklist",
    description: "Get the list of required documents for a specific service. Helps customers know what to bring.",
    parameters: {
      type: "object",
      properties: {
        serviceId: { type: "number", description: "The service ID to get the checklist for" },
      },
      required: ["serviceId"],
    },
    allowedAgents: ["copilot", "external"],
    riskLevel: "read",
  },
  {
    name: "get_reports",
    description: "Get business reports — daily revenue, service-level stats, or top customers. Supports date range filtering.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", description: "Report type", enum: ["daily", "date-range", "service", "customer"] },
        start: { type: "string", description: "Start date in YYYY-MM-DD format" },
        end: { type: "string", description: "End date in YYYY-MM-DD format" },
      },
      required: ["type"],
    },
    allowedAgents: ["copilot"],
    riskLevel: "read",
  },
  {
    name: "search_faq",
    description: "Search the FAQ knowledge base for answers to common customer questions about the center, services, and documents.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Search query" },
        category: { type: "string", description: "FAQ category filter", enum: ["General", "Services", "Documents", "Timing", "Payment", "Other"] },
      },
      required: ["search"],
    },
    allowedAgents: ["external"],
    riskLevel: "read",
  },
  {
    name: "get_center_info",
    description: "Get the CSC center's name, address, phone number, email, operating hours, and description.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    allowedAgents: ["copilot", "external"],
    riskLevel: "read",
  },
  {
    name: "get_message_templates",
    description: "List available WhatsApp/SMS message templates for customer communication.",
    parameters: {
      type: "object",
      properties: {
        channel: { type: "string", description: "Filter by channel", enum: ["whatsapp", "sms", "both"] },
      },
      required: [],
    },
    allowedAgents: ["copilot"],
    riskLevel: "read",
  },
  {
    name: "render_message",
    description: "Render a message template with actual customer/invoice data, replacing placeholders like {{customerName}} and {{total}}.",
    parameters: {
      type: "object",
      properties: {
        templateId: { type: "number", description: "The message template ID" },
        variables: {
          type: "object",
          description: "Key-value pairs for template variables: customerName, invoiceNo, total, status, centerName, serviceName",
        },
      },
      required: ["templateId", "variables"],
    },
    allowedAgents: ["copilot"],
    riskLevel: "read",
  },
  {
    name: "unified_search",
    description: "Search across all entities (customers, invoices, services, FAQ) in a single query. Best for general questions.",
    parameters: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query" },
        types: { type: "string", description: "Comma-separated entity types to search: customers,invoices,services,faq" },
      },
      required: ["q"],
    },
    allowedAgents: ["copilot"],
    riskLevel: "read",
  },

  // ─── Write Tools ─────────────────────────────────────────────────────────
  {
    name: "create_customer",
    description: "Create a new customer record with name and mobile number.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Customer's full name" },
        mobile: { type: "string", description: "Customer's mobile number" },
        email: { type: "string", description: "Customer's email (optional)" },
      },
      required: ["name"],
    },
    allowedAgents: ["copilot"],
    riskLevel: "write",
  },
  {
    name: "create_invoice",
    description: "Create a new invoice/bill for a customer with line items, discount, and payment mode.",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "number", description: "Existing customer ID" },
        items: {
          type: "array",
          description: "Line items — each with serviceId, description, qty, rate, taxRate",
        },
        discount: { type: "number", description: "Discount amount in ₹ (default: 0)" },
        paymentMode: { type: "string", description: "Payment mode", enum: ["Cash", "UPI", "Other"] },
        status: { type: "string", description: "Invoice status", enum: ["PAID", "PENDING"] },
      },
      required: ["customerId", "items"],
    },
    allowedAgents: ["copilot"],
    riskLevel: "write",
  },
  {
    name: "create_lead",
    description: "Capture a new lead/interested customer. Used when someone asks about services but isn't ready to visit yet.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Person's name" },
        mobile: { type: "string", description: "Mobile number" },
        email: { type: "string", description: "Email address (optional)" },
        serviceInterest: { type: "string", description: "Which service they are interested in" },
      },
      required: ["name"],
    },
    allowedAgents: ["copilot", "external"],
    riskLevel: "write",
  },

  // ─── Destructive Tools ───────────────────────────────────────────────────
  {
    name: "update_invoice_status",
    description: "Change an invoice's status to PAID or CANCELLED. Cancellation is destructive and requires confirmation.",
    parameters: {
      type: "object",
      properties: {
        invoiceId: { type: "number", description: "The invoice ID" },
        status: { type: "string", description: "New status", enum: ["PAID", "CANCELLED"] },
      },
      required: ["invoiceId", "status"],
    },
    allowedAgents: ["copilot"],
    riskLevel: "destructive",
  },
];
