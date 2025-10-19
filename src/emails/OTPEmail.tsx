import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
  Hr,
} from '@react-email/components';
import * as React from 'react';

interface OTPEmailProps {
  name: string;
  otpCode: string;
  expiryMinutes?: number;
}

export const OTPEmail = ({
  name = 'User',
  otpCode = '123456',
  expiryMinutes = 10
}: OTPEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your login verification code: {otpCode}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="max-w-md mx-auto bg-white my-8 p-6 rounded-lg shadow-lg">
            <Section>
              <Heading className="text-2xl font-bold text-gray-800 text-center mb-4">
                Login Verification
              </Heading>
              
              <Text className="text-gray-600 text-base mb-4">
                Hello {name},
              </Text>
              
              <Text className="text-gray-600 text-base mb-6">
                You have requested to sign in to your account. Please use the following 
                One-Time Password (OTP) to complete your login:
              </Text>
              
              <Section className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-6">
                <Text className="text-3xl font-bold text-blue-600 tracking-wider mb-2">
                  {otpCode}
                </Text>
                <Text className="text-sm text-gray-500">
                  This code will expire in {expiryMinutes} minutes
                </Text>
              </Section>
              
              <Section className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <Text className="text-sm text-yellow-800 font-medium mb-2">
                  🔒 Security Notice:
                </Text>
                <Text className="text-sm text-yellow-700">
                  • This code is for one-time use only
                  <br />
                  • Never share this code with anyone
                  <br />
                  • If you didn't request this login, please ignore this email
                </Text>
              </Section>
              
              <Hr className="border-gray-200 my-6" />
              
              <Text className="text-gray-500 text-sm text-center">
                This is an automated message. Please do not reply to this email.
                <br />
                If you need assistance, please contact our support team.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default OTPEmail;