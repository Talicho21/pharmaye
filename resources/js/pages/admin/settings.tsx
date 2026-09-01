import { Head, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, KeyRound, Shield, User } from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

import AdminLayout from '@/layouts/admin-layout';
import type { SharedData } from '@/types';

interface Props {
    status?: string;
}

export default function AdminSettings({ status }: Props) {
    const { auth } = usePage<SharedData>().props;
    const admin = auth.admin;

    const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'security'>('profile');
    const [toast, setToast] = useState<string | null>(null);

    // Show toast when status changes
    useEffect(() => {
        if (status === 'profile-updated') {
            setToast('Profile updated successfully.');
        } else if (status === 'password-updated') {
            setToast('Password changed successfully.');
        }
    }, [status]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    /* ── Profile form ── */
    const profileForm = useForm({ name: admin?.name ?? '', email: admin?.email ?? '' });
    const submitProfile: FormEventHandler = (e) => {
        e.preventDefault();
        profileForm.patch(route('admin.settings.profile'), { preserveScroll: true });
    };

    /* ── Password form ── */
    const currentPasswordRef = useRef<HTMLInputElement>(null);
    const newPasswordRef = useRef<HTMLInputElement>(null);
    const passwordForm = useForm({ current_password: '', password: '', password_confirmation: '' });
    const submitPassword: FormEventHandler = (e) => {
        e.preventDefault();
        passwordForm.put(route('admin.settings.password'), {
            preserveScroll: true,
            onSuccess: () => passwordForm.reset(),
            onError: (errs) => {
                if (errs.password) {
                    passwordForm.reset('password', 'password_confirmation');
                    newPasswordRef.current?.focus();
                }
                if (errs.current_password) {
                    passwordForm.reset('current_password');
                    currentPasswordRef.current?.focus();
                }
            },
        });
    };

    const tabs = [
        { key: 'profile' as const, label: 'Profile', icon: User },
        { key: 'password' as const, label: 'Password', icon: KeyRound },
        { key: 'security' as const, label: 'Security', icon: Shield },
    ];

    return (
        <AdminLayout title="Settings">
            <Head title="Platform settings" />

            {/* ── Toast ── */}
            {toast && (
                <div className="fixed right-6 bottom-6 z-50 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4 shadow-xl transition-all">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                    <p className="text-sm font-semibold text-green-800">{toast}</p>
                </div>
            )}

            <div className="max-w-3xl space-y-6">
                {/* ── Admin identity card ── */}
                <div className="flex items-center gap-4 rounded-2xl border border-border-gray bg-pure-white p-5 shadow-sm">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-blue text-xl font-black text-white shadow">
                        {admin?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-base font-bold text-dark-charcoal">{admin?.name}</p>
                        <p className="text-sm text-dark-charcoal/60">{admin?.email}</p>
                        <span className="mt-1 inline-block rounded-full bg-primary-blue/10 px-2.5 py-0.5 text-[10px] font-black tracking-widest text-primary-blue uppercase">
                            Super Admin
                        </span>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className="rounded-2xl border border-border-gray bg-pure-white shadow-sm">
                    {/* Tab headers */}
                    <div className="flex border-b border-border-gray">
                        {tabs.map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setActiveTab(key)}
                                className={`flex flex-1 items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors ${
                                    activeTab === key
                                        ? 'border-b-2 border-primary-blue text-primary-blue'
                                        : 'text-dark-charcoal/50 hover:text-dark-charcoal'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        {/* ── Profile Tab ── */}
                        {activeTab === 'profile' && (
                            <form onSubmit={submitProfile} className="space-y-5">
                                <div>
                                    <h2 className="text-base font-bold text-dark-charcoal">Profile information</h2>
                                    <p className="mt-0.5 text-sm text-dark-charcoal/60">Update your name and email address.</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-dark-charcoal">
                                            Full name
                                        </label>
                                        <input
                                            id="name"
                                            type="text"
                                            value={profileForm.data.name}
                                            onChange={(e) => profileForm.setData('name', e.target.value)}
                                            className="w-full rounded-lg border border-border-gray px-3.5 py-2.5 text-sm text-dark-charcoal shadow-sm outline-none transition focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20"
                                            required
                                            autoComplete="name"
                                        />
                                        {profileForm.errors.name && (
                                            <p className="mt-1 text-xs text-red-600">{profileForm.errors.name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-dark-charcoal">
                                            Email address
                                        </label>
                                        <input
                                            id="email"
                                            type="email"
                                            value={profileForm.data.email}
                                            onChange={(e) => profileForm.setData('email', e.target.value)}
                                            className="w-full rounded-lg border border-border-gray px-3.5 py-2.5 text-sm text-dark-charcoal shadow-sm outline-none transition focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20"
                                            required
                                            autoComplete="email"
                                        />
                                        {profileForm.errors.email && (
                                            <p className="mt-1 text-xs text-red-600">{profileForm.errors.email}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-1">
                                    <button
                                        type="submit"
                                        disabled={profileForm.processing}
                                        className="rounded-lg bg-primary-blue px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-blue/90 disabled:opacity-60"
                                    >
                                        {profileForm.processing ? 'Saving…' : 'Save changes'}
                                    </button>
                                    {profileForm.recentlySuccessful && (
                                        <span className="text-sm font-medium text-green-600">Saved!</span>
                                    )}
                                </div>
                            </form>
                        )}

                        {/* ── Password Tab ── */}
                        {activeTab === 'password' && (
                            <form onSubmit={submitPassword} className="space-y-5">
                                <div>
                                    <h2 className="text-base font-bold text-dark-charcoal">Change password</h2>
                                    <p className="mt-0.5 text-sm text-dark-charcoal/60">Use a long, random password to keep your account secure.</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="current_password" className="mb-1.5 block text-sm font-semibold text-dark-charcoal">
                                            Current password
                                        </label>
                                        <input
                                            id="current_password"
                                            ref={currentPasswordRef}
                                            type="password"
                                            value={passwordForm.data.current_password}
                                            onChange={(e) => passwordForm.setData('current_password', e.target.value)}
                                            className="w-full rounded-lg border border-border-gray px-3.5 py-2.5 text-sm text-dark-charcoal shadow-sm outline-none transition focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20"
                                            autoComplete="current-password"
                                        />
                                        {passwordForm.errors.current_password && (
                                            <p className="mt-1 text-xs text-red-600">{passwordForm.errors.current_password}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="new_password" className="mb-1.5 block text-sm font-semibold text-dark-charcoal">
                                            New password
                                        </label>
                                        <input
                                            id="new_password"
                                            ref={newPasswordRef}
                                            type="password"
                                            value={passwordForm.data.password}
                                            onChange={(e) => passwordForm.setData('password', e.target.value)}
                                            className="w-full rounded-lg border border-border-gray px-3.5 py-2.5 text-sm text-dark-charcoal shadow-sm outline-none transition focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20"
                                            autoComplete="new-password"
                                        />
                                        {passwordForm.errors.password && (
                                            <p className="mt-1 text-xs text-red-600">{passwordForm.errors.password}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="password_confirmation" className="mb-1.5 block text-sm font-semibold text-dark-charcoal">
                                            Confirm new password
                                        </label>
                                        <input
                                            id="password_confirmation"
                                            type="password"
                                            value={passwordForm.data.password_confirmation}
                                            onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
                                            className="w-full rounded-lg border border-border-gray px-3.5 py-2.5 text-sm text-dark-charcoal shadow-sm outline-none transition focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20"
                                            autoComplete="new-password"
                                        />
                                        {passwordForm.errors.password_confirmation && (
                                            <p className="mt-1 text-xs text-red-600">{passwordForm.errors.password_confirmation}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-1">
                                    <button
                                        type="submit"
                                        disabled={passwordForm.processing}
                                        className="rounded-lg bg-primary-blue px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-blue/90 disabled:opacity-60"
                                    >
                                        {passwordForm.processing ? 'Updating…' : 'Update password'}
                                    </button>
                                    {passwordForm.recentlySuccessful && (
                                        <span className="text-sm font-medium text-green-600">Updated!</span>
                                    )}
                                </div>
                            </form>
                        )}

                        {/* ── Security Tab ── */}
                        {activeTab === 'security' && (
                            <div className="space-y-5">
                                <div>
                                    <h2 className="text-base font-bold text-dark-charcoal">Security information</h2>
                                    <p className="mt-0.5 text-sm text-dark-charcoal/60">Your account security status and access details.</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between rounded-xl border border-border-gray p-4">
                                        <div>
                                            <p className="text-sm font-semibold text-dark-charcoal">Account role</p>
                                            <p className="text-xs text-dark-charcoal/60">Highest privilege level on this platform</p>
                                        </div>
                                        <span className="rounded-full bg-primary-blue/10 px-3 py-1 text-xs font-black tracking-widest text-primary-blue uppercase">
                                            Super Admin
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between rounded-xl border border-border-gray p-4">
                                        <div>
                                            <p className="text-sm font-semibold text-dark-charcoal">Authentication guard</p>
                                            <p className="text-xs text-dark-charcoal/60">Separate from store user accounts</p>
                                        </div>
                                        <span className="rounded-full bg-grass-green/10 px-3 py-1 text-xs font-bold text-grass-green">
                                            admin guard
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between rounded-xl border border-border-gray p-4">
                                        <div>
                                            <p className="text-sm font-semibold text-dark-charcoal">Registration</p>
                                            <p className="text-xs text-dark-charcoal/60">New admin accounts require direct DB or seeder access</p>
                                        </div>
                                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                                            Restricted
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
