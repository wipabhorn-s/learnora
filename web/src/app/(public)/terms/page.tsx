import { ContactEmail, LegalPage } from "@/components/shared/LegalPage";
import TextLink from "@/components/shared/TextLink";
import { LEGAL } from "@/lib/constants/legal";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service | Learnora" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <>
          <p>
            These terms explain the rules for using Learnora, an online platform
            where students buy and take courses and instructors publish them. By
            creating an account or buying a course, you agree to these terms and
            to our <TextLink href="/privacy">Privacy Policy</TextLink>.
          </p>
          <p>If you don&apos;t agree, please don&apos;t use the platform.</p>
        </>
      }
      sections={[
        {
          id: "accounts",
          title: "Your account",
          content: (
            <>
              <ul>
                <li>
                  You must give accurate information and verify your email
                  address before you can sign in with a password.
                </li>
                <li>
                  You are responsible for everything that happens under your
                  account. Keep your password private, and turn on two-factor
                  authentication for extra protection.
                </li>
                <li>
                  One person, one account. Don&apos;t share, sell or transfer
                  your account.
                </li>
                <li>
                  If you are under 20, you need permission from a parent or
                  guardian to buy courses.
                </li>
              </ul>
              <p>
                We may suspend accounts that break these terms, put other users
                at risk, or are used for fraud.
              </p>
            </>
          ),
        },
        {
          id: "purchases",
          title: "Buying courses",
          content: (
            <>
              <ul>
                <li>
                  Prices are shown in Thai baht (฿) and include any applicable
                  taxes unless stated otherwise.
                </li>
                <li>
                  Payments are processed by Opn Payments (Omise). We never see
                  or store your full card number.
                </li>
                <li>
                  A purchase gives you a personal, non-transferable licence to
                  watch the course. You don&apos;t own the course content.
                </li>
                <li>
                  <strong>Lifetime access</strong> means for as long as the
                  course and Learnora are available.{" "}
                  <strong>Limited access</strong> courses end after the number
                  of days shown on the course page, counted from when your
                  payment succeeds.
                </li>
                <li>
                  Courses may be updated, and in rare cases removed, by the
                  instructor or by us. If a course you paid for is removed
                  within your access period, contact us and we&apos;ll offer a
                  refund or a replacement.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "refunds",
          title: "Refunds",
          content: (
            <>
              <p>
                You can request a refund within{" "}
                <strong>{LEGAL.REFUND_WINDOW_DAYS} days</strong> of a successful
                purchase from your{" "}
                <TextLink href="/purchase-history">Purchase History</TextLink>.
              </p>
              <ul>
                <li>
                  Every request is reviewed by our team. We may decline requests
                  that look like abuse, for example when most of the course has
                  already been completed, or after repeated refunds.
                </li>
                <li>
                  You can send one request per purchase. We&apos;ll email you
                  the decision.
                </li>
                <li>
                  If approved, you lose access to the refunded courses. Card
                  payments are returned to the same card; the time it takes
                  depends on your bank (usually 7–14 business days). PromptPay
                  payments are transferred back to you manually.
                </li>
                <li>Free courses can&apos;t be refunded.</li>
              </ul>
              <p>
                This doesn&apos;t limit any rights you have under Thai consumer
                protection law.
              </p>
            </>
          ),
        },
        {
          id: "acceptable-use",
          title: "Acceptable use",
          content: (
            <>
              <p>You agree not to:</p>
              <ul>
                <li>
                  Download, record, copy, resell or share course videos or
                  materials, or share your login so others can watch.
                </li>
                <li>
                  Upload anything illegal, harmful, misleading, or that you
                  don&apos;t have the rights to.
                </li>
                <li>
                  Try to break, overload, scrape or get unauthorised access to
                  the platform or other people&apos;s accounts.
                </li>
                <li>Use stolen payment details or abuse the refund process.</li>
              </ul>
            </>
          ),
        },
        {
          id: "instructors",
          title: "Instructors",
          content: (
            <>
              <ul>
                <li>
                  You keep ownership of the content you upload. You give
                  Learnora a worldwide, non-exclusive licence to host, stream,
                  promote and sell it to students on the platform while your
                  course is published, and to keep providing it to students who
                  already bought it.
                </li>
                <li>
                  You confirm you have the rights to everything in your course,
                  including videos, music, images and code.
                </li>
                <li>
                  Courses must be accurate and match their description. We may
                  unpublish or suspend courses that break these terms or receive
                  repeated valid complaints.
                </li>
                <li>
                  Revenue share and payouts for paid courses are set out in a
                  separate instructor agreement.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "liability",
          title: "Disclaimers and liability",
          content: (
            <>
              <p>
                Courses are provided for learning purposes. Instructors are
                responsible for their content, and we can&apos;t guarantee any
                particular result from taking a course.
              </p>
              <p>
                We work to keep Learnora available and secure, but the service
                is provided &quot;as is&quot; and may sometimes be unavailable.
                To the extent the law allows, our total liability to you for any
                claim is limited to the amount you paid us in the 12 months
                before the claim.
              </p>
            </>
          ),
        },
        {
          id: "changes",
          title: "Changes and ending your account",
          content: (
            <>
              <p>
                We may update these terms. If the changes are significant,
                we&apos;ll let you know by email or on the site before they take
                effect. Continuing to use Learnora after that means you accept
                the new terms.
              </p>
              <p>
                You can delete your account at any time from Profile → Login
                &amp; Security. You&apos;ll lose access to the courses you
                bought. Instructors with courses need to remove them first, or
                contact us.
              </p>
            </>
          ),
        },
        {
          id: "law",
          title: "Governing law",
          content: (
            <p>
              These terms are governed by the laws of Thailand. Any dispute will
              be handled by the competent courts of Thailand.
            </p>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          content: (
            <p>
              Questions about these terms? Email us at <ContactEmail />.
            </p>
          ),
        },
      ]}
    />
  );
}
