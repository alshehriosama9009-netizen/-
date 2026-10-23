/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, PointTransaction, RewardRequest } from '../../types/index.ts';
import { apiRequest } from '../../api/client.ts';
import {
  X,
  History,
  Coins,
  Sparkles,
  ShoppingBag,
  Award,
  AlertCircle,
  FileEdit,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface StudentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onRefresh: () => void;
}

export const StudentHistoryModal: React.FC<StudentHistoryModalProps> = ({
  isOpen,
  onClose,
  student,
  onRefresh,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [rewardRequests, setRewardRequests] = useState<RewardRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'tx' | 'rewards'>('tx');

  // Correction state
  const [correctingTx, setCorrectingTx] = useState<PointTransaction | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [adjustmentPoints, setAdjustmentPoints] = useState<number>(0);
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchHistory = async () => {
    if (!student) return;
    setLoading(true);
    try {
      const res = await apiRequest<{
        student: Student;
        transactions: PointTransaction[];
        rewardRequests: RewardRequest[];
      }>(`/students/${student.id}/history`);
      setTransactions(res.transactions);
      setRewardRequests(res.rewardRequests);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && student) {
      fetchHistory();
      setCorrectingTx(null);
      setStatusBanner(null);
    }
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingTx || !correctionReason.trim()) return;

    setSubmittingCorrection(true);
    setStatusBanner(null);
    try {
      await apiRequest('/points/correct', {
        method: 'POST',
        body: JSON.stringify({
          transactionId: correctingTx.id,
          correctionReason,
          adjustmentPoints: Number(adjustmentPoints),
        }),
      });
      setStatusBanner({ type: 'success', text: 'تم تسجيل عملية التصحيح بنجاح.' });
      setCorrectingTx(null);
      setCorrectionReason('');
      setAdjustmentPoints(0);
      fetchHistory();
      onRefresh();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message });
    } finally {
      setSubmittingCorrection(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
              <History className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  سجل عمليات الطالب: {student.name}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-mono">
                  {student.studentCode}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                رمز الدخول (PIN): {student.pinCode} | تاريخ الانضمام:{' '}
                {new Date(student.createdAt).toLocaleDateString('ar-SA')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Distinct Balances Banner (Crucial Requirement) */}
        <div className="grid grid-cols-3 p-4 bg-slate-50 border-b border-slate-200 gap-3 text-center">
          <div className="p-3 bg-white rounded-2xl border border-indigo-100 shadow-2xs">
            <p className="text-[11px] font-bold text-slate-500 flex items-center justify-center gap-1">
              <Coins className="w-3.5 h-3.5 text-indigo-600" />
              الرصيد المتاح للإنفاق
            </p>
            <p className="text-xl font-black text-indigo-600 mt-1">
              {student.availableBalance}
            </p>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-emerald-100 shadow-2xs">
            <p className="text-[11px] font-bold text-slate-500 flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              إجمالي النقاط المكتسبة
            </p>
            <p className="text-xl font-black text-emerald-600 mt-1">
              {student.totalEarned}
            </p>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-amber-100 shadow-2xs">
            <p className="text-[11px] font-bold text-slate-500 flex items-center justify-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
              النقاط المصروفة
            </p>
            <p className="text-xl font-black text-amber-600 mt-1">
              {student.totalSpent}
            </p>
          </div>
        </div>

        {/* Historical Achievement Notice */}
        <div className="px-6 py-2 bg-indigo-50/70 border-b border-indigo-100 flex items-center gap-2 text-xs text-indigo-900 font-semibold">
          <Award className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            المجموع التاريخي للإنجازات:{' '}
            <strong className="font-extrabold">{student.historicalAchievement} نقطة</strong>{' '}
            (ثابت ولا ينقص بصرف المكافآت)
          </span>
        </div>

        {/* Correction Modal Section */}
        {correctingTx && (
          <div className="p-5 bg-amber-50/90 border-b border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <FileEdit className="w-4 h-4 text-amber-700" />
                <span>تصحيح المعاملة رقم #{correctingTx.id}</span>
              </h4>
              <button
                type="button"
                onClick={() => setCorrectingTx(null)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                إلغاء
              </button>
            </div>
            <p className="text-[11px] text-amber-800 mb-3">
              العملية الأصلية: {correctingTx.reason} ({correctingTx.points > 0 ? `+${correctingTx.points}` : correctingTx.points} نقطة).
              سيتم إنشاء قيد تصحيحي مرتبط يوثق سبب التعديل.
            </p>
            <form onSubmit={handleCorrectionSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  سبب التصحيح (إلزامي للتوثيق والتدقيق):
                </label>
                <input
                  type="text"
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="مثال: تصحيح خطأ إدخال في درجة السؤال"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-amber-300 bg-white"
                />
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    قيمة التعديل بالنقاط (سالب للخصم، موجب للإضافة):
                  </label>
                  <input
                    type="number"
                    required
                    value={adjustmentPoints}
                    onChange={(e) => setAdjustmentPoints(Number(e.target.value))}
                    className="w-32 px-3 py-1.5 text-xs rounded-xl border border-amber-300 bg-white font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingCorrection}
                  className="self-end px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs"
                >
                  {submittingCorrection ? 'جارٍ الاعتماد...' : 'حفظ قيد التصحيح'}
                </button>
              </div>
            </form>
          </div>
        )}

        {statusBanner && (
          <div
            className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between border-b ${
              statusBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>{statusBanner.text}</span>
            <button type="button" onClick={() => setStatusBanner(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        )}

        {/* Tabs: Transactions Ledger vs Reward Requests */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('tx')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'tx'
                ? 'border-indigo-600 text-indigo-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            سجل حركات النقاط ({transactions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rewards')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'rewards'
                ? 'border-indigo-600 text-indigo-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            طلبات المكافآت ({rewardRequests.length})
          </button>
        </div>

        {/* Content Table */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-10 text-xs text-slate-500">
              جارٍ تحميل سجل العمليات...
            </div>
          ) : activeTab === 'tx' ? (
            transactions.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                لا توجد معاملات مسجلة لهذا الطالب حتى الآن.
              </div>
            ) : (
              <div className="space-y-2.5">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      tx.isAdjustment
                        ? 'bg-amber-50/60 border-amber-200'
                        : tx.points > 0
                        ? 'bg-white border-slate-200'
                        : 'bg-rose-50/50 border-rose-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold ${
                            tx.points > 0 ? 'text-indigo-900' : 'text-rose-900'
                          }`}
                        >
                          {tx.reason}
                        </span>
                        {tx.isAdjustment && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-200 text-amber-900">
                            قيد تصحيحي
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(tx.date).toLocaleDateString('ar-SA')} -{' '}
                          {new Date(tx.date).toLocaleTimeString('ar-SA', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>بواسطة: {tx.performedByName || 'المعلم'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-black ${
                          tx.points > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {tx.points > 0 ? `+${tx.points}` : tx.points} نقطة
                      </span>
                      {!tx.isAdjustment && (
                        <button
                          type="button"
                          onClick={() => {
                            setCorrectingTx(tx);
                            setAdjustmentPoints(-tx.points); // default to reversing
                            setCorrectionReason('');
                          }}
                          className="text-xs text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100"
                          title="تصحيح هذه المعاملة بقيد جديد"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : rewardRequests.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              لم يقم الطالب بطلب أي مكافأة بعد.
            </div>
          ) : (
            <div className="space-y-2.5">
              {rewardRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">
                      {req.rewardTitle}
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      التاريخ:{' '}
                      {new Date(req.createdAt).toLocaleDateString('ar-SA')}
                    </p>
                    {req.rejectionReason && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">
                        سبب الرفض: {req.rejectionReason}
                      </p>
                    )}
                  </div>
                  <div className="text-left">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        req.status === 'delivered'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : req.status === 'approved'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : req.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {req.status === 'delivered'
                        ? 'تم التسليم'
                        : req.status === 'approved'
                        ? 'معتمد'
                        : req.status === 'rejected'
                        ? 'مرفوض ومسترد'
                        : 'قيد المراجعة'}
                    </span>
                    <span className="block text-xs font-extrabold text-slate-600 mt-1">
                      {req.costPoints} نقطة
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
