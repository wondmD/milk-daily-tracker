import React, { forwardRef } from 'react';
import { SettlementPeriod } from '@/services/settlements';

interface ReceiptTemplateProps {
  period: SettlementPeriod;
  entityName: string;
  entityType: 'SUPPLIER' | 'CUSTOMER';
  totalMilk: number | string;
  grossAmount: number | string;
  adjustments: number | string;
  finalAmount: number | string;
  amountPaid: number | string;
  remainingBalance: number | string;
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(
  ({ period, entityName, entityType, totalMilk, grossAmount, adjustments, finalAmount, amountPaid, remainingBalance }, ref) => {
    return (
      <div ref={ref} className="p-10 bg-white text-black font-sans w-full max-w-3xl mx-auto hidden-print-show" style={{ display: 'none' }}>
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-widest text-black">Arkani</h1>
            <p className="text-sm text-gray-600 mt-1">Milk Daily Tracker & Settlements</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-800">OFFICIAL RECEIPT</h2>
            <p className="text-sm text-gray-500 mt-1">Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Issued To</h3>
            <p className="text-lg font-bold text-black">{entityName}</p>
            <p className="text-sm text-gray-600 capitalize">{entityType.toLowerCase()}</p>
          </div>
          <div className="text-right">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Settlement Period</h3>
            <p className="text-lg font-bold text-black">Period {period.period_number}</p>
            <p className="text-sm text-gray-600">Month {period.ethiopian_month}, Year {period.ethiopian_year}</p>
            <p className="text-xs text-gray-500 mt-1">{period.start_date_ethiopian} - {period.end_date_ethiopian}</p>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="mb-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="py-3 font-bold text-gray-700">Description</th>
                <th className="py-3 font-bold text-gray-700 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-4 text-gray-800">Total Milk {entityType === 'SUPPLIER' ? 'Collected' : 'Delivered'} ({totalMilk} L)</td>
                <td className="py-4 text-right font-medium text-gray-800">{grossAmount} ETB</td>
              </tr>
              {Number(adjustments) !== 0 && (
                <tr>
                  <td className="py-4 text-gray-800">Adjustments ({entityType === 'SUPPLIER' ? 'Advances' : 'Returns'})</td>
                  <td className="py-4 text-right font-medium text-red-600">{Number(adjustments) > 0 ? '-' : '+'}{Math.abs(Number(adjustments))} ETB</td>
                </tr>
              )}
              <tr className="bg-gray-50">
                <td className="py-4 px-2 font-bold text-black">Final Amount Payable</td>
                <td className="py-4 px-2 text-right font-bold text-black">{finalAmount} ETB</td>
              </tr>
              <tr>
                <td className="py-4 text-gray-800">Amount Paid</td>
                <td className="py-4 text-right font-medium text-gray-800">{amountPaid} ETB</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black">
                <td className="py-4 font-bold text-xl text-black">Remaining Balance</td>
                <td className="py-4 text-right font-bold text-xl text-black">{remainingBalance} ETB</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-300 text-center text-sm text-gray-500 flex justify-between px-10">
          <div>
            <div className="border-b border-gray-400 w-40 mb-2"></div>
            <p>Authorized Signature</p>
          </div>
          <div>
            <div className="border-b border-gray-400 w-40 mb-2"></div>
            <p>Recipient Signature</p>
          </div>
        </div>
        
        {/* Style to force print visibility */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            .hidden-print-show {
              display: block !important;
              position: absolute;
              left: 0;
              top: 0;
              margin: 0;
              padding: 20px;
              width: 100%;
            }
            body * {
              visibility: hidden;
            }
            .hidden-print-show, .hidden-print-show * {
              visibility: visible;
            }
          }
        `}} />
      </div>
    );
  }
);
ReceiptTemplate.displayName = 'ReceiptTemplate';
