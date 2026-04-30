import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Shared demo seed used by both the CLI script (scripts/seed-demo.ts) and
// the nightly cron endpoint (app/api/cron/reset-demo/route.ts). The shape
// targets the Release 2.0 schema: companies + contacts + deals (with
// deal_contacts junction) + polymorphic notes. German B2B flavour so the
// live demo at crm.ibwayi.com tells a coherent story.
//
// Idempotent — the function wipes the demo user's data first and then
// re-inserts everything from scratch.

type AdminClient = SupabaseClient<Database>

type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"]
type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"]
type DealInsert = Database["public"]["Tables"]["deals"]["Insert"]
type DealContactInsert =
  Database["public"]["Tables"]["deal_contacts"]["Insert"]
type NoteInsert = Database["public"]["Tables"]["notes"]["Insert"]

export type SeedResult = {
  companiesInserted: number
  contactsInserted: number
  dealsInserted: number
  dealContactsInserted: number
  notesInserted: number
}

const DAY = 1000 * 60 * 60 * 24
const HOUR = 1000 * 60 * 60
const ago = (ms: number) => new Date(Date.now() - ms).toISOString()
const ahead = (ms: number) => new Date(Date.now() + ms).toISOString()

// expected_close_date is a DATE column (YYYY-MM-DD, no timezone).
const dateOnly = (iso: string): string => iso.slice(0, 10)

// -----------------------------------------------------------------------------
// Source data. Each row carries a string `key` so children can reference
// parents before any UUIDs exist. The seed function resolves keys → UUIDs
// after each batch insert.
// -----------------------------------------------------------------------------

type SeedCompany = Omit<CompanyInsert, "user_id"> & { key: string }

const COMPANIES: SeedCompany[] = [
  {
    key: "bytewise",
    name: "Bytewise Software GmbH",
    industry: "Software / SaaS",
    website: "https://bytewise.de",
    size_range: "51-200",
    phone: "+49 30 4455 6677",
    email: "kontakt@bytewise.de",
    address: "Friedrichstraße 145, 10117 Berlin",
  },
  {
    key: "hartmann",
    name: "Hartmann Maschinenbau AG",
    industry: "Maschinenbau",
    website: "https://hartmann-mb.de",
    size_range: "201-1000",
    phone: "+49 711 1112233",
    email: "info@hartmann-mb.de",
    address: "Industriestraße 8, 70565 Stuttgart",
  },
  {
    key: "strategiewerk",
    name: "Strategiewerk Beratung",
    industry: "Unternehmensberatung",
    website: "https://strategiewerk.de",
    size_range: "11-50",
    phone: "+49 89 9876543",
    email: "office@strategiewerk.de",
    address: "Maximilianstraße 32, 80539 München",
  },
  {
    key: "lehmann",
    name: "Lehmann & Partner Marketing",
    industry: "Marketing & Werbung",
    website: "https://lehmann-marketing.de",
    size_range: "11-50",
    phone: "+49 40 8889999",
    email: null,
    address: "Neuer Wall 22, 20354 Hamburg",
  },
  {
    key: "vogt",
    name: "Vogt Versicherungen",
    industry: "Versicherung",
    website: "https://vogt-versicherung.de",
    size_range: "51-200",
    phone: null,
    email: "service@vogt-versicherung.de",
    address: "Bockenheimer Landstraße 51, 60325 Frankfurt am Main",
  },
  {
    key: "medicare",
    name: "MediCare Praxisverbund",
    industry: "Gesundheitswesen",
    website: "https://medicare-praxis.de",
    size_range: "51-200",
    phone: "+49 221 6667788",
    email: "verwaltung@medicare-praxis.de",
    address: "Hohenzollernring 78, 50672 Köln",
  },
  {
    key: "kanzlei-becker",
    name: "Kanzlei Becker Rechtsanwälte",
    industry: "Recht",
    website: "https://becker-recht.de",
    size_range: "11-50",
    phone: "+49 211 5556677",
    email: "kanzlei@becker-recht.de",
    address: "Königsallee 14, 40212 Düsseldorf",
  },
  {
    key: "schneider-logistik",
    name: "Schneider Logistik GmbH",
    industry: "Transport & Logistik",
    website: "https://schneider-logistik.de",
    size_range: "201-1000",
    phone: "+49 511 3334455",
    email: "dispatch@schneider-logistik.de",
    address: "Bahnhofstraße 105, 30159 Hannover",
  },
  {
    key: "lernwerk",
    name: "Lernwerk Akademie",
    industry: "Bildung",
    website: "https://lernwerk-akademie.de",
    size_range: "11-50",
    phone: "+49 341 2233445",
    email: "kontakt@lernwerk-akademie.de",
    address: "Karl-Liebknecht-Straße 22, 04107 Leipzig",
  },
  {
    key: "stadtbau",
    name: "Stadtbau Immobilien",
    industry: "Immobilien",
    website: "https://stadtbau-immobilien.de",
    size_range: "51-200",
    phone: "+49 30 7788991",
    email: null,
    address: "Kurfürstendamm 200, 10719 Berlin",
  },
  {
    key: "genuss",
    name: "Genuss Catering",
    industry: "Gastronomie & Catering",
    website: "https://genuss-catering.de",
    size_range: "11-50",
    phone: "+49 30 1122334",
    email: "events@genuss-catering.de",
    address: "Torstraße 88, 10119 Berlin",
  },
  {
    key: "bauer-bau",
    name: "Bauer Bau & Renovierung",
    industry: "Bau & Handwerk",
    website: "https://bauer-bau.de",
    size_range: "11-50",
    phone: "+49 421 4455667",
    email: "info@bauer-bau.de",
    address: "Schlachte 21, 28195 Bremen",
  },
  {
    key: "sonnenkraft",
    name: "Sonnenkraft Energie",
    industry: "Energie & Umwelt",
    website: "https://sonnenkraft-energie.de",
    size_range: "201-1000",
    phone: "+49 761 9988776",
    email: "vertrieb@sonnenkraft-energie.de",
    address: "Kaiser-Joseph-Straße 250, 79098 Freiburg",
  },
  {
    key: "studio-pixel",
    name: "Studio Pixel Media",
    industry: "Medien & Design",
    website: "https://studio-pixel.de",
    size_range: "1-10",
    phone: null,
    email: "hello@studio-pixel.de",
    address: "Oranienstraße 6, 10997 Berlin",
  },
  {
    key: "klick-kauf",
    name: "Klick & Kauf E-Commerce",
    industry: "E-Commerce",
    website: "https://klick-kauf.de",
    size_range: "51-200",
    phone: "+49 221 8899001",
    email: "support@klick-kauf.de",
    address: "Aachener Straße 1056, 50858 Köln",
  },
]

