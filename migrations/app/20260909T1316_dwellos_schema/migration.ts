#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0d1a2ed646f5706caeecda7a541a1b7de02bf08dbdba9e6374ee469c61eed995/contract';
import endContract from '../../snapshots/0d1a2ed646f5706caeecda7a541a1b7de02bf08dbdba9e6374ee469c61eed995/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/bd6cd4febdccf911cbc0230a0ee66d1eeb16a0f11a9a95931dbe32fc35a3feeb/contract';
import startContract from '../../snapshots/bd6cd4febdccf911cbc0230a0ee66d1eeb16a0f11a9a95931dbe32fc35a3feeb/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropTable({ schema: 'public', table: 'Post' }),
      this.dropTable({ schema: 'public', table: 'User' }),
      this.createTable({
        schema: 'public',
        table: 'application',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('employment', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('holdExpiresAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('moveInDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('personalInfo', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('references', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('roomId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('SUBMITTED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'application_status_check_52a801f4',
            "\"status\" IN ('SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'EXPIRED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'applicationDocument',
        columns: [
          col('applicationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('fileUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('uploadedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'auditLog',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('actorId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('afterState', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('beforeState', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('entityId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('entityType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'billShare',
        columns: [
          col('amount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('billId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('daysOccupied', 'int4', {
            notNull: true,
            default: lit(30),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('paymentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('billShare_status_check_50d0035a', "\"status\" IN ('PENDING', 'PAID')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'dispute',
        columns: [
          col('category', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('raisedById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('resolution', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('resolvedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('resolvedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('OPEN'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('targetId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('targetType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'dispute_category_check_91a50e00',
            "\"category\" IN ('RENT', 'DEPOSIT', 'BILL', 'ROOMMATE', 'OTHER')",
          ),
          checkExpression(
            'dispute_status_check_0cd47f74',
            "\"status\" IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'documentAuditLog',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('actorId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('documentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ipAddress', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'documentSignature',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('documentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ipAddress', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('signatureUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('signedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('signerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'documentSignature_status_check_1f857ff4',
            "\"status\" IN ('PENDING', 'SIGNED', 'DECLINED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'lease',
        columns: [
          col('billingCycle', 'text', {
            notNull: true,
            default: lit('MONTHLY'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('billingDayOfMonth', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('deposit', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('endDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('propertyId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('rent', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('roomId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'lease_billingCycle_check_212d9f6a',
            "\"billingCycle\" IN ('MONTHLY', 'WEEKLY', 'BIWEEKLY')",
          ),
          checkExpression(
            'lease_status_check_b7e86225',
            "\"status\" IN ('ACTIVE', 'ENDED', 'TERMINATED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'leaseTenant',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isPrimary', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('joinedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('leaseId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('leftAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'maintenanceRequest',
        columns: [
          col('assignedToId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('category', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('feedback', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('photos', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('rating', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('requesterId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('resolvedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('roomId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('OPEN'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('urgency', 'text', {
            notNull: true,
            default: lit('MEDIUM'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'maintenanceRequest_category_check_e431dd84',
            "\"category\" IN ('PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'STRUCTURAL', 'OTHER')",
          ),
          checkExpression(
            'maintenanceRequest_photos_elem_not_null_2b483247',
            'array_position("photos", NULL) IS NULL',
          ),
          checkExpression(
            'maintenanceRequest_status_check_cc5bde75',
            "\"status\" IN ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')",
          ),
          checkExpression(
            'maintenanceRequest_urgency_check_4da39f14',
            "\"urgency\" IN ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'notification',
        columns: [
          col('category', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('channel', 'text', {
            notNull: true,
            default: lit('IN_APP'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('data', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isRead', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('message', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'notification_category_check_d4834058',
            "\"category\" IN ('APPLICATION', 'VIEWING', 'RENT', 'BILL', 'MAINTENANCE', 'MATCH', 'LEASE', 'SYSTEM')",
          ),
          checkExpression(
            'notification_channel_check_1b4c6cff',
            "\"channel\" IN ('IN_APP', 'EMAIL', 'PUSH', 'SMS')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'notificationPreference',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('emailEnabled', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('inAppEnabled', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('preferences', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('pushEnabled', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('smsEnabled', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'payment',
        columns: [
          col('amount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('billShareId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('currency', 'text', {
            notNull: true,
            default: lit('usd'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('idempotencyKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('invoiceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('leaseId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('refundAmount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('stripeCheckoutSessionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('stripePaymentIntentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('stripeTransferId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'payment_status_check_dbaf17ff',
            "\"status\" IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED')",
          ),
          checkExpression('payment_type_check_c31e7368', "\"type\" IN ('RENT', 'BILL', 'DEPOSIT')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'property',
        columns: [
          col('address', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('amenities', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('city', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('country', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('latitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('longitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ownerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('photos', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('requiresRoommateApproval', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('state', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('stripeAccountId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('zipCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'property_amenities_elem_not_null_8aca8596',
            'array_position("amenities", NULL) IS NULL',
          ),
          checkExpression(
            'property_photos_elem_not_null_2b483247',
            'array_position("photos", NULL) IS NULL',
          ),
          checkExpression('property_status_check_aef30f3b', "\"status\" IN ('ACTIVE', 'ARCHIVED')"),
          checkExpression(
            'property_type_check_9b6fee13',
            "\"type\" IN ('APARTMENT', 'HOUSE', 'STUDIO', 'CONDO', 'TOWNHOUSE', 'OTHER')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'propertyManager',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('permissions', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('propertyId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'propertyManager_permissions_elem_not_null_318e2952',
            'array_position("permissions", NULL) IS NULL',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'rentInvoice',
        columns: [
          col('amount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('amountPaid', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('dueDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('gracePeriodDays', 'int4', {
            notNull: true,
            default: lit(5),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lateFee', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('leaseId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('periodEnd', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('periodStart', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('DUE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'rentInvoice_status_check_c05aa5f5',
            "\"status\" IN ('DUE', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'rentalDocument',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('fileUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('leaseId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('version', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'rentalDocument_status_check_cff2e3d2',
            "\"status\" IN ('DRAFT', 'PENDING_SIGNATURE', 'PARTIALLY_SIGNED', 'EXECUTED', 'EXPIRED')",
          ),
          checkExpression(
            'rentalDocument_type_check_185b3a4c',
            "\"type\" IN ('LEASE_AGREEMENT', 'ADDENDUM', 'INSPECTION_REPORT', 'OTHER')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'room',
        columns: [
          col('availableFrom', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('deposit', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('furnishing', 'text', {
            notNull: true,
            default: lit('UNFURNISHED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('leaseTerms', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('maxOccupants', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('minStayMonths', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('occupiedSlots', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('photos', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('propertyId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('rent', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('size', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('AVAILABLE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('version', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'room_furnishing_check_1f903f45',
            "\"furnishing\" IN ('FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED')",
          ),
          checkExpression(
            'room_photos_elem_not_null_2b483247',
            'array_position("photos", NULL) IS NULL',
          ),
          checkExpression(
            'room_status_check_a159f159',
            "\"status\" IN ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'ARCHIVED')",
          ),
          checkExpression('room_type_check_71674863', "\"type\" IN ('PRIVATE', 'SHARED')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'roommateApproval',
        columns: [
          col('applicationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('approverId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('comments', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('roomId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'roommateApproval_status_check_56005a61',
            "\"status\" IN ('PENDING', 'APPROVED', 'REJECTED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'roommateMatch',
        columns: [
          col('breakdown', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('score', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('user1Id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('user1Interest', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('user2Id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('user2Interest', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'roommateMatch_status_check_be304d40',
            "\"status\" IN ('PENDING', 'MUTUAL_INTEREST', 'DECLINED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'roommateProfile',
        columns: [
          col('bio', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('budgetMax', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('budgetMin', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('cleanliness', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lifestyleTags', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('moveInDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('pets', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('sleepSchedule', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('smoking', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('workSchedule', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'roommateProfile_cleanliness_check_b05bae6d',
            "\"cleanliness\" IN ('VERY_CLEAN', 'MODERATE', 'RELAXED')",
          ),
          checkExpression(
            'roommateProfile_lifestyleTags_elem_not_null_172fe942',
            'array_position("lifestyleTags", NULL) IS NULL',
          ),
          checkExpression(
            'roommateProfile_sleepSchedule_check_386b614a',
            "\"sleepSchedule\" IN ('EARLY_BIRD', 'NIGHT_OWL', 'FLEXIBLE')",
          ),
          checkExpression(
            'roommateProfile_workSchedule_check_7b051211',
            "\"workSchedule\" IN ('REMOTE', 'OFFICE', 'HYBRID', 'SHIFT')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'savedSearch',
        columns: [
          col('amenities', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('location', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('moveInDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('priceMax', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('priceMin', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('roomType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'savedSearch_amenities_elem_not_null_8aca8596',
            'array_position("amenities", NULL) IS NULL',
          ),
          checkExpression(
            'savedSearch_roomType_check_8f09ee46',
            "\"roomType\" IN ('PRIVATE', 'SHARED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'stripeWebhookEvent',
        columns: [
          col('eventType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('payload', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('processedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('stripeEventId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('password', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('TENANT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('stripeAccountId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('stripeCustomerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('user_role_check_0ed2480f', "\"role\" IN ('TENANT', 'OWNER', 'ADMIN')"),
          checkExpression(
            'user_status_check_18a7fd43',
            "\"status\" IN ('ACTIVE', 'SUSPENDED', 'BANNED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'utilityBill',
        columns: [
          col('amount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('billingPeriodEnd', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('billingPeriodStart', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('category', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('dueDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('proofUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('propertyId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('splitMethod', 'text', {
            notNull: true,
            default: lit('EQUAL'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'utilityBill_category_check_56cb25d3',
            "\"category\" IN ('ELECTRICITY', 'WATER', 'GAS', 'INTERNET', 'TRASH', 'OTHER')",
          ),
          checkExpression(
            'utilityBill_splitMethod_check_d98072a3',
            "\"splitMethod\" IN ('EQUAL', 'PERCENTAGE', 'USAGE_BASED')",
          ),
          checkExpression(
            'utilityBill_status_check_8cbaf7be',
            "\"status\" IN ('PENDING', 'PARTIALLY_PAID', 'SETTLED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'verification',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('data', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('documentUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reviewerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'verification_status_check_7362ec11',
            "\"status\" IN ('PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED')",
          ),
          checkExpression(
            'verification_type_check_2383abb9',
            "\"type\" IN ('IDENTITY', 'INCOME', 'EMPLOYMENT', 'REFERENCE_CHECK')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'viewingRequest',
        columns: [
          col('alternateDate', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('preferredDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('roomId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('REQUESTED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', {
            notNull: true,
            default: lit('IN_PERSON'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'viewingRequest_status_check_ba1fa1b3',
            "\"status\" IN ('REQUESTED', 'CONFIRMED', 'ALTERNATE_PROPOSED', 'DECLINED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')",
          ),
          checkExpression(
            'viewingRequest_type_check_004541db',
            "\"type\" IN ('IN_PERSON', 'VIRTUAL')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'billShare',
        constraint: 'billShare_billId_tenantId_key',
        columns: ['billId', 'tenantId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'leaseTenant',
        constraint: 'leaseTenant_leaseId_tenantId_key',
        columns: ['leaseId', 'tenantId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'notificationPreference',
        constraint: 'notificationPreference_userId_key',
        columns: ['userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'payment',
        constraint: 'payment_stripePaymentIntentId_key',
        columns: ['stripePaymentIntentId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'payment',
        constraint: 'payment_idempotencyKey_key',
        columns: ['idempotencyKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'propertyManager',
        constraint: 'propertyManager_propertyId_userId_key',
        columns: ['propertyId', 'userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'roommateMatch',
        constraint: 'roommateMatch_user1Id_user2Id_key',
        columns: ['user1Id', 'user2Id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'roommateProfile',
        constraint: 'roommateProfile_userId_key',
        columns: ['userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'stripeWebhookEvent',
        constraint: 'stripeWebhookEvent_stripeEventId_key',
        columns: ['stripeEventId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'application',
        index: 'application_roomId_idx_fe51d647',
        columns: ['roomId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'application',
        index: 'application_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'applicationDocument',
        index: 'applicationDocument_applicationId_idx_8158f91a',
        columns: ['applicationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'billShare',
        index: 'billShare_billId_idx_1639f7ee',
        columns: ['billId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'billShare',
        index: 'billShare_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dispute',
        index: 'dispute_raisedById_idx_32ba08ab',
        columns: ['raisedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documentAuditLog',
        index: 'documentAuditLog_actorId_idx_a58f6b4b',
        columns: ['actorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documentAuditLog',
        index: 'documentAuditLog_documentId_idx_825ef746',
        columns: ['documentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documentSignature',
        index: 'documentSignature_documentId_idx_825ef746',
        columns: ['documentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documentSignature',
        index: 'documentSignature_signerId_idx_869496e8',
        columns: ['signerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'lease',
        index: 'lease_propertyId_idx_4bcae41c',
        columns: ['propertyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'lease',
        index: 'lease_roomId_idx_fe51d647',
        columns: ['roomId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leaseTenant',
        index: 'leaseTenant_leaseId_idx_f789d0e1',
        columns: ['leaseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leaseTenant',
        index: 'leaseTenant_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'maintenanceRequest',
        index: 'maintenanceRequest_requesterId_idx_a5f4af92',
        columns: ['requesterId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'maintenanceRequest',
        index: 'maintenanceRequest_roomId_idx_fe51d647',
        columns: ['roomId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payment',
        index: 'payment_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'property',
        index: 'property_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'propertyManager',
        index: 'propertyManager_propertyId_idx_4bcae41c',
        columns: ['propertyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'propertyManager',
        index: 'propertyManager_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'rentInvoice',
        index: 'rentInvoice_leaseId_idx_f789d0e1',
        columns: ['leaseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'rentalDocument',
        index: 'rentalDocument_leaseId_idx_f789d0e1',
        columns: ['leaseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'room',
        index: 'room_propertyId_idx_4bcae41c',
        columns: ['propertyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'roommateApproval',
        index: 'roommateApproval_approverId_idx_a4f46e61',
        columns: ['approverId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'roommateApproval',
        index: 'roommateApproval_roomId_idx_fe51d647',
        columns: ['roomId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'roommateMatch',
        index: 'roommateMatch_user1Id_idx_db150192',
        columns: ['user1Id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'roommateMatch',
        index: 'roommateMatch_user2Id_idx_d408a8bd',
        columns: ['user2Id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'savedSearch',
        index: 'savedSearch_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'utilityBill',
        index: 'utilityBill_propertyId_idx_4bcae41c',
        columns: ['propertyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'verification',
        index: 'verification_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'viewingRequest',
        index: 'viewingRequest_roomId_idx_fe51d647',
        columns: ['roomId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'viewingRequest',
        index: 'viewingRequest_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'application',
        foreignKey: {
          name: 'application_roomId_fkey',
          columns: ['roomId'],
          references: { schema: 'public', table: 'room', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'application',
        foreignKey: {
          name: 'application_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'applicationDocument',
        foreignKey: {
          name: 'applicationDocument_applicationId_fkey',
          columns: ['applicationId'],
          references: { schema: 'public', table: 'application', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'billShare',
        foreignKey: {
          name: 'billShare_billId_fkey',
          columns: ['billId'],
          references: { schema: 'public', table: 'utilityBill', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'billShare',
        foreignKey: {
          name: 'billShare_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'dispute',
        foreignKey: {
          name: 'dispute_raisedById_fkey',
          columns: ['raisedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'documentAuditLog',
        foreignKey: {
          name: 'documentAuditLog_documentId_fkey',
          columns: ['documentId'],
          references: { schema: 'public', table: 'rentalDocument', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'documentAuditLog',
        foreignKey: {
          name: 'documentAuditLog_actorId_fkey',
          columns: ['actorId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'documentSignature',
        foreignKey: {
          name: 'documentSignature_documentId_fkey',
          columns: ['documentId'],
          references: { schema: 'public', table: 'rentalDocument', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'documentSignature',
        foreignKey: {
          name: 'documentSignature_signerId_fkey',
          columns: ['signerId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'lease',
        foreignKey: {
          name: 'lease_propertyId_fkey',
          columns: ['propertyId'],
          references: { schema: 'public', table: 'property', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'lease',
        foreignKey: {
          name: 'lease_roomId_fkey',
          columns: ['roomId'],
          references: { schema: 'public', table: 'room', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'leaseTenant',
        foreignKey: {
          name: 'leaseTenant_leaseId_fkey',
          columns: ['leaseId'],
          references: { schema: 'public', table: 'lease', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'leaseTenant',
        foreignKey: {
          name: 'leaseTenant_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'maintenanceRequest',
        foreignKey: {
          name: 'maintenanceRequest_roomId_fkey',
          columns: ['roomId'],
          references: { schema: 'public', table: 'room', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'maintenanceRequest',
        foreignKey: {
          name: 'maintenanceRequest_requesterId_fkey',
          columns: ['requesterId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notification',
        foreignKey: {
          name: 'notification_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notificationPreference',
        foreignKey: {
          name: 'notificationPreference_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'payment',
        foreignKey: {
          name: 'payment_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'property',
        foreignKey: {
          name: 'property_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'propertyManager',
        foreignKey: {
          name: 'propertyManager_propertyId_fkey',
          columns: ['propertyId'],
          references: { schema: 'public', table: 'property', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'propertyManager',
        foreignKey: {
          name: 'propertyManager_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'rentInvoice',
        foreignKey: {
          name: 'rentInvoice_leaseId_fkey',
          columns: ['leaseId'],
          references: { schema: 'public', table: 'lease', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'rentalDocument',
        foreignKey: {
          name: 'rentalDocument_leaseId_fkey',
          columns: ['leaseId'],
          references: { schema: 'public', table: 'lease', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'room',
        foreignKey: {
          name: 'room_propertyId_fkey',
          columns: ['propertyId'],
          references: { schema: 'public', table: 'property', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'roommateApproval',
        foreignKey: {
          name: 'roommateApproval_roomId_fkey',
          columns: ['roomId'],
          references: { schema: 'public', table: 'room', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'roommateApproval',
        foreignKey: {
          name: 'roommateApproval_approverId_fkey',
          columns: ['approverId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'roommateMatch',
        foreignKey: {
          name: 'roommateMatch_user1Id_fkey',
          columns: ['user1Id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'roommateMatch',
        foreignKey: {
          name: 'roommateMatch_user2Id_fkey',
          columns: ['user2Id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'roommateProfile',
        foreignKey: {
          name: 'roommateProfile_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'savedSearch',
        foreignKey: {
          name: 'savedSearch_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'utilityBill',
        foreignKey: {
          name: 'utilityBill_propertyId_fkey',
          columns: ['propertyId'],
          references: { schema: 'public', table: 'property', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'verification',
        foreignKey: {
          name: 'verification_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'viewingRequest',
        foreignKey: {
          name: 'viewingRequest_roomId_fkey',
          columns: ['roomId'],
          references: { schema: 'public', table: 'room', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'viewingRequest',
        foreignKey: {
          name: 'viewingRequest_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
