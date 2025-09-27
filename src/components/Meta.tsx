"use client";

import React from 'react';
import Head from 'next/head';

interface MetaProps {
  title?: string;
  description?: string;
  keywords?: string;
}

const Meta: React.FC<MetaProps> = ({ 
  title = 'Data Processing Suite',
  description = 'Data validation and categorization tool',
  keywords = 'data, processing, validation, categorization'
}) => {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Mobile optimizations */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={title} />
      
      {/* PWA support */}
      <meta name="application-name" content="Data Processing Suite" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="theme-color" content="#3b82f6" />
      
      {/* Responsive design */}
      <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, viewport-fit=cover" />
      
      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />
    </Head>
  );
};

export default Meta;
