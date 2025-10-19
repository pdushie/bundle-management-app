import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Heading,
  Section,
  Row,
  Column,
} from '@react-email/components';
import * as React from 'react';

interface VerificationEmailProps {
  name: string;
  verificationUrl: string;
}

export const VerificationEmail: React.FC<VerificationEmailProps> = ({
  name = 'User',
  verificationUrl = '#',
}) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>Bundle Management</Text>
            <Heading style={title}>Verify Your Email Address</Heading>
            <Text style={subtitle}>Welcome to Bundle Management, {name}!</Text>
          </Section>
          
          <Section style={content}>
            <Text style={text}>
              Thanks for signing up! To complete your registration and start using your account, please verify your email address by clicking the button below:
            </Text>
            
            <Section style={buttonContainer}>
              <Button style={button} href={verificationUrl}>
                Verify Email Address
              </Button>
            </Section>
            
            <Text style={text}>
              This verification link will expire in 24 hours for security reasons.
            </Text>
            
            <Section style={warning}>
              <Text style={warningText}>
                <strong>Security Notice:</strong> If you didn't create an account with Bundle Management, please ignore this email. Your email address will not be added to our system.
              </Text>
            </Section>
            
            <Text style={text}>
              If the button doesn't work, you can copy and paste this link into your browser:
            </Text>
            <Text style={linkText}>{verificationUrl}</Text>
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
  color: '#2563eb',
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

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '12px 24px',
  textDecoration: 'none',
  borderRadius: '6px',
  fontWeight: '500',
  display: 'inline-block',
};

const warning = {
  backgroundColor: '#fef3c7',
  border: '1px solid #f59e0b',
  borderRadius: '6px',
  padding: '16px',
  margin: '20px 0',
};

const warningText = {
  color: '#92400e',
  fontSize: '14px',
  margin: '0',
};

const linkText = {
  color: '#2563eb',
  fontSize: '14px',
  wordBreak: 'break-all' as const,
  margin: '8px 0',
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

export default VerificationEmail;