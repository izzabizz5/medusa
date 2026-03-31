'use client';
import Link from 'next/link';
import { Shield, Search, FileText, CheckCircle } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-primary-700">Medusa</span>
        <div className="flex gap-4">
          <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">Log in</Link>
          <Link href="/auth/register" className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Your image. <span className="text-primary-600">Your control.</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Medusa scans the web for unauthorized use of your photos and files
          platform takedowns and DMCA notices on your behalf — automatically.
        </p>
        <Link href="/auth/register"
          className="inline-block bg-primary-600 text-white text-lg px-8 py-4 rounded-xl hover:bg-primary-700 font-medium">
          Protect my photos
        </Link>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: Shield, title: 'Upload & protect', desc: 'Upload your reference photos once. We extract your facial signature.' },
          { icon: Search, title: 'Daily scanning', desc: 'We scan thousands of URLs daily using facial recognition to find matches.' },
          { icon: CheckCircle, title: 'You verify', desc: 'Review every match. Confirm it\'s you before any action is taken.' },
          { icon: FileText, title: 'Automated takedowns', desc: 'We file DMCA notices and platform takedowns on your behalf after your approval.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-gray-50 rounded-xl p-6">
            <Icon className="w-8 h-8 text-primary-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-600">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
