import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole, PermissionKey, DEFAULT_ADMIN_PERMISSIONS } from '../../config/constants';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  permissions: PermissionKey[];
  avatar?: string;
  resetPasswordOtp?: string;
  resetPasswordOtpExpires?: Date;
  addresses: Array<{
    _id: mongoose.Types.ObjectId;
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  hasPermission(permission: PermissionKey): boolean;
}

const AddressSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, default: 'India', trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CUSTOMER,
      index: true,
    },
    isActive: { type: Boolean, default: true },
    permissions: {
      type: [String],
      enum: Object.values(PermissionKey),
      default: [],
    },
    avatar: { type: String },
    resetPasswordOtp: { type: String },
    resetPasswordOtpExpires: { type: Date },
    addresses: [AddressSchema],
  },
  {
    timestamps: true,
  }
);

// Password comparison method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Permission checking method
UserSchema.methods.hasPermission = function (permission: PermissionKey): boolean {
  if (!this.isActive) return false;
  if (this.role === UserRole.SUPER_ADMIN) return true;
  if (this.role === UserRole.ADMIN) {
    // If specific permissions array is populated on this Admin, check it; otherwise fallback to default admin permissions
    const activePerms = this.permissions.length > 0 ? this.permissions : DEFAULT_ADMIN_PERMISSIONS;
    return activePerms.includes(permission);
  }
  return false;
};

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
