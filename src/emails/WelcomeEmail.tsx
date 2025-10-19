import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Heading,
  Section,
} from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
  name: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  name = 'User',
}) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>✅ Bundle Management</Text>
            <Heading style={title}>Welcome Aboard, {name}!</Heading>
            <Text style={subtitle}>Your email has been verified successfully</Text>
          </Section>
          
          <Section style={content}>
            <Text style={text}>
              Congratulations! Your account has been verified and is now pending admin approval. You'll receive another email once your account is approved and ready to use.
            </Text>
            
            <Section style={feature}>
              <Heading style={featureTitle}>What happens next?</Heading>
              <Text style={featureList}>
                • An administrator will review your account request<br/>
                • You'll receive an email notification once approved<br/>
                • After approval, you can sign in and start using the system
              </Text>
            </Section>
            
            <Text style={text}>
              Thank you for choosing Bundle Management. We're excited to have you on board!
            </Text>
          </Section>
          
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent by Bundle Management System.
            </Text>
            <Text style={footerText}>
              If you have any questions, please contact our support team.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f9fafb',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  maxWidth: '600px',
};

const header = {
  textAlign: 'center' as const,
  marginBottom: '30px',
};

const logo = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#10b981',
  marginBottom: '10px',
  margin: '0 0 10px 0',
};

const title = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#1f2937',
  marginBottom: '10px',
  margin: '0 0 10px 0',
};

const subtitle = {
  color: '#6b7280',
  fontSize: '16px',
  margin: '0',
};

const content = {
  margin: '30px 0',
};

const text = {
  color: '#333333',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '16px 0',
};

const feature = {
  backgroundColor: '#f0f9ff',
  borderLeft: '4px solid #3b82f6',
  padding: '16px',
  margin: '16px 0',
};

const featureTitle = {
  fontSize: '18px',
  color: '#1f2937',
  margin: '0 0 12px 0',
};

const featureList = {
  fontSize: '14px',
  color: '#333333',
  lineHeight: '1.6',
  margin: '0',
};

const footer = {
  marginTop: '40px',
  paddingTop: '20px',
  borderTop: '1px solid #e5e7eb',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '8px 0',
};

export default WelcomeEmail;