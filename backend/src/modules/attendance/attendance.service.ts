import crypto from 'crypto';
import { Types } from 'mongoose';
import { AttendanceModel, AttendanceSource, AttendanceStatus } from './attendance.model';
import { EmployeeModel } from '../employee/employee.model';
import { AuditService } from '../../core/audit/audit.service';
import { env } from '../../config/env';

// Default HQ Geofence: Colombo World Trade Center (6.9333, 79.8433)
const HQ_LAT = 6.9333;
const HQ_LON = 79.8433;
const MAX_GEOFENCE_METERS = 500;

export class AttendanceService {
  /**
   * Calculates distance in meters between two lat/lon points using Haversine formula
   */
  public static calculateDistance(lat1: number, lon1: number, lat2 = HQ_LAT, lon2 = HQ_LON): number {
    const R = 6371e3; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Generates a time-bound cryptographic QR attendance token (valid for 60 seconds)
   */
  public static generateDynamicQRToken(tenantId: string): { token: string; expiresAt: Date } {
    const now = Date.now();
    const windowSlice = Math.floor(now / 30000); // 30-sec window
    const signature = crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(`${tenantId}:${windowSlice}`)
      .digest('hex');

    const token = Buffer.from(JSON.stringify({ tenantId, window: windowSlice, sig: signature })).toString('base64');
    const expiresAt = new Date(now + 60000);

    return { token, expiresAt };
  }

  /**
   * Validates dynamic rotating QR token
   */
  public static verifyDynamicQRToken(tenantId: string, token: string): boolean {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      if (decoded.tenantId !== tenantId) return false;

      const currentWindow = Math.floor(Date.now() / 30000);
      // Allow current or previous 30s window to handle clock drift
      const validWindows = [currentWindow, currentWindow - 1];

      return validWindows.some((w) => {
        const expectedSig = crypto
          .createHmac('sha256', env.JWT_SECRET)
          .update(`${tenantId}:${w}`)
          .digest('hex');
        return expectedSig === decoded.sig;
      });
    } catch {
      return false;
    }
  }

  /**
   * Records Check-In for Employee
   */
  public static async recordCheckIn(params: {
    tenantId: string;
    employeeId: string;
    source: AttendanceSource;
    location?: { latitude: number; longitude: number };
    qrToken?: string;
  }) {
    const today = new Date().toISOString().split('T')[0];

    // Verify QR if source is DynamicQR
    if (params.source === 'DynamicQR') {
      if (!params.qrToken || !this.verifyDynamicQRToken(params.tenantId, params.qrToken)) {
        throw new Error('Invalid or expired dynamic QR code. Please scan the current live QR code.');
      }
    }

    // Verify Geofence if location provided
    let isWithinGeofence = true;
    if (params.location && params.location.latitude && params.location.longitude) {
      const dist = this.calculateDistance(params.location.latitude, params.location.longitude);
      isWithinGeofence = dist <= MAX_GEOFENCE_METERS;
    }

    let record = await AttendanceModel.findOne({
      tenantId: params.tenantId,
      employeeId: new Types.ObjectId(params.employeeId),
      date: today,
    });

    const now = new Date();
    // Determine Late Status (after 09:15 AM)
    const checkInHour = now.getHours();
    const checkInMinute = now.getMinutes();
    const isLate = checkInHour > 9 || (checkInHour === 9 && checkInMinute > 15);
    const status: AttendanceStatus = isLate ? 'Late' : 'Present';

    if (record) {
      if (record.checkInTime) {
        throw new Error(`Already checked in today at ${record.checkInTime.toLocaleTimeString()}`);
      }
      record.checkInTime = now;
      record.status = status;
      record.source = params.source;
      record.isWithinGeofence = isWithinGeofence;
      if (params.location) record.location = params.location;
      await record.save();
    } else {
      record = new AttendanceModel({
        tenantId: params.tenantId,
        employeeId: new Types.ObjectId(params.employeeId),
        date: today,
        checkInTime: now,
        status,
        source: params.source,
        isWithinGeofence,
        location: params.location,
        workHours: 0,
      });
      await record.save();
    }

    await AuditService.log({
      tenantId: params.tenantId,
      action: 'ATTENDANCE_CHECK_IN',
      resource: 'Attendance',
      resourceId: record._id.toString(),
      details: {
        employeeId: params.employeeId,
        date: today,
        status,
        source: params.source,
        isWithinGeofence,
      },
    });

    return record;
  }

  /**
   * Records Check-Out for Employee
   */
  public static async recordCheckOut(params: {
    tenantId: string;
    employeeId: string;
    source: AttendanceSource;
    location?: { latitude: number; longitude: number };
  }) {
    const today = new Date().toISOString().split('T')[0];

    const record = await AttendanceModel.findOne({
      tenantId: params.tenantId,
      employeeId: new Types.ObjectId(params.employeeId),
      date: today,
    });

    if (!record || !record.checkInTime) {
      throw new Error('No check-in record found for today. Please check in first.');
    }

    const now = new Date();
    record.checkOutTime = now;

    // Calculate work hours
    const diffMs = now.getTime() - record.checkInTime.getTime();
    const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    record.workHours = hours;

    if (hours < 4.0 && record.status !== 'OnLeave') {
      record.status = 'HalfDay';
    }

    await record.save();

    await AuditService.log({
      tenantId: params.tenantId,
      action: 'ATTENDANCE_CHECK_OUT',
      resource: 'Attendance',
      resourceId: record._id.toString(),
      details: {
        employeeId: params.employeeId,
        date: today,
        workHours: hours,
        finalStatus: record.status,
      },
    });

    return record;
  }

  /**
   * Biometric Machine Webhook Punch Synchronizer
   */
  public static async processBiometricSync(params: {
    tenantId: string;
    punches: Array<{
      employeeCode: string;
      timestamp: string;
      type: 'IN' | 'OUT';
      deviceId: string;
    }>;
  }) {
    const results = [];

    for (const punch of params.punches) {
      const employee = await EmployeeModel.findOne({
        tenantId: params.tenantId,
        employeeCode: punch.employeeCode,
      });

      if (!employee) continue;

      const punchDate = new Date(punch.timestamp);
      const dateStr = punchDate.toISOString().split('T')[0];

      let record = await AttendanceModel.findOne({
        tenantId: params.tenantId,
        employeeId: employee._id,
        date: dateStr,
      });

      if (punch.type === 'IN') {
        if (!record) {
          record = new AttendanceModel({
            tenantId: params.tenantId,
            employeeId: employee._id,
            date: dateStr,
            checkInTime: punchDate,
            status: punchDate.getHours() > 9 ? 'Late' : 'Present',
            source: 'BiometricDevice',
            isWithinGeofence: true,
            notes: `Biometric device: ${punch.deviceId}`,
          });
        } else if (!record.checkInTime) {
          record.checkInTime = punchDate;
        }
      } else {
        // OUT
        if (record && record.checkInTime) {
          record.checkOutTime = punchDate;
          const diffMs = punchDate.getTime() - record.checkInTime.getTime();
          record.workHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
        }
      }

      if (record) {
        await record.save();
        results.push(record);
      }
    }

    return { syncedCount: results.length, records: results };
  }
}
