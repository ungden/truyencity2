/**
 * Error Handler Service for Story Factory
 * Manages error logging, alerts, and recovery
 */

import { createClient } from '@supabase/supabase-js';
import {
  FactoryError,
  ErrorType,
  ErrorSeverity,
  ErrorStatus,
  ServiceResult,
} from './types';

export class ErrorHandlerService {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(options?: { supabaseUrl?: string; supabaseKey?: string }) {
    this.supabaseUrl = options?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    this.supabaseKey = options?.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  }

  private getSupabase() {
    return createClient(this.supabaseUrl, this.supabaseKey);
  }

  /**
   * Log an error
   */
  async logError(params: {
    error_type: ErrorType;
    error_message: string;
    production_id?: string;
    novel_id?: string;
    chapter_number?: number;
    severity?: ErrorSeverity;
    error_code?: string;
    error_details?: Record<string, unknown>;
    stack_trace?: string;
  }): Promise<ServiceResult<FactoryError>> {
    const supabase = this.getSupabase();

    // Use database function if available
    const { data: errorId, error: funcError } = await supabase.rpc('log_factory_error', {
      p_error_type: params.error_type,
      p_error_message: params.error_message,
      p_production_id: params.production_id || null,
      p_novel_id: params.novel_id || null,
      p_chapter_number: params.chapter_number || null,
      p_severity: params.severity || 'warning',
      p_error_details: params.error_details || null,
    });

    if (!funcError && errorId) {
      // Fetch the created error
      const { data } = await supabase
        .from('factory_errors')
        .select('*')
        .eq('id', errorId)
        .single();

      return {
        success: true,
        data: data as FactoryError,
      };
    }

    // Fallback: Direct insert
    const { data, error } = await supabase
      .from('factory_errors')
      .insert({
        error_type: params.error_type,
        error_message: params.error_message,
        production_id: params.production_id || null,
        novel_id: params.novel_id || null,
        chapter_number: params.chapter_number || null,
        error_code: params.error_code || null,
        error_details: params.error_details || null,
        stack_trace: params.stack_trace || null,
        severity: params.severity || 'warning',
        requires_attention: ['error', 'critical'].includes(params.severity || 'warning'),
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      console.error('[ErrorHandlerService] Failed to log error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_INSERT_ERROR',
      };
    }

    return {
      success: true,
      data: data as FactoryError,
    };
  }

  /**
   * Get new errors requiring attention
   */
  async getNewErrors(limit: number = 50): Promise<ServiceResult<FactoryError[]>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('factory_errors')
      .select('*')
      .eq('status', 'new')
      .eq('requires_attention', true)
      .order('severity', { ascending: false }) // Critical first
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    return {
      success: true,
      data: data as FactoryError[],
    };
  }

