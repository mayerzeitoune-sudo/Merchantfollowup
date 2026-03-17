import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-orange-600">Merchant Follow Up</h1>
            <p className="text-sm text-gray-500">Privacy Policy</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-gray-500 mb-8">Last Updated: March 16, 2026</p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                Welcome to Merchant Follow Up ("we," "our," or "us"). We are committed to protecting your privacy 
                and ensuring the security of your personal information. This Privacy Policy explains how we collect, 
                use, disclose, and safeguard your information when you use our customer relationship management 
                platform at merchantfollowup.com (the "Service").
              </p>
              <p className="text-gray-700">
                By using our Service, you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium mt-4 mb-2">2.1 Information You Provide</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, phone number, and password when you create an account.</li>
                <li><strong>Business Information:</strong> Company name, business address, and other business-related details.</li>
                <li><strong>Client Data:</strong> Information about your clients that you input into the system, including names, contact details, and communication history.</li>
                <li><strong>Communication Content:</strong> Messages, emails, and other communications you send through our platform.</li>
              </ul>

              <h3 className="text-lg font-medium mt-4 mb-2">2.2 Information from Third-Party Services</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Google Gmail Integration:</strong> When you connect your Gmail account, we access your email address, profile information, and email messages to enable email functionality within our platform. We only access emails you explicitly choose to sync.</li>
                <li><strong>Twilio Integration:</strong> Phone numbers and SMS/call logs for communication features.</li>
              </ul>

              <h3 className="text-lg font-medium mt-4 mb-2">2.3 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Usage Data:</strong> Information about how you use our Service, including features accessed and actions taken.</li>
                <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers.</li>
                <li><strong>Log Data:</strong> IP addresses, access times, and pages viewed.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use the collected information for the following purposes:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>To provide, maintain, and improve our Service</li>
                <li>To process and complete transactions</li>
                <li>To send you technical notices, updates, and administrative messages</li>
                <li>To respond to your comments, questions, and customer service requests</li>
                <li>To enable communication features (email, SMS, calls) with your clients</li>
                <li>To monitor and analyze usage patterns and trends</li>
                <li>To detect, prevent, and address technical issues and security threats</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Google API Services - Limited Use Disclosure</h2>
              <p className="text-gray-700 mb-4">
                Our use and transfer to any other app of information received from Google APIs will adhere to the 
                <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-orange-600 hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                  Google API Services User Data Policy
                </a>, including the Limited Use requirements.
              </p>
              <p className="text-gray-700 mb-4">Specifically, we:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Only use Gmail data to provide and improve user-facing features of our email integration</li>
                <li>Do not use Gmail data for advertising purposes</li>
                <li>Do not sell Gmail data to third parties</li>
                <li>Do not use Gmail data for any purpose other than providing the email features you requested</li>
                <li>Allow users to revoke access at any time through their Google Account settings</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Data Storage and Security</h2>
              <p className="text-gray-700 mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Encryption of data in transit using SSL/TLS</li>
                <li>Encryption of sensitive data at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Secure cloud infrastructure with industry-standard protections</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Your data is stored on secure servers provided by our cloud infrastructure partners. 
                We retain your data for as long as your account is active or as needed to provide services to you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Data Sharing and Disclosure</h2>
              <p className="text-gray-700 mb-4">We do not sell your personal information. We may share your information in the following circumstances:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Service Providers:</strong> With third-party vendors who assist in operating our Service (e.g., cloud hosting, email delivery, SMS services).</li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or governmental authority.</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize sharing.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Your Rights and Choices</h2>
              <p className="text-gray-700 mb-4">You have the following rights regarding your personal information:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information, subject to legal retention requirements.</li>
                <li><strong>Data Portability:</strong> Request a copy of your data in a portable format.</li>
                <li><strong>Withdraw Consent:</strong> Revoke consent for data processing at any time.</li>
                <li><strong>Disconnect Services:</strong> Remove connected third-party services (like Gmail) at any time.</li>
              </ul>
              <p className="text-gray-700 mt-4">
                To exercise these rights, please contact us at privacy@merchantfollowup.com.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Cookies and Tracking Technologies</h2>
              <p className="text-gray-700 mb-4">
                We use cookies and similar tracking technologies to track activity on our Service and hold certain information. 
                Cookies are files with small amounts of data that may include an anonymous unique identifier.
              </p>
              <p className="text-gray-700">
                You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. 
                However, if you do not accept cookies, you may not be able to use some portions of our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Children's Privacy</h2>
              <p className="text-gray-700">
                Our Service is not intended for use by children under the age of 18. We do not knowingly collect 
                personal information from children under 18. If you become aware that a child has provided us with 
                personal information, please contact us, and we will take steps to delete such information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. International Data Transfers</h2>
              <p className="text-gray-700">
                Your information may be transferred to and maintained on computers located outside of your state, 
                province, country, or other governmental jurisdiction where data protection laws may differ. 
                By using our Service, you consent to such transfers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">11. Changes to This Privacy Policy</h2>
              <p className="text-gray-700">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting 
                the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review 
                this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">12. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700"><strong>Merchant Follow Up</strong></p>
                <p className="text-gray-700">Email: privacy@merchantfollowup.com</p>
                <p className="text-gray-700">Website: https://merchantfollowup.com</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Merchant Follow Up. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link to="/privacy" className="text-orange-600 hover:underline">Privacy Policy</Link>
            <Link to="/terms" className="text-orange-600 hover:underline">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
