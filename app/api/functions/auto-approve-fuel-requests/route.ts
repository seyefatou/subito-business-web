import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@base44/sdk';

export async function POST(request: NextRequest) {
  try {
    const base44 = createClient({
      appId: process.env.BASE44_APP_ID!,
      apiKey: process.env.BASE44_API_KEY!,
      authToken: request.headers.get('authorization')?.replace('Bearer ', ''),
    });

    // Get active auto-approval rules
    const allRules = await base44.asServiceRole.entities.AutomationRule.list();
    const autoApprovalRules = allRules.filter((r: any) =>
      r.type === 'fuel_auto_approval' && r.is_active
    );

    if (autoApprovalRules.length === 0) {
      return NextResponse.json({
        message: 'No active auto-approval rules',
        approved: 0
      });
    }

    // Get pending fuel requests
    const allRequests = await base44.asServiceRole.entities.FuelRequest.list();
    const pendingRequests = allRequests.filter((r: any) => r.status === 'pending');

    let approvedCount = 0;
    const now = new Date().toISOString();

    for (const request of pendingRequests) {
      for (const rule of autoApprovalRules) {
        const conditions = rule.conditions || {};
        let shouldApprove = false;

        // Check threshold condition
        if (conditions.max_amount && request.estimated_cost <= conditions.max_amount) {
          shouldApprove = true;
        }

        // Check approved vehicles
        if (conditions.approved_vehicles &&
            conditions.approved_vehicles.includes(request.vehicle_registration)) {
          shouldApprove = true;
        }

        // Check approved drivers
        if (conditions.approved_drivers &&
            conditions.approved_drivers.includes(request.driver_name)) {
          shouldApprove = true;
        }

        // Check department
        if (conditions.departments &&
            conditions.departments.includes(request.department)) {
          shouldApprove = true;
        }

        if (shouldApprove) {
          await base44.asServiceRole.entities.FuelRequest.update(request.id, {
            status: 'approved',
            approved_by: 'Systeme - Auto-approuve',
            approved_at: now,
          });

          // Create notification
          if (request.created_by) {
            await base44.asServiceRole.entities.Notification.create({
              type: 'order_accepted',
              title: 'Demande de carburant approuvee automatiquement',
              message: `Votre demande pour ${request.vehicle_registration} (${request.quantity_liters}L) a ete approuvee automatiquement.`,
              recipient_email: request.created_by,
              action_url: 'FuelManagement',
            });
          }

          approvedCount++;
          break; // Stop checking other rules for this request
        }
      }
    }

    return NextResponse.json({
      success: true,
      approved: approvedCount,
      message: `${approvedCount} demande(s) approuvee(s) automatiquement`
    });
  } catch (error: any) {
    console.error('Error in auto-approval:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
