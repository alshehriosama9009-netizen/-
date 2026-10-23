/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RewardItem, RewardRequest } from '../../types/index.ts';
import { apiRequest } from '../../api/client.ts';
import {
  ShoppingBag,
  Plus,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Gift,
  Coins,
  Sparkles,
  Trophy,
  Crown,
  PenTool,
  BookOpen,
  Armchair,
  Gamepad2,
  X,
  Edit3,
} from 'lucide-react';

interface RewardsStoreManagerProps {
  onRefresh: () => void;
}

const ICON_MAP: Record<string, any> = {
  Sparkles,
  Gamepad2,
  Crown,
  Armchair,
  PenTool,
  BookOpen,
  Gift,
  Award: Trophy,
  Trophy,
};

export const RewardsStoreManager: React.FC<RewardsStoreManagerProps> = ({ onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'catalog'>('requests');
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [requests, setRequests] = useState<RewardRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // New/Edit reward item state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);
  const [title, setTitle] = useState('');
  const [costPoints, setCostPoints] = useState<number>(50);
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Gift');
  const [stock, setStock] = useState<string>(''); // empty = unlimited
  const [submitting, setSubmitting] = useState(false);

  // Rejection modal state
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rewData, reqData] = await Promise.all([
        apiRequest<RewardItem[]>('/rewards'),
        apiRequest<RewardRequest[]>('/rewards/requests'),
      ]);
      setRewards(rewData);
      setRequests(reqData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingReward(null);
    setTitle('');
    setCostPoints(50);
    setDescription('');
    setIcon('Gift');
    setStock('');
    setIsModalOpen(true);
  };

  const openEditModal = (reward: RewardItem) => {
    setEditingReward(reward);
    setTitle(reward.title);
    setCostPoints(reward.costPoints);
    setDescription(reward.description);
    setIcon(reward.icon);
    setStock(reward.stock !== null ? String(reward.stock) : '');
    setIsModalOpen(true);
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || costPoints <= 0) return;

    setSubmitting(true);
    setStatusBanner(null);
    try {
      const payload = {
        title,
        costPoints: Number(costPoints),
        description,
        icon,
        stock: stock.trim() === '' ? null : Number(stock),
      };

      if (editingReward) {
        await apiRequest(`/rewards/${editingReward.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/rewards', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      setStatusBanner({ type: 'success', text: 'تم حفظ المكافأة بنجاح.' });
      fetchData();
      onRefresh();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (
    requestId: string,
    action: 'approve' | 'reject' | 'deliver',
    reason?: string
  ) => {
    setStatusBanner(null);
    try {
      await apiRequest(`/rewards/requests/${requestId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, rejectionReason: reason }),
      });
      setRejectingRequestId(null);
      setRejectionReason('');
      fetchData();
      onRefresh();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message });
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  return (
    <div className="space-y-6">
      {statusBanner && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{statusBanner.text}</span>
          <button type="button" onClick={() => setStatusBanner(null)} className="text-slate-400 hover:text-slate-600 px-2">
            ✕
          </button>
        </div>
      )}
      {/* Top Banner and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>طلبات الاستبدال</span>
            {pendingRequests.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'catalog'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>كتالوج المكافآت والمخزون ({rewards.length})</span>
          </button>
        </div>

        {activeTab === 'catalog' && (
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مكافأة جديدة</span>
          </button>
        )}
      </div>

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              <span>مراجعة طلبات استبدال النقاط ({requests.length})</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              الطلبات المعلقة: {pendingRequests.length}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs text-slate-400">
              جارٍ تحميل الطلبات...
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              لا توجد طلبات استبدال حتى الآن.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    req.status === 'pending' ? 'bg-amber-50/30' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black text-slate-900">
                          {req.studentName}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {req.rewardTitle}
                        </span>
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {req.costPoints} نقطة
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        تاريخ الطلب:{' '}
                        {new Date(req.createdAt).toLocaleDateString('ar-SA')} -{' '}
                        {new Date(req.createdAt).toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {req.rejectionReason && (
                        <p className="text-[11px] text-rose-600 font-bold mt-1">
                          سبب الرفض: {req.rejectionReason} (أُعيدت النقاط للطالب)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions / Status */}
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {req.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleReview(req.id, 'approve')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>اعتماد وخصم النقاط</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingRequestId(req.id);
                            setRejectionReason('عذرًا، المكافأة غير متوفرة حاليًا');
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>رفض وإعادة النقاط</span>
                        </button>
                      </>
                    ) : req.status === 'approved' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                          جاهز للاستلام
                        </span>
                        <button
                          type="button"
                          onClick={() => handleReview(req.id, 'deliver')}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>تم التسليم للبطل</span>
                        </button>
                      </div>
                    ) : req.status === 'delivered' ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تم التسليم</span>
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
                        مرفوض ومسترد
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Catalog Tab */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((reward) => {
            const IconComp = ICON_MAP[reward.icon] || Gift;

            return (
              <div
                key={reward.id}
                className={`p-5 rounded-3xl bg-white border transition-all shadow-xs flex flex-col justify-between ${
                  reward.isActive ? 'border-slate-200/90' : 'border-slate-200 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                        {reward.costPoints} نقطة
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditModal(reward)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                        title="تعديل المكافأة"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    {reward.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {reward.description || 'مكافأة تحفيزية لأبطال الفصل'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-4">
                  <span>
                    المخزون:{' '}
                    <strong>
                      {reward.stock === null ? 'غير محدود' : `${reward.stock} متبقي`}
                    </strong>
                  </span>
                  <span
                    className={`font-semibold ${
                      reward.isActive ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    {reward.isActive ? 'متاحة للطلاب' : 'معطلة'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Reward Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingReward ? 'تعديل المكافأة' : 'إضافة مكافأة جديدة'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReward} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المكافأة:
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: اختيار اللغز القادم"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    التكلفة بالنقاط:
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={costPoints}
                    onChange={(e) => setCostPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المخزون (اتركه فارغًا إن كان غير محدود):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="غير محدود"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الأيقونة:
                </label>
                <select
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50"
                >
                  <option value="Sparkles">Sparkles (بريق / نجمة)</option>
                  <option value="Gamepad2">Gamepad (لعبة)</option>
                  <option value="Crown">Crown (تاج)</option>
                  <option value="Armchair">Armchair (مقعد)</option>
                  <option value="PenTool">PenTool (قلم)</option>
                  <option value="BookOpen">BookOpen (دفتر)</option>
                  <option value="Gift">Gift (هدية / مفاجأة)</option>
                  <option value="Trophy">Trophy (كأس / جائزة)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الوصف:
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وصف مختصر لمزايا المكافأة..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-2xs"
                >
                  {submitting ? 'جارٍ الحفظ...' : 'حفظ المكافأة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingRequestId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-5 border border-slate-100 space-y-4">
            <h4 className="text-xs font-bold text-slate-900">
              تأكيد رفض طلب المكافأة وإعادة النقاط:
            </h4>
            <p className="text-xs text-slate-500">
              سيتم إعادة النقاط تلقائيًا إلى رصيد الطالب فور الرفض.
            </p>
            <input
              type="text"
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="اكتب سبب الرفض هنا..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-rose-300 bg-rose-50/40"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingRequestId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleReview(rejectingRequestId, 'reject', rejectionReason)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs"
              >
                تأكيد الرفض والاسترداد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
