import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@base44/sdk';

export async function POST(request: NextRequest) {
  try {
    const base44 = createClient({
      appId: process.env.BASE44_APP_ID!,
      apiKey: process.env.BASE44_API_KEY!,
      authToken: request.headers.get('authorization')?.replace('Bearer ', ''),
    });

    // Get active reminder rules
    const allRules = await base44.asServiceRole.entities.AutomationRule.list();
    const reminderRules = allRules.filter((r: any) =>
      r.type === 'reminder' && r.is_active
    );

    if (reminderRules.length === 0) {
      return NextResponse.json({
        message: 'No active reminder rules',
        sent: 0
      });
    }

    let remindersSent = 0;

    // Get pending orders awaiting validation
    const allOrders = await base44.asServiceRole.entities.Order.list();
    const pendingOrders = allOrders.filter((o: any) =>
      o.status === 'pending_company_validation' ||
      o.status === 'pending_subito_validation'
    );

    // Get pending fuel requests
    const allFuelRequests = await base44.asServiceRole.entities.FuelRequest.list();
    const pendingFuelRequests = allFuelRequests.filter((r: any) => r.status === 'pending');

    // Get all employees (potential validators)
    const employees = await base44.asServiceRole.entities.Employee.list();
    const adminsAndManagers = employees.filter((e: any) =>
      (e.role === 'admin' || e.role === 'manager') && e.is_active
    );

    // Send reminders to admins/managers about pending validations
    for (const employee of adminsAndManagers) {
      if (!employee.email) continue;

      const pendingCount = pendingOrders.length + pendingFuelRequests.length;

      if (pendingCount > 0) {
        // Check if notification already exists today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingNotifications = await base44.asServiceRole.entities.Notification.list();
        const todayReminders = existingNotifications.filter((n: any) =>
          n.recipient_email === employee.email &&
          n.type === 'validation_request' &&
          new Date(n.created_date) >= today
        );

        if (todayReminders.length === 0) {
          await base44.asServiceRole.entities.Notification.create({
            type: 'validation_request',
            title: `${pendingCount} validation(s) en attente`,
            message: `Vous avez ${pendingOrders.length} commande(s) et ${pendingFuelRequests.length} demande(s) de carburant en attente de validation.`,
            recipient_email: employee.email,
            action_url: 'PendingValidations',
          });

          // Send email reminder
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: employee.email,
              subject: `Subito - ${pendingCount} validation(s) en attente`,
              body: `Bonjour ${employee.full_name},\n\nVous avez actuellement ${pendingCount} element(s) en attente de validation:\n- ${pendingOrders.length} commande(s)\n- ${pendingFuelRequests.length} demande(s) de carburant\n\nVeuillez vous connecter a votre tableau de bord pour traiter ces demandes.\n\nCordialement,\nSubito Business`,
            });
          } catch (emailError) {
            console.error('Failed to send email:', emailError);
          }

          remindersSent++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent: remindersSent,
      message: `${remindersSent} rappel(s) envoye(s)`
    });
  } catch (error: any) {
    console.error('Error sending reminders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
