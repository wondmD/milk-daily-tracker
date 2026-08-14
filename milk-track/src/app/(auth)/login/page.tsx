'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Droplets, Lock, User, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        username,
        password,
      });

      if (result?.error) {
        setError('Invalid username or password');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-surface p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border">
        <div>
          <div className="mx-auto h-16 w-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 transform rotate-3">
            <Droplets className="h-8 w-8 text-white -rotate-3" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Welcome Back
          </h2>
          <p className="mt-2 text-center text-sm text-muted">
            Sign in to manage milk collections and financials
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-danger-subtle text-danger p-3 rounded-xl text-sm font-medium text-center border border-danger/20">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-muted" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="appearance-none rounded-xl relative block w-full px-3 py-3 pl-10 border border-border placeholder:text-muted text-foreground focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-surface-secondary transition-colors"
                  placeholder="Username (e.g. admin)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-xl relative block w-full px-3 py-3 pl-10 border border-border placeholder:text-muted text-foreground focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-surface-secondary transition-colors"
                  placeholder="Password (e.g. admin123)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-md shadow-primary/20 disabled:opacity-70"
            >
              {isLoading ? 'Signing in...' : (
                <>
                  Sign in to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
        
        <div className="mt-8 border-t border-border pt-6">
          <p className="text-sm font-medium text-foreground mb-3">Demo Accounts Available:</p>
          <ul className="text-sm text-muted space-y-2">
            <li className="flex justify-between"><span>Admin:</span> <span className="font-mono bg-surface-secondary px-2 py-0.5 rounded text-foreground">admin / admin123</span></li>
            <li className="flex justify-between"><span>Collector:</span> <span className="font-mono bg-surface-secondary px-2 py-0.5 rounded text-foreground">collector / demo123</span></li>
            <li className="flex justify-between"><span>Distributor:</span> <span className="font-mono bg-surface-secondary px-2 py-0.5 rounded text-foreground">distributor / demo123</span></li>
            <li className="flex justify-between"><span>Accountant:</span> <span className="font-mono bg-surface-secondary px-2 py-0.5 rounded text-foreground">accountant / demo123</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
