'use client';

import React from 'react';
import CallWorkerButton from './CallWorkerButton';

/**
 * Example Worker Directory Component demonstrating CallWorkerButton usage
 * in a real-world card loop.
 */
export default function WorkersDirectoryExample({ workers = [] }) {
  // Sample fallback data if no workers are passed
  const sampleWorkers = workers.length > 0 ? workers : [
    {
      id: 1,
      name: 'Sunil Sharma',
      phone: '9848011223',
      trade: 'Masonry / Rajmistri',
      wage: 950,
      experience: 8,
      city: 'Gachibowli',
      district: 'Hyderabad',
      state: 'Telangana',
      verified: true,
      status: 'Available',
    },
    {
      id: 2,
      name: 'Pradeep Patil',
      phone: '9822014455',
      trade: 'Painting & Finishing',
      wage: 900,
      experience: 6,
      city: 'Kothrud',
      district: 'Pune',
      state: 'Maharashtra',
      verified: true,
      status: 'Available',
    },
    {
      id: 3,
      name: 'Balasubramanian S.',
      phone: '9840015566',
      trade: 'Electrical & Wiring',
      wage: 950,
      experience: 6,
      city: 'Ambattur',
      district: 'Chennai',
      state: 'Tamil Nadu',
      verified: true,
      status: 'Available',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            All-India Verified Workers Directory
          </h2>
          <p className="text-xs text-slate-500">
            Direct instant calling for contractors & site owners
          </p>
        </div>
        <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
          {sampleWorkers.length} Workers Available
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sampleWorkers.map((worker) => (
          <div
            key={worker.id}
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
          >
            {/* Header info */}
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{worker.name}</h3>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {worker.trade}
                  </span>
                </div>
                {worker.verified && (
                  <span
                    className="inline-flex items-center space-x-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
                    title="Aadhaar KYC & Skill Verified"
                  >
                    <span>✓</span>
                    <span>KYC Verified</span>
                  </span>
                )}
              </div>

              {/* Rates & Location */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Daily Wage</span>
                  <span className="font-extrabold text-slate-900">₹{worker.wage} / day</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Experience</span>
                  <span className="font-bold text-slate-900">{worker.experience} Years</span>
                </div>
              </div>

              <div className="mt-2.5 text-xs text-slate-500 flex items-center space-x-1">
                <span>📍</span>
                <span className="truncate">
                  {worker.city}, {worker.district}, {worker.state}
                </span>
              </div>
            </div>

            {/* UPGRADED CALL DIRECT ACTION BUTTON */}
            <div className="pt-2 border-t border-slate-100">
              <CallWorkerButton
                phoneNumber={worker.phone}
                workerName={worker.name}
                className="w-full"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
