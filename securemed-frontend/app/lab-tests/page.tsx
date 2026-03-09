'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes';
import {
    Activity,
    ArrowRight,
    CheckCircle2,
    FlaskConical,
    Loader2,
    Minus,
    Plus,
    Search,
    ShoppingCart,
    Trash2,
    X,
} from 'lucide-react';

type LabTest = {
    id: number;
    name: string;
    code: string;
    category: string;
    description: string;
    turnaround_time: string;
};

function loginHref(nextPath: string) {
    return `/login?next=${encodeURIComponent(nextPath)}`;
}

export default function LabTestsPage() {
    const router = useRouter();
    const { isAuthenticated, user } = useAuth();

    const [tests, setTests] = useState<LabTest[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Cart for lab order
    const [cart, setCart] = useState<LabTest[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
    const [orderError, setOrderError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTests = async () => {
            try {
                const response = await api.get('/labs/tests/');
                const payload = Array.isArray(response.data) ? response.data : response.data?.results ?? [];
                setTests(payload);
                setError(null);
            } catch (fetchError) {
                console.error('Failed to fetch lab tests', fetchError);
                setError('Unable to load the lab test catalog right now.');
            } finally {
                setLoading(false);
            }
        };

        fetchTests();
    }, []);

    const filteredTests = useMemo(() => {
        if (!query.trim()) return tests;
        const normalized = query.trim().toLowerCase();
        return tests.filter((test) =>
            test.name.toLowerCase().includes(normalized)
            || test.code.toLowerCase().includes(normalized)
            || test.category.toLowerCase().includes(normalized),
        );
    }, [query, tests]);

    const addToCart = (test: LabTest) => {
        if (!cart.find(t => t.id === test.id)) {
            setCart(prev => [...prev, test]);
        }
    };

    const removeFromCart = (testId: number) => {
        setCart(prev => prev.filter(t => t.id !== testId));
    };

    const inCart = (testId: number) => cart.some(t => t.id === testId);

    const handlePlaceOrder = async () => {
        if (!isAuthenticated) {
            // Redirect to login with return path
            router.push(loginHref(ROUTES.LAB_TESTS));
            return;
        }

        if (cart.length === 0) return;
        setSubmitting(true);
        setOrderError(null);

        try {
            // Patient self-order: the backend perform_create populates the patient
            // from the logged-in user if they have a patient_profile.
            // For patients, patient_id is their own patient profile ID.
            const patientId = user && 'patient_id' in user ? (user as any).patient_id : undefined;

            const res = await api.post('/labs/orders/', {
                items: cart.map(t => t.id),
                priority: 'routine',
                ...(patientId ? { patient_id: patientId } : {}),
            });

            setOrderSuccess(res.data?.sample_id || res.data?.id?.toString() || 'submitted');
            setCart([]);
            setShowCart(false);
        } catch (err: any) {
            const msg = err.response?.data?.detail
                || err.response?.data?.error
                || err.response?.data?.patient_id?.[0]
                || 'Failed to place order. Please try again.';
            setOrderError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-8">

                {/* Header */}
                <section className="rounded-3xl border border-border/60 bg-card p-8 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                                <FlaskConical className="h-4 w-4" />
                                Lab Test Catalog
                            </div>
                            <h1 className="mt-4 text-4xl font-black tracking-tight text-foreground">
                                Browse and order lab tests
                            </h1>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                Select the tests you need, add them to your order, and submit. Your order goes directly to the lab for processing.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Cart toggle */}
                            <Button
                                variant={showCart ? 'default' : 'outline'}
                                onClick={() => setShowCart(prev => !prev)}
                                className="relative"
                            >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Order ({cart.length})
                                {cart.length > 0 && (
                                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                        {cart.length}
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Order success banner */}
                {orderSuccess && (
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-6 flex items-center gap-4">
                        <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
                        <div>
                            <h3 className="font-bold text-foreground">Lab order submitted</h3>
                            <p className="text-sm text-muted-foreground">
                                Your order has been submitted and is pending sample collection. Check your patient portal for status updates.
                            </p>
                        </div>
                        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setOrderSuccess(null)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Cart panel */}
                {showCart && (
                    <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
                        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                            Your Lab Order
                        </h2>
                        {cart.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No tests selected yet. Browse the catalog below and click &ldquo;Add to Order&rdquo;.</p>
                        ) : (
                            <div className="space-y-3">
                                {cart.map(test => (
                                    <div key={test.id} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                                        <div>
                                            <p className="font-semibold text-foreground text-sm">{test.name}</p>
                                            <p className="text-xs text-muted-foreground">{test.code} · {test.category}</p>
                                        </div>
                                        <Button size="sm" variant="ghost" onClick={() => removeFromCart(test.id)} className="text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {orderError && (
                                    <p className="text-sm text-destructive">{orderError}</p>
                                )}
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button variant="outline" onClick={() => setCart([])}>Clear All</Button>
                                    <Button onClick={handlePlaceOrder} disabled={submitting}>
                                        {submitting ? (
                                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Placing Order...</>
                                        ) : (
                                            <>{isAuthenticated ? 'Place Order' : 'Login to Place Order'} <ArrowRight className="h-4 w-4 ml-2" /></>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* Search + catalog */}
                <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search by test name, code, or category"
                            className="w-full rounded-2xl border border-border bg-background py-3 pl-11 pr-4 text-sm outline-none transition-colors focus:border-primary"
                        />
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Loading lab catalog...
                        </div>
                    ) : error ? (
                        <div className="py-12 text-center text-sm text-destructive">{error}</div>
                    ) : (
                        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {filteredTests.map((test) => (
                                <article key={test.id} className="rounded-2xl border border-border/60 bg-background p-5 shadow-sm flex flex-col">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{test.category}</p>
                                            <h2 className="mt-2 text-lg font-bold text-foreground">{test.name}</h2>
                                        </div>
                                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">{test.code}</span>
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-muted-foreground flex-1">
                                        {test.description || 'Laboratory test available through the SecureMed diagnostics workflow.'}
                                    </p>
                                    <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-sm">
                                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                                            <Activity className="h-4 w-4" />
                                            Turnaround
                                        </span>
                                        <span className="font-semibold text-foreground">{test.turnaround_time}</span>
                                    </div>
                                    <div className="mt-3">
                                        {inCart(test.id) ? (
                                            <Button size="sm" variant="outline" className="w-full text-destructive border-destructive/30" onClick={() => removeFromCart(test.id)}>
                                                <Minus className="h-4 w-4 mr-1" />
                                                Remove
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="outline" className="w-full" onClick={() => addToCart(test)}>
                                                <Plus className="h-4 w-4 mr-1" />
                                                Add to Order
                                            </Button>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    {!loading && !error && filteredTests.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">No tests match your search.</div>
                    ) : null}
                </section>
            </div>
        </main>
    );
}
