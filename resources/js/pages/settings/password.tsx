import InputError from '@/components/input-error';
import { AppShell } from '@/components/pharmacy/app-shell';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, KeyRound } from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Password settings',
        href: '/settings/password',
    },
];

interface Props {
    forced?: boolean;
    status?: string;
}

export default function Password({ forced = false, status }: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);
    const [showToast, setShowToast] = useState(false);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    // Show toast when password is successfully changed
    useEffect(() => {
        if (recentlySuccessful) {
            setShowToast(true);
        }
    }, [recentlySuccessful]);

    useEffect(() => {
        if (showToast) {
            const timer = setTimeout(() => setShowToast(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showToast]);

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <AppShell>
            <Head title="Password settings" />

            {/* ── Success Toast ── */}
            <Transition
                show={showToast}
                enter="transition ease-out duration-300"
                enterFrom="opacity-0 translate-y-4"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-4"
            >
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4 shadow-xl">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                    <p className="text-sm font-semibold text-green-800">Password changed successfully!</p>
                </div>
            </Transition>

            <SettingsLayout>
                <div className="space-y-6">
                    {/* ── Forced change banner ── */}
                    {forced && (
                        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                            <div>
                                <p className="text-sm font-bold text-amber-800">Action required — set a new password</p>
                                <p className="mt-0.5 text-xs text-amber-700">
                                    Your password was reset by an administrator. Please choose a new password to continue
                                    accessing the system.
                                </p>
                            </div>
                        </div>
                    )}

                    <HeadingSmall
                        title={forced ? 'Set your new password' : 'Update password'}
                        description={
                            forced
                                ? 'Choose a secure password. You will be redirected to the dashboard after saving.'
                                : 'Ensure your account is using a long, random password to stay secure'
                        }
                    />

                    <form onSubmit={updatePassword} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="current_password">
                                {forced ? 'Temporary password (from the admin)' : 'Current password'}
                            </Label>

                            <Input
                                id="current_password"
                                ref={currentPasswordInput}
                                value={data.current_password}
                                onChange={(e) => setData('current_password', e.target.value)}
                                type="password"
                                className="mt-1 block w-full"
                                autoComplete="current-password"
                                placeholder={forced ? 'Enter the temporary password' : 'Current password'}
                            />

                            <InputError message={errors.current_password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">New password</Label>

                            <Input
                                id="password"
                                ref={passwordInput}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                type="password"
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                                placeholder="New password"
                            />

                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">Confirm password</Label>

                            <Input
                                id="password_confirmation"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                type="password"
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                                placeholder="Confirm password"
                            />

                            <InputError message={errors.password_confirmation} />
                        </div>

                        <div className="flex items-center gap-4">
                            <Button disabled={processing} className={forced ? 'gap-2 bg-green-600 hover:bg-green-700' : ''}>
                                {forced && <KeyRound className="h-4 w-4" />}
                                {forced ? 'Set password & continue' : 'Save password'}
                            </Button>

                            {!forced && (
                                <Transition
                                    show={recentlySuccessful}
                                    enter="transition ease-in-out"
                                    enterFrom="opacity-0"
                                    leave="transition ease-in-out"
                                    leaveTo="opacity-0"
                                >
                                    <p className="text-sm text-neutral-600">Saved</p>
                                </Transition>
                            )}
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppShell>
    );
}
