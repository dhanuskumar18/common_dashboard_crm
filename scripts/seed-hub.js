const { Pool } = require('pg');
const crypto = require('crypto');

const HUB_URL = process.env.HUB_DATABASE_URL || 'postgresql://hub_user:HubPassword123!@localhost:5480/hubdb';

const TEST_LEADS = [
  {
    firstName: 'Aarav',
    lastName: 'Sharma',
    email: 'aarav.sharma@apexsol.com',
    phone: '+91 98201 44521',
    companyName: 'Apex Cloud Solutions',
    source: 'WEBSITE',
    sourceDetails: 'Google Organic Search - Landing Page',
    industry: 'Information Technology',
    interest: 'Enterprise ERP Migration & AWS Cloud Infrastructure',
    description: 'Looking to migrate 40+ on-premise servers to AWS/GCP with auto-scaling and 24/7 DevOps management.',
    estimatedValue: 240000,
    currency: 'INR',
    priority: 'HIGH',
    notes: 'Inquiry received via web inquiry form. Prefers callback in evening.',
  },
  {
    firstName: 'Priya',
    lastName: 'Nair',
    email: 'priya.nair@zenithetail.in',
    phone: '+91 94471 22319',
    companyName: 'Zenith E-Commerce India',
    source: 'SOCIAL_MEDIA',
    sourceDetails: 'LinkedIn Sponsored Ad - B2B Commerce',
    industry: 'Retail & E-commerce',
    interest: 'Custom Headless Shopify + High-Concurrency Backend',
    description: 'Need a fast headless Next.js frontend with high-concurrency payment gateway integrations for festive sale peak loads.',
    estimatedValue: 185000,
    currency: 'INR',
    priority: 'URGENT',
    notes: 'Urgent timeline: needs initial prototype ready within 4 weeks.',
  },
  {
    firstName: 'Vikram',
    lastName: 'Patel',
    email: 'vikram.p@bluestarlogistics.org',
    phone: '+91 98791 88204',
    companyName: 'Blue Star Logistics Ltd',
    source: 'REFERRAL',
    sourceDetails: 'Referred by Suresh Singhania',
    industry: 'Supply Chain & Logistics',
    interest: 'Fleet GPS Tracking & Dispatch Automation Portal',
    description: 'Tracking for 150+ commercial trucks with real-time fuel efficiency analytics and driver dispatch mobile app.',
    estimatedValue: 420000,
    currency: 'INR',
    priority: 'HIGH',
    notes: 'Decision maker ready to schedule technical demo next Tuesday.',
  },
  {
    firstName: 'Ananya',
    lastName: 'Deshmukh',
    email: 'ananya@fincrestadvisory.com',
    phone: '+91 98220 77112',
    companyName: 'FinCrest Wealth Advisory',
    source: 'ADVERTISEMENT',
    sourceDetails: 'Google Search Ads - Financial Tech',
    industry: 'Financial Services & Wealth Management',
    interest: 'Client Portfolio Portal & Secure Document Vault',
    description: 'Multi-tenant client investor dashboard with two-factor authentication and automated portfolio PDF statement generation.',
    estimatedValue: 310000,
    currency: 'INR',
    priority: 'URGENT',
    notes: 'Requires compliance with RBI guidelines on data residency in India.',
  },
  {
    firstName: 'Rohan',
    lastName: 'Menon',
    email: 'rohan.menon@keralaspicesonline.com',
    phone: '+91 98460 33901',
    companyName: 'Malabar Spices & Agro Exports',
    source: 'WEBSITE',
    sourceDetails: 'Contact Us form inquiry',
    industry: 'Food & Agriculture Export',
    interest: 'International B2B Export Catalog with Currency Switcher',
    description: 'Multi-currency export ordering portal for GCC and European buyers with custom quotation generation.',
    estimatedValue: 145000,
    currency: 'INR',
    priority: 'MEDIUM',
    notes: 'Budget is flexible if payment gateway integrates Stripe & PayPal.',
  },
  {
    firstName: 'Sneha',
    lastName: 'Kulkarni',
    email: 'sneha.k@novamedia.co',
    phone: '+91 99231 66450',
    companyName: 'Nova Digital Media Hub',
    source: 'COLD_OUTREACH',
    sourceDetails: 'Outbound Email Campaign Q4',
    industry: 'Media & Marketing',
    interest: 'Dedicated Fullstack Developer Retainer',
    description: 'Seeking 2 dedicated senior React + Node.js developers on annual contract for ongoing agency client deliverables.',
    estimatedValue: 720000,
    currency: 'INR',
    priority: 'HIGH',
    notes: 'Wants to review GitHub profiles and conduct technical screen.',
  },
  {
    firstName: 'Karthik',
    lastName: 'Ramanathan',
    email: 'karthik@rayantech.io',
    phone: '+91 98840 55123',
    companyName: 'Rayan Smart IoT Systems',
    source: 'PARTNER',
    sourceDetails: 'AWS Solution Partner Network Referral',
    industry: 'Industrial IoT',
    interest: 'Telemetry Dashboard & MQTT Broker Cluster',
    description: 'Need visual dashboards for factory sensor telemetry, parsing 5000 events/sec via TimescaleDB/PostgreSQL.',
    estimatedValue: 560000,
    currency: 'INR',
    priority: 'URGENT',
    notes: 'High probability deal. Needs formal proposal and RFP response.',
  },
  {
    firstName: 'Meera',
    lastName: 'Iyer',
    email: 'meera.iyer@healthnestcare.in',
    phone: '+91 97690 11840',
    companyName: 'HealthNest Telemedicine',
    source: 'WEBSITE',
    sourceDetails: 'Blog Post - Healthcare CRM Solutions',
    industry: 'Healthcare & HealthTech',
    interest: 'Doctor Appointment Scheduling & Video Consultations',
    description: 'WebRTC video consultation portal with integrated prescription management and WhatsApp automated appointment reminders.',
    estimatedValue: 275000,
    currency: 'INR',
    priority: 'MEDIUM',
    notes: 'Interested in seeing live case studies in telemedicine.',
  },
  {
    firstName: 'Aditya',
    lastName: 'Verma',
    email: 'aditya.verma@urbancraftfurnishings.com',
    phone: '+91 98110 99402',
    companyName: 'UrbanCraft Modular Interiors',
    source: 'SOCIAL_MEDIA',
    sourceDetails: 'Instagram Business Sponsored Reel',
    industry: 'Architecture & Interior Design',
    interest: '3D Room Quotation & Cost Calculator Tool',
    description: 'Interactive cost estimation calculator for home buyers to estimate modular kitchen and wardrobe pricing.',
    estimatedValue: 120000,
    currency: 'INR',
    priority: 'LOW',
    notes: 'Early stage inquiry, comparing 3 different tech agencies.',
  },
  {
    firstName: 'Deepak',
    lastName: 'Choudhary',
    email: 'deepak@rajasthanmarbles.in',
    phone: '+91 94140 88310',
    companyName: 'Royal Rajasthan Granites',
    source: 'EXISTING_CUSTOMER',
    sourceDetails: 'Up-sell / Phase 2 Expansion',
    industry: 'Mining & Building Materials',
    interest: 'Inventory & Warehouse Barcode Scanner App',
    description: 'Mobile PWA for warehouse staff to scan marble slab QR codes, track stock counts, and generate delivery challans.',
    estimatedValue: 195000,
    currency: 'INR',
    priority: 'HIGH',
    notes: 'Repeat client, ready to advance upon contract submission.',
  },
];

