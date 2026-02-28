export default function TermsOfService() {
  const updated = "28 February 2026";
  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: "#0f0a30", color: "white", minHeight: "100vh" }}>
      <nav style={{ background: "#1a1150", padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "white", width: "fit-content" }}>
          <span style={{ fontSize: "1.5rem", color: "#d4a843" }}>✦</span>
          <span style={{ fontSize: "1.1rem", fontWeight: "600" }}>Kevria Calc</span>
        </a>
      </nav>

      <main style={{ maxWidth: "760px", margin: "0 auto", padding: "60px 24px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "800", marginBottom: "8px" }}>Terms of Service</h1>
        <p style={{ color: "#6060a0", fontSize: "0.9rem", marginBottom: "40px" }}>Last updated: {updated}</p>

        {[
          {
            heading: "1. Agreement to these terms",
            body: `By creating an account or using the Kevria Kevria Calc ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.

The Service is operated by Kevria, an Australian business (kevria.com). References to "we", "us", or "our" refer to Kevria.`,
          },
          {
            heading: "2. Description of the Service",
            body: `The Service is a professional budgeting tool designed to assist NDIS providers, support coordinators, plan managers, and related professionals with:
• Calculating NDIS support budgets and roster of care costs
• Applying 2025–26 NDIS Price Guide rates by support category
• Tracking claims and actual spend against allocated funding
• Generating budget reports and exports

The Service is a calculation aid only. It does not constitute financial, legal, or NDIS compliance advice.`,
          },
          {
            heading: "3. Eligibility",
            body: `You must be at least 18 years of age to use the Service. By using the Service, you represent and warrant that you have the legal capacity to enter into a binding agreement.`,
          },
          {
            heading: "4. Subscriptions and payment",
            body: `Access to the Service requires a paid subscription. Subscription plans and pricing are displayed at the time of purchase.

• Subscriptions are billed in advance on a monthly or annual basis.
• All fees are in Australian Dollars (AUD) and are inclusive of GST where applicable.
• Payments are processed by Stripe. We do not store your payment card details.
• Subscriptions automatically renew at the end of each billing period unless cancelled.
• You may cancel at any time through the billing portal. Cancellation takes effect at the end of the current billing period — no partial refunds are issued for unused time.`,
          },
          {
            heading: "5. Free trial and promotional access",
            body: `Where a free trial or promotional period is offered, it will be clearly disclosed. At the end of any trial period, your subscription will automatically convert to a paid plan unless cancelled before the trial ends.`,
          },
          {
            heading: "6. Your account",
            body: `You are responsible for:
• Maintaining the confidentiality of your login credentials
• All activity that occurs under your account
• Ensuring your account information is accurate and up to date

You must notify us immediately at support@kevria.com if you suspect unauthorised access to your account.`,
          },
          {
            heading: "7. Acceptable use",
            body: `You agree not to:
• Use the Service for any unlawful purpose or in violation of any applicable law or regulation
• Attempt to reverse-engineer, decompile, or extract the source code of the Service
• Use automated tools (bots, scrapers) to access or extract data from the Service
• Share your account credentials with others outside your organisation
• Upload malicious files or attempt to disrupt the Service's infrastructure

We reserve the right to suspend or terminate accounts that violate these terms without notice.`,
          },
          {
            heading: "8. Data and privacy",
            body: `Your use of the Service is also governed by our Privacy Policy (available at /privacy), which is incorporated into these Terms by reference.

You retain ownership of any data you enter into the Service. By using the Service, you grant us a limited licence to store and process that data solely for the purpose of providing the Service to you.

You are responsible for ensuring you have appropriate consents and authorisations to enter any personal information about third parties (including NDIS participants) into the Service.`,
          },
          {
            heading: "9. NDIS rates and calculations",
            body: `The Service applies rates from the NDIS Pricing Arrangements and Price Limits (2025–26) as a reference. Rates are pre-loaded but are fully editable to reflect your organisation's actual pricing.

We make reasonable efforts to keep rates current, but we do not guarantee that all rates are accurate, complete, or up to date at any given time. You are responsible for verifying rates against the current NDIS Pricing Arrangements before quoting or invoicing participants.

Nothing in the Service constitutes a guarantee of NDIS claim approval or compliance with NDIS rules.`,
          },
          {
            heading: "10. Disclaimer of warranties",
            body: `The Service is provided "as is" and "as available" without warranties of any kind, either express or implied.

To the maximum extent permitted by Australian Consumer Law, we disclaim all implied warranties, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.

We do not warrant that:
• The Service will be uninterrupted or error-free
• Calculations produced are free from errors or suitable for your specific circumstances
• The Service will meet all your professional or regulatory requirements`,
          },
          {
            heading: "11. Limitation of liability",
            body: `To the maximum extent permitted by law, Kevria and its directors, employees, and contractors shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service, including but not limited to:
• Loss of profits or revenue
• Errors in budget calculations relied upon for quoting or claiming
• Data loss or corruption
• NDIS claim rejections or compliance issues

Our total aggregate liability to you in connection with the Service shall not exceed the total subscription fees you paid to us in the 12 months preceding the claim.

Nothing in these Terms limits any rights you may have under the Australian Consumer Law that cannot be excluded by agreement.`,
          },
          {
            heading: "12. Indemnification",
            body: `You agree to indemnify and hold harmless Kevria and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or in connection with:
• Your use of the Service
• Your violation of these Terms
• Your infringement of any third-party rights
• Any inaccurate data you enter into the Service`,
          },
          {
            heading: "13. Intellectual property",
            body: `The Service and all of its content, features, and functionality — including but not limited to software, design, text, and branding — are owned by Kevria and are protected by Australian and international intellectual property laws.

You may not copy, reproduce, distribute, or create derivative works from any part of the Service without our prior written consent.`,
          },
          {
            heading: "14. Service availability and changes",
            body: `We reserve the right to modify, suspend, or discontinue the Service (or any part of it) at any time with reasonable notice. We will endeavour to provide at least 30 days' notice of any material discontinuation.

We may update these Terms from time to time. Material changes will be notified by email or by prominent notice within the Service. Continued use of the Service after changes take effect constitutes your acceptance of the updated Terms.`,
          },
          {
            heading: "15. Termination",
            body: `We may suspend or terminate your access to the Service at any time if you breach these Terms. You may terminate your account at any time by cancelling your subscription and contacting us to request account deletion.

Upon termination, your right to use the Service ceases immediately. We will retain your data for up to 30 days following termination, after which it will be deleted.`,
          },
          {
            heading: "16. Governing law",
            body: `These Terms are governed by the laws of Victoria, Australia. You agree to submit to the exclusive jurisdiction of the courts of Victoria for any disputes arising under or in connection with these Terms.`,
          },
          {
            heading: "17. Contact us",
            body: `For any questions about these Terms, contact:

Kevria
Email: support@kevria.com
Website: kevria.com`,
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: "36px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#d4a843", marginBottom: "12px" }}>
              {section.heading}
            </h2>
            <p style={{ color: "#b0a0d0", lineHeight: "1.8", fontSize: "0.95rem", whiteSpace: "pre-line" }}>
              {section.body}
            </p>
          </div>
        ))}
      </main>

      <footer style={{ background: "#0f0a30", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "24px", textAlign: "center" }}>
        <p style={{ color: "#404070", fontSize: "0.85rem" }}>
          © {new Date().getFullYear()} Kevria. All rights reserved. —{" "}
          <a href="/" style={{ color: "#6060a0", textDecoration: "none" }}>Back to home</a>
          {" "}—{" "}
          <a href="/privacy" style={{ color: "#6060a0", textDecoration: "none" }}>Privacy Policy</a>
        </p>
      </footer>
    </div>
  );
}
