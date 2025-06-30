'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Calculator, 
  TrendingUp, 
  Shield, 
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { TaxCalculationResult as TaxResult, HeirType } from '@/types/inheritance';

interface TaxCalculationResultProps {
  result: TaxResult;
  taxableAmount: number;
}

export function TaxCalculationResult({ result, taxableAmount }: TaxCalculationResultProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ja-JP').format(amount);
  };

  const getHeirTypeLabel = (heirType: HeirType): string => {
    switch (heirType) {
      case HeirType.SPOUSE:
        return '配偶者';
      case HeirType.CHILD:
        return '子';
      case HeirType.PARENT:
        return '親';
      case HeirType.SIBLING:
        return '兄弟姉妹';
      default:
        return 'その他';
    }
  };

  const getHeirTypeBadgeColor = (heirType: HeirType): string => {
    switch (heirType) {
      case HeirType.SPOUSE:
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case HeirType.CHILD:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case HeirType.PARENT:
        return 'bg-green-100 text-green-800 border-green-200';
      case HeirType.SIBLING:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // 法定相続人のみをフィルタリング（法定相続人以外を除外）
  const legalHeirsOnly = result.legal_heirs.filter(h => h.heir_type !== HeirType.OTHER);
  const legalHeirDetails = result.heir_tax_details.filter(d => {
    const heir = result.legal_heirs.find(h => h.id === d.heir_id);
    return heir && heir.heir_type !== HeirType.OTHER;
  });

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              課税遺産総額
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(result.taxable_inheritance)}円
            </div>
            <p className="text-xs text-blue-600 mt-1">
              課税価格 - 基礎控除
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              基礎控除額
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {formatCurrency(result.basic_deduction)}円
            </div>
            <p className="text-xs text-green-600 mt-1">
              3,000万円 + 600万円 × {result.total_heirs_count}人
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              相続税総額
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {formatCurrency(result.total_tax_amount)}円
            </div>
            <p className="text-xs text-purple-600 mt-1">
              法定相続分による計算
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 相続税がかからない場合の表示 */}
      {result.total_tax_amount === 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>相続税はかかりません</strong><br />
            課税価格の合計額（{formatCurrency(taxableAmount)}円）が基礎控除額（{formatCurrency(result.basic_deduction)}円）以下のため、相続税の申告は不要です。
          </AlertDescription>
        </Alert>
      )}

      {/* 法定相続人一覧 */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <Users className="h-5 w-5" />
            法定相続人と相続分
          </CardTitle>
          <CardDescription className="text-indigo-700">
            法定相続分に基づく相続税の計算結果
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">相続人</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">続柄</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">法定相続分</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">相続税額</th>
                </tr>
              </thead>
              <tbody>
                {legalHeirsOnly.map((heir, index) => {
                  const detail = legalHeirDetails.find(d => d.heir_id === heir.id);
                  const sharePercentage = (heir.inheritance_share * 100).toFixed(1);
                  
                  return (
                    <tr key={heir.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{heir.name}</span>
                          <Badge className={getHeirTypeBadgeColor(heir.heir_type)}>
                            {getHeirTypeLabel(heir.heir_type)}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {detail?.relationship || heir.relationship}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {formatCurrency(detail?.legal_share_amount || 0)}円
                          </div>
                          <div className="text-xs text-gray-500">
                            ({sharePercentage}%)
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-medium text-purple-700">
                          {formatCurrency(detail?.tax_before_addition || 0)}円
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-indigo-50 border-t-2 border-indigo-200">
                <tr>
                  <td colSpan={3} className="py-3 px-4 font-semibold text-indigo-900">
                    合計
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-indigo-900 text-lg">
                    {formatCurrency(result.total_tax_amount)}円
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 計算の詳細 */}
      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader>
          <CardTitle className="text-amber-900 flex items-center gap-2">
            <Info className="h-5 w-5" />
            計算の詳細
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">課税価格の合計額:</span>
              <span className="ml-2">{formatCurrency(taxableAmount)}円</span>
            </div>
            <div>
              <span className="font-medium">基礎控除額:</span>
              <span className="ml-2">{formatCurrency(result.basic_deduction)}円</span>
            </div>
            <div>
              <span className="font-medium">課税遺産総額:</span>
              <span className="ml-2">{formatCurrency(result.taxable_inheritance)}円</span>
            </div>
            <div>
              <span className="font-medium">法定相続人数:</span>
              <span className="ml-2">{legalHeirsOnly.length}人</span>
            </div>
          </div>
          
          {result.total_tax_amount > 0 && (
            <Alert className="border-blue-200 bg-blue-50 mt-4">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>重要な注意事項:</strong><br />
                • この計算は法定相続分による仮の計算です<br />
                • 実際の相続では配偶者税額軽減や2割加算が適用される場合があります<br />
                • 正確な税額は「実際の分割」タブで計算してください
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

