import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Filter, Search, AlertCircle, Clock, CheckCircle, XCircle, Users } from 'lucide-react';
import { StatCard } from './StatCard';
import { Pagination } from './Pagination';
import { Payment } from '../types';

interface TelegramSubscription {
  id: string;
  customer_name: string;
  telegram_username: string;
  telegram_user_id: number;
  phone_number: string | null;
  email: string | null;
  plan_duration: string;
  plan_name: string;
  start_date: string;
  expiry_date: string;
  reminder_date: string;
  signed?: boolean;
  gender?: string | null;
  location?: string | null;
  problems?: string | null;
  joinReason?: string | null;
  referral?: string | null;
  hookupAgreement?: boolean | null;
  privacyAgreement?: boolean | null;
  participationAgreement?: boolean | null;
  respectAgreement?: boolean | null;
  contentAgreement?: boolean | null;
  nonJudgmentalAgreement?: boolean | null;
  participateAgreement?: boolean | null;
  sensitiveTopicsAgreement?: boolean | null;
  anonymityAgreement?: boolean | null;
  liabilityAgreement?: boolean | null;
  explicitLanguageAgreement?: boolean | null;
  additionalGuidelinesAgreement?: boolean | null;
  privacySettingsAgreement?: boolean | null;
  impliedSignatureAgreement?: boolean | null;
}

const TelegramSubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<TelegramSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'all' | 'customer' | 'username' | 'phone'>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active'); // Default to active
  const [signedFilter, setSignedFilter] = useState<string>('signed'); // Default to signed
  const [startDateFrom, setStartDateFrom] = useState('');
  const [startDateTo, setStartDateTo] = useState('');
  const [startDatePreset, setStartDatePreset] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTableTab, setActiveTableTab] = useState<'subscriptions' | 'paid-not-signed' | 'deleted'>('subscriptions');
  const [paidNotSignedRange, setPaidNotSignedRange] = useState<'all' | '7days' | '30days'>('all');
  const [selectedSubscription, setSelectedSubscription] = useState<TelegramSubscription | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedDeletedUser, setSelectedDeletedUser] = useState<{ email: string | null; phone_number: string | null } | null>(null);
  const [kpiModal, setKpiModal] = useState<string | null>(null);

  const [intimatePayments, setIntimatePayments] = useState<Payment[]>([]);
  const [deletedSubs, setDeletedSubs] = useState<{ email: string | null; phone_number: string | null }[]>([]);
  const [formAgreements, setFormAgreements] = useState<{ email: string | null; phone_number: string | null }[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('telegram_subscriptions')
          .select('*');

        if (error) throw error;

        const mapped: TelegramSubscription[] = (data || []).map((item) => ({
          id: item.id,
          customer_name: item.customer_name,
          telegram_username: item.telegram_username,
          telegram_user_id: item.telegram_user_id,
          phone_number: (item.phone_number ?? item['phone number'])
            ? String(item.phone_number ?? item['phone number'])
            : null,
          email: item.email ?? null,
          plan_duration: item.plan_duration,
          plan_name: item.plan_name,
          start_date: item.start_date,
          expiry_date: item.expiry_date,
          reminder_date: item.reminder_date,
          signed: item.signed,
          gender: item.gender ?? null,
          location: item.location ?? null,
          problems: item.problems ?? null,
          joinReason: item.joinReason ?? null,
          referral: item.referral ?? null,
          hookupAgreement: item.hookupAgreement ?? null,
          privacyAgreement: item.privacyAgreement ?? null,
          participationAgreement: item.participationAgreement ?? null,
          respectAgreement: item.respectAgreement ?? null,
          contentAgreement: item.contentAgreement ?? null,
          nonJudgmentalAgreement: item.nonJudgmentalAgreement ?? null,
          participateAgreement: item.participateAgreement ?? null,
          sensitiveTopicsAgreement: item.sensitiveTopicsAgreement ?? null,
          anonymityAgreement: item.anonymityAgreement ?? null,
          liabilityAgreement: item.liabilityAgreement ?? null,
          explicitLanguageAgreement: item.explicitLanguageAgreement ?? null,
          additionalGuidelinesAgreement: item.additionalGuidelinesAgreement ?? null,
          privacySettingsAgreement: item.privacySettingsAgreement ?? null,
          impliedSignatureAgreement: item.impliedSignatureAgreement ?? null,
        }));

        setSubscriptions(mapped);

        // Fetch payments_kb_all for Intimate talks funnel (successful payments only)
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments_kb_all')
          .select('*')
          .eq('status', 'SUCCESS');

        if (paymentsError) {
          console.error('Error fetching payments_kb_all:', paymentsError);
        } else {
          const intimate =
            (paymentsData as Payment[] | null | undefined)?.filter((p) => {
              if (!p.product) return false;
              const prod = p.product.toLowerCase();
              // Only treat real Intimate talks products as part of the funnel
              if (prod.includes('69 ebook') || prod.includes('32 ebook')) return false;
              return prod.includes('intimate');
            }) || [];
          setIntimatePayments(intimate);
        }

        // Fetch deleted telegram subscriptions for churn analysis
        const { data: deletedData, error: deletedError } = await supabase
          .from('telegram_sub_deleted')
          .select('email, phone_number');

        if (deletedError) {
          console.error('Error fetching telegram_sub_deleted:', deletedError);
        } else {
          setDeletedSubs(
            (deletedData as { email: string | null; phone_number: string | null }[] | null) || []
          );
        }

        // Fetch telegram_form_agreements - anyone here has already signed the form
        const { data: formData, error: formError } = await supabase
          .from('telegram_form_agreements')
          .select('email, phone_number');

        if (formError) {
          console.error('Error fetching telegram_form_agreements:', formError);
        } else {
          setFormAgreements(
            (formData as { email: string | null; phone_number: string | null }[] | null) || []
          );
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching telegram subscriptions:', err);
        setError('Failed to load telegram subscriptions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const formatPhoneNumber = (phoneNumber: string | number | null | undefined): string => {
    if (!phoneNumber) return '-';
    const phone = String(phoneNumber);
    if (phone.startsWith('91') || phone.startsWith('+91')) {
      const cleaned = phone.replace(/\D/g, '');
      const match = cleaned.match(/^(91)?([0-9]{10})$/);
      if (match) {
        return `+91 ${match[2].replace(/(.{5})(.{5})/, '$1 $2')}`;
      }
    }
    return phone;
  };

  const calculateDaysRemaining = (expiryDate: string): number => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getSubscriptionStatus = (
    daysRemaining: number
  ): 'active' | 'expiring-soon' | 'expired' => {
    if (daysRemaining <= 0) return 'expired';
    if (daysRemaining <= 10) return 'expiring-soon';
    return 'active';
  };

  const uniquePlans = useMemo(() => {
    const plans = subscriptions.map((sub) => sub.plan_name);
    return ['all', ...Array.from(new Set(plans))];
  }, [subscriptions]);

  // Main filtered list for table (respects all filters including Signed dropdown)
  const filteredSubscriptions = useMemo(() => {
    const filtered = subscriptions.filter((subscription) => {
      const daysRemaining = calculateDaysRemaining(subscription.expiry_date);
      const status = getSubscriptionStatus(daysRemaining);

      const lowerSearch = searchTerm.toLowerCase();

      // Start date range filter (based on subscription.start_date)
      if (startDateFrom || startDateTo) {
        const start = new Date(subscription.start_date);

        if (startDateFrom) {
          const from = new Date(startDateFrom);
          from.setHours(0, 0, 0, 0);
          if (start < from) {
            return false;
          }
        }

        if (startDateTo) {
          const to = new Date(startDateTo);
          to.setHours(23, 59, 59, 999);
          if (start > to) {
            return false;
          }
        }
      }

      const matchesSearch = (() => {
        if (!searchTerm) return true;

        const inCustomer = subscription.customer_name.toLowerCase().includes(lowerSearch);
        const inUsername = subscription.telegram_username.toLowerCase().includes(lowerSearch);
        const inPhone =
          subscription.phone_number && subscription.phone_number.toString().includes(searchTerm);

        if (searchField === 'customer') return inCustomer;
        if (searchField === 'username') return inUsername;
        if (searchField === 'phone') return !!inPhone;

        // 'all'
        return inCustomer || inUsername || inPhone;
      })();

      const matchesPlan = planFilter === 'all' || subscription.plan_name === planFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && status === 'active') ||
        (statusFilter === 'expiring-soon' && status === 'expiring-soon') ||
        (statusFilter === 'expired' && status === 'expired');

      const matchesSigned =
        signedFilter === 'all' ||
        (signedFilter === 'signed' && subscription.signed === true) ||
        (signedFilter === 'not-signed' &&
          (subscription.signed === false || subscription.signed === undefined));

      return matchesSearch && matchesPlan && matchesStatus && matchesSigned;
    });

    // Sort with latest start date first
    return filtered.sort((a, b) => {
      const aTime = new Date(a.start_date).getTime();
      const bTime = new Date(b.start_date).getTime();
      return bTime - aTime;
    });
  }, [subscriptions, searchTerm, searchField, planFilter, statusFilter, signedFilter, startDateFrom, startDateTo]);

  const paginatedSubscriptions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSubscriptions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSubscriptions, currentPage, itemsPerPage]);

  const totalCount = filteredSubscriptions.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchField, planFilter, statusFilter, signedFilter, startDateFrom, startDateTo, itemsPerPage]);

  // Normalize phone so payments (numbers), subscriptions ("91..." strings), and agreements match
  const normalizePhone = (phone?: string | null | number): string => {
    if (phone == null) return '';
    const digits = String(phone).replace(/\D/g, '');
    // Use last 10 digits as canonical (Indian mobile); this handles 91/0 prefixes, etc.
    if (digits.length <= 10) return digits;
    return digits.slice(-10);
  };

  // activeSubscriptions count is derived from activeList below
  const subscriptionKey = (email?: string | null, phone?: string | null | number) => {
    const e = (email || '').toLowerCase();
    const p = normalizePhone(phone);
    return `${e}|${p}`;
  };

  const subscriptionKeys = useMemo(
    () =>
      new Set(
        subscriptions.map((sub) => subscriptionKey(sub.email, sub.phone_number))
      ),
    [subscriptions]
  );

  const formAgreementKeys = useMemo(
    () =>
      new Set(
        formAgreements.map((row) =>
          subscriptionKey(row.email ?? null, row.phone_number ?? null)
        )
      ),
    [formAgreements]
  );

  const deletedKeys = useMemo(
    () =>
      new Set(
        deletedSubs.map((row) =>
          subscriptionKey(row.email ?? null, row.phone_number ?? null)
        )
      ),
    [deletedSubs]
  );

  const totalPaidIntimate = intimatePayments.length;

  // Paid not signed: people who paid but NEVER had any subscription (not in telegram_subscriptions)
  // and are NOT in telegram_form_agreements (never signed the external form)
  // Goal: find people who purchased but never started using the product
  const paidNotSignedList = useMemo(
    () => {
      const base = intimatePayments.filter((payment) => {
        const key = subscriptionKey(payment.email, payment.phone);
        // Exclude if they have/had ANY subscription (even expired)
        const hasSubscription = subscriptionKeys.has(key);
        // Exclude if they have filled telegram_form_agreements (they are already signed)
        const hasFormAgreement = formAgreementKeys.has(key);
        return !hasSubscription && !hasFormAgreement;
      });

      return base.sort((a, b) => {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        return bTime - aTime; // latest payments first
      });
    },
    [intimatePayments, subscriptionKeys, formAgreementKeys]
  );

  const visiblePaidNotSignedList = useMemo(() => {
    const now = Date.now();
    // Hard cap: only show payments from the last 30 days in this tab
    const baseCutoff = now - 30 * 24 * 60 * 60 * 1000;
    const recentBase = paidNotSignedList.filter((payment) => {
      const created = new Date(payment.created_at).getTime();
      return created >= baseCutoff;
    });

    if (paidNotSignedRange === 'all') return recentBase;

    const days = paidNotSignedRange === '7days' ? 7 : 30;
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    return recentBase.filter((payment) => {
      const created = new Date(payment.created_at).getTime();
      return created >= cutoff;
    });
  }, [paidNotSignedList, paidNotSignedRange]);

  const paidNotSignedAll = paidNotSignedList.length;
  const visiblePaidNotSignedCount = visiblePaidNotSignedList.length;

  // KPI: Paid not signed (last 30 days only) - recent purchases who haven't signed yet
  const recentPaidNotSignedList = useMemo(() => {
    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000; // 30 days
    return paidNotSignedList.filter((payment) => {
      const created = new Date(payment.created_at).getTime();
      return created >= cutoff;
    });
  }, [paidNotSignedList]);
  const recentPaidNotSigned = recentPaidNotSignedList.length;

  // Paid not signed but older than 30 days - effectively churned (never signed even after 30 days)
  const stalePaidNotSignedList = useMemo(() => {
    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000; // 30 days
    return paidNotSignedList.filter((payment) => {
      const created = new Date(payment.created_at).getTime();
      return created < cutoff;
    });
  }, [paidNotSignedList]);

  // KPI: Signed subscriptions
  const signedList = useMemo(() => subscriptions.filter((sub) => sub.signed), [subscriptions]);
  const signedCount = signedList.length;

  // KPI: Active subscriptions
  const activeList = useMemo(() => {
    return subscriptions.filter((sub) => {
      const days = calculateDaysRemaining(sub.expiry_date);
      return getSubscriptionStatus(days) === 'active';
    });
  }, [subscriptions]);
  const activeSubscriptions = activeList.length;

  // KPI: Expired unsigned - subscriptions that expired and user never signed
  const expiredUnsignedList = useMemo(() => {
    return subscriptions.filter((sub) => {
      const days = calculateDaysRemaining(sub.expiry_date);
      const isExpired = days <= 0;
      const notSigned = !sub.signed;
      return isExpired && notSigned;
    });
  }, [subscriptions]);
  const expiredUnsigned = expiredUnsignedList.length;

  // KPI: Deleted (not re-subscribed)
  const churnedDeletedList = useMemo(() => {
    const result: { email: string | null; phone_number: string | null }[] = [];
    deletedSubs.forEach((sub) => {
      const key = subscriptionKey(sub.email, sub.phone_number);
      if (!subscriptionKeys.has(key)) {
        result.push(sub);
      }
    });
    return result;
  }, [deletedSubs, subscriptionKeys]);
  const churnedDeleted = churnedDeletedList.length;

  const applyStartDatePreset = (preset: 'all' | 'today' | 'yesterday' | 'week' | 'month') => {
    setStartDatePreset(preset);

    const today = new Date();

    const format = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (preset === 'all') {
      setStartDateFrom('');
      setStartDateTo('');
      return;
    }

    if (preset === 'today') {
      const d = new Date(today);
      const f = format(d);
      setStartDateFrom(f);
      setStartDateTo(f);
      return;
    }

    if (preset === 'yesterday') {
      const yest = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const f = format(yest);
      setStartDateFrom(f);
      setStartDateTo(f);
      return;
    }

    if (preset === 'week') {
      const weekStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      setStartDateFrom(format(weekStart));
      setStartDateTo(format(today));
      return;
    }

    if (preset === 'month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDateFrom(format(monthStart));
      setStartDateTo(format(today));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Telegram Subscriptions</h1>
          <p className="text-sm text-gray-600 mt-1">
            Overview of all Telegram subscriptions from the telegram_subscriptions table.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div onClick={() => setKpiModal('active')} className="cursor-pointer hover:scale-[1.02] transition-transform">
          <StatCard
            title="Active subscriptions"
            value={activeSubscriptions}
            icon={Clock}
            bgColor="bg-gradient-to-br from-rose-500 to-rose-600"
            iconColor="text-rose-500"
          />
        </div>
        <div onClick={() => setKpiModal('signed')} className="cursor-pointer hover:scale-[1.02] transition-transform">
          <StatCard
            title="Telegram signed"
            value={signedCount}
            icon={CheckCircle}
            bgColor="bg-gradient-to-br from-emerald-500 to-emerald-600"
            iconColor="text-emerald-500"
          />
        </div>
        <div onClick={() => setKpiModal('paid-intimate')} className="cursor-pointer hover:scale-[1.02] transition-transform">
          <StatCard
            title="Paid (Intimate talks)"
            value={totalPaidIntimate}
            icon={Users}
            bgColor="bg-gradient-to-br from-blue-500 to-blue-600"
            iconColor="text-blue-500"
          />
        </div>
        <div onClick={() => setKpiModal('paid-not-signed')} className="cursor-pointer hover:scale-[1.02] transition-transform">
          <StatCard
            title="Paid not signed (30d)"
            value={recentPaidNotSigned}
            icon={XCircle}
            bgColor="bg-gradient-to-br from-amber-500 to-amber-600"
            iconColor="text-amber-500"
          />
        </div>
        <div onClick={() => setKpiModal('expired-unsigned')} className="cursor-pointer hover:scale-[1.02] transition-transform">
          <StatCard
            title="Expired unsigned"
            value={expiredUnsigned}
            icon={XCircle}
            bgColor="bg-gradient-to-br from-orange-500 to-orange-600"
            iconColor="text-orange-500"
          />
        </div>
        <div onClick={() => setKpiModal('deleted')} className="cursor-pointer hover:scale-[1.02] transition-transform">
          <StatCard
            title="Deleted (not re-subscribed)"
            value={churnedDeleted}
            icon={XCircle}
            bgColor="bg-gradient-to-br from-slate-500 to-slate-600"
            iconColor="text-slate-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, username, or phone..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search in</label>
              <select
                value={searchField}
                onChange={(e) =>
                  setSearchField(e.target.value as 'all' | 'customer' | 'username' | 'phone')
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
              >
                <option value="all">All fields</option>
                <option value="customer">Customer name</option>
                <option value="username">Telegram username</option>
                <option value="phone">Phone</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
              >
                {uniquePlans.map((plan) => (
                  <option key={plan} value={plan}>
                    {plan === 'all' ? 'All Plans' : plan}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="expiring-soon">Expiring soon</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Signed</label>
              <select
                value={signedFilter}
                onChange={(e) => setSignedFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
              >
                <option value="all">All</option>
                <option value="signed">Signed</option>
                <option value="not-signed">Not signed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date from</label>
              <input
                type="date"
                value={startDateFrom}
                onChange={(e) => setStartDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date to</label>
              <input
                type="date"
                value={startDateTo}
                onChange={(e) => setStartDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quick range</label>
              <select
                value={startDatePreset}
                onChange={(e) =>
                  applyStartDatePreset(
                    e.target.value as 'all' | 'today' | 'yesterday' | 'week' | 'month'
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
              >
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Subscriptions</h2>
          </div>
          {activeTableTab === 'subscriptions' ? (
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>
                {totalCount} total, page {currentPage} of {totalPages}
              </span>
              <label className="flex items-center gap-1">
                <span className="hidden sm:inline">Rows per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>
          ) : (
            <span className="text-sm text-gray-500">{visiblePaidNotSignedCount} paid not signed</span>
          )}
        </div>
        <div className="mb-4 flex gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTableTab('subscriptions')}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTableTab === 'subscriptions'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Signed & Active
          </button>
          <button
            type="button"
            onClick={() => setActiveTableTab('paid-not-signed')}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTableTab === 'paid-not-signed'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Paid but never signed ({visiblePaidNotSignedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTableTab('deleted')}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTableTab === 'deleted'
                ? 'border-slate-500 text-slate-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Deleted users ({deletedSubs.length})
          </button>
        </div>
        <div>
          {isLoading && (
            <div className="py-10 text-center text-gray-500 text-sm">
              Loading telegram subscriptions...
            </div>
          )}
          {!isLoading && error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
          {!isLoading && !error && activeTableTab === 'subscriptions' && (
            <>
              {totalCount === 0 ? (
                <div className="py-10 text-center text-gray-500 text-sm">
                  No subscriptions found. Try adjusting your filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Start date</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Customer</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Telegram</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Plan</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Expiry</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Signed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedSubscriptions.map((sub) => {
                        const daysRemaining = calculateDaysRemaining(sub.expiry_date);
                        const status = getSubscriptionStatus(daysRemaining);

                        const statusStyles: Record<string, string> = {
                          active: 'bg-green-100 text-green-700',
                          'expiring-soon': 'bg-amber-100 text-amber-700',
                          expired: 'bg-red-100 text-red-700',
                        };

                        const StatusIcon =
                          status === 'active' ? CheckCircle : status === 'expired' ? XCircle : Clock;

                        return (
                          <tr
                            key={sub.id}
                            onClick={() => setSelectedSubscription(sub)}
                            className={`hover:bg-gray-50 cursor-pointer ${
                              selectedSubscription?.id === sub.id ? 'bg-rose-50' : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="text-gray-900">
                                {new Date(sub.start_date).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{sub.customer_name}</div>
                              {sub.phone_number && (
                                <div className="text-gray-500">
                                  {formatPhoneNumber(sub.phone_number)}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-gray-900">@{sub.telegram_username}</div>
                              <div className="text-gray-500 text-xs">ID: {sub.telegram_user_id}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-gray-900">{sub.plan_name}</div>
                              <div className="text-gray-500 text-xs">{sub.plan_duration}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-gray-900">
                                {new Date(sub.expiry_date).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </div>
                              <div
                                className={`text-xs font-medium ${
                                  status === 'active'
                                    ? 'text-emerald-600'
                                    : status === 'expiring-soon'
                                    ? 'text-amber-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {daysRemaining > 0
                                  ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`
                                  : 'Expired'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[status]}`}
                              >
                                <StatusIcon className="w-3.5 h-3.5" />
                                <span>
                                  {status === 'active'
                                    ? 'Active'
                                    : status === 'expiring-soon'
                                    ? 'Expiring soon'
                                    : 'Expired'}
                                </span>
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {sub.signed ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Signed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                                  <XCircle className="w-3.5 h-3.5" />
                                  Not signed
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
          {!isLoading && !error && activeTableTab === 'paid-not-signed' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">
                  Showing {visiblePaidNotSignedCount} of {paidNotSignedAll} paid not signed
                </span>
                <select
                  value={paidNotSignedRange}
                  onChange={(e) =>
                    setPaidNotSignedRange(e.target.value as 'all' | '7days' | '30days')
                  }
                  className="px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                >
                  <option value="all">All time</option>
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Payment date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Phone</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Amount</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Product</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Telegram status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visiblePaidNotSignedList.map((payment, index) => {
                      const key = subscriptionKey(payment.email, payment.phone);
                      const hasSubscription = subscriptionKeys.has(key);

                      const isSelected =
                        selectedPayment &&
                        (selectedPayment.razorpay_order_id
                          ? selectedPayment.razorpay_order_id === payment.razorpay_order_id
                          : selectedPayment.email === payment.email &&
                            String(selectedPayment.phone) === String(payment.phone));

                      return (
                        <tr
                          key={
                            payment.razorpay_order_id || `${payment.email}-${payment.phone}-${index}`
                          }
                          onClick={() => setSelectedPayment(payment)}
                          className={`hover:bg-gray-50 cursor-pointer ${
                            isSelected ? 'bg-rose-50' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="text-gray-900">
                              {new Date(payment.created_at).toLocaleString('en-IN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-900">{payment.email || '-'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-900">
                              {payment.phone ? formatPhoneNumber(String(payment.phone)) : '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-900">
                              {payment.amount.toLocaleString('en-IN', {
                                style: 'currency',
                                currency: payment.currency || 'INR',
                                maximumFractionDigits: 0,
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-900">{payment.product}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                hasSubscription
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {hasSubscription ? 'In Telegram, not signed' : 'No Telegram subscription'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {!isLoading && !error && activeTableTab === 'deleted' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Deleted subscriptions (from telegram_sub_deleted)</span>
                  <span className="text-xs text-gray-500">{deletedSubs.length} users</span>
                </div>
                {deletedSubs.length === 0 ? (
                  <div className="py-6 text-center text-gray-500 text-sm">
                    No deleted users found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Phone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {deletedSubs.map((sub, idx) => (
                          <tr
                            key={`${sub.email}-${sub.phone_number}-${idx}`}
                            onClick={() => setSelectedDeletedUser(sub)}
                            className="hover:bg-gray-50 cursor-pointer"
                          >
                            <td className="px-4 py-3">
                              <div className="text-gray-900">{sub.email || '-'}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-gray-900">
                                {sub.phone_number ? formatPhoneNumber(sub.phone_number) : '-'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Auto-churned: paid &gt; 30 days ago, never signed</span>
                  <span className="text-xs text-gray-500">{stalePaidNotSignedList.length} payments</span>
                </div>
                {stalePaidNotSignedList.length === 0 ? (
                  <div className="py-6 text-center text-gray-500 text-sm">
                    No auto-churned paid-not-signed users.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Payment date</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Phone</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stalePaidNotSignedList.map((payment, idx) => (
                          <tr
                            key={payment.razorpay_order_id || `${payment.email}-${idx}`}
                            onClick={() => setSelectedPayment(payment)}
                            className="hover:bg-gray-50 cursor-pointer"
                          >
                            <td className="px-4 py-3">
                              <div className="text-gray-900">
                                {new Date(payment.created_at).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-gray-900">{payment.email || '-'}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-gray-900">
                                {payment.phone ? formatPhoneNumber(String(payment.phone)) : '-'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-gray-900">
                                {payment.amount.toLocaleString('en-IN', {
                                  style: 'currency',
                                  currency: payment.currency || 'INR',
                                  maximumFractionDigits: 0,
                                })}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 relative">
            <button
              type="button"
              onClick={() => setSelectedSubscription(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Customer</div>
                <div className="text-gray-900 font-medium">{selectedSubscription.customer_name}</div>
                {selectedSubscription.phone_number && (
                  <div className="text-gray-600">
                    {formatPhoneNumber(selectedSubscription.phone_number)}
                  </div>
                )}
                {selectedSubscription.email && (
                  <div className="text-gray-600">{selectedSubscription.email}</div>
                )}
                {selectedSubscription.location && (
                  <div className="text-gray-600">Location: {selectedSubscription.location}</div>
                )}
                {selectedSubscription.gender && (
                  <div className="text-gray-600">Gender: {selectedSubscription.gender}</div>
                )}
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Telegram</div>
                <div className="text-gray-900">@{selectedSubscription.telegram_username}</div>
                <div className="text-gray-600 text-xs">ID: {selectedSubscription.telegram_user_id}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Plan</div>
                <div className="text-gray-900">{selectedSubscription.plan_name}</div>
                <div className="text-gray-600 text-xs">{selectedSubscription.plan_duration}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Dates</div>
                <div className="text-gray-900">
                  Start:{' '}
                  {new Date(selectedSubscription.start_date).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-gray-900">
                  Expiry:{' '}
                  {new Date(selectedSubscription.expiry_date).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-gray-600 text-xs">
                  Reminder date:{' '}
                  {new Date(selectedSubscription.reminder_date).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
              {(selectedSubscription.joinReason || selectedSubscription.problems) && (
                <div className="md:col-span-2 space-y-1">
                  {selectedSubscription.joinReason && (
                    <div>
                      <div className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">
                        Join reason
                      </div>
                      <div className="text-gray-900 whitespace-pre-line">
                        {selectedSubscription.joinReason}
                      </div>
                    </div>
                  )}
                  {selectedSubscription.problems && (
                    <div>
                      <div className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">
                        Problems
                      </div>
                      <div className="text-gray-900 whitespace-pre-line">
                        {selectedSubscription.problems}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="md:col-span-2">
                <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Agreements</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {selectedSubscription.privacyAgreement && (
                    <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      Privacy
                    </span>
                  )}
                  {selectedSubscription.participationAgreement && (
                    <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      Participation
                    </span>
                  )}
                  {selectedSubscription.respectAgreement && (
                    <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      Respect
                    </span>
                  )}
                  {selectedSubscription.contentAgreement && (
                    <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      Content
                    </span>
                  )}
                  {selectedSubscription.nonJudgmentalAgreement && (
                    <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      Non-judgmental
                    </span>
                  )}
                  {selectedSubscription.sensitiveTopicsAgreement && (
                    <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      Sensitive topics
                    </span>
                  )}
                  {selectedSubscription.anonymityAgreement && (
                    <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      Anonymity
                    </span>
                  )}
                  {selectedSubscription.explicitLanguageAgreement && (
                    <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      Explicit language
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
                <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Payer</div>
                {selectedPayment.email && (
                  <div className="text-gray-900 font-medium">{selectedPayment.email}</div>
                )}
                {selectedPayment.phone && (
                  <div className="text-gray-600">
                    {formatPhoneNumber(String(selectedPayment.phone))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Payment</div>
                <div className="text-gray-900">
                  {new Date(selectedPayment.created_at).toLocaleString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="text-gray-900">
                  {selectedPayment.amount.toLocaleString('en-IN', {
                    style: 'currency',
                    currency: selectedPayment.currency || 'INR',
                    maximumFractionDigits: 0,
                  })}{' '}
                  ({selectedPayment.product})
                </div>
                {selectedPayment.razorpay_order_id && (
                  <div className="text-gray-600 text-xs mt-1">
                    Order ID: {selectedPayment.razorpay_order_id}
                  </div>
                )}
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Form & Telegram status</div>
                {(() => {
                  const key = subscriptionKey(selectedPayment.email, selectedPayment.phone);
                  const hasForm = formAgreementKeys.has(key);
                  const inSubs = subscriptionKeys.has(key);
                  const inDeleted = deletedKeys.has(key);

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500 uppercase tracking-wide">Form:</span>
                        {hasForm ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                            Signed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">
                            Not signed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500 uppercase tracking-wide">Telegram:</span>
                        {inSubs ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                            In subscriptions
                          </span>
                        ) : inDeleted ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 font-medium">
                            Deleted
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                            Not in Telegram tables
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedDeletedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
            <button
              type="button"
              onClick={() => setSelectedDeletedUser(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Deleted user details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Email</div>
                <div className="text-gray-900">{selectedDeletedUser.email || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Phone</div>
                <div className="text-gray-900">
                  {selectedDeletedUser.phone_number
                    ? formatPhoneNumber(selectedDeletedUser.phone_number)
                    : '-'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {kpiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col relative">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {kpiModal === 'active' && `Active subscriptions (${activeSubscriptions})`}
                {kpiModal === 'signed' && `Telegram signed (${signedCount})`}
                {kpiModal === 'paid-intimate' && `Paid Intimate talks (${totalPaidIntimate})`}
                {kpiModal === 'paid-not-signed' && `Paid not signed - last 30 days (${recentPaidNotSigned})`}
                {kpiModal === 'expired-unsigned' && `Expired unsigned (${expiredUnsigned})`}
                {kpiModal === 'deleted' && `Deleted not re-subscribed (${churnedDeleted})`}
              </h3>
              <button
                type="button"
                onClick={() => setKpiModal(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="overflow-auto flex-1 p-4">
              {(kpiModal === 'active' ||
                kpiModal === 'signed' ||
                kpiModal === 'expired-unsigned') && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Customer</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Telegram</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Plan</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Expiry</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Signed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(kpiModal === 'active'
                      ? activeList
                      : kpiModal === 'signed'
                      ? signedList
                      : expiredUnsignedList
                    ).map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{sub.customer_name}</div>
                          {sub.email && <div className="text-gray-500 text-xs">{sub.email}</div>}
                          {sub.phone_number && <div className="text-gray-500 text-xs">{formatPhoneNumber(sub.phone_number)}</div>}
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-gray-900">@{sub.telegram_username}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-gray-900">{sub.plan_name}</div>
                          <div className="text-gray-500 text-xs">{sub.plan_duration}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-gray-900">
                            {new Date(sub.expiry_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {sub.signed ? (
                            <span className="text-green-600 text-xs font-medium">Yes</span>
                          ) : (
                            <span className="text-gray-400 text-xs">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {(kpiModal === 'paid-intimate' || kpiModal === 'paid-not-signed') && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Date</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Email</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Phone</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Amount</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Product</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Form signed</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Telegram status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(kpiModal === 'paid-intimate' ? intimatePayments : recentPaidNotSignedList).map((payment, idx) => {
                      const key = subscriptionKey(payment.email, payment.phone);
                      const hasForm = formAgreementKeys.has(key);
                      const inSubs = subscriptionKeys.has(key);
                      const inDeleted = deletedKeys.has(key);

                      let telegramStatus = 'None';
                      if (inSubs) telegramStatus = 'Active table';
                      else if (inDeleted) telegramStatus = 'Deleted';

                      return (
                        <tr
                          key={payment.razorpay_order_id || `${payment.email}-${idx}`}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-3 py-2">
                            <div className="text-gray-900">
                              {new Date(payment.created_at).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-gray-900">{payment.email || '-'}</div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-gray-900">
                              {payment.phone ? formatPhoneNumber(String(payment.phone)) : '-'}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-gray-900">
                              {payment.amount.toLocaleString('en-IN', {
                                style: 'currency',
                                currency: payment.currency || 'INR',
                                maximumFractionDigits: 0,
                              })}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-gray-900">{payment.product}</div>
                          </td>
                          <td className="px-3 py-2">
                            {hasForm ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-medium">
                                No
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {telegramStatus === 'Active table' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                                In subscriptions
                              </span>
                            )}
                            {telegramStatus === 'Deleted' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 text-xs font-medium">
                                Deleted
                              </span>
                            )}
                            {telegramStatus === 'None' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                                Not in Telegram tables
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {kpiModal === 'deleted' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Email</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {churnedDeletedList.map((sub, idx) => (
                      <tr key={`${sub.email}-${sub.phone_number}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="text-gray-900">{sub.email || '-'}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-gray-900">{sub.phone_number ? formatPhoneNumber(sub.phone_number) : '-'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {filteredSubscriptions.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalCount}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  );
}

export default TelegramSubscriptionsPage;
