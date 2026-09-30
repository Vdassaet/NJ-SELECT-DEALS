export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, subDays, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'all';

    let dateFilter: any = undefined;
    const now = new Date();

    switch (period) {
      case 'last7':
        dateFilter = { gte: startOfDay(subDays(now, 7)) };
        break;
      case 'last30':
        dateFilter = { gte: startOfDay(subDays(now, 30)) };
        break;
      case 'thisMonth':
        dateFilter = { gte: startOfMonth(now) };
        break;
      case 'thisQuarter':
        dateFilter = { gte: startOfQuarter(now) };
        break;
      case 'thisYear':
        dateFilter = { gte: startOfYear(now) };
        break;
      default:
        dateFilter = undefined;
    }

    const orders = await prisma.order.findMany({
      where: dateFilter ? { createdAt: dateFilter } : undefined,
      include: { refunds: true },
      orderBy: { createdAt: 'desc' }
    });

    let csvContent = "Order ID,Transaction Date,Customer,Order Status,Payment Status,Gross Product Sales,Store Discounts,Final Selling Price,Net Taxable Amount,Non-Taxable Amount,Sales Tax,Shipping Cost,Refunded Amount,Refunded Tax,Net Customer Payment\n";

    for (const o of orders) {
      const isCancelledUnpaid = o.status === 'CANCELLED' && o.paymentStatus !== 'REFUNDED' && o.paymentStatus !== 'PARTIALLY_REFUNDED' && o.paymentStatus !== 'PAID';
      
      const totalRefunded = o.refunds.reduce((sum, r) => sum + r.amountRefunded, 0);
      const totalTaxRefunded = o.refunds.reduce((sum, r) => sum + r.taxRefunded, 0);

      // Only calculate totals if paid or refunded
      const grossSales = isCancelledUnpaid ? 0 : (o.taxableSubtotal + o.nonTaxableSubtotal + o.discount);
      const storeDiscounts = isCancelledUnpaid ? 0 : o.discount;
      const finalSellingPrice = isCancelledUnpaid ? 0 : (grossSales - storeDiscounts);
      const netTaxableAmount = isCancelledUnpaid ? 0 : (o.taxableSubtotal + o.taxableShipping);
      const nonTaxableAmount = isCancelledUnpaid ? 0 : (o.nonTaxableSubtotal + o.nonTaxableShipping);
      const salesTax = isCancelledUnpaid ? 0 : o.tax;
      const shipping = isCancelledUnpaid ? 0 : o.shippingCost;
      
      const netCustomerPayment = isCancelledUnpaid ? 0 : ((finalSellingPrice + shipping + salesTax) - (totalRefunded + totalTaxRefunded));

      const escapeCSV = (str: string) => '"' + String(str).replace(/"/g, '""') + '"';

      csvContent += `${escapeCSV(o.orderNumber)},${escapeCSV(o.createdAt.toISOString())},${escapeCSV(o.guestEmail || "")},${escapeCSV(o.status)},${escapeCSV(o.paymentStatus)},${grossSales.toFixed(2)},${storeDiscounts.toFixed(2)},${finalSellingPrice.toFixed(2)},${netTaxableAmount.toFixed(2)},${nonTaxableAmount.toFixed(2)},${salesTax.toFixed(2)},${shipping.toFixed(2)},${totalRefunded.toFixed(2)},${totalTaxRefunded.toFixed(2)},${netCustomerPayment.toFixed(2)}\n`;
    }

    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="nj-select-deals-tax-report-${period}.csv"`);

    return new NextResponse(csvContent, { headers });
  } catch (error) {
    console.error("CSV Export Error:", error);
    return NextResponse.json({ error: "Failed to generate CSV" }, { status: 500 });
  }
}