import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@base44/sdk';

export async function POST(request: NextRequest) {
  try {
    const base44 = createClient({
      appId: process.env.BASE44_APP_ID!,
      apiKey: process.env.BASE44_API_KEY!,
      authToken: request.headers.get('authorization')?.replace('Bearer ', ''),
    });

    // Check if auto-generation is enabled
    const allRules = await base44.asServiceRole.entities.AutomationRule.list();
    const invoiceRule = allRules.find((r: any) =>
      r.type === 'invoice_generation' && r.is_active
    );

    if (!invoiceRule) {
      return NextResponse.json({
        message: 'Invoice auto-generation is not enabled',
        generated: 0
      });
    }

    // Get last month's date range
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const periodStart = lastMonth.toISOString().split('T')[0];
    const periodEnd = lastMonthEnd.toISOString().split('T')[0];

    // Check if invoice already exists for this period
    const existingInvoices = await base44.asServiceRole.entities.Invoice.list();
    const periodInvoice = existingInvoices.find((inv: any) =>
      inv.period_start === periodStart && inv.period_end === periodEnd
    );

    if (periodInvoice) {
      return NextResponse.json({
        message: 'Invoice already exists for this period',
        generated: 0,
        existing: periodInvoice.invoice_number
      });
    }

    // Get all completed orders and fuel requests from last month
    const allOrders = await base44.asServiceRole.entities.Order.list();
    const lastMonthOrders = allOrders.filter((o: any) => {
      const orderDate = new Date(o.created_date);
      return orderDate >= lastMonth &&
             orderDate <= lastMonthEnd &&
             (o.status === 'completed' || o.status === 'validated_by_subito');
    });

    const allFuelRequests = await base44.asServiceRole.entities.FuelRequest.list();
    const lastMonthFuel = allFuelRequests.filter((r: any) => {
      const reqDate = new Date(r.created_date);
      return reqDate >= lastMonth &&
             reqDate <= lastMonthEnd &&
             (r.status === 'completed' || r.status === 'dispensed');
    });

    if (lastMonthOrders.length === 0 && lastMonthFuel.length === 0) {
      return NextResponse.json({
        message: 'No completed orders or fuel requests for last month',
        generated: 0
      });
    }

    // Calculate totals by service
    const breakdownByService: Record<string, number> = {};
    lastMonthOrders.forEach((order: any) => {
      const service = order.service_category || 'autre';
      const cost = order.final_cost || order.estimated_cost || 0;
      breakdownByService[service] = (breakdownByService[service] || 0) + cost;
    });

    // Add fuel costs
    const fuelCost = lastMonthFuel.reduce((sum: number, r: any) =>
      sum + (r.actual_cost || r.estimated_cost || 0), 0
    );
    if (fuelCost > 0) {
      breakdownByService['carburant'] = fuelCost;
    }

    // Calculate totals by department
    const breakdownByDepartment: Record<string, number> = {};
    lastMonthOrders.forEach((order: any) => {
      const dept = order.department || 'General';
      const cost = order.final_cost || order.estimated_cost || 0;
      breakdownByDepartment[dept] = (breakdownByDepartment[dept] || 0) + cost;
    });

    lastMonthFuel.forEach((req: any) => {
      const dept = req.department || 'General';
      const cost = req.actual_cost || req.estimated_cost || 0;
      breakdownByDepartment[dept] = (breakdownByDepartment[dept] || 0) + cost;
    });

    // Calculate total
    const totalAmount = Object.values(breakdownByService).reduce((sum, val) => sum + val, 0);

    // Generate invoice number
    const invoiceNumber = `SUBITO-${now.getFullYear()}${String(now.getMonth()).padStart(2, '0')}-${Date.now()}`;

    // Calculate due date (30 days from now)
    const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Create invoice
    const invoice = await base44.asServiceRole.entities.Invoice.create({
      invoice_number: invoiceNumber,
      period_start: periodStart,
      period_end: periodEnd,
      total_amount: totalAmount,
      status: 'pending',
      payment_method: 'virement',
      breakdown_by_service: breakdownByService,
      breakdown_by_department: breakdownByDepartment,
      due_date: dueDate.toISOString().split('T')[0],
    });

    // Send notification to admins
    const employees = await base44.asServiceRole.entities.Employee.list();
    const admins = employees.filter((e: any) => e.role === 'admin' && e.is_active);

    for (const admin of admins) {
      if (admin.email) {
        await base44.asServiceRole.entities.Notification.create({
          type: 'order_accepted',
          title: 'Nouvelle facture mensuelle generee',
          message: `La facture ${invoiceNumber} pour le mois de ${lastMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} a ete generee. Montant: ${totalAmount.toLocaleString()} FCFA`,
          recipient_email: admin.email,
          action_url: 'Billing',
        });
      }
    }

    return NextResponse.json({
      success: true,
      generated: 1,
      invoice: {
        number: invoiceNumber,
        amount: totalAmount,
        period: `${periodStart} - ${periodEnd}`,
        orders: lastMonthOrders.length,
        fuelRequests: lastMonthFuel.length
      }
    });
  } catch (error: any) {
    console.error('Error generating invoice:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
