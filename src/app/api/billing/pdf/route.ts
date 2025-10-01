import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getDateBounds, getFormattedDate } from '@/lib/dateUtils';
import { orders as ordersTable, orderEntries } from '@/lib/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import PDFDocument from 'pdfkit';

export async function GET(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: 'Database connection unavailable' }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const dateParam = url.searchParams.get('date');
  if (!dateParam) {
    return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
  }

  try {
    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    const { start, end } = getDateBounds(date);
    const formattedDate = getFormattedDate(date);

    // Find all orders for the user on the specified date
    const ordersResult = await db.select().from(ordersTable)
      .where(and(
        eq(ordersTable.userEmail, session.user.email as string),
        gte(ordersTable.timestamp, start.getTime()),
        lte(ordersTable.timestamp, end.getTime())
      ))
      .orderBy(desc(ordersTable.timestamp));

    // Get entries for each order
    const orders = [];
    for (const order of ordersResult) {
      const entriesResult = await db.select().from(orderEntries)
        .where(eq(orderEntries.orderId, order.id));
      orders.push({ ...order, entries: entriesResult });
    }

    // Generate PDF
    const doc = new PDFDocument({ margin: 30 });
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    doc.fontSize(18).text(`Billing Report - ${formattedDate}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`User: ${session.user.email}`);
    doc.text(`Date: ${formattedDate}`);
    doc.moveDown();

    doc.text('Order ID | Time | Total Entries | Total Data (GB) | Pricing Profile | Amount (GHS)');
    doc.moveDown(0.5);
    orders.forEach(order => {
      const time = new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const dataValue = parseFloat(order.totalData?.toString() || '0') || 0;
      const costValue = parseFloat(order.estimatedCost?.toString() || '0') || 0;
      doc.text(`${order.id} | ${time} | ${order.totalCount} | ${dataValue.toFixed(2)} | ${order.pricingProfileName || 'Default'} | ${costValue.toFixed(2)}`);
    });
    doc.moveDown();

    // Calculate totals
    let totalData = 0;
    let totalAmount = 0;
    orders.forEach(order => {
      const dataValue = parseFloat(order.totalData?.toString() || '0') || 0;
      const costValue = parseFloat(order.estimatedCost?.toString() || '0') || 0;
      totalData += dataValue;
      totalAmount += costValue;
    });
    doc.text(`Total Orders: ${orders.length}`);
    doc.text(`Total Data: ${totalData.toFixed(2)} GB`);
    doc.text(`Total Amount: GHS ${totalAmount.toFixed(2)}`);

    doc.end();

    // Wait for PDF generation to complete
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => {
        try {
          resolve(Buffer.concat(chunks));
        } catch (error) {
          reject(error);
        }
      });
      
      doc.on('error', (error) => {
        reject(error);
      });
    });

    // Create a response with the correct headers
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Billing_${dateParam}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error exporting billing PDF:', error);
    return NextResponse.json(
      { error: 'Failed to export billing PDF' },
      { status: 500 }
    );
  }
}
