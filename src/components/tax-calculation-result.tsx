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
  AlertCircle,
} from 'lucide-react';
import {
  TaxCalculationResult as TaxResultType,
} from '@/types/inheritance';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"

interface TaxCalculationResultProps {
  result: TaxResultType;
  taxableAmount: number;
  isLoading: boolean;
}

export function TaxCalculationResult({ result, taxableAmount, isLoading }: TaxCalculationResultProps) {
  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined) return '-';
    return new Intl.NumberFormat('ja-JP').format(Math.round(amount));
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!result) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          計算結果がありません。まず家族構成を入力してください。
        </AlertDescription>
      </Alert>
    );
  }

  if (result.total_tax_amount === 0) {
    return (
      <Alert className="mt-6 border-green-200 bg-green-50">
        <AlertCircle className="h-5 w-5 text-green-700" />
        <AlertDescription className="text-green-800">
          <b>相続税はかかりません。</b>
          <br />
          課税価格の合計額（{formatCurrency(taxableAmount)}円）が基礎控除額（
          {formatCurrency(result.basic_deduction)}円）以下のため、相続税の申告は不要です。
        </AlertDescription>
      </Alert>
    );
  }

  const legalHeirsDetails = result.heir_tax_details || [];

  return (
    <>
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
          <CardTitle className="text-2xl font-bold text-blue-900">
            法定相続による税額計算結果
          </CardTitle>
          <CardDescription className="text-blue-700">
            民法に定められた法定相続分に基づいて計算された各相続人の納税額です。
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>相続人</TableHead>
                  <TableHead className="text-right">法定相続分</TableHead>
                  <TableHead className="text-right">取得金額</TableHead>
                  <TableHead className="text-right">納税額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {legalHeirsDetails.map((heir) => (
                  <TableRow key={heir.heir_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{heir.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {heir.relationship}
                        </Badge>
                        {heir.two_fold_addition && (
                          <Badge variant="destructive" className="text-xs">
                            2割加算
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {heir.legal_share_fraction}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(heir.legal_share_amount)}円
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(heir.tax_before_addition)}円
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-blue-50">
                  <TableCell colSpan={3} className="font-semibold text-right text-blue-800">
                    相続税の総額
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg text-blue-800 font-mono">
                    {formatCurrency(result.total_tax_amount)}円
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mt-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold bg-slate-50 w-1/3">課税価格の合計額</TableCell>
                <TableCell className="text-right font-mono text-lg">{formatCurrency(taxableAmount)}円</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold bg-slate-50">
                  基礎控除
                  <span className="text-xs font-normal text-gray-500 ml-2">
                    (3,000万円 + 600万円 × {result.total_heirs_count}人)
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-lg">{formatCurrency(result.basic_deduction)}円</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold bg-slate-50">課税遺産総額</TableCell>
                <TableCell className="text-right font-mono text-lg">{formatCurrency(result.taxable_estate)}円</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold bg-slate-50">相続税総額</TableCell>
                <TableCell className="text-right font-mono text-lg font-bold text-blue-800">{formatCurrency(result.total_tax_amount)}円</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

