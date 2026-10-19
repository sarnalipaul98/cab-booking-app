"use client";

import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-2xl font-bold text-yellow-400">
          GoCab
        </Link>

        <div className="flex items-center gap-4">
          {!isLoaded ? (
            <span className="text-sm text-slate-400">Loading...</span>
          ) : isSignedIn ? (
            <>
              <Link href="/dashboard" className="hover:text-yellow-400">
                Rider Dashboard
              </Link>
              <Link href="/driver" className="hover:text-yellow-400">
                Driver Dashboard
              </Link>
              <UserButton />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-lg border border-slate-600 px-4 py-2 hover:bg-slate-800"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-yellow-400 px-4 py-2 font-semibold text-slate-950 hover:bg-yellow-300"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-32">
        <div>
          <p className="mb-4 font-semibold uppercase tracking-widest text-yellow-400">
            Your journey, your way
          </p>

          <h1 className="text-5xl font-extrabold leading-tight md:text-7xl">
            Your ride.
            <br />
            Your time.
            <br />
            <span className="text-yellow-400">Go anywhere.</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            Book your ride in a few simple steps. Travel comfortably,
            track your ride status, and manage your trips in one place.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            {!isLoaded ? null : isSignedIn ? (
              <>
                <Link
                  href="/book-ride"
                  className="rounded-xl bg-yellow-400 px-6 py-4 font-bold text-slate-950 hover:bg-yellow-300"
                >
                  Book a Ride →
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-xl border border-slate-600 px-6 py-4 font-semibold hover:bg-slate-800"
                >
                  My Rides
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/sign-up"
                  className="rounded-xl bg-yellow-400 px-6 py-4 font-bold text-slate-950 hover:bg-yellow-300"
                >
                  Get Started →
                </Link>
                <Link
                  href="/sign-in"
                  className="rounded-xl border border-slate-600 px-6 py-4 font-semibold hover:bg-slate-800"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl md:p-12">
          <div className="mb-8 flex items-center justify-between">
            <span className="text-lg font-semibold">Your next journey</span>
            <span className="rounded-full bg-green-500/15 px-3 py-1 text-sm text-green-400">
              Easy booking
            </span>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="mt-1 h-4 w-4 rounded-full bg-yellow-400" />
              <div>
                <p className="text-sm text-slate-400">PICKUP</p>
                <p className="mt-1 font-semibold">
                  Choose your pickup location
                </p>
              </div>
            </div>

            <div className="ml-[7px] h-10 border-l-2 border-dashed border-slate-600" />

            <div className="flex gap-4">
              <div className="mt-1 h-4 w-4 rounded-sm bg-white" />
              <div>
                <p className="text-sm text-slate-400">DESTINATION</p>
                <p className="mt-1 font-semibold">
                  Where would you like to go?
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-xl bg-slate-800 p-5">
            <p className="text-sm text-slate-400">Ready when you are</p>
            <p className="mt-2 text-xl font-bold">
              Your destination is one tap away.
            </p>
          </div>
        </div>
      </section>

                  <footer className="border-t border-slate-800 px-6 py-6 text-center text-sm text-slate-400">
        GoCab - Your journey, made simple.
      </footer>
    </main>
  );
}