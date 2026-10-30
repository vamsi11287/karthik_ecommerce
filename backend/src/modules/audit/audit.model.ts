import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  userEmail?: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  previousState?: any;
  newState?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    userEmail: { type: String },
    userRole: { type: String },
    action: { type: String, required: true, index: true },
    resource: { type: String, required: true, index: true },
    resourceId: { type: String },
    previousState: { type: Schema.Types.Mixed },
    newState: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export const logAuditEvent = async (data: {
  userId?: any;
  userEmail?: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  previousState?: any;
  newState?: any;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> => {
  try {
    await AuditLog.create(data);
  } catch (error) {
    console.error('Failed to write audit log entry:', error);
  }
};
