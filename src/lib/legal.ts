/**
 * Legal content for the public site (Privacy, Terms, Imprint, Cookies), in EN
 * and DE. This is a professional TEMPLATE — the company-specific fields in
 * `LEGAL_ENTITY` below MUST be completed and the texts reviewed by qualified
 * legal counsel before relying on them. Placeholders are shown as [ ... ].
 */

/** Single place to fill in the legal entity's real details. */
export const LEGAL_ENTITY = {
  product: "TURI",
  legalName: "[Legal company name]",
  address: "[Street & no.], [Postal code] [City], [Country]",
  privacyEmail: "privacy@[your-domain]",
  contactEmail: "hello@[your-domain]",
  managingDirectors: "[Managing director(s)]",
  registerCourt: "[Register court]",
  registerNumber: "[HRB ...]",
  vatId: "[VAT ID / USt-IdNr.]",
  hosting: "Amazon Web Services, Frankfurt (eu-central-1), Germany",
  supervisoryAuthority:
    "[Competent data-protection supervisory authority for your state]",
  governingLaw: "Germany",
};

export type LegalSlug = "privacy" | "terms" | "imprint" | "cookies";

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: { h: string; b: string[] }[];
  reviewNote: string;
}

const E = LEGAL_ENTITY;
const UPDATED = "August 2026";

