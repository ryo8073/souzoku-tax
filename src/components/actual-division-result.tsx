'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { DivisionResult } from '@/types/inheritance';

interface ActualDivisionResultProps {
  result: DivisionResult | null;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ja-JP').format(Math.round(amount));
};

export function ActualDivisionResult({ result }: ActualDivisionResultProps) {
  if (!result || !result.division_details) {
    return null;
  }

  const totalAcquiredAmount = result.division_details.reduce((sum, d) => sum + d.acquired_amount, 0);
  const totalDistributedTax = result.division_details.reduce((sum, d) => sum + d.distributed_tax, 0);
  const totalAdjustment = result.division_details.reduce((sum, d) => sum + d.adjustment, 0);

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mt-6">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-green-900">
          <CheckCircle className="h-5 w-5" />
          実際の分割による計算結果
        </CardTitle>
        <CardDescription className="text-green-700">
          配偶者税額軽減・2割加算を適用した最終的な納税額
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold">相続人</th>
                <th className="p-3 text-right font-semibold">取得金額</th>
                <th className="p-3 text-right font-semibold">配分税額</th>
                <th className="p-3 text-right font-semibold">加算・減算</th>
                <th className="p-3 text-right font-semibold">最終納税額</th>
              </tr>
            </thead>
            <tbody>
              {result.division_details.map((detail) => (
                <tr key={detail.heir_id} className="border-b">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{detail.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {detail.relationship}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    {formatCurrency(detail.acquired_amount)}円
                  </td>
                  <td className="p-3 text-right">
                    {formatCurrency(detail.distributed_tax)}円
                  </td>
                  <td className="p-3 text-right">
                    <span
                      className={
                        detail.adjustment > 0
                          ? 'text-red-600'
                          : detail.adjustment < 0
                          ? 'text-green-600'
                          : ''
                      }
                    >
                      {detail.adjustment >= 0 ? '+' : ''}
                      {formatCurrency(detail.adjustment)}円
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-indigo-600">
                    {formatCurrency(detail.final_tax_amount)}円
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold border-t-2">
                <td className="p-3 text-left">合計</td>
                <td className="p-3 text-right">{formatCurrency(totalAcquiredAmount)}円</td>
                <td className="p-3 text-right">{formatCurrency(totalDistributedTax)}円</td>
                <td className="p-3 text-right">
                  <span
                    className={
                      totalAdjustment > 0
                        ? 'text-red-600'
                        : totalAdjustment < 0
                        ? 'text-green-600'
                        : ''
                    }
                  >
                    {totalAdjustment >= 0 ? '+' : ''}
                    {formatCurrency(totalAdjustment)}円
                  </span>
                </td>
                <td className="p-3 text-right text-indigo-600 text-lg">
                  {formatCurrency(result.total_final_tax_amount)}円
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
} 