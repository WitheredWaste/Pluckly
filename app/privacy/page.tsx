import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Pluckly handles your data.",
  openGraph: { url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pluckly.net"}/privacy` },
};

export default function PrivacyPage() {
  return (
    <article className="max-w-2xl mx-auto px-6 py-16">
      <div className="text-sm text-muted uppercase tracking-wide">Legal</div>
      <h1 className="mt-2 font-serif text-5xl tracking-tight">Privacy Policy</h1>
      <p className="mt-4 text-sm text-muted">Last updated: January 2026</p>

      <div className="mt-10 text-foreground/90 leading-relaxed space-y-6">
        <p>
          This policy explains what data Pluckly collects, how it is used, and your
          rights in relation to it. Pluckly is operated as a sole trader based in the
          United Kingdom and is subject to UK GDPR.
        </p>

        <h2 className="font-serif text-2xl mt-10 text-foreground">Data we collect</h2>
        <p>
          Pluckly does not require account registration and does not collect personal
          data directly. If you contact us by email, we retain that correspondence to
          respond to your enquiry and for no other purpose.
        </p>
        <p>
          We may use third-party analytics tools that collect anonymised usage data such
          as pages visited, referral source, and approximate location at the country
          level. No personally identifiable information is collected through analytics.
        </p>

        <h2 className="font-serif text-2xl mt-10 text-foreground">Cookies</h2>
        <p>
          This site uses only functional cookies necessary for the site to work
          correctly, such as remembering your light or dark mode preference. No
          advertising or tracking cookies are set.
        </p>

        <h2 className="font-serif text-2xl mt-10 text-foreground">Affiliate links</h2>
        <p>
          Some links on this site are affiliate links. When you click an affiliate link
          and make a purchase, the merchant may set cookies on your device to track the
          referral. This is governed by the merchant's own privacy policy. Pluckly
          receives no personal data from these transactions.
        </p>

        <h2 className="font-serif text-2xl mt-10 text-foreground">Third-party services</h2>
        <p>
          Pluckly may use third-party infrastructure and analytics providers to operate
          the site. These providers process data only as necessary to deliver the
          service. We do not sell data to third parties.
        </p>

        <h2 className="font-serif text-2xl mt-10 text-foreground">Your rights</h2>
        <p>
          Under UK GDPR you have the right to access, correct, or request deletion of
          any personal data we hold about you. To exercise these rights, contact us at
          the address on the contact page. We will respond within 30 days.
        </p>

        <h2 className="font-serif text-2xl mt-10 text-foreground">Changes to this policy</h2>
        <p>
          We may update this policy from time to time. The date at the top of this page
          reflects the most recent revision. Continued use of the site after changes
          constitutes acceptance of the updated policy.
        </p>
      </div>
    </article>
  );
}
