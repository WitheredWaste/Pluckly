import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Pluckly.",
  openGraph: { url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pluckly.net"}/contact` },
};

export default function ContactPage() {
  return (
    <article className="max-w-2xl mx-auto px-6 py-16">
      <div className="text-sm text-muted uppercase tracking-wide">Contact</div>
      <h1 className="mt-2 font-serif text-5xl tracking-tight">Get in touch</h1>

      <div className="mt-10 text-foreground/90 leading-relaxed space-y-6">
        <p>
          For corrections, tool suggestions, or affiliate partnership enquiries, email:
        </p>
        <p className="font-serif text-xl">
            <a
            href="mailto:support@pluckly.net"
            className="text-accent hover:underline"
          >
            support@pluckly.net
          </a>
        </p>
        <p className="text-muted text-sm">
          We aim to respond within a few business days. For tool listing requests,
          please include a link to the tool and a brief note on why it would be useful
          to the creator audience.
        </p>
      </div>
    </article>
  );
}