  /**
   * Get errors by severity
   */
  async getErrorsBySeverity(
    severity: ErrorSeverity,
    limit: number = 50
  ): Promise<ServiceResult<FactoryError[]>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('factory_errors')
      .select('*')
      .eq('severity', severity)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    return {
      success: true,
      data: data as FactoryError[],
    };
  }

  /**
   * Get errors for a production
   */
  async getProductionErrors(productionId: string): Promise<ServiceResult<FactoryError[]>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('factory_errors')
      .select('*')
      .eq('production_id', productionId)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    return {
      success: true,
      data: data as FactoryError[],
    };
  }

  /**
   * Acknowledge an error
   */
  async acknowledgeError(errorId: string): Promise<ServiceResult<void>> {
    const supabase = this.getSupabase();

    const { error } = await supabase
      .from('factory_errors')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', errorId);

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_UPDATE_ERROR',
      };
    }

    return { success: true };
  }

  /**
   * Resolve an error
   */
  async resolveError(
    errorId: string,
    resolvedBy: string,
    notes?: string,
    autoResolved: boolean = false
  ): Promise<ServiceResult<void>> {
    const supabase = this.getSupabase();

    const { error } = await supabase
      .from('factory_errors')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        resolution_notes: notes || null,
        auto_resolved: autoResolved,
        requires_attention: false,
      })
      .eq('id', errorId);

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_UPDATE_ERROR',
      };
    }

    return { success: true };
  }

  /**
   * Ignore an error
   */
  async ignoreError(errorId: string): Promise<ServiceResult<void>> {
    const supabase = this.getSupabase();

    const { error } = await supabase
      .from('factory_errors')
      .update({
        status: 'ignored',
        requires_attention: false,
      })
      .eq('id', errorId);

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_UPDATE_ERROR',
      };
    }

    return { success: true };
  }

  /**
   * Bulk acknowledge errors
   */
  async bulkAcknowledge(errorIds: string[]): Promise<ServiceResult<number>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('factory_errors')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
      })
      .in('id', errorIds)
      .select('id');

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_UPDATE_ERROR',
      };
    }

    return { success: true, data: data?.length || 0 };
  }

  /**
   * Get error statistics
   */
  async getErrorStats(days: number = 7): Promise<
    ServiceResult<{
      total: number;
      new: number;
      critical: number;
      byType: Record<ErrorType, number>;
      bySeverity: Record<ErrorSeverity, number>;
      byStatus: Record<ErrorStatus, number>;
    }>
  > {
    const supabase = this.getSupabase();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startISO = startDate.toISOString();

    // Count by type
    const typeKeys: ErrorType[] = ['ai_failure', 'quality_failure', 'publish_failure', 'system_error', 'rate_limit'];
    const severityKeys: ErrorSeverity[] = ['info', 'warning', 'error', 'critical'];
    const statusKeys: ErrorStatus[] = ['new', 'acknowledged', 'investigating', 'resolved', 'ignored'];

    const [totalResult, ...countResults] = await Promise.all([
      supabase.from('factory_errors').select('*', { count: 'exact', head: true }).gte('created_at', startISO),
      // By type (5 queries)
      ...typeKeys.map(t =>
        supabase.from('factory_errors').select('*', { count: 'exact', head: true }).gte('created_at', startISO).eq('error_type', t)
      ),
      // By severity (4 queries)
      ...severityKeys.map(s =>
        supabase.from('factory_errors').select('*', { count: 'exact', head: true }).gte('created_at', startISO).eq('severity', s)
      ),
      // By status (5 queries)
      ...statusKeys.map(st =>
        supabase.from('factory_errors').select('*', { count: 'exact', head: true }).gte('created_at', startISO).eq('status', st)
      ),
    ]);

    const allResults = [totalResult, ...countResults];
    const firstError = allResults.find(r => r.error);
    if (firstError?.error) {
      return {
        success: false,
        error: firstError.error.message,
        errorCode: 'DB_COUNT_ERROR',
      };
    }

    const byType = {} as Record<ErrorType, number>;
    typeKeys.forEach((key, i) => {
      byType[key] = countResults[i].count || 0;
    });

    const bySeverity = {} as Record<ErrorSeverity, number>;
    severityKeys.forEach((key, i) => {
      bySeverity[key] = countResults[typeKeys.length + i].count || 0;
    });

    const byStatus = {} as Record<ErrorStatus, number>;
    statusKeys.forEach((key, i) => {
      byStatus[key] = countResults[typeKeys.length + severityKeys.length + i].count || 0;
    });

    return {
      success: true,
      data: {
        total: totalResult.count || 0,
        new: byStatus.new,
        critical: bySeverity.critical,
        byType,
        bySeverity,
        byStatus,
      },
    };
  }

  /**
   * Check if should alert admin (critical errors)
   */
  async shouldAlertAdmin(): Promise<ServiceResult<boolean>> {
    const supabase = this.getSupabase();

    const { count, error } = await supabase
      .from('factory_errors')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new')
      .in('severity', ['error', 'critical']);

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_COUNT_ERROR',
      };
    }

    return {
      success: true,
      data: (count || 0) > 0,
    };
  }

  /**
   * Get error summary for dashboard
   */
  async getDashboardSummary(): Promise<
    ServiceResult<{
      newErrors: number;
      criticalErrors: number;
      todayErrors: number;
      requiresAttention: number;
    }>
  > {
    const supabase = this.getSupabase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [newResult, criticalResult, todayResult, attentionResult] = await Promise.all([
      supabase
        .from('factory_errors')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new'),
      supabase
        .from('factory_errors')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .eq('status', 'new'),
      supabase
        .from('factory_errors')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
      supabase
        .from('factory_errors')
        .select('*', { count: 'exact', head: true })
        .eq('requires_attention', true),
    ]);

    return {
      success: true,
      data: {
        newErrors: newResult.count || 0,
        criticalErrors: criticalResult.count || 0,
        todayErrors: todayResult.count || 0,
        requiresAttention: attentionResult.count || 0,
      },
    };
  }

  /**
   * Auto-resolve old minor errors
   */
  async autoResolveOldErrors(daysOld: number = 7): Promise<ServiceResult<number>> {
    const supabase = this.getSupabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabase
      .from('factory_errors')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: 'system',
        auto_resolved: true,
        requires_attention: false,
      })
      .in('severity', ['info', 'warning'])
      .lt('created_at', cutoffDate.toISOString())
      .eq('status', 'new')
      .select('id');

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_UPDATE_ERROR',
      };
    }

    return { success: true, data: data?.length || 0 };
  }

  /**
   * Clean up old resolved errors
   */
  async cleanupOldErrors(daysOld: number = 30): Promise<ServiceResult<number>> {
    const supabase = this.getSupabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabase
      .from('factory_errors')
      .delete()
      .in('status', ['resolved', 'ignored'])
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_DELETE_ERROR',
      };
    }

    return { success: true, data: data?.length || 0 };
  }
}

// Singleton instance
let errorHandlerInstance: ErrorHandlerService | null = null;

export function getErrorHandlerService(): ErrorHandlerService {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new ErrorHandlerService();
  }
  return errorHandlerInstance;
}

export function createErrorHandlerService(options?: {
  supabaseUrl?: string;
  supabaseKey?: string;
}): ErrorHandlerService {
  return new ErrorHandlerService(options);
}
