import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@base44/sdk';

export async function POST(request: NextRequest) {
  try {
    const base44 = createClient({
      appId: process.env.BASE44_APP_ID!,
      apiKey: process.env.BASE44_API_KEY!,
      authToken: request.headers.get('authorization')?.replace('Bearer ', ''),
    });

    // Authenticate as service role
    const invoices = await base44.asServiceRole.entities.Invoice.list();
    const employees = await base44.asServiceRole.entities.Employee.list();

    const notificationsCreated: any[] = [];
    const today = new Date();

    console.log(`Checking ${invoices.length} invoices for alerts...`);

    for (const invoice of invoices) {
      // Skip if already paid
      if (invoice.status === 'paid') continue;

      const dueDate = new Date(invoice.due_date);
      const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let shouldNotify = false;
      let notificationMessage = '';
      let severity = 'info';

      // Check for overdue invoices
      if (daysUntilDue < 0) {
        shouldNotify = true;
        severity = 'critical';
        notificationMessage = `Facture ${invoice.invoice_number} en retard de ${Math.abs(daysUntilDue)} jours (${invoice.total_amount?.toLocaleString()} FCFA)`;

        // Update invoice status to overdue
        if (invoice.status !== 'overdue') {
          await base44.asServiceRole.entities.Invoice.update(invoice.id, {
            status: 'overdue'
          });
        }
      }
      // Check for invoices due within 7 days
      else if (daysUntilDue <= 7 && daysUntilDue >= 0) {
        shouldNotify = true;
        severity = 'warning';
        notificationMessage = `Facture ${invoice.invoice_number} a payer dans ${daysUntilDue} jours (${invoice.total_amount?.toLocaleString()} FCFA)`;
      }

      // Create notifications for admins
      if (shouldNotify) {
        const adminEmployees = employees.filter((e: any) => e.role === 'admin');

        for (const admin of adminEmployees) {
          // Check if notification already sent today
          const existingNotifications = await base44.asServiceRole.entities.Notification.filter({
            recipient_email: admin.email,
            type: 'invoice_alert'
          });

          const alreadySentToday = existingNotifications.some((n: any) => {
            const notifDate = new Date(n.created_date);
            return notifDate.toDateString() === today.toDateString() &&
                   n.message.includes(invoice.invoice_number);
          });

          if (!alreadySentToday) {
            const notification = await base44.asServiceRole.entities.Notification.create({
              type: 'invoice_alert',
              title: severity === 'critical' ? 'Facture en retard' : 'Facture a echeance',
              message: notificationMessage,
              recipient_email: admin.email,
              is_read: false,
              action_url: `/Billing`
            });
            notificationsCreated.push(notification);
          }
        }
      }
    }

    console.log(`Created ${notificationsCreated.length} invoice notifications`);

    return NextResponse.json({
      success: true,
      notificationsCreated: notificationsCreated.length,
      message: `Processed ${invoices.length} invoices`
    });

  } catch (error: any) {
    console.error('Error creating invoice alerts:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