async function seed() {
  console.log(`Connecting to Hub Database at: ${HUB_URL}`);
  const pool = new Pool({ connectionString: HUB_URL });

  try {
    const client = await pool.connect();
    console.log('Connected successfully!');

    // 1. Create hub schema and tables
    console.log('Setting up schema "hub"...');
    await client.query(`CREATE SCHEMA IF NOT EXISTS hub`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS hub.leads (
        id               text PRIMARY KEY,
        "firstName"      text NOT NULL,
        "lastName"       text NOT NULL DEFAULT '',
        email            text NOT NULL,
        phone            text,
        "companyName"    text,
        source           text NOT NULL DEFAULT 'WEBSITE',
        "sourceDetails"  text,
        industry         text,
        interest         text,
        description      text,
        "estimatedValue" numeric(18,2),
        currency         text NOT NULL DEFAULT 'INR',
        priority         text NOT NULL DEFAULT 'MEDIUM',
        notes            text,
        status           text NOT NULL DEFAULT 'UNASSIGNED',
        "assignedCompany" text,
        "assignedLeadId"  text,
        "assignedAt"      timestamptz,
        "createdAt"      timestamptz NOT NULL DEFAULT now(),
        "deletedAt"      timestamptz
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS hub.lead_transfers (
        id            text PRIMARY KEY,
        "fromCompany" text NOT NULL,
        "fromLeadId"  text NOT NULL,
        "toCompany"   text NOT NULL,
        "toLeadId"    text NOT NULL,
        "leadName"    text,
        "movedBy"     text,
        "movedAt"     timestamptz NOT NULL DEFAULT now()
      )
    `);

    await client.query(
      `CREATE INDEX IF NOT EXISTS hub_leads_status_idx ON hub.leads (status, "deletedAt")`
    );

    // 2. Insert test leads
    console.log(`Feeding ${TEST_LEADS.length} test leads into hub.leads...`);
    let count = 0;

    for (const lead of TEST_LEADS) {
      // Check if lead with this email already exists
      const existing = await client.query(
        `SELECT id FROM hub.leads WHERE email = $1 AND "deletedAt" IS NULL`,
        [lead.email]
      );

      if (existing.rowCount === 0) {
        const id = crypto.randomUUID();
        await client.query(
          `INSERT INTO hub.leads (
            id, "firstName", "lastName", email, phone, "companyName",
            source, "sourceDetails", industry, interest, description,
            "estimatedValue", currency, priority, notes, status, "createdAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'UNASSIGNED', now() - (interval '1 hour' * $16)
          )`,
          [
            id,
            lead.firstName,
            lead.lastName,
            lead.email,
            lead.phone,
            lead.companyName,
            lead.source,
            lead.sourceDetails,
            lead.industry,
            lead.interest,
            lead.description,
            lead.estimatedValue,
            lead.currency,
            lead.priority,
            lead.notes,
            count * 4, // spread out creation times
          ]
        );
        count++;
        console.log(`  + [${lead.priority}] ${lead.firstName} ${lead.lastName} (${lead.companyName}) - ₹${lead.estimatedValue.toLocaleString()}`);
      } else {
        console.log(`  ~ Already exists: ${lead.email}`);
      }
    }

    const totalRes = await client.query(`SELECT COUNT(*)::int AS total FROM hub.leads WHERE status = 'UNASSIGNED' AND "deletedAt" IS NULL`);
    console.log(`\nDone! Total unassigned leads now in Hub Database: ${totalRes.rows[0].total}`);
    client.release();
  } catch (err) {
    console.error('Error seeding Hub Database:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
