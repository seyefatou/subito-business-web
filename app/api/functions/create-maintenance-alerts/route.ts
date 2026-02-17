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
    const vehicles = await base44.asServiceRole.entities.Vehicle.list();
    const maintenanceRecords = await base44.asServiceRole.entities.MaintenanceRecord.list();
    const alerts = await base44.asServiceRole.entities.VehicleAlert.list();
    const employees = await base44.asServiceRole.entities.Employee.list();

    const alertsCreated: any[] = [];
    const notificationsCreated: any[] = [];

    console.log(`Checking ${vehicles.length} vehicles for maintenance alerts...`);

    for (const vehicle of vehicles) {
      const issues: { type: string; severity: string; title: string; message: string }[] = [];

      // Check odometer-based maintenance
      if (vehicle.next_service_km && vehicle.odometer) {
        const kmUntilService = vehicle.next_service_km - vehicle.odometer;
        if (kmUntilService <= 500 && kmUntilService >= 0) {
          issues.push({
            type: 'maintenance_due',
            severity: kmUntilService <= 100 ? 'critical' : 'warning',
            title: `Maintenance proche pour ${vehicle.registration}`,
            message: `Prochain entretien dans ${kmUntilService} km`
          });
        } else if (kmUntilService < 0) {
          issues.push({
            type: 'maintenance_due',
            severity: 'critical',
            title: `Maintenance depassee pour ${vehicle.registration}`,
            message: `Entretien en retard de ${Math.abs(kmUntilService)} km`
          });
        }
      }

      // Check insurance expiry
      if (vehicle.insurance_expiry) {
        const daysUntilExpiry = Math.floor(
          (new Date(vehicle.insurance_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
          issues.push({
            type: 'insurance_expiry',
            severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
            title: `Assurance expire bientot - ${vehicle.registration}`,
            message: `Assurance expire dans ${daysUntilExpiry} jours`
          });
        } else if (daysUntilExpiry < 0) {
          issues.push({
            type: 'insurance_expiry',
            severity: 'critical',
            title: `Assurance expiree - ${vehicle.registration}`,
            message: `Assurance expiree depuis ${Math.abs(daysUntilExpiry)} jours`
          });
        }
      }

      // Check technical control expiry
      if (vehicle.technical_control_expiry) {
        const daysUntilExpiry = Math.floor(
          (new Date(vehicle.technical_control_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
          issues.push({
            type: 'technical_control_expiry',
            severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
            title: `Controle technique expire - ${vehicle.registration}`,
            message: `Controle technique expire dans ${daysUntilExpiry} jours`
          });
        } else if (daysUntilExpiry < 0) {
          issues.push({
            type: 'technical_control_expiry',
            severity: 'critical',
            title: `Controle technique expire - ${vehicle.registration}`,
            message: `Controle technique expire depuis ${Math.abs(daysUntilExpiry)} jours`
          });
        }
      }

      // Create alerts and notifications for each issue
      for (const issue of issues) {
        // Check if alert already exists
        const existingAlert = alerts.find((a: any) =>
          a.vehicle_registration === vehicle.registration &&
          a.alert_type === issue.type &&
          !a.is_resolved
        );

        if (!existingAlert) {
          // Create vehicle alert
          const alert = await base44.asServiceRole.entities.VehicleAlert.create({
            vehicle_registration: vehicle.registration,
            alert_type: issue.type,
            severity: issue.severity,
            title: issue.title,
            message: issue.message,
            is_read: false,
            is_resolved: false
          });
          alertsCreated.push(alert);

          // Create notifications for relevant employees
          const relevantEmployees = employees.filter((e: any) =>
            e.role === 'admin' ||
            (vehicle.department && e.department === vehicle.department)
          );

          for (const employee of relevantEmployees) {
            const notification = await base44.asServiceRole.entities.Notification.create({
              type: issue.severity === 'critical' ? 'maintenance_alert' : 'vehicle_alert',
              title: issue.title,
              message: issue.message,
              recipient_email: employee.email,
              is_read: false,
              action_url: `/Maintenance`
            });
            notificationsCreated.push(notification);
          }
        }
      }
    }

    console.log(`Created ${alertsCreated.length} alerts and ${notificationsCreated.length} notifications`);

    return NextResponse.json({
      success: true,
      alertsCreated: alertsCreated.length,
      notificationsCreated: notificationsCreated.length,
      message: `Processed ${vehicles.length} vehicles`
    });

  } catch (error: any) {
    console.error('Error creating maintenance alerts:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
