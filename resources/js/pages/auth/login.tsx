import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, LoaderCircle, LogOut, Mail, Phone, Store } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { SharedData } from '@/types';

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const { store } = usePage<SharedData>().props;

    const { data, setData, post, processing, errors, reset } = useForm<LoginForm & { suspended?: string }>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    const storeName = store?.name ?? 'Your Store';

    // When the backend signals STORE_SUSPENDED, replace the entire form with
    // the suspended card — same design as /store-suspended.
    if (errors.suspended === 'STORE_SUSPENDED') {
        return (
            <AuthLayout title="" description="">
                <Head title="Store Suspended" />

                <div className="w-full">
                    {/* Icon */}
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                        <AlertTriangle className="h-8 w-8 text-red-600" aria-hidden="true" />
                    </div>

                    {/* Heading */}
                    <h1 className="text-center text-2xl font-black tracking-tight">
                        Store Suspended
                    </h1>

                    <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
                        Access to <span className="font-semibold text-foreground">{storeName}</span> has
                        been temporarily suspended. Please contact support to resolve this.
                    </p>

                    {/* Divider */}
                    <div className="my-6 border-t" />

                    {/* Support contact */}
                    <div className="rounded-xl bg-muted/50 px-5 py-4">
                        <p className="mb-3 text-xs font-black tracking-widest text-muted-foreground uppercase">
                            Need help?
                        </p>
                        <div className="space-y-2">
                            <a
                                href="mailto:yonatanshitaye@gmail.com"
                                className="flex items-center gap-3 text-sm font-semibold text-primary hover:underline"
                            >
                                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                                yonatanshitaye@gmail.com
                            </a>
                            {store?.phone && (
                                <a
                                    href={`tel:${store.phone}`}
                                    className="flex items-center gap-3 text-sm font-semibold text-primary hover:underline"
                                >
                                    <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                                    {store.phone}
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="my-6 border-t" />

                    {/* Back to login */}
                    <button
                        type="button"
                        onClick={() => router.get(route('login'))}
                        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-all duration-200 hover:opacity-90 hover:shadow-md active:scale-95"
                    >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Back to login
                    </button>

                    <p className="mt-4 text-center text-xs text-muted-foreground">
                        Once your account is reinstated, try logging in again.
                    </p>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title={store ? `Sign in to ${store.name}` : 'Log in to your account'} description="Enter your email and password below to log in">
            <Head title="Log in" />

            {store && (
                <div className="flex items-center justify-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
                    {store.logo_url ? (
                        <img src={store.logo_url} alt={`${store.name} logo`} className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                            <Store className="h-5 w-5 text-primary" />
                        </div>
                    )}
                    <div className="text-left">
                        <p className="text-sm font-semibold">{store.name}</p>
                        <Link href={route('store.find')} className="text-muted-foreground text-xs underline underline-offset-2">
                            Not your pharmacy? Switch store
                        </Link>
                    </div>
                </div>
            )}

            <form className="flex flex-col gap-6" onSubmit={submit}>
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="email@example.com"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="password">Password</Label>
                            {canResetPassword && (
                                <TextLink href={route('password.request')} className="ml-auto text-sm" tabIndex={5}>
                                    Forgot password?
                                </TextLink>
                            )}
                        </div>
                        <Input
                            id="password"
                            type="password"
                            required
                            tabIndex={2}
                            autoComplete="current-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Password"
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="flex items-center space-x-3">
                        <Checkbox id="remember" name="remember" tabIndex={3} checked={data.remember} onClick={() => setData('remember', !data.remember)} />
                        <Label htmlFor="remember">Remember me</Label>
                    </div>

                    <Button type="submit" className="mt-4 w-full" tabIndex={4} disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Log in
                    </Button>
                </div>
            </form>

            {status && <div className="mb-4 text-center text-sm font-medium text-green-600">{status}</div>}
        </AuthLayout>
    );
}
