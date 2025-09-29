import { NextRequest, NextResponse } from 'next/server';
import { checkAuthAdmin } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  // Check admin authentication
  const user = await checkAuthAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const excelFile = formData.get('excelFile') as File;
    
    if (!excelFile) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file type
    const fileType = excelFile.name.split('.').pop()?.toLowerCase();
    if (fileType !== 'xlsx' && fileType !== 'xls') {
      return NextResponse.json({ error: 'Invalid file format. Please upload an Excel file (.xlsx or .xls)' }, { status: 400 });
    }

    // Process Excel file
    const buffer = await excelFile.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    
    // Get the first worksheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert worksheet to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 });
    }
    
    // Process the data into the required format
    const tiers = jsonData.map((row: any) => {
      // The column names might be different, try common patterns
      const dataGB = row['Data GB'] || row['DataGB'] || row['Data'] || row['GB'] || row['A'] || Object.values(row)[0];
      const price = row['Price'] || row['Cost'] || row['Amount'] || row['B'] || Object.values(row)[1];
      
      if (dataGB === undefined || price === undefined) {
        throw new Error('Could not identify Data GB and Price columns in the Excel file');
      }
      
      // Validate data
      const parsedDataGB = parseFloat(dataGB);
      const parsedPrice = parseFloat(price);
      
      if (isNaN(parsedDataGB) || parsedDataGB <= 0) {
        throw new Error(`Invalid Data GB value: ${dataGB}. Must be a positive number.`);
      }
      
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        throw new Error(`Invalid Price value: ${price}. Must be a non-negative number.`);
      }
      
      return {
        dataGB: parsedDataGB,
        price: parsedPrice
      };
    });
    
    // Check for duplicate data allocations
    const dataGBValues = tiers.map(tier => tier.dataGB);
    const uniqueDataGBValues = new Set(dataGBValues);
    
    if (dataGBValues.length !== uniqueDataGBValues.size) {
      return NextResponse.json({ error: 'Duplicate data GB allocations found in Excel. Each tier must have a unique data allocation.' }, { status: 400 });
    }
    
    return NextResponse.json({ tiers }, { status: 200 });
  } catch (error) {
    console.error('Error processing Excel file:', error);
    return NextResponse.json({ 
      error: `Failed to process Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
