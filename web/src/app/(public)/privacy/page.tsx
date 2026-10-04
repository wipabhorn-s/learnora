import { ContactEmail, LegalPage } from "@/components/shared/LegalPage";
import TextLink from "@/components/shared/TextLink";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy | Learnora" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <>
          <p>
            This policy explains what personal data Learnora collects, why we
            use it, who we share it with, and the rights you have under
            Thailand&apos;s Personal Data Protection Act B.E. 2562 (PDPA).
          </p>
          <p>
            Learnora is the data controller for the personal data described
            here. Using the platform is also subject to our{" "}
            <TextLink href="/terms">Terms of Service</TextLink>.
          </p>
        </>
      }
      sections={[
        {
          id: "data-we-collect",
          title: "Data we collect",
          content: (
            <ul>
              <li>
                <strong>Account details:</strong> first and last name, email
                address, password (stored only as a one-way hash), profile
                photo, and instructor bio if you teach.
              </li>
              <li>
                <strong>Google sign-in:</strong> if you use it, your Google
                account ID, name and email address. We never receive your Google
                password.
              </li>
              <li>
                <strong>Purchases:</strong> what you bought, the amount, the
                payment method type and status, and refund requests with the
                reason you give. Card details go directly to our payment
                provider; we only receive a token and the result.
              </li>
              <li>
                <strong>Learning activity:</strong> courses you&apos;re enrolled
                in, lessons completed and where you stopped watching, your cart
                and wishlist.
              </li>
              <li>
                <strong>Security records:</strong> email verification links,
                password-reset links and one-time sign-in codes, kept in hashed
                form and only until they expire or are used.
              </li>
              <li>
                <strong>Technical data:</strong> basic logs that our hosting
                providers record automatically, such as IP address, browser type
                and request times.
              </li>
            </ul>
          ),
        },
        {
          id: "how-we-use",
          title: "How we use your data",
          content: (
            <>
              <ul>
                <li>
                  <strong>To provide the service</strong> (performing our
                  contract with you): creating your account, processing
                  purchases and refunds, giving you access to courses, and
                  saving your progress.
                </li>
                <li>
                  <strong>To keep accounts secure</strong> (legitimate
                  interest): verifying emails, two-factor authentication,
                  detecting fraud and abuse.
                </li>
                <li>
                  <strong>To contact you about your account</strong>: emails
                  about verification, sign-in codes, password resets, purchases
                  and refund decisions. We don&apos;t send marketing emails.
                </li>
                <li>
                  <strong>To meet legal duties</strong>: keeping payment and
                  accounting records as required by Thai law.
                </li>
              </ul>
              <p>
                Instructors see the number of students in their courses, not
                students&apos; personal contact details. Your name, photo and
                bio are public on your instructor profile if you teach.
              </p>
            </>
          ),
        },
        {
          id: "sharing",
          title: "Who we share data with",
          content: (
            <>
              <p>
                We don&apos;t sell your personal data. We share it only with
                service providers that help us run Learnora, under agreements
                that require them to protect it:
              </p>
              <ul>
                <li>
                  <strong>Opn Payments (Omise)</strong> — processes payments and
                  refunds.
                </li>
                <li>
                  <strong>Brevo</strong> — sends account and purchase emails.
                </li>
                <li>
                  <strong>Cloudinary</strong> — stores profile photos, course
                  images and lesson videos.
                </li>
                <li>
                  <strong>Google</strong> — only if you choose to sign in with
                  Google.
                </li>
                <li>
                  <strong>Hosting and database providers</strong> — run our
                  servers.
                </li>
              </ul>
              <p>
                Some of these providers may process data outside Thailand. When
                that happens, we rely on safeguards permitted under the PDPA. We
                may also disclose data when required by law or to protect users
                from fraud.
              </p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "Cookies",
          content: (
            <>
              <p>
                We use only cookies that are necessary for the site to work. We
                don&apos;t use advertising or third-party tracking cookies.
              </p>
              <ul>
                <li>
                  <strong>Session cookie</strong> — keeps you signed in.
                </li>
                <li>
                  <strong>Sign-in step cookie</strong> — remembers that your
                  password was correct while you enter a two-factor code
                  (expires after 10 minutes).
                </li>
                <li>
                  <strong>Preference cookies</strong> — remember small choices,
                  such as whether you last used the Learn or Teach area.
                </li>
              </ul>
              <p>
                Our payment provider may set its own cookies on the payment form
                for fraud prevention.
              </p>
            </>
          ),
        },
        {
          id: "retention",
          title: "How long we keep data",
          content: (
            <ul>
              <li>
                Account and learning data: for as long as your account is open.
                When you delete your account, your name, email, password, photo,
                bio, cart, wishlist and progress are removed right away.
              </li>
              <li>
                Purchase and refund records: for the period required by Thai tax
                and accounting law, even after your account is closed.
              </li>
              <li>
                Verification links and one-time codes: until they are used or
                expire.
              </li>
            </ul>
          ),
        },
        {
          id: "your-rights",
          title: "Your rights",
          content: (
            <>
              <p>Under the PDPA, you have the right to:</p>
              <ul>
                <li>access and get a copy of your personal data;</li>
                <li>
                  correct inaccurate data (you can edit your name, photo and bio
                  yourself on your profile page);
                </li>
                <li>
                  delete your account yourself from Profile → Login &amp;
                  Security, or ask us to delete your data;
                </li>
                <li>object to or restrict how we use your data;</li>
                <li>receive your data in a commonly used electronic format;</li>
                <li>
                  withdraw consent where we rely on it, without affecting
                  earlier processing;
                </li>
                <li>
                  complain to Thailand&apos;s Personal Data Protection Committee
                  (PDPC).
                </li>
              </ul>
              <p>
                To use these rights, email <ContactEmail />. We&apos;ll reply
                within 30 days. Some data, such as payment records, may have to
                be kept for legal reasons even if you ask us to delete it.
              </p>
            </>
          ),
        },
        {
          id: "security",
          title: "Security",
          content: (
            <p>
              We protect your data with encrypted connections (HTTPS), hashed
              passwords and tokens, optional two-factor authentication, and
              access limited to staff who need it. No system is perfectly
              secure, so please use a strong, unique password. If a breach
              affects your data, we&apos;ll notify you and the authorities as
              the PDPA requires.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes to this policy",
          content: (
            <p>
              We may update this policy. If the changes are significant,
              we&apos;ll let you know by email or on the site before they take
              effect.
            </p>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          content: (
            <p>
              Questions about your privacy? Email us at <ContactEmail />.
            </p>
          ),
        },
      ]}
    />
  );
}
