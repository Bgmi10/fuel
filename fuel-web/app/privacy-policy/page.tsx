import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Fitness Center",
  description:
    "Privacy Policy explaining how we collect, use, store, and protect your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800">
      <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <header className="mb-12 border-b border-gray-200 pb-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Privacy Policy
          </h1>

          <p className="mt-4 text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString("en-IN")}
          </p>

          <p className="mt-6 text-lg leading-8 text-gray-600">
            We respect your privacy and are committed to protecting your
            personal information. This Privacy Policy explains how we collect,
            use, store, and protect information when you use our website,
            membership services, fitness applications, and related services.
          </p>
        </header>

        <div className="space-y-10 leading-7">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900">
              1. Information We Collect
            </h2>

            <p className="mt-4">
              We may collect information that you provide directly to us when
              you register as a member, contact us, book a trial, purchase a
              membership, make a payment, or use our fitness services.
            </p>

            <h3 className="mt-6 text-lg font-semibold text-gray-900">
              Personal Information
            </h3>

            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Name</li>
              <li>Phone number</li>
              <li>Email address</li>
              <li>Date of birth</li>
              <li>Gender</li>
              <li>Address</li>
              <li>Profile photograph</li>
              <li>Emergency contact information</li>
              <li>Branch and membership information</li>
            </ul>

            <h3 className="mt-6 text-lg font-semibold text-gray-900">
              Fitness and Health Information
            </h3>

            <p className="mt-3">
              If you choose to provide it, we may collect information related
              to your fitness and wellness activities, including weight,
              height, body measurements, body-fat percentage, fitness
              assessments, workout plans, diet plans, nutrition information,
              fitness goals, and related notes.
            </p>

            <p className="mt-3">
              Please provide health or fitness information only when necessary
              for your requested services. Such information may be used by
              authorized fitness professionals to provide and manage your
              fitness program.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">
              2. Trial Bookings and Enquiries
            </h2>

            <p className="mt-4">
              When you submit a contact enquiry or trial booking, we may
              collect your name, phone number, email address, fitness goal,
              preferred time, scheduled date, and the message or information
              you provide.
            </p>

            <p className="mt-3">
              This information is used to respond to your enquiry, arrange
              appointments, communicate with you, and provide requested
              services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">
              3. Membership and Payment Information
            </h2>

            <p className="mt-4">
              When you purchase a membership or other service, we may maintain
              information such as your selected package, subscription dates,
              invoices, discounts, payments, payment method, receipts, and
              membership status.
            </p>

            <p className="mt-3">
              Payment transactions may be processed through third-party
              payment providers. We do not intend to store complete card
              numbers, CVV numbers, or other sensitive payment credentials in
              our own database unless specifically required and lawfully
              permitted.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">
              4. How We Use Your Information
            </h2>

            <p className="mt-4">We may use your information to:</p>

            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Create and manage your membership account.</li>
              <li>Process membership purchases and payments.</li>
              <li>Manage subscriptions and invoices.</li>
              <li>Schedule and manage trial bookings.</li>
              <li>Provide fitness, workout, and nutrition services.</li>
              <li>Maintain fitness assessments and progress information.</li>
              <li>Manage slot bookings and attendance.</li>
              <li>Send service-related notifications.</li>
              <li>Respond to enquiries and customer-support requests.</li>
              <li>Manage referrals, rewards, and applicable promotions.</li>
              <li>Improve our website, applications, and services.</li>
              <li>Prevent fraud, abuse, and unauthorized access.</li>
              <li>Comply with applicable legal and regulatory requirements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">
              5. Workout and Diet Information
            </h2>

            <p className="mt-4">
              Our services may allow authorized coaches or fitness
              professionals to create workout plans, workout programs, diet
              plans, meal plans, food logs, and fitness assessments for
              members.
            </p>

            <p className="mt-3">
              This information is used to deliver the services requested by
              you and to help authorized staff manage your fitness program.
            </p>

            <p className="mt-3">
              Fitness and nutrition information provided through the platform
              should not be considered a substitute for professional medical
              advice, diagnosis, or treatment.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">
              6. WhatsApp and Other Communications
            </h2>

            <p className="mt-4">
              We may use phone, email, WhatsApp, SMS, push notifications, or
              other communication channels to contact you about your enquiries,
              bookings, membership, payments, appointments, and other
              service-related matters.
            </p>

            <p className="mt-3">
              Where third-party communication providers are used, your
              information may be processed by those providers according to
              their respective privacy policies and terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">
              7. Referrals and Promotions
            </h2>

            <p className="mt-4">
              If you participate in our referral or promotional programs, we
              may process referral codes, referral relationships, rewards,
              discounts, and related membership information to administer the
              program.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">
              8. Cookies and Similar Technologies
            </h2>

            <p className="mt-4">
              Our website or application may use cookies, local storage,
              session technologies, analytics tools, or similar technologies
              to maintain sessions, remember preferences, improve performance,
              and understand how our services are used.
            </p>

            <p className="mt-3">
              You may be able to control certain cookies through your browser
              settings. Disabling certain cookies may affect the functionality
              of some parts of the website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">
              9. Data Sharing
            </h2>

            <p className="mt-4">
              We do not sell your personal information as a product to third
              parties.
            </p>

            <p className="mt-3">
              We may share information with trusted service providers when
              reasonably necessary to operate our services, including
              providers for hosting, payment processing, communications,
              analytics, authentication, notifications, and technical
              infrastructure.
            </p>

            <p className="mt-3">
              We may also disclose information when required by applicable
              law, legal process, court order, governmental request, or when
              necessary to protect our rights, users, property, or security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">
              10. Data Security
            </h2>

            <p className="mt-4">
              We use reasonable technical and organizational safeguards
              designed to protect personal information against unauthorized
              access, alteration, disclosure, loss, or destruction.
            </p>

            <p className="mt-3">
              However, no method of electronic storage or transmission over
              the internet can be guaranteed to be completely secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">
              11. Data Retention
            </h2>

            <p className="mt-4">
              We retain personal information for as long as reasonably
              necessary to provide our services, maintain business and
              financial records, resolve disputes, enforce agreements, comply
              with legal obligations, and protect our legitimate interests.
            </p>

            <p className="mt-3">
              Retention periods may vary depending on the type of information
              and the purpose for which it was collected.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">
              12. Your Privacy Rights
            </h2>

            <p className="mt-4">
              Depending on applicable law, you may have rights relating to
              your personal information, including the right to request access,
              correction, updating, or deletion of certain information.
            </p>

            <p className="mt-3">
              You may also contact us regarding questions about how your
              personal information is processed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">
              13. Children's Privacy
            </h2>

            <p className="mt-4">
              Our services are not intended to knowingly collect personal
              information from children without appropriate parental or
              guardian involvement where required by applicable law.
            </p>

            <p className="mt-3">
              If you believe that a child has provided personal information
              without appropriate authorization, please contact us so that we
              can review the situation and take appropriate action.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">
              14. Third-Party Services
            </h2>

            <p className="mt-4">
              Our website or application may contain integrations or links to
              third-party services. These services operate under their own
              privacy policies and terms.
            </p>

            <p className="mt-3">
              We recommend reviewing the privacy policies of third-party
              services before providing them with personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">
              15. Changes to This Privacy Policy
            </h2>

            <p className="mt-4">
              We may update this Privacy Policy from time to time to reflect
              changes in our services, technology, legal requirements, or
              business practices.
            </p>

            <p className="mt-3">
              When changes are made, we will update the "Last updated" date
              displayed at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">
              16. Contact Us
            </h2>

            <p className="mt-4">
              If you have questions, concerns, or requests regarding this
              Privacy Policy or your personal information, please contact us
              using the contact details provided by your fitness center.
            </p>

            <div className="mt-6 rounded-lg bg-gray-50 p-6">
              <p className="font-medium text-gray-900">
                Privacy / Support Contact
              </p>

              <p className="mt-2 text-gray-600">
                Email: fuelgym.co@gmail.com
              </p>

              <p className="mt-1 text-gray-600">
                Phone: +91 842 842 88 66
              </p>
            </div>
          </section>
        </div>

        <footer className="mt-16 border-t border-gray-200 pt-8">
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to Home
          </Link>
        </footer>
      </div>
    </main>
  );
}