type SeedContact = Omit<ContactInsert, "user_id" | "company_id"> & {
  key: string
  companyKey?: string
}

const CONTACTS: SeedContact[] = [
  // Bytewise — 3 contacts
  {
    key: "lukas-hoffmann",
    companyKey: "bytewise",
    first_name: "Lukas",
    last_name: "Hoffmann",
    email: "l.hoffmann@bytewise.de",
    phone: "+49 30 4455 6678",
    position: "CTO",
    linkedin_url: "https://linkedin.com/in/lukas-hoffmann-de",
    birthday: null,
  },
  {
    key: "sarah-bytewise",
    companyKey: "bytewise",
    first_name: "Sarah",
    last_name: "Klein",
    email: "s.klein@bytewise.de",
    phone: "+49 30 4455 6679",
    position: "Head of Sales",
    linkedin_url: null,
    birthday: "1986-09-12",
  },
  {
    key: "tim-bytewise",
    companyKey: "bytewise",
    first_name: "Tim",
    last_name: "Brandt",
    email: "t.brandt@bytewise.de",
    phone: null,
    position: "Frontend Lead",
    linkedin_url: null,
    birthday: null,
  },
  // Hartmann — 2 contacts
  {
    key: "max-hartmann",
    companyKey: "hartmann",
    first_name: "Maximilian",
    last_name: "Hartmann",
    email: "m.hartmann@hartmann-mb.de",
    phone: "+49 711 1112234",
    position: "Geschäftsführer",
    linkedin_url: "https://linkedin.com/in/m-hartmann-de",
    birthday: null,
  },
  {
    key: "petra-hartmann",
    companyKey: "hartmann",
    first_name: "Petra",
    last_name: "Adler",
    email: "p.adler@hartmann-mb.de",
    phone: null,
    position: "Head of Procurement",
    linkedin_url: null,
    birthday: null,
  },
  // Strategiewerk — 2 contacts
  {
    key: "anna-schaefer",
    companyKey: "strategiewerk",
    first_name: "Anna",
    last_name: "Schäfer",
    email: "a.schaefer@strategiewerk.de",
    phone: "+49 89 9876544",
    position: "Senior Partnerin",
    linkedin_url: "https://linkedin.com/in/anna-schaefer-mc",
    birthday: null,
  },
  {
    key: "felix-strategiewerk",
    companyKey: "strategiewerk",
    first_name: "Felix",
    last_name: "Wagner",
    email: "f.wagner@strategiewerk.de",
    phone: null,
    position: "Senior Consultant",
    linkedin_url: null,
    birthday: null,
  },
  // Lehmann — 1 contact
  {
    key: "sophie-lehmann",
    companyKey: "lehmann",
    first_name: "Sophie",
    last_name: "Lehmann",
    email: "sophie@lehmann-marketing.de",
    phone: "+49 40 8889998",
    position: "Account Director",
    linkedin_url: null,
    birthday: "1990-03-22",
  },
  // Vogt — 1 contact
  {
    key: "hannah-vogt",
    companyKey: "vogt",
    first_name: "Hannah",
    last_name: "Vogt",
    email: "h.vogt@vogt-versicherung.de",
    phone: null,
    position: "Vorstand",
    linkedin_url: null,
    birthday: null,
  },
  // MediCare — 2 contacts
  {
    key: "carolin-medicare",
    companyKey: "medicare",
    first_name: "Carolin",
    last_name: "Fischer",
    email: "c.fischer@medicare-praxis.de",
    phone: "+49 221 6667789",
    position: "Geschäftsführerin",
    linkedin_url: null,
    birthday: null,
  },
  {
    key: "ralf-medicare",
    companyKey: "medicare",
    first_name: "Ralf",
    last_name: "Müller",
    email: "r.mueller@medicare-praxis.de",
    phone: null,
    position: "IT-Leiter",
    linkedin_url: null,
    birthday: null,
  },
  // Kanzlei Becker — 1 contact
  {
    key: "miriam-becker",
    companyKey: "kanzlei-becker",
    first_name: "Miriam",
    last_name: "Becker",
    email: "m.becker@becker-recht.de",
    phone: "+49 211 5556678",
    position: "Senior Partnerin",
    linkedin_url: "https://linkedin.com/in/miriam-becker-recht",
    birthday: null,
  },
  // Schneider Logistik — 1 contact
  {
    key: "jonas-schneider",
    companyKey: "schneider-logistik",
    first_name: "Jonas",
    last_name: "Schneider",
    email: "j.schneider@schneider-logistik.de",
    phone: "+49 511 3334456",
    position: "Operations Manager",
    linkedin_url: null,
    birthday: null,
  },
  // Lernwerk — 2 contacts
  {
    key: "katharina-lernwerk",
    companyKey: "lernwerk",
    first_name: "Katharina",
    last_name: "Roth",
    email: "k.roth@lernwerk-akademie.de",
    phone: "+49 341 2233446",
    position: "Schulleiterin",
    linkedin_url: null,
    birthday: "1979-11-08",
  },
  {
    key: "ben-lernwerk",
    companyKey: "lernwerk",
    first_name: "Ben",
    last_name: "Krüger",
    email: "b.krueger@lernwerk-akademie.de",
    phone: null,
    position: "Marketing-Verantwortlicher",
    linkedin_url: null,
    birthday: null,
  },
  // Stadtbau — 1 contact
  {
    key: "marie-stadtbau",
    companyKey: "stadtbau",
    first_name: "Marie",
    last_name: "Köhler",
    email: "m.koehler@stadtbau-immobilien.de",
    phone: "+49 30 7788992",
    position: "Projektentwicklerin",
    linkedin_url: null,
    birthday: null,
  },
  // Genuss — 1 contact
  {
    key: "lara-genuss",
    companyKey: "genuss",
    first_name: "Lara",
    last_name: "Bender",
    email: "l.bender@genuss-catering.de",
    phone: "+49 30 1122335",
    position: "Inhaberin",
    linkedin_url: null,
    birthday: null,
  },
  // Bauer Bau — 1 contact
  {
    key: "felix-bauer",
    companyKey: "bauer-bau",
    first_name: "Felix",
    last_name: "Bauer",
    email: "f.bauer@bauer-bau.de",
    phone: "+49 421 4455668",
    position: "Projektleiter",
    linkedin_url: null,
    birthday: null,
  },
  // Sonnenkraft — 2 contacts
  {
    key: "daniel-sonnenkraft",
    companyKey: "sonnenkraft",
    first_name: "Daniel",
    last_name: "Wagner",
    email: "d.wagner@sonnenkraft-energie.de",
    phone: "+49 761 9988777",
    position: "CEO",
    linkedin_url: "https://linkedin.com/in/daniel-wagner-renewables",
    birthday: null,
  },
  {
    key: "lena-sonnenkraft",
    companyKey: "sonnenkraft",
    first_name: "Lena",
    last_name: "Bauer",
    email: "l.bauer@sonnenkraft-energie.de",
    phone: null,
    position: "Head of B2B Sales",
    linkedin_url: null,
    birthday: null,
  },
  // Studio Pixel — 1 contact
  {
    key: "niklas-studio",
    companyKey: "studio-pixel",
    first_name: "Niklas",
    last_name: "Frey",
    email: "niklas@studio-pixel.de",
    phone: null,
    position: "Creative Director",
    linkedin_url: null,
    birthday: null,
  },
  // Klick & Kauf — 1 contact
  {
    key: "eva-klick",
    companyKey: "klick-kauf",
    first_name: "Eva",
    last_name: "Zimmermann",
    email: "e.zimmermann@klick-kauf.de",
    phone: "+49 221 8899002",
    position: "COO",
    linkedin_url: null,
    birthday: null,
  },
  // 5 freelancers / consultants — no company
  {
    key: "freelance-clara",
    first_name: "Clara",
    last_name: "Neumann",
    email: "clara@neumann-design.com",
    phone: "+49 151 2233445",
    position: "Freelance UX Designer",
    linkedin_url: "https://linkedin.com/in/clara-neumann-ux",
    birthday: null,
  },
  {
    key: "freelance-thomas",
    first_name: "Thomas",
    last_name: "Albrecht",
    email: "t.albrecht@steuer-albrecht.de",
    phone: null,
    position: "Steuerberater (selbstständig)",
    linkedin_url: null,
    birthday: null,
  },
  {
    key: "freelance-marek",
    first_name: "Marek",
    last_name: "Pawlak",
    email: "marek@pawlak-architects.de",
    phone: "+49 176 9988776",
    position: "Freelance Software Architect",
    linkedin_url: "https://linkedin.com/in/marek-pawlak",
    birthday: null,
  },
  {
    key: "freelance-stefanie",
    first_name: "Stefanie",
    last_name: "Engel",
    email: "stefanie@engel-hr.de",
    phone: null,
    position: "HR-Beraterin (selbstständig)",
    linkedin_url: null,
    birthday: null,
  },
  {
    key: "freelance-rico",
    first_name: "Rico",
    last_name: "Schwarz",
    email: "rico@rs-fotografie.de",
    phone: "+49 178 4455667",
    position: "Freelance Fotograf",
    linkedin_url: null,
    birthday: null,
  },
]

