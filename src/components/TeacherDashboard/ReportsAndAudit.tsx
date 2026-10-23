/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../types/index.ts';
import { apiRequest } from '../../api/client.ts';
import {
  FileText,
  Download,
  ShieldCheck,
  History,
  Lock,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

export const ReportsAndAudit: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [logsData, policyData] = await Promise.all([
          apiRequest<AuditLog[]>('/audit-logs'),
          apiRequest<any>('/privacy/policy'),
        ]);
        setLogs(logsData);
        setPolicy(policyData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Export & Compliance Header Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-800">
              تصدير البيانات والنسخ الاحتياطي
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            وفق نظام حماية البيانات الشخصية السعودي (PDPL) — يمكنك تحميل نسخة كاملة من بيانات فصولك
          </p>
        </div>

        <a
          href="/api/backup/export"
          download="class_heroes_backup.json"
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>تحميل نسخة احتياطية (JSON)</span>
        </a>
      </div>

      {/* Saudi PDPL Privacy Principles Card */}
      {policy && (
        <div className="bg-emerald-50/70 border border-emerald-200 p-6 rounded-3xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-950 font-black text-xs sm:text-sm">
            <Lock className="w-4 h-4 text-emerald-700" />
            <span>سياسة الخصوصية وحماية بيانات الطلاب القُصّر ({policy.jurisdiction})</span>
          </div>
          <ul className="space-y-2 text-xs text-emerald-900 list-disc list-inside">
            {policy.principles.map((item: string, idx: number) => (
              <li key={idx} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <span>سجل التدقيق والعمليات الإدارية الحساسة ({logs.length})</span>
          </h3>
          <span className="text-[11px] text-slate-400">سجل تدقيق آمن وغير قابل للتعديل</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">
            جارٍ تحميل سجل التدقيق...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            لا توجد سجلات تدقيق مسجلة حتى الآن.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {log.action}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      #{log.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{log.details}</p>
                </div>
                <div className="text-left text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(log.timestamp).toLocaleDateString('ar-SA')} -{' '}
                    {new Date(log.timestamp).toLocaleTimeString('ar-SA', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
