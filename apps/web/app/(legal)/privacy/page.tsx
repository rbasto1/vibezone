import type { Metadata, NextPage } from "next";

import type { ProviderPrivacyInfo } from "@/generated/providers-privacy";
import { providersPrivacy } from "@/generated/providers-privacy";
import { siteDomain, siteName } from "@/lib/branding";
import { ItemList, SectionHeader, SectionSubheader } from "../text";

const title = `Privacy Policy | ${siteName}`;

export const metadata: Metadata = {
  title,
  description: `Learn how ${siteName} protects your privacy and handles your data. Our privacy policy explains our data collection, usage, and protection practices.`,
  keywords: [
    "privacy policy",
    "data protection",
    `${siteName} privacy`,
    "user data",
    "privacy terms",
  ],
  openGraph: {
    title,
    description: `Learn how ${siteName} protects your privacy and handles your data.`,
    type: "website",
    url: "/privacy",
  },
};

const PrivacyPage: NextPage = () => {
  const nameFull =
    siteDomain === "multipla.ia.br" ? "Multipla.ia.br" : "Vibezone.ai";
  const supportEmail =
    siteDomain === "multipla.ia.br"
      ? "support@multipla.ia.br"
      : "support@vibezone.ai";

  return (
    <article className="mx-auto w-full max-w-3xl px-4 sm:px-6 md:px-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground italic">
          Last updated: September 24, 2025
        </p>
      </header>

      <main className="[&>section>p]:mt-3">
        <section>
          <SectionSubheader>Summary</SectionSubheader>
          <p>In short:</p>
          <ItemList>
            <li>
              We keep a record of your chats so you can revisit them in your
              history.
            </li>
            <li>
              We do <strong>not</strong> use your chats to train AI models.
            </li>
            <li>
              The model providers we connect to (e.g. OpenAI, Anthropic, Google)
              may use chats for their own training unless you opt out with them
              directly.
            </li>
            <li>
              We display notices throughout our Service when this may be the
              case, but these are provided on a best-effort basis only. For
              authoritative details, you should consult the provider’s own
              privacy policy and terms of use (see the <ProviderPoliciesLink />{" "}
              section below).
            </li>
            <li>
              We may use aggregated, non-identifiable metadata (like model
              usage, response time, or feedback ratings) to improve our Service
              and suggest models better suited to your needs.
            </li>
            <li>We do not sell your personal information.</li>
          </ItemList>
        </section>

        <section>
          <SectionHeader num={null}>Introduction</SectionHeader>
          <p>
            {nameFull} (“{siteName},” “we,” “our,” or “us”) values your trust
            and takes your privacy seriously. This Privacy Policy explains how
            we handle the personal information we collect when you use our
            website, applications, and services (together, the “Service”). It
            also describes the choices available to you regarding your data.
          </p>
          <p>This Privacy Policy applies whenever you:</p>
          <ItemList>
            <li>
              Visit our website at https://www.{siteDomain} and any related
              pages that link to this Privacy Policy (the “Site”);
            </li>
            <li>
              Use or interact with the Service, including through integrated
              applications or third-party platforms that reference this Privacy
              Policy.
            </li>
          </ItemList>
          <p>
            Use or interact with the Service, including through integrated
            applications or third-party platforms that reference this Privacy
            Policy.
          </p>
          <p>
            By accessing or using our Site or Service, you agree to this Privacy
            Policy and our Terms of Service. If you do not agree with them, you
            should not use the Site or Service. Please review both documents
            carefully before proceeding.
          </p>
          <p>
            We may update this Privacy Policy from time to time. When we make
            changes, we will revise the “Last Updated” date at the top of the
            page and post the revised version on our Site. If we make material
            changes that affect how we handle the personal data of registered
            users, we will notify you in advance (for example, by email). Your
            continued use of the Site or Service after changes take effect means
            you accept the updated policy.
          </p>
          <p>
            From time to time, we may also provide additional notices within the
            Service to explain in more detail how specific data is collected,
            used, or shared. These notices are intended to supplement this
            Privacy Policy and give you more control over your information.
          </p>
        </section>

        <section>
          <SectionHeader num={1}>Information We Collect</SectionHeader>
          <p>
            We collect different types of information when you use {nameFull}{" "}
            (“Service”), some of which may be considered personal data under
            applicable laws.
          </p>
          <SectionSubheader>Information You Provide</SectionSubheader>
          <ItemList>
            <li>
              <strong>Account Information</strong>: When you register, we
              collect your email address (via email link login or Google login).
              If you use Google login, we may also receive your name and profile
              picture.
            </li>
            <li>
              <strong>Profile Information</strong>: You may choose to provide
              additional optional information in your profile, such as your
              name, city, age, or gender.
            </li>
            <li>
              <strong>Chats</strong>: We store the content of your chats (inputs
              and outputs) for logged-in users, so you can view your history. We
              do not use your chats to train AI models. Please note, however,
              that the third-party providers of the models may use chats for
              training; see <ProviderPoliciesLink />.
            </li>
            <li>
              <strong>Preferences</strong>: The models you choose to use, the
              models you add to your favorites, and if you "like" or "dislike"
              responses, we keep that information.
            </li>
            <li>
              <strong>Communications</strong>: If you contact us by email or
              through the Service, we may store copies of that correspondence.
            </li>
          </ItemList>

          <SectionSubheader>
            Information Collected Automatically
          </SectionSubheader>
          <p>
            When you use the Service, we may automatically collect technical
            information, such as:
          </p>
          <ItemList>
            <li>
              IP address, browser type, operating system, and device
              information.
            </li>
            <li>
              Usage data such as which models you use, how long responses take,
              and error reports.
            </li>
            <li>
              Cookies or similar technologies that help us keep you logged in
              and maintain session security. We do <strong>not</strong> use
              cookies for advertising or behavioral tracking.
            </li>
          </ItemList>

          <SectionSubheader>Analytics</SectionSubheader>
          <p>
            We may use third-party analytics services (for example, Google
            Analytics or PostHog) to help us understand how the Service is used
            and to improve performance. These services may collect information
            such as which pages you visit, how you interact with the Site, and
            basic device identifiers. For more information, please see their
            respective privacy policies.
          </p>
        </section>

        <section>
          <SectionHeader num={2}>
            Cookies and Tracking Technologies
          </SectionHeader>
          <p>
            Like most online services, {siteName} uses cookies and similar
            technologies to operate and improve our Service.
          </p>

          <SectionSubheader>How We Use Cookies</SectionSubheader>
          <p>
            We use cookies and related technologies for the following purposes:
          </p>
          <ItemList>
            <li>
              <strong>Essential cookies</strong>: Required for the Site and
              Service to function properly, such as maintaining your login
              session and account security.
            </li>
            <li>
              <strong>Preference cookies</strong>: To remember your settings or
              profile details you choose to share (e.g. display preferences).
            </li>
            <li>
              <strong>Analytics cookies</strong>: To help us understand how the
              Service is used, diagnose technical issues, and improve
              performance.
            </li>
          </ItemList>
          <p>We do not use cookies for targeted advertising.</p>

          <SectionSubheader>Your Choices</SectionSubheader>
          <ItemList>
            <li>
              <strong>Browser settings</strong>: Most browsers let you refuse or
              delete cookies. If you do so, some parts of the Service may not
              function correctly.
            </li>
            <li>
              <strong>Do Not Track / Global Privacy Control</strong>: {siteName}{" "}
              respects standard browser signals where required by law.
            </li>
            <li>
              <strong>Consent</strong>: By using {siteName}, you consent to the
              use of cookies as described here. You may withdraw or modify your
              consent at any time through your browser settings.
            </li>
          </ItemList>
          <p>
            For more information about cookies and how to manage them, you can
            visit{" "}
            <a
              href="https://www.allaboutcookies.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.allaboutcookies.org
            </a>
            .
          </p>
        </section>

        <section>
          <SectionHeader num={3}>How We Use Your Information</SectionHeader>
          <p>
            We use the information we collect for purposes that are necessary to
            provide and improve the Service, including:
          </p>
          <ItemList>
            <li>
              <strong>Operating the Service</strong>: To provide you with access
              to the chat interface, maintain your account, and store your chat
              history.
            </li>
            <li>
              <strong>Communications</strong>: To send account-related messages,
              such as login links, confirmations, security notices, or updates
              about changes to the Service or our policies.
            </li>
            <li>
              <strong>Improvement and personalization</strong>: To analyze usage
              patterns, collect feedback, and improve the quality and
              performance of the Service. For example, we may use aggregated
              metadata to suggest models that fit specific use cases.
            </li>
            <li>
              <strong>Security and abuse prevention</strong>: To detect,
              prevent, and address fraud, abuse, or unauthorized access.
            </li>
            <li>
              <strong>Legal compliance</strong>: To comply with legal
              obligations and enforce our Terms of Service.
            </li>
            <li>
              <strong>Other purposes disclosed to you</strong>: Any other
              purpose made clear to you at the time of collection, or with your
              consent.
            </li>
          </ItemList>

          <SectionSubheader>Aggregated and De-Identified Data</SectionSubheader>
          <p>
            We may process information in an aggregated or de-identified form
            (which does not identify you personally) to understand general usage
            trends, measure performance, and improve our Service. We may share
            such aggregated insights publicly or with partners, but never in a
            way that reveals your individual identity.
          </p>
        </section>

        <section>
          <SectionHeader num={4}>
            How We Share and Disclose Your Information
          </SectionHeader>
          <p>
            We do not sell your personal information. We may share your data
            only in the following circumstances:
          </p>
          <ItemList>
            <li>
              <strong>Service providers</strong>: We rely on trusted third-party
              vendors to help us operate the Service (for example, hosting,
              authentication, analytics, or email delivery). These providers may
              only process your data on our behalf and under strict
              confidentiality obligations.
            </li>
            <li>
              <strong>Model providers</strong>: When you send a message through
              {siteName}, your inputs are transmitted to the chosen model
              provider (e.g. OpenAI, Anthropic). These providers process your
              data in line with their own privacy policies (see{" "}
              <ProviderPoliciesLink />
              ).
            </li>
            <li>
              <strong>Legal obligations</strong>: We may disclose information if
              required by law, regulation, legal process, or governmental
              request, or if we believe it is necessary to protect the rights,
              property, or safety of {siteName}, our users, or the public.
            </li>
            <li>
              <strong>Business transactions</strong>: If {siteName} is involved
              in a merger, acquisition, or sale of assets, your personal data
              may be transferred as part of that transaction.
            </li>
            <li>
              <strong>With your consent</strong>: In any other situation, we
              will share your information only with your explicit consent.
            </li>
          </ItemList>
        </section>

        <section>
          <SectionHeader num={5}>Your Rights and Choices</SectionHeader>

          <SectionSubheader>Access, Update, and Deletion</SectionSubheader>
          <p>
            You can review and update the information in your account profile at
            any time by logging into the Service. If you would like to delete
            your account (including your chat history), you may request this by
            contacting us at{" "}
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Once
            confirmed, deletion cannot be reversed, though in some cases we may
            retain limited information if required by law or for legitimate
            business purposes (such as security, fraud prevention, or
            compliance).
          </p>

          <SectionSubheader>Rights Under Applicable Laws</SectionSubheader>
          <p>
            Depending on where you live, you may have additional rights
            regarding your personal data. These may include:
          </p>
          <ItemList>
            <li>
              <strong>Right to know</strong>: to request details about the
              categories of personal data we collect and how it is used.
            </li>
            <li>
              <strong>Right of access and portability</strong>: to request a
              copy of your personal data, in a portable format where technically
              feasible.
            </li>
            <li>
              <strong>Right to correction</strong>: to request correction of
              inaccurate information.
            </li>
            <li>
              <strong>Right to deletion</strong>: to request that we delete your
              personal data, subject to applicable exceptions.
            </li>
            <li>
              <strong>Right to object or restrict</strong>: to object to certain
              processing or ask us to limit how your information is used.
            </li>
            <li>
              <strong>Right to withdraw consent</strong>: if our processing is
              based on consent, you may withdraw it at any time (without
              affecting prior processing).
            </li>
            <li>
              <strong>Right not to be discriminated against</strong>: if you
              exercise your privacy rights under CCPA/CPRA (for California
              residents).
            </li>
          </ItemList>

          <SectionSubheader>How to Exercise Your Rights</SectionSubheader>
          <p>
            To exercise your rights, please contact us at{" "}
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. We may need
            to verify your identity before fulfilling your request. If permitted
            by law, you may also authorize an agent to make requests on your
            behalf.
          </p>

          <SectionSubheader>Marketing Communications</SectionSubheader>
          <p>
            We do not currently send promotional or marketing emails. If this
            changes in the future, we will give you clear choices to opt out of
            such communications.
          </p>

          <SectionSubheader>No Sale of Personal Data</SectionSubheader>
          <p>
            We do not "sell" your personal data as defined under applicable
            laws, nor do we share it for cross-context behavioral advertising.
          </p>
        </section>

        <section>
          <SectionHeader num={6}>Data Security</SectionHeader>
          <p>
            We use reasonable technical, organizational, and administrative
            measures to protect your personal data against accidental loss and
            against unauthorized access, use, alteration, or disclosure. All
            personal data you provide to us is stored on secure servers behind
            firewalls.
          </p>
          <p>
            The security of your account also depends on you. If you use Google
            login, your account security is managed by Google. If you log in via
            email link, please keep your email account secure, as access to that
            account may allow access to your {siteName} account.
          </p>
          <p>
            Please note that no method of transmission over the internet or
            method of electronic storage is completely secure. While we take
            steps to protect your personal data, we cannot guarantee absolute
            security. Any transmission of data is at your own risk.
          </p>
        </section>

        <section>
          <SectionHeader num={7}>Third-Party Services</SectionHeader>
          <p>
            Our Service integrates with third-party platforms and services, such
            as model providers (e.g. OpenAI, Anthropic), analytics providers,
            and authentication providers. These third parties may collect and
            process personal data according to their own privacy practices.
          </p>
          <p>
            This Privacy Policy applies only to data collected by {siteName}.
            Once you leave our Site or interact with a third-party service,
            their terms and privacy policy will govern the use of your data. We
            encourage you to review their policies (see <ProviderPoliciesLink />{" "}
            for model providers).
          </p>
        </section>

        <section>
          <SectionHeader num={8}>Data Retention</SectionHeader>
          <p>
            We retain your personal data for as long as your account is active
            or as needed to provide the Service. If you request deletion of your
            account, we will delete your chats and personal data, subject to any
            legal or regulatory requirements to retain certain information (for
            example, to comply with law, resolve disputes, or enforce our
            agreements).
          </p>
          <p>
            When data is no longer required, we will take reasonable steps to
            delete or anonymize it.
          </p>
        </section>

        <section>
          <SectionHeader num={9}>
            Children's Privacy and Eligibility
          </SectionHeader>
          <p>
            Our Service is not directed to children under the age of 13, and we
            do not knowingly collect personal data from anyone under 13. If you
            are under 13, you may not use {siteName} or provide any personal
            data to us.
          </p>
          <p>
            If we become aware that we have collected personal data from a child
            under 13 without verified parental consent, we will take steps to
            delete that information as quickly as possible.
          </p>
          <p>You may use the Service only if:</p>
          <ItemList>
            <li>
              You are at least 13 years old (or the minimum age required in your
              country to consent to data processing); and
            </li>
            <li>
              If you are under 18, you have permission from a parent or legal
              guardian.
            </li>
          </ItemList>
          <p>
            By using {siteName}, you represent and warrant that you meet these
            eligibility requirements.
          </p>
        </section>

        <section>
          <SectionHeader num={10}>International Data Transfers</SectionHeader>
          <p>
            {siteName} is operated from servers that may be located in the
            United States or other countries. If you access the Service from
            outside these regions, please be aware that your personal data may
            be transferred to and stored in a country that may not provide the
            same level of data protection as your home jurisdiction.
          </p>
          <p>
            Where required by law (such as for residents of the European
            Economic Area or the UK), we implement appropriate safeguards for
            such transfers, which may include the use of Standard Contractual
            Clauses approved by the European Commission or other lawful transfer
            mechanisms.
          </p>
        </section>

        <section>
          <SectionHeader num={11}>Governing Law</SectionHeader>
          <p>
            This Privacy Policy, and any dispute or claim arising out of or
            related to it, shall be governed by and construed in accordance with
            the laws of the <strong>State of Delaware, United States</strong>,
            without regard to its conflict of laws principles.
          </p>
        </section>

        <section>
          <SectionHeader num={12}>
            Additional Disclosures for EU/EEA and U.S. State Laws
          </SectionHeader>
          <p>
            Certain privacy laws, including the GDPR (for users in the European
            Economic Area and UK) and state privacy laws in the United States
            (such as the California Consumer Privacy Act, or "CCPA"), require us
            to provide additional disclosures:
          </p>
          <p>
            <strong>Categories of Information Collected</strong>: We collect
            identifiers (such as name, email, and IP address), account/profile
            details you choose to provide, chat history, usage data, and
            technical information about your device and browser.
          </p>
          <p>
            <strong>Purposes of Use</strong>: We use this data to operate and
            provide the Service (contract), maintain security and prevent abuse
            (legitimate interest and legal obligation), improve the Service
            (legitimate interest), and communicate with you (consent or
            contract, depending on the context).
          </p>
          <p>
            <strong>Disclosure of Information</strong>: We share information
            only with service providers who process data on our behalf, model
            providers (see <ProviderPoliciesLink />
            ), or when required by law. We do not sell personal data.
          </p>
          <p>
            For more detail, please see the sections above on{" "}
            <a href="#1" className="underline">
              Information We Collect
            </a>
            ,{" "}
            <a href="#3" className="underline">
              How We Use Your Information
            </a>
            , and{" "}
            <a href="#4" className="underline">
              How We Share and Disclose Your Information
            </a>
            .
          </p>
        </section>

        <hr className="my-8" />

        <section id="provider-policies">
          <SectionHeader num={null}>
            Appendix: LLM Providers Policies
          </SectionHeader>
          <p>
            {siteName} connects you to large language models (“LLMs”) operated
            by third-party providers. These providers may process your inputs
            and outputs in accordance with their own privacy practices and terms
            of service, which may include using data for model training or other
            purposes.
          </p>
          <p>
            We make a best effort to highlight when this might be the case, but
            ultimately you are responsible for reviewing and understanding the
            privacy policies and terms of use of each provider. {siteName}’s
            notices are provided for convenience only and should not be taken as
            authoritative statements of a provider’s policies.
          </p>
          <p>
            Below are links to the privacy policies and terms of use for the
            model providers available through our Service:
          </p>
          <ItemList>
            {providersPrivacy.map((provider) => (
              <ProviderPolicyItem key={provider.id} provider={provider} />
            ))}
          </ItemList>
        </section>
      </main>
    </article>
  );
};

export default PrivacyPage;

function ProviderPolicyItem({
  provider: { name, privacyPolicyUrl },
}: {
  provider: ProviderPrivacyInfo;
}) {
  return (
    <li>
      {name}
      {": "}
      {privacyPolicyUrl ? (
        <a
          className="underline"
          href={privacyPolicyUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {privacyPolicyUrl}
        </a>
      ) : (
        "Coming soon"
      )}
    </li>
  );
}

function ProviderPoliciesLink() {
  return (
    <a href="#provider-policies" className="underline">
      Provider Policies
    </a>
  );
}
