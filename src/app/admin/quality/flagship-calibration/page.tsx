import { AuthGuard } from '@/components/admin/auth-guard';
import CalibrationClient from './calibration-client';

export default function FlagshipCalibrationPage() {
  return <AuthGuard><CalibrationClient /></AuthGuard>;
}
