export default function PrivacyPolicy() {
  const updated = "27 February 2026";
  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: "#0f0a30", color: "white", minHeight: "100vh" }}>
      <nav style={{ background: "#1a1150", padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "white", width: "fit-content" }}>
          <span style={{ fontSize: "1.5rem", color: "#d4a843" }}>✦</span>
          <span style={{ fontSize: "1.1rem", fontWeight: "600" }}>NDIS Budget Calculator</span>
        </a>
      </nav>

      <main style={{ maxWidth: "760px", margin: "0 auto", padding: "60px 24px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "800", marginBottom: "8px" }}>Privacy Policy</h1>
        <p style={{ color: "#6060a0", fontSize: "0.9rem", marginBottom: "40px" }}>Last updated: {updated}</p>

        {[
          {
            heading: "1. Who we are",
            body: `This NDIS Budget Calculator ("the Service") is operated by Kevria, an Australian business (kevria.com.au). References to "we", "us", or "our" in this policy refer to Kevria.

For privacy enquiries contact us at: support@kevria.com`,
          },
          {
            heading: "2. What personal information we collect",
            body: `We collect the following personal information when you use the Service:

• Email address — collected when you create an account, used solely for authentication and account-related communications.
• Budget and participant data — the NDIS budget calculations, support line details, participant names, and NDIS numbers you enter into the tool. This data is stored in your account to enable cloud sync across devices.

We do not collect payment card details directly. Payments are processed by Stripe, which has its own privacy policy.`,
          },
          {
            heading: "3. How we collect your information",
            body: `We collect your information directly from you when you:
• Create an account
• Enter data into the calculator
• Contact us for support

We use Supabase (a third-party database provider) to store account and calculation data securely.`,
          },
          {
            heading: "4. How we use your information",
            body: `We use your personal information only to:
• Provide and operate the Service
• Authenticate your account and sync your data across devices
• Respond to support enquiries
• Send essential account communications (e.g. password resets)

We do not use your information for advertising or marketing purposes, and we do not sell your data to any third party.`,
          },
          {
            heading: "5. Disclosure of your information",
            body: `We do not sell, rent, or trade your personal information. We may share limited information with the following service providers only to the extent necessary to operate the Service:

• Supabase — database and authentication hosting
• Stripe — payment processing

These providers are contractually bound to protect your data and may not use it for their own purposes.

We may also disclose your information if required to do so by law or in response to a valid legal request.`,
          },
          {
            heading: "6. Data storage and security",
            body: `Your data is stored on Supabase's infrastructure, which is hosted on AWS and complies with industry-standard security practices. We take reasonable steps to protect your personal information from misuse, interference, loss, and unauthorised access.

However, no internet transmission is completely secure and we cannot guarantee the absolute security of your data.`,
          },
          {
            heading: "7. Data retention",
            body: `We retain your account and calculation data for as long as your account is active. If you wish to delete your account and all associated data, contact us at support@kevria.com and we will action your request within 30 days.`,
          },
          {
            heading: "8. Your rights",
            body: `Under the Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles, you have the right to:
• Access the personal information we hold about you
• Request correction of inaccurate or incomplete information
• Make a complaint about how we have handled your personal information

To exercise any of these rights, contact us at support@kevria.com.

If you are not satisfied with our response to a complaint, you may contact the Office of the Australian Information Commissioner (OAIC) at oaic.gov.au.`,
          },
          {
            heading: "9. Cookies",
            body: `The Service uses minimal browser storage (localStorage) to cache your data locally for performance. We do not use third-party tracking cookies or advertising cookies.`,
          },
          {
            heading: "10. Changes to this policy",
            body: `We may update this Privacy Policy from time to time. We will notify you of material changes by updating the "Last updated" date at the top of this page. Continued use of the Service after changes are posted constitutes your acceptance of the updated policy.`,
          },
          {
            heading: "11. Contact us",
            body: `For any privacy-related questions or requests, contact:

Kevria
Email: support@kevria.com
Website: kevria.com.au`,
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
          <a href="/terms" style={{ color: "#6060a0", textDecoration: "none" }}>Terms of Service</a>
        </p>
      </footer>
    </div>
  );
}
