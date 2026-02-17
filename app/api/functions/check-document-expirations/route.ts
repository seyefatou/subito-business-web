import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@base44/sdk';

export async function POST(request: NextRequest) {
  try {
    const base44 = createClient({
      appId: process.env.BASE44_APP_ID!,
      apiKey: process.env.BASE44_API_KEY!,
      authToken: request.headers.get('authorization')?.replace('Bearer ', ''),
    });

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const documents = await base44.asServiceRole.entities.VehicleDocument.filter({});

    const now = new Date();
    const notifications: { vehicle: string; document: string; daysUntil: number }[] = [];

    for (const doc of documents) {
      if (!doc.expiry_date || doc.reminder_sent) continue;

      const expiryDate = new Date(doc.expiry_date);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= doc.reminder_days_before && daysUntilExpiry >= 0) {
        // Mark as sent
        await base44.asServiceRole.entities.VehicleDocument.update(doc.id, {
          reminder_sent: true
        });

        // Create alert
        await base44.asServiceRole.entities.VehicleAlert.create({
          vehicle_registration: doc.vehicle_registration,
          alert_type: doc.document_type === 'assurance' ? 'insurance_expiry' : 'technical_control_expiry',
          severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
          title: `Document ${doc.document_name} arrive a expiration`,
          message: `Le document expire le ${expiryDate.toLocaleDateString('fr-FR')} (dans ${daysUntilExpiry} jours)`,
        });

        notifications.push({
          vehicle: doc.vehicle_registration,
          document: doc.document_name,
          daysUntil: daysUntilExpiry
        });
      }
    }

    return NextResponse.json({
      success: true,
      checked: documents.length,
      notificationsSent: notifications.length,
      notifications
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
