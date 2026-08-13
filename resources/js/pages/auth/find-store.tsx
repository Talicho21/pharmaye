import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, Store } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

interface FindStoreProps {
    prefillCode: string | null;
}

export default function FindStore({ prefillCode }: FindStoreProps) {
    const { data, setData, post, processing, errors } = useForm({
        code: prefillCode ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('store.select'));
    };

    return (
        <AuthLayout title="Find your pharmacy" description="Enter your store code to continue to your pharmacy's sign-in page">
            <Head title="Find your store" />

            <form className="flex flex-col gap-6" onSubmit={submit}>
                <div className="grid gap-2">
                    <Label htmlFor="code">Store code</Label>
                    <div className="relative">
                        <Store className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                            id="code"
                            type="text"
                            required
                            autoFocus
                            autoComplete="off"
                            autoCapitalize="none"
                            className="pl-9"
                            value={data.code}
                            onChange={(e) => setData('code', e.target.value)}
                            placeholder="e.g. hawan-drug-store"
                        />
                    </div>
                    <InputError message={errors.code} />
                </div>

                <Button type="submit" className="w-full" disabled={processing}>
                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    Continue
                </Button>

                <p className="text-muted-foreground text-center text-sm">Don't know your store code? Ask your pharmacy administrator.</p>
            </form>
        </AuthLayout>
    );
}