type SeedDeal = Omit<
  DealInsert,
  "user_id" | "company_id" | "expected_close_date" | "closed_at"
> & {
  key: string
  companyKey?: string
  primaryContactKey: string
  secondaryContactKeys?: string[]
  // For won/lost: a past date used both for created_at AND for the
  // post-insert closed_at update. The deals_set_closed_at trigger from
  // 0005 stamps closed_at = now() on insert, so we update it after.
  // For active stages: how far in the future expected_close lands.
  closedDaysAgo?: number
  expectedCloseDays?: number
}

const DEALS: SeedDeal[] = [
  // ---- Lead (8) ------------------------------------------------------------
  {
    key: "bytewise-pilot",
    companyKey: "bytewise",
    primaryContactKey: "sarah-bytewise",
    title: "API-Pilot für interne Tools",
    stage: "lead",
    value_eur: 8000,
    priority: "medium",
    source: "LinkedIn",
    probability: 15,
    expectedCloseDays: 75,
  },
  {
    key: "lehmann-rebrand",
    companyKey: "lehmann",
    primaryContactKey: "sophie-lehmann",
    title: "Rebranding-Workshop H2",
    stage: "lead",
    value_eur: 12500,
    priority: "low",
    source: "Referral",
    probability: 10,
    expectedCloseDays: 80,
  },
  {
    key: "vogt-portal",
    companyKey: "vogt",
    primaryContactKey: "hannah-vogt",
    title: "Kundenportal Discovery",
    stage: "lead",
    value_eur: 18000,
    priority: "medium",
    source: "Cold outreach",
    probability: 15,
    expectedCloseDays: 90,
  },
  {
    key: "studio-website",
    companyKey: "studio-pixel",
    primaryContactKey: "niklas-studio",
    title: "Neuer Web-Auftritt",
    stage: "lead",
    value_eur: 6500,
    priority: "low",
    source: "Inbound",
    probability: 20,
    expectedCloseDays: 65,
  },
  {
    key: "kanzlei-doku",
    companyKey: "kanzlei-becker",
    primaryContactKey: "miriam-becker",
    title: "Mandanten-Dokumentenportal",
    stage: "lead",
    value_eur: 22000,
    priority: "medium",
    source: "Event",
    probability: 15,
    expectedCloseDays: 85,
  },
  {
    key: "stadtbau-app",
    companyKey: "stadtbau",
    primaryContactKey: "marie-stadtbau",
    title: "Mieter-Service-App",
    stage: "lead",
    value_eur: 24000,
    priority: "high",
    source: "Referral",
    probability: 20,
    expectedCloseDays: 70,
  },
  {
    key: "freelance-clara-system",
    primaryContactKey: "freelance-clara",
    title: "Design-System-Kollaboration",
    stage: "lead",
    value_eur: 5500,
    priority: "low",
    source: "LinkedIn",
    probability: 10,
    expectedCloseDays: 60,
  },
  {
    key: "schneider-tracking",
    companyKey: "schneider-logistik",
    primaryContactKey: "jonas-schneider",
    title: "Echtzeit-Tracking-Erweiterung",
    stage: "lead",
    value_eur: 19000,
    priority: "medium",
    source: "Cold outreach",
    probability: 15,
    expectedCloseDays: 88,
  },

  // ---- Qualified (7) -------------------------------------------------------
  {
    key: "bytewise-platform",
    companyKey: "bytewise",
    primaryContactKey: "lukas-hoffmann",
    secondaryContactKeys: ["tim-bytewise"],
    title: "Plattform-Erweiterung Q3",
    stage: "qualified",
    value_eur: 32000,
    priority: "high",
    source: "Inbound",
    probability: 35,
    expectedCloseDays: 45,
  },
  {
    key: "hartmann-mes",
    companyKey: "hartmann",
    primaryContactKey: "petra-hartmann",
    title: "MES-Anbindung Werk Süd",
    stage: "qualified",
    value_eur: 28000,
    priority: "medium",
    source: "Referral",
    probability: 30,
    expectedCloseDays: 50,
  },
  {
    key: "strategiewerk-research",
    companyKey: "strategiewerk",
    primaryContactKey: "anna-schaefer",
    title: "Marktanalyse-Tool für Klienten",
    stage: "qualified",
    value_eur: 14000,
    priority: "medium",
    source: "Event",
    probability: 40,
    expectedCloseDays: 35,
  },
  {
    key: "medicare-rollout",
    companyKey: "medicare",
    primaryContactKey: "ralf-medicare",
    secondaryContactKeys: ["carolin-medicare"],
    title: "Praxis-IT-Rollout",
    stage: "qualified",
    value_eur: 38000,
    priority: "high",
    source: "Inbound",
    probability: 35,
    expectedCloseDays: 55,
  },
  {
    key: "lernwerk-platform",
    companyKey: "lernwerk",
    primaryContactKey: "katharina-lernwerk",
    title: "Lernplattform-Pilot",
    stage: "qualified",
    value_eur: 18500,
    priority: "medium",
    source: "Referral",
    probability: 30,
    expectedCloseDays: 40,
  },
  {
    key: "freelance-marek-arch",
    primaryContactKey: "freelance-marek",
    title: "System-Architektur-Audit",
    stage: "qualified",
    value_eur: 11000,
    priority: "low",
    source: "LinkedIn",
    probability: 35,
    expectedCloseDays: 30,
  },
  {
    key: "bauer-portal",
    companyKey: "bauer-bau",
    primaryContactKey: "felix-bauer",
    title: "Bauakten-Portal",
    stage: "qualified",
    value_eur: 16500,
    priority: "medium",
    source: "Cold outreach",
    probability: 30,
    expectedCloseDays: 48,
  },

  // ---- Proposal (6) --------------------------------------------------------
  {
    key: "bytewise-q3-roadmap",
    companyKey: "bytewise",
    primaryContactKey: "sarah-bytewise",
    secondaryContactKeys: ["lukas-hoffmann"],
    title: "Q3 Plattform-Roadmap",
    stage: "proposal",
    value_eur: 65000,
    priority: "high",
    source: "Inbound",
    probability: 55,
    expectedCloseDays: 22,
  },
  {
    key: "hartmann-iot",
    companyKey: "hartmann",
    primaryContactKey: "max-hartmann",
    secondaryContactKeys: ["petra-hartmann"],
    title: "IoT-Integration Maschinenpark",
    stage: "proposal",
    value_eur: 78000,
    priority: "high",
    source: "Event",
    probability: 60,
    expectedCloseDays: 18,
  },
  {
    key: "strategiewerk-data",
    companyKey: "strategiewerk",
    primaryContactKey: "felix-strategiewerk",
    title: "Datenstrategie-Programm",
    stage: "proposal",
    value_eur: 42000,
    priority: "medium",
    source: "Referral",
    probability: 50,
    expectedCloseDays: 25,
  },
  {
    key: "klick-personalisierung",
    companyKey: "klick-kauf",
    primaryContactKey: "eva-klick",
    title: "Personalisierungs-Engine",
    stage: "proposal",
    value_eur: 55000,
    priority: "high",
    source: "Inbound",
    probability: 55,
    expectedCloseDays: 16,
  },
  {
    key: "lernwerk-blended",
    companyKey: "lernwerk",
    primaryContactKey: "ben-lernwerk",
    secondaryContactKeys: ["katharina-lernwerk"],
    title: "Blended-Learning-Paket",
    stage: "proposal",
    value_eur: 26000,
    priority: "medium",
    source: "Referral",
    probability: 60,
    expectedCloseDays: 20,
  },
  {
    key: "genuss-bookings",
    companyKey: "genuss",
    primaryContactKey: "lara-genuss",
    title: "Buchungssystem & POS",
    stage: "proposal",
    value_eur: 22000,
    priority: "medium",
    source: "Cold outreach",
    probability: 50,
    expectedCloseDays: 28,
  },

  // ---- Negotiation (5) -----------------------------------------------------
  {
    key: "sonnenkraft-fleet",
    companyKey: "sonnenkraft",
    primaryContactKey: "lena-sonnenkraft",
    secondaryContactKeys: ["daniel-sonnenkraft"],
    title: "B2B-Flotten-Roll-out",
    stage: "negotiation",
    value_eur: 92000,
    priority: "high",
    source: "Inbound",
    probability: 75,
    expectedCloseDays: 12,
  },
  {
    key: "kanzlei-suite",
    companyKey: "kanzlei-becker",
    primaryContactKey: "miriam-becker",
    title: "Kanzlei-Suite Premium",
    stage: "negotiation",
    value_eur: 48000,
    priority: "high",
    source: "Referral",
    probability: 80,
    expectedCloseDays: 9,
  },
  {
    key: "vogt-claims",
    companyKey: "vogt",
    primaryContactKey: "hannah-vogt",
    title: "Schadensbearbeitung-System",
    stage: "negotiation",
    value_eur: 65000,
    priority: "high",
    source: "Cold outreach",
    probability: 70,
    expectedCloseDays: 14,
  },
  {
    key: "freelance-thomas-tooling",
    primaryContactKey: "freelance-thomas",
    title: "Steuer-Toolchain für Mandanten",
    stage: "negotiation",
    value_eur: 32000,
    priority: "medium",
    source: "LinkedIn",
    probability: 75,
    expectedCloseDays: 7,
  },
  {
    key: "stadtbau-portfolio",
    companyKey: "stadtbau",
    primaryContactKey: "marie-stadtbau",
    title: "Portfolio-Management-Plattform",
    stage: "negotiation",
    value_eur: 56000,
    priority: "medium",
    source: "Event",
    probability: 70,
    expectedCloseDays: 11,
  },

  // ---- Won (6) -------------------------------------------------------------
  {
    key: "won-bytewise-onboard",
    companyKey: "bytewise",
    primaryContactKey: "lukas-hoffmann",
    title: "Onboarding-Stack",
    stage: "won",
    value_eur: 48000,
    priority: "high",
    source: "Referral",
    probability: 100,
    closedDaysAgo: 6,
  },
  {
    key: "won-medicare-portal",
    companyKey: "medicare",
    primaryContactKey: "carolin-medicare",
    title: "Patientenportal Phase 1",
    stage: "won",
    value_eur: 36000,
    priority: "high",
    source: "Inbound",
    probability: 100,
    closedDaysAgo: 14,
  },
  {
    key: "won-schneider-route",
    companyKey: "schneider-logistik",
    primaryContactKey: "jonas-schneider",
    title: "Routenoptimierung Phase 1",
    stage: "won",
    value_eur: 28000,
    priority: "medium",
    source: "Cold outreach",
    probability: 100,
    closedDaysAgo: 22,
  },
  {
    key: "won-freelance-stefanie",
    primaryContactKey: "freelance-stefanie",
    title: "HR-Toolkit-Integration",
    stage: "won",
    value_eur: 19500,
    priority: "medium",
    source: "LinkedIn",
    probability: 100,
    closedDaysAgo: 9,
  },
  {
    key: "won-bauer-management",
    companyKey: "bauer-bau",
    primaryContactKey: "felix-bauer",
    title: "Projektmanagement-Tool",
    stage: "won",
    value_eur: 25000,
    priority: "medium",
    source: "Referral",
    probability: 100,
    closedDaysAgo: 17,
  },
  {
    key: "won-sonnenkraft-pilot",
    companyKey: "sonnenkraft",
    primaryContactKey: "daniel-sonnenkraft",
    title: "Pilot-Installation Kommunen",
    stage: "won",
    value_eur: 84000,
    priority: "high",
    source: "Event",
    probability: 100,
    closedDaysAgo: 25,
  },

  // ---- Lost (3) ------------------------------------------------------------
  {
    key: "lost-klick-replatform",
    companyKey: "klick-kauf",
    primaryContactKey: "eva-klick",
    title: "Re-Plattform Discovery",
    stage: "lost",
    value_eur: 35000,
    priority: "medium",
    source: "Cold outreach",
    probability: 0,
    closedDaysAgo: 12,
  },
  {
    key: "lost-freelance-rico",
    primaryContactKey: "freelance-rico",
    title: "Foto-Asset-Pipeline",
    stage: "lost",
    value_eur: 18000,
    priority: "low",
    source: "LinkedIn",
    probability: 0,
    closedDaysAgo: 19,
  },
  {
    key: "lost-genuss-app",
    companyKey: "genuss",
    primaryContactKey: "lara-genuss",
    title: "Bestell-App für Stammkunden",
    stage: "lost",
    value_eur: 24000,
    priority: "medium",
    source: "Inbound",
    probability: 0,
    closedDaysAgo: 30,
  },
]

