import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import path from 'path';
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename } = await params;
    
    // Handle legacy evidence_uploaded case
    if (filename === 'evidence_uploaded') {
      return NextResponse.json({ 
        error: 'Evidence file not available',
        message: 'This is a legacy evidence entry. The actual file was not stored in the system.',
        filename: filename,
        legacy: true
      }, { status: 404 });
    }

    // Basic security: only allow certain file extensions
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx'];
    const ext = path.extname(filename).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Only serve files from Cloudinary - ignore any local legacy files
    try {
      // Check if the file exists on Cloudinary by trying to get its info
      const cloudinaryResource = await cloudinary.api.resource(`evidence/${filename}`, {
        resource_type: 'auto'
      });
      
      if (cloudinaryResource) {
        // Redirect to Cloudinary URL
        return NextResponse.redirect(cloudinaryResource.secure_url);
      }
    } catch (cloudinaryError) {
      // File not found on Cloudinary
      console.log('File not found on Cloudinary:', filename);
      return NextResponse.json({ 
        error: 'Evidence file not found',
        message: 'File not found in cloud storage. Legacy local files are not supported.',
        filename: filename
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Error serving evidence file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

