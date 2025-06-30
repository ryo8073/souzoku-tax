'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  FileText,
  CheckCircle,
} from 'lucide-react';
import {
  TaxCalculationResult as TaxCalculationResultType,
} from '@/types/inheritance';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TaxCalculationResultProps {
  result: TaxCalculationResultType | null;
  taxableAmount: number;
  isLoading: boolean;
}

export function TaxCalculationResult({
  result,
  taxableAmount,
  isLoading,
}: TaxCalculationResultProps) {
  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined) return '-';
    return new Intl.NumberFormat('ja-JP').format(Math.round(amount));
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!result) {
    return null;
  }

  if (result.total_tax_amount === 0) {
    return (
      <Alert className="mt-6 border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>相続税はかかりません</strong>
          <br />
          課税価格の合計額（{formatCurrency(taxableAmount)}円）が基礎控除額（
          {formatCurrency(result.basic_deduction)}円）以下のため、相続税の申告は不要です。
        </AlertDescription>
      </Alert>
    );
  }

  const legalHeirsDetails = result.heir_tax_details.filter(
    (heir) => heir.relationship !== 'other'
  );

  return (
    <div className="space-y-6 mt-6">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-lg">
          <CardTitle className="text-xl flex items-center">
            <Users className="mr-2 h-5 w-5" />
            法定相続人と相続分
          </CardTitle>
          <CardDescription>法定相続分に基づく相続税の計算結果</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left font-semibold">相続人</th>
                  <th className="p-3 text-right font-semibold">法定相続分</th>
                  <th className="p-3 text-right font-semibold">相続税額</th>
                </tr>
              </thead>
              <tbody>
                {legalHeirsDetails.map((heir) => {
                  const sharePercentage =
                    result.taxable_inheritance + result.basic_deduction > 0
                      ? ((heir.legal_share_amount || 0) /
                          (result.taxable_inheritance +
                            result.basic_deduction)) *
                        100
                      : 0;

                  return (
                    <tr key={heir.heir_id} className="border-b">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{heir.name.replace(/\s*\d+$/, '')}</span>
                          <Badge variant="outline" className="text-xs">
                            {heir.relationship}
                          </Badge>
                          {heir.two_fold_addition && (
                            <Badge variant="destructive" className="text-xs">
                              2割加算
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(heir.legal_share_amount)}円
                        <div className="text-xs text-gray-500">
                          ({sharePercentage.toFixed(1)}%)
                        </div>
                      </td>
                      <td className="p-3 text-right text-purple-600 font-bold">
                        {formatCurrency(heir.tax_before_addition)}円
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={2} className="p-4 text-right">
                    合計
                  </td>
                  <td className="p-4 text-right text-purple-600">
                    {formatCurrency(result.total_tax_amount)}円
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            計算の詳細
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-base">
          <div className="flex justify-between">
            <span>課税価格の合計額:</span>
            <span className="font-mono">
              {formatCurrency(taxableAmount)}円
            </span>
          </div>
          <div className="flex justify-between">
            <span>基礎控除額:</span>
            <span className="font-mono">
              (-) {formatCurrency(result.basic_deduction)}円
            </span>
          </div>
          <div className="flex justify-between border-t pt-2 mt-2">
            <span className="font-semibold">課税遺産総額:</span>
            <span className="font-semibold font-mono">
              {formatCurrency(result.taxable_inheritance)}円
            </span>
          </div>
          <div className="flex justify-between mt-4">
            <span className="font-semibold text-purple-700">相続税の総額:</span>
            <span className="font-semibold text-purple-700 font-mono text-lg">
              {formatCurrency(result.total_tax_amount)}円
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