const EN: Record<LegalSlug, LegalDoc> = {
  privacy: {
    title: "Privacy Policy",
    updated: UPDATED,
    intro: `This policy explains how ${E.legalName} ("${E.product}", "we") processes personal data when you use our website and the ${E.product} platform, in line with the EU General Data Protection Regulation (GDPR).`,
    reviewNote: "Template — complete the company details and have it reviewed by counsel before publishing.",
    sections: [
      { h: "1. Controller", b: [`The controller responsible for your data is ${E.legalName}, ${E.address}. For any privacy question or to exercise your rights, contact ${E.privacyEmail}.`] },
      {
        h: "2. What data we process",
        b: [
          "Account data: your name, work email, company name and role, set when you sign up or are invited.",
          "Operational data: the production data you and your team enter into the platform (orders, stations, quantities, downtime and quality reasons, etc.).",
          "Billing data: when paid plans are enabled, payments are handled by our payment processor; we store plan, status and invoice metadata, not full card numbers.",
          "Technical data: IP address, device/browser information and server logs, needed to operate and secure the service.",
          "Cookies: strictly necessary cookies for login, language and consent (see our Cookie Policy).",
        ],
      },
      {
        h: "3. Purposes and legal bases",
        b: [
          "To provide the service and your account — performance of a contract (Art. 6(1)(b) GDPR).",
          "To secure, maintain and improve the service — our legitimate interests (Art. 6(1)(f) GDPR).",
          "For any non-essential cookies or analytics — your consent (Art. 6(1)(a) GDPR), which you can withdraw at any time.",
          "To comply with legal obligations such as bookkeeping — Art. 6(1)(c) GDPR.",
        ],
      },
      {
        h: "4. Processors and recipients",
        b: [
          `Hosting and data storage: ${E.hosting}.`,
          "Deployment/CDN and payment processing may be provided by additional processors once enabled; each is bound by a data-processing agreement and processes data only on our instructions.",
          "We do not sell your personal data.",
        ],
      },
      { h: "5. International transfers", b: ["Data is primarily processed within the EU (Frankfurt). Where a processor transfers data outside the EU/EEA, we rely on appropriate safeguards such as the EU Standard Contractual Clauses."] },
      { h: "6. Retention", b: ["We keep account data for as long as your account is active and as required to meet legal obligations. Operational data is kept according to the data-retention window of your plan; you can request deletion at any time, subject to statutory retention periods."] },
      {
        h: "7. Your rights",
        b: [
          "You have the right to access, rectify, erase, restrict and port your data, and to object to processing. Where processing is based on consent, you may withdraw it at any time.",
          `To exercise a right, contact ${E.privacyEmail}. You also have the right to lodge a complaint with a supervisory authority (${E.supervisoryAuthority}).`,
        ],
      },
      { h: "8. Security", b: ["Data is encrypted in transit and at rest, access is role-based and least-privilege, and infrastructure is hosted in the EU."] },
      { h: "9. Changes", b: [`We may update this policy; the current version is dated ${UPDATED}. Material changes will be communicated on this page.`] },
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: UPDATED,
    intro: `These terms govern your use of the ${E.product} website and platform provided by ${E.legalName}. By creating an account or using the service, you agree to them.`,
    reviewNote: "Template — complete the company details and have it reviewed by counsel before publishing.",
    sections: [
      { h: "1. The service", b: [`${E.product} is a cloud-based production-intelligence and MES platform for metalworking shops. We may improve, change or discontinue features; we will not materially reduce a paid plan's core functionality during a paid term without notice.`] },
      { h: "2. Accounts", b: ["The account owner may invite team members and grant each one a role and access to specific screens. You are responsible for the accuracy of your details, for keeping credentials confidential, and for the activity of your users."] },
      {
        h: "3. Plans, billing and trials",
        b: [
          "Plans (Basic, AI Pro) are offered on a monthly or an annual basis. Prices are shown on the pricing page and are exclusive of any applicable taxes.",
          "Monthly plans are billed every month and can be cancelled at any time; access continues until the next payment day.",
          "Annual plans are a 12-month commitment billed monthly at the discounted rate; they renew for a further 12 months unless cancelled before the renewal date.",
          "A referred customer starts with a 30-day free trial; the referring account may receive free-month credit as described at sign-up.",
          "When online payment is enabled, billing is handled by our payment processor. Fees already due are non-refundable except where required by law.",
        ],
      },
      { h: "4. Acceptable use", b: ["You may not misuse the service, attempt to breach its security, use it unlawfully, or upload content you have no right to. We may suspend accounts that put the service or other customers at risk."] },
      { h: "5. Your data and intellectual property", b: ["You retain all rights to the data you enter. You grant us the limited rights needed to host and process it to provide the service. We and our licensors retain all rights in the platform, software and brand."] },
      { h: "6. Availability", b: ["We use reasonable efforts to keep the service available and updates are applied with a migration-safe process. During this phase no specific service-level agreement is guaranteed."] },
      { h: "7. Warranties and liability", b: ["The service is provided \"as is\" to the extent permitted by law. Nothing in these terms excludes liability that cannot be excluded under mandatory law (including for intent, gross negligence, or injury to life, body or health)."] },
      { h: "8. Term and termination", b: ["These terms apply while you use the service. You may stop using it and cancel per your plan. We may terminate for material breach."] },
      { h: "9. Governing law", b: [`These terms are governed by the laws of ${E.governingLaw}, without prejudice to mandatory consumer-protection rules of your place of residence.`] },
      { h: "10. Contact", b: [`Questions about these terms: ${E.contactEmail}.`] },
    ],
  },
  imprint: {
    title: "Imprint",
    updated: UPDATED,
    intro: "Information pursuant to § 5 TMG (German Telemedia Act).",
    reviewNote: "Template — this must be completed with your registered company details before the site goes live in Germany.",
    sections: [
      { h: "Provider", b: [`${E.legalName}`, E.address] },
      { h: "Represented by", b: [E.managingDirectors] },
      { h: "Contact", b: [`Email: ${E.contactEmail}`] },
      { h: "Register entry", b: [`Register court: ${E.registerCourt}`, `Registration number: ${E.registerNumber}`] },
      { h: "VAT", b: [`VAT identification number pursuant to § 27a UStG: ${E.vatId}`] },
      { h: "Responsible for content", b: [`${E.managingDirectors}, ${E.address}`] },
      { h: "Note", b: [`${E.product} is an independent product built on decades of machine and process expertise. Brand and product names of third parties are the property of their respective owners.`] },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    updated: UPDATED,
    intro: `${E.product} uses only strictly necessary cookies. We do not use advertising or cross-site tracking cookies.`,
    reviewNote: "Template — review before publishing.",
    sections: [
      {
        h: "Strictly necessary cookies",
        b: [
          "Session cookie — keeps you signed in after login.",
          "Company selector — remembers the workspace you are viewing.",
          "Language — remembers your EN/DE choice.",
          "Consent — remembers your cookie choice so we don't ask again.",
        ],
      },
      { h: "Analytics and tracking", b: ["We currently do not load any analytics or third-party tracking. If that changes, non-essential cookies will load only after your consent, and you can withdraw it at any time via the cookie banner."] },
      { h: "Managing cookies", b: ["You can clear cookies in your browser settings at any time. Because our cookies are strictly necessary, blocking them may stop parts of the service (such as login) from working."] },
    ],
  },
};

const DE: Record<LegalSlug, LegalDoc> = {
  privacy: {
    title: "Datenschutzerklärung",
    updated: "August 2026",
    intro: `Diese Erklärung beschreibt, wie ${E.legalName} („${E.product}", „wir") personenbezogene Daten verarbeitet, wenn Sie unsere Website und die ${E.product}-Plattform nutzen — im Einklang mit der Datenschutz-Grundverordnung (DSGVO).`,
    reviewNote: "Vorlage — Firmenangaben ergänzen und vor Veröffentlichung juristisch prüfen lassen.",
    sections: [
      { h: "1. Verantwortlicher", b: [`Verantwortlich ist ${E.legalName}, ${E.address}. Für Datenschutzfragen oder zur Ausübung Ihrer Rechte: ${E.privacyEmail}.`] },
      {
        h: "2. Welche Daten wir verarbeiten",
        b: [
          "Kontodaten: Name, geschäftliche E-Mail, Firmenname und Rolle, angelegt bei Registrierung oder Einladung.",
          "Betriebsdaten: die Produktionsdaten, die Sie und Ihr Team eingeben (Aufträge, Stationen, Mengen, Stillstands- und Qualitätsgründe usw.).",
          "Zahlungsdaten: bei aktivierten Bezahltarifen werden Zahlungen über unseren Zahlungsdienstleister abgewickelt; wir speichern Tarif, Status und Rechnungs-Metadaten, keine vollständigen Kartennummern.",
          "Technische Daten: IP-Adresse, Geräte-/Browserinformationen und Server-Logs, nötig für Betrieb und Sicherheit.",
          "Cookies: unbedingt erforderliche Cookies für Login, Sprache und Einwilligung (siehe Cookie-Richtlinie).",
        ],
      },
      {
        h: "3. Zwecke und Rechtsgrundlagen",
        b: [
          "Bereitstellung des Dienstes und Ihres Kontos — Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).",
          "Sicherheit, Betrieb und Verbesserung — berechtigte Interessen (Art. 6 Abs. 1 lit. f DSGVO).",
          "Nicht notwendige Cookies oder Analyse — Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), jederzeit widerrufbar.",
          "Erfüllung rechtlicher Pflichten, etwa Buchführung — Art. 6 Abs. 1 lit. c DSGVO.",
        ],
      },
      {
        h: "4. Auftragsverarbeiter und Empfänger",
        b: [
          `Hosting und Datenspeicherung: ${E.hosting}.`,
          "Deployment/CDN und Zahlungsabwicklung können nach Aktivierung durch weitere Auftragsverarbeiter erfolgen; jeder ist durch einen Auftragsverarbeitungsvertrag gebunden und verarbeitet Daten nur auf unsere Weisung.",
          "Wir verkaufen Ihre personenbezogenen Daten nicht.",
        ],
      },
      { h: "5. Drittlandübermittlungen", b: ["Die Verarbeitung erfolgt überwiegend in der EU (Frankfurt). Bei Übermittlungen außerhalb der EU/des EWR stützen wir uns auf geeignete Garantien wie die EU-Standardvertragsklauseln."] },
      { h: "6. Speicherdauer", b: ["Kontodaten speichern wir, solange Ihr Konto aktiv ist und soweit gesetzlich erforderlich. Betriebsdaten werden gemäß dem Aufbewahrungsfenster Ihres Tarifs gespeichert; eine Löschung können Sie jederzeit verlangen, vorbehaltlich gesetzlicher Aufbewahrungsfristen."] },
      {
        h: "7. Ihre Rechte",
        b: [
          "Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch. Auf Einwilligung gestützte Verarbeitung können Sie jederzeit widerrufen.",
          `Zur Ausübung: ${E.privacyEmail}. Zudem haben Sie das Recht auf Beschwerde bei einer Aufsichtsbehörde (${E.supervisoryAuthority}).`,
        ],
      },
      { h: "8. Sicherheit", b: ["Daten werden bei Übertragung und Speicherung verschlüsselt, Zugriffe erfolgen rollenbasiert nach dem Minimalprinzip, die Infrastruktur wird in der EU betrieben."] },
      { h: "9. Änderungen", b: [`Wir können diese Erklärung aktualisieren; die aktuelle Fassung ist von August 2026. Wesentliche Änderungen werden auf dieser Seite mitgeteilt.`] },
    ],
  },
  terms: {
    title: "Nutzungsbedingungen",
    updated: "August 2026",
    intro: `Diese Bedingungen regeln die Nutzung der Website und Plattform ${E.product} von ${E.legalName}. Mit der Kontoerstellung oder Nutzung stimmen Sie ihnen zu.`,
    reviewNote: "Vorlage — Firmenangaben ergänzen und vor Veröffentlichung juristisch prüfen lassen.",
    sections: [
      { h: "1. Der Dienst", b: [`${E.product} ist eine cloudbasierte Plattform für Produktionsintelligenz und MES für metallverarbeitende Betriebe. Wir dürfen Funktionen verbessern, ändern oder einstellen; die Kernfunktion eines Bezahltarifs wird während einer bezahlten Laufzeit nicht ohne Ankündigung wesentlich reduziert.`] },
      { h: "2. Konten", b: ["Der Kontoinhaber kann Teammitglieder einladen und ihnen eine Rolle sowie Zugriff auf bestimmte Bildschirme gewähren. Sie sind für die Richtigkeit Ihrer Angaben, die Vertraulichkeit der Zugangsdaten und die Aktivität Ihrer Nutzer verantwortlich."] },
      {
        h: "3. Tarife, Abrechnung und Testphasen",
        b: [
          "Die Tarife (Basic, AI Pro) werden monatlich oder jährlich angeboten. Preise stehen auf der Preisseite und verstehen sich zzgl. etwaiger Steuern.",
          "Monatstarife werden monatlich abgerechnet und sind jederzeit kündbar; der Zugang bleibt bis zum nächsten Zahltag.",
          "Jahrestarife sind eine 12-Monats-Bindung mit monatlicher Abrechnung zum vergünstigten Satz; sie verlängern sich um weitere 12 Monate, sofern nicht vor dem Verlängerungsdatum gekündigt.",
          "Ein geworbener Kunde startet mit 30 Tagen kostenlos; das werbende Konto kann eine Gutschrift an Freimonaten erhalten (wie bei der Registrierung beschrieben).",
          "Bei aktivierter Online-Zahlung erfolgt die Abrechnung über unseren Zahlungsdienstleister. Bereits fällige Entgelte sind nicht erstattungsfähig, soweit gesetzlich nicht anders vorgeschrieben.",
        ],
      },
      { h: "4. Zulässige Nutzung", b: ["Sie dürfen den Dienst nicht missbrauchen, seine Sicherheit nicht angreifen, ihn nicht rechtswidrig nutzen und keine Inhalte hochladen, zu denen Sie nicht berechtigt sind. Konten, die den Dienst oder andere Kunden gefährden, können gesperrt werden."] },
      { h: "5. Ihre Daten und geistiges Eigentum", b: ["Sie behalten alle Rechte an den von Ihnen eingegebenen Daten und räumen uns die für Hosting und Verarbeitung nötigen begrenzten Rechte ein. Alle Rechte an Plattform, Software und Marke verbleiben bei uns bzw. unseren Lizenzgebern."] },
      { h: "6. Verfügbarkeit", b: ["Wir bemühen uns angemessen um Verfügbarkeit; Updates erfolgen migrationssicher. In dieser Phase wird keine bestimmte Service-Level-Zusage garantiert."] },
      { h: "7. Gewährleistung und Haftung", b: ["Der Dienst wird im gesetzlich zulässigen Rahmen „wie besehen“ bereitgestellt. Eine Haftung, die nach zwingendem Recht nicht ausgeschlossen werden kann (u. a. Vorsatz, grobe Fahrlässigkeit, Leben/Körper/Gesundheit), bleibt unberührt."] },
      { h: "8. Laufzeit und Kündigung", b: ["Diese Bedingungen gelten während der Nutzung. Sie können die Nutzung beenden und gemäß Ihrem Tarif kündigen. Wir können bei erheblichem Verstoß kündigen."] },
      { h: "9. Anwendbares Recht", b: [`Es gilt das Recht von ${E.governingLaw}, unbeschadet zwingender Verbraucherschutzvorschriften Ihres Wohnorts.`] },
      { h: "10. Kontakt", b: [`Fragen zu diesen Bedingungen: ${E.contactEmail}.`] },
    ],
  },
  imprint: {
    title: "Impressum",
    updated: "August 2026",
    intro: "Angaben gemäß § 5 TMG.",
    reviewNote: "Vorlage — vor dem Livegang in Deutschland mit den eingetragenen Firmendaten zu vervollständigen.",
    sections: [
      { h: "Anbieter", b: [`${E.legalName}`, E.address] },
      { h: "Vertreten durch", b: [E.managingDirectors] },
      { h: "Kontakt", b: [`E-Mail: ${E.contactEmail}`] },
      { h: "Registereintrag", b: [`Registergericht: ${E.registerCourt}`, `Registernummer: ${E.registerNumber}`] },
      { h: "Umsatzsteuer", b: [`Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: ${E.vatId}`] },
      { h: "Verantwortlich für den Inhalt", b: [`${E.managingDirectors}, ${E.address}`] },
      { h: "Hinweis", b: [`${E.product} ist ein eigenständiges Produkt, aufgebaut auf jahrzehntelanger Maschinen- und Prozesskompetenz. Marken- und Produktnamen Dritter sind Eigentum ihrer jeweiligen Inhaber.`] },
    ],
  },
  cookies: {
    title: "Cookie-Richtlinie",
    updated: "August 2026",
    intro: `${E.product} verwendet ausschließlich unbedingt erforderliche Cookies. Wir setzen keine Werbe- oder seitenübergreifenden Tracking-Cookies ein.`,
    reviewNote: "Vorlage — vor Veröffentlichung prüfen.",
    sections: [
      {
        h: "Unbedingt erforderliche Cookies",
        b: [
          "Session-Cookie — hält Sie nach dem Login angemeldet.",
          "Firmenauswahl — merkt sich den angezeigten Arbeitsbereich.",
          "Sprache — merkt sich Ihre EN/DE-Auswahl.",
          "Einwilligung — merkt sich Ihre Cookie-Wahl, damit wir nicht erneut fragen.",
        ],
      },
      { h: "Analyse und Tracking", b: ["Derzeit laden wir keinerlei Analyse- oder Drittanbieter-Tracking. Sollte sich das ändern, werden nicht notwendige Cookies erst nach Ihrer Einwilligung geladen, die Sie jederzeit über das Cookie-Banner widerrufen können."] },
      { h: "Cookies verwalten", b: ["Sie können Cookies jederzeit in Ihren Browsereinstellungen löschen. Da unsere Cookies unbedingt erforderlich sind, kann das Blockieren Teile des Dienstes (etwa den Login) außer Funktion setzen."] },
    ],
  },
};

export function legalDoc(slug: LegalSlug, locale: string): LegalDoc {
  return (locale === "de" ? DE : EN)[slug];
}

export const LEGAL_SLUGS: LegalSlug[] = ["privacy", "terms", "imprint", "cookies"];
