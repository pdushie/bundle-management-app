import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  // Check admin authentication
  try {
    const session = await requireAdmin();
  } catch (error) {
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
    
    // Get the range of the worksheet
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:B1');
    
    if (range.e.r < 1) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 });
    }
    
    // Process the data row by row to preserve exact values
    const tiers = [];
    
    for (let rowNum = range.s.r + 1; rowNum <= range.e.r; rowNum++) {
      // Get cell addresses for column A (dataGB) and B (price)
      const dataGBCellAddr = XLSX.utils.encode_cell({ c: 0, r: rowNum });
      const priceCellAddr = XLSX.utils.encode_cell({ c: 1, r: rowNum });
      
      // Get the actual cells
      const dataGBCell = worksheet[dataGBCellAddr];
      const priceCell = worksheet[priceCellAddr];
      
      // Skip empty rows
      if (!dataGBCell && !priceCell) continue;
      
      if (!dataGBCell || !priceCell) {
        throw new Error(`Row ${rowNum + 1}: Both Data GB and Price columns must have values`);
      }
      
      // Get the raw value as it appears in Excel (preserving exact decimal representation)
      let dataGBStr: string;
      let priceStr: string;
      
      // For numeric cells, prefer the formatted display value to preserve original representation
      if (dataGBCell.t === 'n') { // numeric type
        // Use formatted value (w) if available as it preserves the original display format
        // If no formatted value, convert the raw value but be careful about precision
        if (dataGBCell.w && dataGBCell.w.trim()) {
          dataGBStr = dataGBCell.w.trim();
        } else {
          // Format the number to avoid floating point precision issues
          const rawValue = dataGBCell.v;
          // Check if it's a whole number or has reasonable decimal places
          if (rawValue % 1 === 0) {
            dataGBStr = String(Math.round(rawValue));
          } else {
            // Round to a reasonable number of decimal places to avoid floating point errors
            dataGBStr = String(Math.round(rawValue * 100000) / 100000);
          }
        }
      } else {
        dataGBStr = String(dataGBCell.v).trim();
      }
      
      if (priceCell.t === 'n') { // numeric type
        // Use formatted value (w) if available as it preserves the original display format
        if (priceCell.w && priceCell.w.trim()) {
          priceStr = priceCell.w.trim();
        } else {
          // Format the number to avoid floating point precision issues
          const rawValue = priceCell.v;
          // Check if it's a whole number or has reasonable decimal places
          if (rawValue % 1 === 0) {
            priceStr = String(Math.round(rawValue));
          } else {
            // Round to a reasonable number of decimal places to avoid floating point errors
            priceStr = String(Math.round(rawValue * 100000) / 100000);
          }
        }
      } else {
        priceStr = String(priceCell.v).trim();
      }
      
      // Clean up any potential formatting
      dataGBStr = dataGBStr.trim();
      priceStr = priceStr.trim();
      
      // Validate the values
      const parsedDataGB = parseFloat(dataGBStr);
      const parsedPrice = parseFloat(priceStr);
      
      if (isNaN(parsedDataGB) || parsedDataGB <= 0) {
        throw new Error(`Row ${rowNum + 1}: Invalid Data GB value: ${dataGBStr}. Must be a positive number.`);
      }
      
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        throw new Error(`Row ${rowNum + 1}: Invalid Price value: ${priceStr}. Must be a non-negative number.`);
      }
      
      tiers.push({
        dataGB: dataGBStr,
        price: priceStr
      });
    }
    
    if (tiers.length === 0) {
      return NextResponse.json({ error: 'No valid data found in Excel file' }, { status: 400 });
    }
    
    // Check for duplicate data allocations (normalize for comparison)
    const dataGBValues = tiers.map(tier => parseFloat(tier.dataGB));
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
