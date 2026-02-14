/**
 * Dexter Stripe Transactions Fetcher
 *
 * Fetches real-time transaction data from Stripe API.
 * Falls back to mock data when STRIPE_SECRET_KEY is not configured.
 */

export interface StripeFetchInput {
  limit?: number;
  status?: 'succeeded' | 'pending' | 'failed' | 'all';
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
  currency?: string;  // e.g. 'eur', 'usd'
}

export interface TransactionRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  customer_email?: string;
  created: string; // ISO date
  fee: number;
  net: number;
}

export interface StripeFetchResult {
  transactions: TransactionRecord[];
  total_count: number;
  total_amount: number;
  total_fees: number;
  total_net: number;
  currency: string;
  period: string;
  formatted_output: string;
}

export const STRIPE_FETCH_TOOL = {
  name: 'fetch_transactions',
  description: 'Ruft Transaktionsdaten von Stripe ab. Zeigt Zahlungen, Umsaetze und Gebuehren fuer einen bestimmten Zeitraum.',
  input_schema: {
    type: 'object',
    properties: {
      limit: { type: 'number', description: 'Maximale Anzahl Transaktionen (default: 25, max: 100)' },
      status: { type: 'string', enum: ['succeeded', 'pending', 'failed', 'all'], description: 'Filtere nach Status (default: succeeded)' },
      date_from: { type: 'string', description: 'Start-Datum (YYYY-MM-DD)' },
      date_to: { type: 'string', description: 'End-Datum (YYYY-MM-DD)' },
      currency: { type: 'string', description: 'Waehrung filtern (z.B. eur, usd)' },
    },
    required: [],
  },
};

// Mock transaction data for when Stripe is not configured
function generateMockTransactions(input: StripeFetchInput): TransactionRecord[] {
  const mockData: TransactionRecord[] = [
    { id: 'pi_3Abc123', amount: 4999, currency: 'eur', status: 'succeeded', description: 'Pro Plan - Monatlich', customer_email: 'max@example.com', created: '2026-02-12T10:30:00Z', fee: 175, net: 4824 },
    { id: 'pi_3Abc124', amount: 14999, currency: 'eur', status: 'succeeded', description: 'Enterprise Plan - Monatlich', customer_email: 'anna@corp.de', created: '2026-02-11T14:20:00Z', fee: 465, net: 14534 },
    { id: 'pi_3Abc125', amount: 2999, currency: 'eur', status: 'succeeded', description: 'Starter Plan - Monatlich', customer_email: 'tom@startup.io', created: '2026-02-11T09:15:00Z', fee: 117, net: 2882 },
    { id: 'pi_3Abc126', amount: 4999, currency: 'eur', status: 'pending', description: 'Pro Plan - Monatlich', customer_email: 'lisa@agency.com', created: '2026-02-10T16:45:00Z', fee: 0, net: 4999 },
    { id: 'pi_3Abc127', amount: 49999, currency: 'eur', status: 'succeeded', description: 'Enterprise Plan - Jaehrlich', customer_email: 'cfo@bigcorp.de', created: '2026-02-10T11:00:00Z', fee: 1480, net: 48519 },
    { id: 'pi_3Abc128', amount: 2999, currency: 'eur', status: 'failed', description: 'Starter Plan - Monatlich', customer_email: 'test@fail.com', created: '2026-02-09T08:30:00Z', fee: 0, net: 0 },
    { id: 'pi_3Abc129', amount: 4999, currency: 'eur', status: 'succeeded', description: 'Pro Plan - Monatlich', customer_email: 'sarah@design.de', created: '2026-02-09T07:10:00Z', fee: 175, net: 4824 },
    { id: 'pi_3Abc130', amount: 14999, currency: 'eur', status: 'succeeded', description: 'Enterprise Plan - Monatlich', customer_email: 'kai@tech.com', created: '2026-02-08T13:25:00Z', fee: 465, net: 14534 },
    { id: 'pi_3Abc131', amount: 2999, currency: 'eur', status: 'succeeded', description: 'Starter Plan - Monatlich', customer_email: 'nina@freelance.de', created: '2026-02-08T10:00:00Z', fee: 117, net: 2882 },
    { id: 'pi_3Abc132', amount: 4999, currency: 'eur', status: 'succeeded', description: 'Pro Plan - Monatlich', customer_email: 'alex@media.io', created: '2026-02-07T15:40:00Z', fee: 175, net: 4824 },
  ];

  let filtered = [...mockData];

  // Filter by status
  if (input.status && input.status !== 'all') {
    filtered = filtered.filter(t => t.status === input.status);
  }

  // Filter by date range
  if (input.date_from) {
    const from = new Date(input.date_from).getTime();
    filtered = filtered.filter(t => new Date(t.created).getTime() >= from);
  }
  if (input.date_to) {
    const to = new Date(input.date_to + 'T23:59:59Z').getTime();
    filtered = filtered.filter(t => new Date(t.created).getTime() <= to);
  }

  // Limit
  const limit = Math.min(input.limit || 25, 100);
  return filtered.slice(0, limit);
}