type SeedNote =
  | { kind: "company"; companyKey: string; content: string; daysAgo: number }
  | { kind: "contact"; contactKey: string; content: string; daysAgo: number }
  | { kind: "deal"; dealKey: string; content: string; daysAgo: number }

const NOTES: SeedNote[] = [
  {
    kind: "company",
    companyKey: "hartmann",
    content:
      "Trafen Max H. auf der Hannover Messe 2026. Sehr interessiert am IoT-Roadmap-Material — Folgemeeting in 4 Wochen.",
    daysAgo: 21,
  },
  {
    kind: "company",
    companyKey: "sonnenkraft",
    content:
      "Quartalsmeeting Anfang Q3 fest eingeplant. Daniel Wagner hat Interesse an einer erweiterten Partnerschaft signalisiert.",
    daysAgo: 4,
  },
  {
    kind: "company",
    companyKey: "lehmann",
    content: "Sophie bevorzugt Slack über E-Mail. Zeitzone Hamburg.",
    daysAgo: 12,
  },
  {
    kind: "contact",
    contactKey: "lukas-hoffmann",
    content:
      "Lukas ist Hauptansprechpartner für technische Themen, bevorzugt asynchrone Kommunikation. Vor 14 Uhr antwortet er selten.",
    daysAgo: 8,
  },
  {
    kind: "contact",
    contactKey: "hannah-vogt",
    content:
      "Bevorzugt formelle E-Mail. Vorstandstermine Mo/Mi vormittags — Termine entsprechend planen.",
    daysAgo: 30,
  },
  {
    kind: "contact",
    contactKey: "freelance-marek",
    content:
      "Marek arbeitet remote aus Krakau, Zeitzone CEST. Gute Reviews aus früherem Projekt mit Strategiewerk.",
    daysAgo: 6,
  },
  {
    kind: "deal",
    dealKey: "bytewise-q3-roadmap",
    content:
      "Proposal v2 versendet am letzten Freitag. Lukas und Sarah müssen intern abstimmen — Feedback bis Ende der Woche zugesagt.",
    daysAgo: 3,
  },
  {
    kind: "deal",
    dealKey: "sonnenkraft-fleet",
    content:
      "Vertragsentwurf rotiert noch in der Rechtsabteilung von Sonnenkraft. Lena meldet sich, sobald sie grünes Licht hat.\n\nOffene Punkte:\n- SLA-Klausel\n- Eskalationsweg",
    daysAgo: 2,
  },
  {
    kind: "deal",
    dealKey: "won-medicare-portal",
    content:
      "Onboarding läuft, Phase 2 (Terminbuchung) ist optional und für Q4 vorgemerkt. Quartalscheck im September.",
    daysAgo: 14,
  },
  {
    kind: "deal",
    dealKey: "lost-klick-replatform",
    content:
      "Eva hat nach internem Pivot abgesagt — Budget für 2026 geht in interne Tools. Re-Engagement Q1 2027 angepeilt.",
    daysAgo: 12,
  },
]

