import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsOfService = () => {
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
            <p className="text-sm text-gray-500">Terms of Service</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-gray-500 mb-8">Last Updated: March 16, 2026</p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Agreement to Terms</h2>
              <p className="text-gray-700 mb-4">
                Welcome to Merchant Follow Up. These Terms of Service ("Terms") govern your access to and use of 
                the Merchant Follow Up platform, website at merchantfollowup.com, and any related services 
                (collectively, the "Service") provided by Merchant Follow Up ("Company," "we," "us," or "our").
              </p>
              <p className="text-gray-700 mb-4">
                By accessing or using the Service, you agree to be bound by these Terms. If you disagree with 
                any part of these Terms, you may not access the Service.
              </p>
              <p className="text-gray-700">
                You must be at least 18 years old to use this Service. By using the Service, you represent and 
                warrant that you are at least 18 years of age.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                Merchant Follow Up is a customer relationship management (CRM) platform designed for businesses 
                to manage client relationships, communications, and sales pipelines. Our Service includes:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Client and contact management</li>
                <li>Sales pipeline and deal tracking</li>
                <li>Email integration and management</li>
                <li>SMS and messaging capabilities</li>
                <li>Calendar and scheduling tools</li>
                <li>Automated follow-up campaigns</li>
                <li>Analytics and reporting</li>
                <li>Team collaboration features</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
              
              <h3 className="text-lg font-medium mt-4 mb-2">3.1 Account Creation</h3>
              <p className="text-gray-700 mb-4">
                To use certain features of the Service, you must register for an account. When you register, 
                you agree to provide accurate, current, and complete information and to update such information 
                to keep it accurate, current, and complete.
              </p>

              <h3 className="text-lg font-medium mt-4 mb-2">3.2 Account Security</h3>
              <p className="text-gray-700 mb-4">
                You are responsible for safeguarding your account credentials and for all activities that occur 
                under your account. You agree to notify us immediately of any unauthorized use of your account. 
                We are not liable for any loss or damage arising from your failure to protect your account.
              </p>

              <h3 className="text-lg font-medium mt-4 mb-2">3.3 Account Termination</h3>
              <p className="text-gray-700">
                We reserve the right to suspend or terminate your account at any time for violation of these Terms, 
                fraudulent activity, or any other reason we deem appropriate.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Acceptable Use Policy</h2>
              <p className="text-gray-700 mb-4">You agree NOT to use the Service to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Violate any applicable laws, regulations, or third-party rights</li>
                <li>Send spam, unsolicited messages, or engage in any form of harassment</li>
                <li>Transmit viruses, malware, or other malicious code</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                <li>Use the Service for any illegal or fraudulent purposes</li>
                <li>Interfere with or disrupt the Service or servers/networks connected to the Service</li>
                <li>Collect or harvest user data without consent</li>
                <li>Impersonate any person or entity or misrepresent your affiliation</li>
                <li>Use the Service to send communications that violate the Telephone Consumer Protection Act (TCPA), CAN-SPAM Act, or similar regulations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Third-Party Integrations</h2>
              
              <h3 className="text-lg font-medium mt-4 mb-2">5.1 Google Services</h3>
              <p className="text-gray-700 mb-4">
                Our Service integrates with Google APIs to provide email functionality. By connecting your Google 
                account, you authorize us to access your Gmail data in accordance with our Privacy Policy and 
                Google's Terms of Service. You can revoke this access at any time through your Google Account settings.
              </p>

              <h3 className="text-lg font-medium mt-4 mb-2">5.2 Twilio Services</h3>
              <p className="text-gray-700 mb-4">
                Our SMS and calling features are powered by Twilio. Use of these features is subject to Twilio's 
                Acceptable Use Policy and applicable telecommunications regulations. You are responsible for 
                obtaining proper consent before sending SMS messages or making calls.
              </p>

              <h3 className="text-lg font-medium mt-4 mb-2">5.3 Third-Party Terms</h3>
              <p className="text-gray-700">
                Your use of any third-party services through our platform is subject to those third parties' 
                terms of service and privacy policies. We are not responsible for the practices of third-party services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Payment Terms</h2>
              
              <h3 className="text-lg font-medium mt-4 mb-2">6.1 Subscription Fees</h3>
              <p className="text-gray-700 mb-4">
                Access to certain features of the Service requires a paid subscription. Fees are billed in advance 
                on a monthly or annual basis, depending on your chosen plan.
              </p>

              <h3 className="text-lg font-medium mt-4 mb-2">6.2 Pricing</h3>
              <p className="text-gray-700 mb-4">
                Current pricing is $100 per user per month. We reserve the right to modify pricing with 30 days' 
                notice to existing subscribers.
              </p>

              <h3 className="text-lg font-medium mt-4 mb-2">6.3 Refunds</h3>
              <p className="text-gray-700">
                Subscription fees are non-refundable except as required by law or as explicitly stated in writing.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Intellectual Property</h2>
              
              <h3 className="text-lg font-medium mt-4 mb-2">7.1 Our Intellectual Property</h3>
              <p className="text-gray-700 mb-4">
                The Service and its original content, features, and functionality are owned by Merchant Follow Up 
                and are protected by international copyright, trademark, patent, trade secret, and other 
                intellectual property laws.
              </p>

              <h3 className="text-lg font-medium mt-4 mb-2">7.2 Your Content</h3>
              <p className="text-gray-700 mb-4">
                You retain ownership of all content you upload to the Service ("User Content"). By uploading 
                User Content, you grant us a non-exclusive, worldwide, royalty-free license to use, store, 
                and process that content solely for the purpose of providing the Service to you.
              </p>

              <h3 className="text-lg font-medium mt-4 mb-2">7.3 Feedback</h3>
              <p className="text-gray-700">
                Any feedback, suggestions, or ideas you provide about the Service may be used by us without 
                any obligation to you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. SMS and Communication Compliance</h2>
              <p className="text-gray-700 mb-4">When using our SMS and communication features, you agree to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Obtain proper consent from recipients before sending messages</li>
                <li>Comply with the Telephone Consumer Protection Act (TCPA) and all applicable regulations</li>
                <li>Honor opt-out requests promptly</li>
                <li>Maintain accurate records of consent</li>
                <li>Not send messages to numbers on the Do Not Call Registry without prior consent</li>
                <li>Include proper identification and opt-out instructions in messages</li>
              </ul>
              <p className="text-gray-700 mt-4">
                You are solely responsible for compliance with all applicable laws regarding electronic communications.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Disclaimer of Warranties</h2>
              <p className="text-gray-700 mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER 
                EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, 
                FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.
              </p>
              <p className="text-gray-700">
                We do not warrant that the Service will be uninterrupted, secure, or error-free, that defects 
                will be corrected, or that the Service is free of viruses or other harmful components.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL MERCHANT FOLLOW UP, ITS DIRECTORS, 
                EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, 
                DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Your access to or use of or inability to access or use the Service</li>
                <li>Any conduct or content of any third party on the Service</li>
                <li>Any content obtained from the Service</li>
                <li>Unauthorized access, use, or alteration of your transmissions or content</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Our total liability shall not exceed the amount you paid to us in the twelve (12) months 
                preceding the claim.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">11. Indemnification</h2>
              <p className="text-gray-700">
                You agree to defend, indemnify, and hold harmless Merchant Follow Up and its officers, directors, 
                employees, and agents from and against any claims, liabilities, damages, losses, and expenses, 
                including without limitation reasonable attorney fees and costs, arising out of or in any way 
                connected with: (a) your access to or use of the Service; (b) your violation of these Terms; 
                (c) your violation of any third-party right, including without limitation any intellectual 
                property right, publicity, confidentiality, property, or privacy right; or (d) any claim that 
                your User Content caused damage to a third party.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">12. Governing Law and Dispute Resolution</h2>
              <p className="text-gray-700 mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the United States, 
                without regard to its conflict of law provisions.
              </p>
              <p className="text-gray-700">
                Any dispute arising from these Terms shall first be attempted to be resolved through good faith 
                negotiation. If the dispute cannot be resolved within 30 days, either party may pursue binding 
                arbitration or file a claim in a court of competent jurisdiction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">13. Changes to Terms</h2>
              <p className="text-gray-700">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, 
                we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes 
                a material change will be determined at our sole discretion. Your continued use of the Service 
                after any changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">14. Severability</h2>
              <p className="text-gray-700">
                If any provision of these Terms is held to be unenforceable or invalid, such provision will be 
                changed and interpreted to accomplish the objectives of such provision to the greatest extent 
                possible under applicable law, and the remaining provisions will continue in full force and effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">15. Entire Agreement</h2>
              <p className="text-gray-700">
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and 
                Merchant Follow Up regarding your use of the Service and supersede all prior agreements and 
                understandings, whether written or oral.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">16. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700"><strong>Merchant Follow Up</strong></p>
                <p className="text-gray-700">Email: legal@merchantfollowup.com</p>
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

export default TermsOfService;