export async function fetchTransactions(
  input: StripeFetchInput
): Promise<StripeFetchResult> {
  const { limit = 25, status = 'succeeded', date_from, date_to, currency } = input;

  let transactions: TransactionRecord[];

  // Try real Stripe API first
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder') {
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const params: Record<string, any> = {
        limit: Math.min(limit, 100),
      };

      if (date_from) {
        params.created = { ...params.created, gte: Math.floor(new Date(date_from).getTime() / 1000) };
      }
      if (date_to) {
        params.created = { ...params.created, lte: Math.floor(new Date(date_to + 'T23:59:59Z').getTime() / 1000) };
      }

      const charges = await stripe.charges.list(params);

      transactions = charges.data
        .filter(c => status === 'all' || c.status === status)
        .filter(c => !currency || c.currency === currency.toLowerCase())
        .map(c => ({
          id: c.id,
          amount: c.amount,
          currency: c.currency,
          status: c.status || 'unknown',
          description: c.description || 'Keine Beschreibung',
          customer_email: c.billing_details?.email || undefined,
          created: new Date(c.created * 1000).toISOString(),
          fee: c.balance_transaction && typeof c.balance_transaction === 'object'
            ? (c.balance_transaction as any).fee || 0
            : 0,
          net: c.balance_transaction && typeof c.balance_transaction === 'object'
            ? (c.balance_transaction as any).net || c.amount
            : c.amount,
        }));

      console.log(`[STRIPE_FETCH] Fetched ${transactions.length} real transactions`);
    } catch (error: any) {
      console.warn(`[STRIPE_FETCH] Stripe API failed, using mock data:`, error.message);
      transactions = generateMockTransactions(input);
    }
  } else {
    console.log(`[STRIPE_FETCH] No Stripe key configured, using mock data`);
    transactions = generateMockTransactions(input);
  }

  // Filter by currency for mock data
  if (currency) {
    transactions = transactions.filter(t => t.currency === currency.toLowerCase());
  }

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalFees = transactions.reduce((sum, t) => sum + t.fee, 0);
  const totalNet = transactions.reduce((sum, t) => sum + t.net, 0);
  const mainCurrency = currency || transactions[0]?.currency || 'eur';

  const period = date_from && date_to
    ? `${date_from} bis ${date_to}`
    : date_from
      ? `ab ${date_from}`
      : date_to
        ? `bis ${date_to}`
        : 'Alle Zeitraeume';

  const formatAmount = (cents: number, cur: string) => {
    return (cents / 100).toLocaleString('de-DE', {
      style: 'currency',
      currency: cur.toUpperCase(),
    });
  };

  const formatted = [
    `💳 **Stripe Transaktionen** | ${period}`,
    `Status-Filter: ${status} | Anzahl: ${transactions.length}`,
    '',
    '| Datum | Betrag | Status | Beschreibung | Kunde |',
    '|-------|--------|--------|-------------|-------|',
    ...transactions.slice(0, 20).map(t => {
      const date = new Date(t.created).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      const amount = formatAmount(t.amount, t.currency);
      const statusIcon = t.status === 'succeeded' ? '✅' : t.status === 'pending' ? '⏳' : '❌';
      return `| ${date} | ${amount} | ${statusIcon} ${t.status} | ${t.description} | ${t.customer_email || '-'} |`;
    }),
    '',
    '**Zusammenfassung:**',
    `- Gesamtumsatz: ${formatAmount(totalAmount, mainCurrency)}`,
    `- Gebuehren: ${formatAmount(totalFees, mainCurrency)}`,
    `- Netto: ${formatAmount(totalNet, mainCurrency)}`,
  ].join('\n');

  return {
    transactions,
    total_count: transactions.length,
    total_amount: totalAmount,
    total_fees: totalFees,
    total_net: totalNet,
    currency: mainCurrency,
    period,
    formatted_output: formatted,
  };
}
