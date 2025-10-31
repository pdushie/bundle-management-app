import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary using CLOUDINARY_URL (more reliable)
if (process.env.CLOUDINARY_URL) {
  cloudinary.config(process.env.CLOUDINARY_URL);
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Debug: Log configuration (with API key for debugging)
console.log('Cloudinary config:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'Present' : 'Missing',
  cloudinary_url: process.env.CLOUDINARY_URL ? 'Present' : 'Missing'
});

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role (you might need to adjust this based on your auth setup)
    // For now, we'll allow any authenticated user
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size too large (max 5MB)' }, { status: 400 });
    }

    // Generate unique filename using timestamp and random number
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const uniqueFilename = `evidence_${timestamp}_${random}`;
    
    // Convert file to base64 for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Upload to Cloudinary
    console.log('Uploading to Cloudinary:', { filename: uniqueFilename, fileType: file.type, fileSize: file.size });
    
    const uploadResult = await cloudinary.uploader.upload(base64, {
      public_id: uniqueFilename,
      folder: 'evidence',
      resource_type: file.type.startsWith('image/') ? 'image' : 'raw',
      quality: 'auto',
      fetch_format: 'auto'
    });

    console.log('Cloudinary upload successful:', { url: uploadResult.secure_url, publicId: uploadResult.public_id });

    return NextResponse.json({ 
      success: true,
      filename: uniqueFilename,
      originalName: file.name,
      size: file.size,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id
    });

  } catch (error) {
    console.error('Error uploading evidence file to Cloudinary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}