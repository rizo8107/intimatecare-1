import React, { useState, useEffect } from 'react';
import { Payment } from '../types';
import { CheckCircle, XCircle, Clock, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PaymentsTableProps {
  payments: Payment[];
  totalCount: number;
}

export function PaymentsTable({ payments, totalCount }: PaymentsTableProps) {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [subsContacts, setSubsContacts] = useState<
    { email: string | null; phone_number: string | null; signed: boolean | null }[]
  >([]);
  const [deletedContacts, setDeletedContacts] = useState<
    { email: string | null; phone_number: string | null }[]
  >([]);
  const [formContacts, setFormContacts] = useState<
    { email: string | null; phone_number: string | null }[]
  >([]);
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffset);

    return istDate.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusUpper = status.toUpperCase();
    const colors = {
      SUCCESS: 'bg-green-100 text-green-700',
      FAILED: 'bg-red-100 text-red-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
    };
    return colors[statusUpper as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const normalizePhone = (phone?: string | null | number): string => {
    if (phone == null) return '';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length <= 10) return digits;
    return digits.slice(-10);
  };

  const subscriptionKey = (email?: string | null, phone?: string | null | number) => {
    const e = (email || '').toLowerCase();
    const p = normalizePhone(phone);
    return `${e}|${p}`;
  };

  useEffect(() => {
    const fetchTelegramMeta = async () => {
      try {
        const [{ data: subs }, { data: deleted }, { data: forms }] = await Promise.all([
          supabase
            .from('telegram_subscriptions')
            .select('email, phone_number, signed'),
          supabase.from('telegram_sub_deleted').select('email, phone_number'),
          supabase.from('telegram_form_agreements').select('email, phone_number'),
        ]);

        setSubsContacts(
          (subs as { email: string | null; phone_number: string | null; signed: boolean | null }[] | null) ||
            []
        );
        setDeletedContacts(
          (deleted as { email: string | null; phone_number: string | null }[] | null) || []
        );
        setFormContacts(
          (forms as { email: string | null; phone_number: string | null }[] | null) || []
        );
      } catch (err) {
        console.error('Error fetching Telegram meta for PaymentsTable:', err);
      }
    };

    fetchTelegramMeta();
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Recent Intimate talks</h2>
            <p className="text-sm text-gray-500 mt-1">Overview of all Intimate talks</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 px-3 sm:px-4 py-2 rounded-lg">
            <Package className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">{totalCount} Total</span>
          </div>
        </div>
      </div>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">No Intimate talks found</p>
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              payments.map((payment, index) => (
              <tr
                key={index}
                onClick={() => setSelectedPayment(payment)}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{formatDate(payment.created_at)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{payment.product}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{payment.email}</div>
                  <div className="text-sm text-gray-500">{payment.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatAmount(payment.amount, payment.currency)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(payment.status)}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                        payment.status
                      )}`}
                    >
                      {payment.status}
                    </span>
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-gray-100">
        {payments.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No Intimate talks found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          </div>
        ) : (
          payments.map((payment, index) => (
            <div
              key={index}
              onClick={() => setSelectedPayment(payment)}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">{payment.product}</div>
                  <div className="text-sm text-gray-500">{formatDate(payment.created_at)}</div>
                </div>
                <div className="flex items-center gap-1">
                  {getStatusIcon(payment.status)}
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                      payment.status
                    )}`}
                  >
                    {payment.status}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Customer:</span>
                  <div className="text-right">
                    <div className="text-sm text-gray-900">{payment.email}</div>
                    <div className="text-sm text-gray-500">{payment.phone}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-base font-bold text-gray-900">
                    {formatAmount(payment.amount, payment.currency)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 relative">
            <button
              type="button"
              onClick={() => setSelectedPayment(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Customer</div>
                {selectedPayment.email && (
                  <div className="text-gray-900 font-medium">{selectedPayment.email}</div>
                )}
                {selectedPayment.phone && (
                  <div className="text-gray-600">{selectedPayment.phone}</div>
                )}
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Payment</div>
                <div className="text-gray-900">{formatDate(selectedPayment.created_at)}</div>
                <div className="text-gray-900">
                  {formatAmount(selectedPayment.amount, selectedPayment.currency)}{' '}
                  ({selectedPayment.product})
                </div>
                {selectedPayment.razorpay_order_id && (
                  <div className="text-gray-600 text-xs mt-1">
                    Order ID: {selectedPayment.razorpay_order_id}
                  </div>
                )}
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Status</div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedPayment.status)}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                      selectedPayment.status
                    )}`}
                  >
                    {selectedPayment.status}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                  Intimate talks status
                </div>
                {(() => {
                  const key = subscriptionKey(selectedPayment.email, selectedPayment.phone);
                  const matchingSub = subsContacts.find(
                    (c) => subscriptionKey(c.email, c.phone_number) === key
                  );
                  const inDeleted = deletedContacts.some(
                    (c) => subscriptionKey(c.email, c.phone_number) === key
                  );
                  const hasForm = formContacts.some(
                    (c) => subscriptionKey(c.email, c.phone_number) === key
                  );

                  if (matchingSub) {
                    return (
                      <div className="space-y-1 text-xs">
                        <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                          In Telegram subscriptions
                        </div>
                        <div>
                          Signed status:{' '}
                          {matchingSub.signed ? (
                            <span className="font-semibold text-emerald-600">Signed</span>
                          ) : (
                            <span className="font-semibold text-red-600">Not signed</span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (inDeleted) {
                    return (
                      <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 text-xs font-medium">
                        Deleted Telegram user
                      </div>
                    );
                  }

                  if (hasForm) {
                    return (
                      <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                        Form signed (agreements), no subscription row
                      </div>
                    );
                  }

                  return (
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                      No Telegram subscription / form yet
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