// -----------------------------------------------------------------------------
// Seed runner. Wipes the demo user's data and re-inserts everything in one
// pass. Each insert uses bulk-mode supabase calls — five round-trips total
// for the inserts, plus the wipe deletes.
// -----------------------------------------------------------------------------
export async function seedDemoData(client: AdminClient): Promise<SeedResult> {
  const userId = process.env.DEMO_USER_ID
  if (!userId) {
    throw new Error("DEMO_USER_ID is not set")
  }

  // Wipe in reverse-FK order. Notes first (cascades from any parent type
  // would also work, but explicit is clearer). Then deal_contacts (cascade-
  // deleted by both deals and contacts deletions, but again explicit).
  // Then deals, contacts, companies — each level depends only on lower
  // levels at this point.
  for (const table of [
    "notes",
    "deal_contacts",
    "deals",
    "contacts",
    "companies",
  ] as const) {
    const { error } = await client.from(table).delete().eq("user_id", userId)
    if (error) {
      throw new Error(`Failed to wipe ${table}: ${error.message}`)
    }
  }

  // Companies — bulk insert, return ids so children can resolve their
  // companyKey references.
  const companyRows: CompanyInsert[] = COMPANIES.map((c) => {
    const { key: _key, ...rest } = c
    void _key
    return { ...rest, user_id: userId }
  })
  const { data: companyData, error: companyError } = await client
    .from("companies")
    .insert(companyRows)
    .select("id, name")
  if (companyError || !companyData) {
    throw new Error(
      `Failed to insert companies: ${companyError?.message ?? "no data"}`
    )
  }
  const companyIdByKey = new Map<string, string>()
  COMPANIES.forEach((c, i) => {
    const inserted = companyData[i]
    if (!inserted) {
      throw new Error(`Company at index ${i} (${c.key}) was not returned`)
    }
    companyIdByKey.set(c.key, inserted.id)
  })

  // Contacts — same pattern. company_id resolved from the map; freelancers
  // pass null.
  const contactRows: ContactInsert[] = CONTACTS.map((c) => {
    const { key: _key, companyKey, ...rest } = c
    void _key
    const company_id = companyKey ? companyIdByKey.get(companyKey) ?? null : null
    if (companyKey && !company_id) {
      throw new Error(`Contact ${c.key} references missing company ${companyKey}`)
    }
    return { ...rest, company_id, user_id: userId }
  })
  const { data: contactData, error: contactError } = await client
    .from("contacts")
    .insert(contactRows)
    .select("id, first_name, last_name")
  if (contactError || !contactData) {
    throw new Error(
      `Failed to insert contacts: ${contactError?.message ?? "no data"}`
    )
  }
  const contactIdByKey = new Map<string, string>()
  CONTACTS.forEach((c, i) => {
    const inserted = contactData[i]
    if (!inserted) {
      throw new Error(`Contact at index ${i} (${c.key}) was not returned`)
    }
    contactIdByKey.set(c.key, inserted.id)
  })

  // Deals. The deals_set_closed_at trigger from 0005 fires on INSERT for
  // any won/lost row and overwrites closed_at to now(). We accept that on
  // insert and then UPDATE closed_at to a realistic past timestamp after
  // the fact (the trigger doesn't refire because we don't change `stage`).
  const dealRows: DealInsert[] = DEALS.map((d) => {
    const {
      key: _key,
      companyKey,
      primaryContactKey: _pck,
      secondaryContactKeys: _sck,
      closedDaysAgo: _cda,
      expectedCloseDays,
      ...rest
    } = d
    void _key
    void _pck
    void _sck
    void _cda
    const company_id = companyKey ? companyIdByKey.get(companyKey) ?? null : null
    if (companyKey && !company_id) {
      throw new Error(`Deal ${d.key} references missing company ${companyKey}`)
    }
    const expected_close_date =
      expectedCloseDays !== undefined
        ? dateOnly(ahead(expectedCloseDays * DAY))
        : null
    return {
      ...rest,
      company_id,
      user_id: userId,
      expected_close_date,
    }
  })
  const { data: dealData, error: dealError } = await client
    .from("deals")
    .insert(dealRows)
    .select("id, title, stage")
  if (dealError || !dealData) {
    throw new Error(
      `Failed to insert deals: ${dealError?.message ?? "no data"}`
    )
  }
  const dealIdByKey = new Map<string, string>()
  DEALS.forEach((d, i) => {
    const inserted = dealData[i]
    if (!inserted) {
      throw new Error(`Deal at index ${i} (${d.key}) was not returned`)
    }
    dealIdByKey.set(d.key, inserted.id)
  })

  // Backfill closed_at on won/lost deals to a realistic past timestamp.
  // The trigger from 0005 only listens to changes on `stage`, so updating
  // closed_at alone is a no-op as far as the trigger goes — exactly what
  // we want.
  for (const d of DEALS) {
    if (d.closedDaysAgo === undefined) continue
    const dealId = dealIdByKey.get(d.key)
    if (!dealId) continue
    const closedAt = ago(
      d.closedDaysAgo * DAY + Math.floor(Math.random() * 12) * HOUR
    )
    const { error: closedError } = await client
      .from("deals")
      .update({ closed_at: closedAt })
      .eq("id", dealId)
    if (closedError) {
      throw new Error(
        `Failed to backfill closed_at for ${d.key}: ${closedError.message}`
      )
    }
  }

  // deal_contacts. Each deal contributes one primary row + N secondaries.
  const dealContactRows: DealContactInsert[] = []
  for (const d of DEALS) {
    const dealId = dealIdByKey.get(d.key)
    if (!dealId) continue

    const primaryId = contactIdByKey.get(d.primaryContactKey)
    if (!primaryId) {
      throw new Error(
        `Deal ${d.key} primary contact ${d.primaryContactKey} not found`
      )
    }
    dealContactRows.push({
      deal_id: dealId,
      contact_id: primaryId,
      user_id: userId,
      is_primary: true,
    })

    for (const k of d.secondaryContactKeys ?? []) {
      const cid = contactIdByKey.get(k)
      if (!cid) {
        throw new Error(`Deal ${d.key} secondary contact ${k} not found`)
      }
      dealContactRows.push({
        deal_id: dealId,
        contact_id: cid,
        user_id: userId,
        is_primary: false,
      })
    }
  }
  // deal_contacts has a composite PK (deal_id, contact_id) — no `id` column.
  // Select the composite columns just to get a row count back.
  const { data: dealContactData, error: dealContactError } = await client
    .from("deal_contacts")
    .insert(dealContactRows)
    .select("deal_id, contact_id")
  if (dealContactError || !dealContactData) {
    throw new Error(
      `Failed to insert deal_contacts: ${dealContactError?.message ?? "no data"}`
    )
  }

  // Notes — polymorphic. Each row sets exactly one of company_id /
  // contact_id / deal_id; the CHECK constraint from 0009 enforces that.
  const noteRows: NoteInsert[] = NOTES.map((n): NoteInsert => {
    const created_at = ago(n.daysAgo * DAY)
    const base = { user_id: userId, content: n.content, created_at }
    if (n.kind === "company") {
      const id = companyIdByKey.get(n.companyKey)
      if (!id) throw new Error(`Note refers to missing company ${n.companyKey}`)
      return { ...base, company_id: id }
    }
    if (n.kind === "contact") {
      const id = contactIdByKey.get(n.contactKey)
      if (!id) throw new Error(`Note refers to missing contact ${n.contactKey}`)
      return { ...base, contact_id: id }
    }
    const id = dealIdByKey.get(n.dealKey)
    if (!id) throw new Error(`Note refers to missing deal ${n.dealKey}`)
    return { ...base, deal_id: id }
  })
  const { error: noteError } = await client.from("notes").insert(noteRows)
  if (noteError) {
    throw new Error(`Failed to insert notes: ${noteError.message}`)
  }

  return {
    companiesInserted: companyData.length,
    contactsInserted: contactData.length,
    dealsInserted: dealData.length,
    dealContactsInserted: dealContactData.length,
    notesInserted: noteRows.length,
  }
}
