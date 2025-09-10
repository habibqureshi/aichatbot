"use client"
import { loginUser, LoginActionResponse } from '@/app/actions/auth'
import React, { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Error from '@/components/common/error'
export default function LoginPage() {
    const initialState: LoginActionResponse = { formData: { username: '', password: '' } }
    const [state, formAction, isPending] = useActionState(loginUser, initialState)
    const router = useRouter()

    useEffect(() => {
        if (state.success) {
            router.push('/dashboard')
        }
    }, [state.success, router])


    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-center">Login</h2>
                <p className="mt-2 text-sm text-center text-primary">
                    Welcome back! Please login to your account.
                </p>
            </div>
            <form className="space-y-4" action={formAction}>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Username
                    </label>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        defaultValue={state.formData?.username}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-black"
                    />
                    {state.fieldErrors?.username && <Error error={state.fieldErrors.username[0]} />}
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        defaultValue={state.formData?.password}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-black"
                    />
                    {state.fieldErrors?.password && <Error error={state.fieldErrors.password[0]} />}
                </div>

                <Button
                    disabled={isPending}
                    variant="default"
                    size="lg"
                    type="submit">
                    {isPending ? "Signing in..." : "Sign in"}
                </Button>
                {state.error && <Error error={state.error} />}
            </form>
        </div>
    )
} 